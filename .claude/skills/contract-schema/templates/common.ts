// src/gaia/common/<topic>.ts — replace Research/RESEARCH with the concept.
import { z } from "zod";

export const RESEARCH_STATUSES = [
  { value: "requested", label: "Requested" },
  { value: "queued", label: "Queued" },
  { value: "archived", label: "Archived" },
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number]["value"];

export const RESEARCH_STATUS_VALUES = RESEARCH_STATUSES.map((status) => status.value) as [
  ResearchStatus,
  ...ResearchStatus[],
];

export const researchStatusSchema = z.enum(RESEARCH_STATUS_VALUES);

export const RESEARCH_TYPES = [
  { value: "market", label: "Market" },
  { value: "regulation", label: "Regulation" },
  { value: "competitor", label: "Competitor" },
  { value: "customer-problem", label: "Customer problem" },
] as const;

export type ResearchType = (typeof RESEARCH_TYPES)[number]["value"];

export const researchTypeSchema = z.enum(
  RESEARCH_TYPES.map((type) => type.value) as [ResearchType, ...ResearchType[]],
);

export const RESEARCH_LIMITS = {
  TITLE_MAX: 200,
  TOPIC_MAX: 500,
  SCOPE_NOTES_MAX: 5000,
} as const;

export const RESEARCH_NOT_FOUND_MESSAGE = "Research not found";
