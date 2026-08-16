# Gaia Research Request Instructions

Use this Markdown brief as the reusable input contract for Gaia research calls.
Every created research request should produce a filled copy of this structure so
LLM calls, paper search, regulation scans, competitor scans, and summaries all
work from the same traceable request.

```md
# Research Request

## Request
- Topic: <topic>
- Research type: <market | regulation | competitor | customer problem>
- Requested by: <role or user>
- Status: Queued for Gaia

## Scope
<scope notes>

## Guiding Questions
- <question 1>
- <question 2>

## AI Instructions
<custom instructions for this request>

## Reusable Task Prompts

### Find Related Papers
Find recent and authoritative papers relevant to the topic and guiding
questions. Prioritize peer-reviewed journals, working papers from credible
institutions, and systematic reviews. Return title, authors, year, venue,
link or DOI, relevance reason, and any limitation.

### Scan Regulations
Scan official regulatory and standards sources relevant to the topic. Prioritize
primary sources such as government, regulator, standards body, and official EU
or national pages. Return jurisdiction, authority, publication date, obligation,
effective date, source link, and confidence.

### Competitor Scan
Identify competitors or comparable products related to the request. Compare
positioning, features, pricing signals, target users, proof points, and gaps.
Separate factual source-backed claims from inference.

### Customer Problem Scan
Identify user pains, workflow breakdowns, buying triggers, and objections.
Use interview notes, support signals, public reviews, market reports, and
credible community discussions when available. Return source-backed insights
and product implications.

### Market Scan
Summarize market size signals, adoption drivers, buyer segments, budget owners,
growth catalysts, and risks. Label estimates clearly and preserve source links.

### Summarize Sources
Summarize each source into claims Gaia can reuse. Include key finding, evidence,
source URL, date accessed, confidence, and whether the source needs RA
verification.

### Draft Research Note
Create a structured note with Summary, Key findings, Risks & opportunities,
Open questions, and Sources. Every factual claim must keep a source reference.

## Output Rules
- Prefer primary sources when available.
- Keep source links with every factual claim.
- Mark assumptions and inferences explicitly.
- Do not present unverified claims as approved facts.
- Preserve enough detail for RA review and later Atlas handoff.
```
