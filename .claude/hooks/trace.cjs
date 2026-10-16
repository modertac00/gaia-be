const fs = require("fs");
const path = require("path");

let raw = "";
process.stdin.on("data", (c) => (raw += c)).on("end", () => {
    let e;
    try {
        e = JSON.parse(raw);
    } catch {
        return;
    }

    const root = process.env.CLAUDE_PROJECT_DIR || e.cwd;
    const dir = path.join(root, ".claude", "logs");
    fs.mkdirSync(dir, {
        recursive: true
    });

    const logFile = path.join(dir, `${e.session_id}.txt`);
    const stateFile = path.join(dir, `.${e.session_id}.state.json`);
    const lockDir = path.join(dir, `.${e.session_id}.lock`);

    const LOCK_TIMEOUT_MS = 2000;
    const LOCK_STALE_MS = 5000;
    const LOCK_RETRY_MS = 5;

    const sleep = (ms) => {
        try {
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
        } catch {}
    };

    const acquire = () => {
        const deadline = Date.now() + LOCK_TIMEOUT_MS;
        for (;;) {
            try {
                fs.mkdirSync(lockDir);
                return true;
            } catch {}
            try {
                if (Date.now() - fs.statSync(lockDir).mtimeMs > LOCK_STALE_MS) {
                    fs.rmSync(lockDir, {
                        recursive: true,
                        force: true
                    });
                }
            } catch {}
            if (Date.now() >= deadline) return false;
            sleep(LOCK_RETRY_MS);
        }
    };

    const release = () => {
        try {
            fs.rmSync(lockDir, {
                recursive: true,
                force: true
            });
        } catch {}
    };

    const locked = acquire();

    try {
        const zeroTokens = () => ({
            input: 0,
            output: 0,
            cacheWrite: 0,
            cacheRead: 0
        });
        const fresh = () => ({
            step: 0, // step counter for the current user prompt
            blockStart: 0, // step number when the current block (prompt or follow-up) began
            ok: 0,
            failed: 0,
            pending: {}, // tool calls waiting for a Post event
            turnStart: 0,
            followUp: false,
            session: zeroTokens(),
            agents: {}, // tool_use_id -> { step, name, start, agentId }
            agentIds: {} // agentId -> tool_use_id
        });
        let state = fresh();
        try {
            state = {
                ...fresh(),
                ...JSON.parse(fs.readFileSync(stateFile, "utf8"))
            };
        } catch {}

        // New user prompt: reset per-prompt counters, keep session totals and running agents
        const resetPrompt = () => {
            const keep = {
                session: state.session,
                agents: state.agents,
                agentIds: state.agentIds
            };
            state = {
                ...fresh(),
                ...keep
            };
            // forget agents that never reported back within 6 hours
            const cutoff = Date.now() - 6 * 3600 * 1000;
            for (const [id, a] of Object.entries(state.agents)) {
                if (a.start < cutoff) {
                    delete state.agents[id];
                    if (a.agentId) delete state.agentIds[a.agentId];
                }
            }
        };

        const time = new Date().toLocaleTimeString("en-GB", {
            hour12: false
        });
        const oneLine = (s, n = 300) => String(s ? s : "").replace(/\s+/g, " ").trim().slice(0, n);
        const fmt = (x) => Number(x || 0).toLocaleString("en-US");
        const sum = (u) => u.input + u.output + u.cacheWrite + u.cacheRead;
        const dur = (ms) => {
            const s = Math.round(ms / 1000);
            return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${(ms / 1000).toFixed(1)}s`;
        };
        const tag = (re, s) => (s.match(re) || [])[1];
        const lines = [];

        const t = e.tool_input || {};
        const n = e.tool_name || "";
        const fp = (t.file_path || "").split(path.sep).join("/");
        const tracked = ["Task", "Agent", "Skill", "SlashCommand"].includes(n) ||
            n.startsWith("mcp__") ||
            (n === "Read" && fp.includes("/.claude/"));
        const isAgent = n === "Task" || n === "Agent";
        const key = e.tool_use_id || `${n}:${JSON.stringify(t)}`;
        // Tool calls made inside a subagent carry its identity (on versions that send it)
        const who = e.agent_type ? `[${e.agent_type}] ` : e.agent_id ? `[agent ${e.agent_id}] ` : "";
        const ind = who ? "   " : "";

        if (!fs.existsSync(logFile)) {
            const bar = "=".repeat(70);
            lines.push(bar, `Session : ${e.session_id}`, `Started : ${new Date().toLocaleString("en-GB")}`, bar, "");
        }

        const describe = () => {
            if (isAgent) return ["AGENT", `${t.subagent_type || "general"} — "${t.description || ""}"`];
            if (n === "Skill") return ["SKILL", t.skill || t.command];
            if (n === "SlashCommand") return ["COMMAND", t.command];
            if (n.startsWith("mcp__")) {
                const [, server, ...tool] = n.split("__");
                return ["MCP", `${server} → ${tool.join("__")}`];
            }
            return ["REFERENCE", path.relative(root, t.file_path)];
        };

        const errorOf = () => {
            if (e.error) return e.error;
            const r = e.tool_response;
            if (!r || typeof r !== "object") return null;
            if (r.error) return r.error;
            if (r.is_error || r.isError) {
                const c = Array.isArray(r.content) ? r.content.map((x) => x.text || "").join(" ") : r.content;
                return c || "unknown error";
            }
            return null;
        };

        const agentTokens = () => {
            const r = e.tool_response;
            if (!r || typeof r !== "object") return 0;
            if (r.totalTokens) return r.totalTokens;
            const u = r.usage;
            if (!u) return 0;
            return (u.input_tokens || 0) + (u.output_tokens || 0) +
                (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
        };

        const turnUsage = () => {
            let text;
            try {
                text = fs.readFileSync(e.transcript_path, "utf8");
            } catch {
                return null;
            }
            const u = zeroTokens();
            const models = new Set();
            const seen = new Set();
            for (const line of text.split("\n")) {
                if (!line) continue;
                let m;
                try {
                    m = JSON.parse(line);
                } catch {
                    continue;
                }
                if (m.type !== "assistant" || m.isSidechain) continue;
                const msg = m.message;
                if (!msg || !msg.usage) continue;
                if (state.turnStart && m.timestamp && Date.parse(m.timestamp) < state.turnStart) continue;
                const id = msg.id || m.uuid;
                if (seen.has(id)) continue;
                seen.add(id);
                u.input += msg.usage.input_tokens || 0;
                u.output += msg.usage.output_tokens || 0;
                u.cacheWrite += msg.usage.cache_creation_input_tokens || 0;
                u.cacheRead += msg.usage.cache_read_input_tokens || 0;
                if (msg.model) models.add(msg.model);
            }
            return {
                ...u,
                models: [...models]
            };
        };

        const finish = (err) => {
            const p = state.pending[key];
            if (!p) return;
            delete state.pending[key];
            const secs = dur(Date.now() - p.start);
            const tok = isAgent ? agentTokens() : 0;
            const tokText = tok ? ` · ${fmt(tok)} tokens` : "";
            const prefix = `[${time}] ${ind}    `;

            if (isAgent && state.agents[key]) {
                // remember the agent id so its later <agent-message> can be linked to this step
                const r = e.tool_response && typeof e.tool_response === "object" ? e.tool_response : {};
                const agentId = r.agentId || r.agent_id || r.taskId || r.task_id;
                if (agentId) {
                    state.agents[key].agentId = agentId;
                    state.agentIds[agentId] = key;
                }
            }

            if (err) {
                state.failed++;
                lines.push(`${prefix}✗ FAILED step ${p.step} (${secs}${tokText}): ${oneLine(err)}`);
                if (isAgent) delete state.agents[key];
            } else {
                state.ok++;
                lines.push(`${prefix}✓ OK step ${p.step} (${secs}${tokText})`);
            }
        };

        // A finished background agent: link back to the step that launched it
        const agentFinished = (toolUseId, taskId, status) => {
            const a = state.agents[toolUseId] || (taskId && state.agents[state.agentIds[taskId]]);
            const st = status ? ` — ${status}` : "";
            const bad = status && /fail|error|kill|cancel|abort/i.test(status);
            if (a) {
                lines.push(`[${time}] ${bad ? "✗" : "◆"} AGENT FINISHED step ${a.step}: ${a.name} (${dur(Date.now() - a.start)}${st})`);
                for (const [id, x] of Object.entries(state.agents)) {
                    if (x === a) delete state.agents[id];
                }
                if (a.agentId) delete state.agentIds[a.agentId];
            } else {
                lines.push(`[${time}] ${bad ? "✗" : "◆"} BACKGROUND TASK FINISHED: ${taskId || toolUseId || "unknown"}${st}`);
            }
            if (bad) state.failed++;
        };

        switch (e.hook_event_name) {
            case "UserPromptSubmit": {
                const p = e.prompt || "";

                // Injected by Claude Code when a background agent finishes: not a user prompt
                if (/^\s*<task-notification>/.test(p)) {
                    state.followUp = true;
                    state.turnStart = Date.now();
                    state.blockStart = state.step;
                    lines.push("");
                    agentFinished(
                        tag(/<tool-use-id>([^<]+)</, p),
                        tag(/<task-id>([^<]+)</, p),
                        tag(/<status>([^<]+)</, p)
                    );
                    break;
                }
                if (/^\s*<agent-message/.test(p)) {
                    state.followUp = true;
                    state.turnStart = Date.now();
                    state.blockStart = state.step;
                    const from = tag(/from="([^"]+)"/, p);
                    const a = from && state.agents[state.agentIds[from]];
                    lines.push("", `[${time}] ↩ REPORT received from ${a ? `step ${a.step}: ${a.name}` : `agent ${from || "unknown"}`}`);
                    break;
                }

                resetPrompt();
                state.turnStart = Date.now();
                lines.push("", "", `[${time}] PROMPT: ${oneLine(p, 200)}`, "-".repeat(70));
                break;
            }

            case "PreToolUse": {
                if (!tracked) break;
                const [label, text] = describe();
                state.step++;
                state.pending[key] = {
                    step: state.step,
                    start: Date.now(),
                    label
                };
                if (isAgent) {
                    state.agents[key] = {
                        step: state.step,
                        name: t.subagent_type || "general",
                        start: Date.now()
                    };
                }
                lines.push(`[${time}] ${ind}${String(state.step).padStart(2)}. ${label.padEnd(9)}: ${who}${text}`);
                break;
            }

            case "PostToolUse":
                if (tracked) finish(errorOf());
                break;

            case "PostToolUseFailure":
                if (tracked) finish(e.error || errorOf() || "unknown error");
                break;

            case "Stop": {
                for (const p of Object.values(state.pending)) {
                    state.failed++;
                    lines.push(`[${time}]     ⚠ NO RESULT step ${p.step} (${p.label}): denied, interrupted or cancelled`);
                }
                state.pending = {};

                const u = turnUsage();
                if (u) {
                    state.session.input += u.input;
                    state.session.output += u.output;
                    state.session.cacheWrite += u.cacheWrite;
                    state.session.cacheRead += u.cacheRead;
                    lines.push(
                        `[${time}] TOKENS  — in ${fmt(u.input)} · out ${fmt(u.output)} · ` +
                        `cache write ${fmt(u.cacheWrite)} · cache read ${fmt(u.cacheRead)} · ` +
                        `total ${fmt(sum(u))}${u.models.length ? ` (${u.models.join(", ")})` : ""}`,
                        `[${time}] SESSION — ${fmt(sum(state.session))} tokens so far (out ${fmt(state.session.output)})`
                    );
                } else {
                    lines.push(`[${time}] TOKENS  — unavailable (transcript not readable)`);
                }

                const running = Object.keys(state.agents).length;
                const runText = running ? ` · ${running} background agent(s) still running` : "";
                if (state.followUp) {
                    lines.push(`[${time}] DONE (follow-up) — ${state.step - state.blockStart} new step(s)${runText}`);
                } else {
                    lines.push("-".repeat(70), `[${time}] DONE — ${state.step} step(s): ${state.ok} ok, ${state.failed} failed${runText}`);
                }
                state.followUp = false;
                state.blockStart = state.step;
                break;
            }
        }

        if (lines.length) fs.appendFileSync(logFile, lines.join("\n") + "\n");
        if (locked) fs.writeFileSync(stateFile, JSON.stringify(state));
    } finally {
        if (locked) release();
    }
});