import { z } from "zod";

const text = z.string().trim().min(1).max(20000);
const id = z.string().uuid();
export const kinds = [
  "question",
  "claim",
  "intent",
  "decision",
  "scope",
] as const;
export type Kind = (typeof kinds)[number];
export const states: Record<Kind, string[]> = {
  question: ["open", "answered", "deferred", "withdrawn"],
  claim: ["assumed", "supported", "challenged", "refuted", "retired"],
  intent: ["draft", "active", "superseded", "withdrawn"],
  decision: ["draft", "accepted", "superseded", "withdrawn"],
  scope: ["draft", "ready", "active", "in_review", "accepted", "cancelled"],
};
export const relations = [
  "depends_on",
  "constrained_by",
  "supports",
  "challenges",
  "answers",
] as const;
export const recordInput = z
  .object({
    kind: z.enum(kinds),
    title: text.max(180),
    body: text,
    status: text.max(30),
    rationale: z.string().max(10000).default(""),
    evidence: z.string().max(10000).default(""),
    criteria: z.string().max(10000).default(""),
    exclusions: z.string().max(10000).default(""),
    source: z.string().max(20000).default(""),
  })
  .strict();
export type RecordInput = z.infer<typeof recordInput>;
export type Revision = RecordInput & {
  id: string;
  at: string;
  actor: string;
  origin: "human" | "ai";
  changeReason: string;
};
export type KnowledgeRecord = { id: string; revisions: Revision[] };
export type Link = {
  id: string;
  dependent: string;
  upstream: string;
  type: (typeof relations)[number];
  rationale: string;
  actor: string;
  at: string;
  retiredAt?: string;
  retiredReason?: string;
};
export type Notice = {
  id: string;
  recordId: string;
  upstreamId: string;
  sourceRevision: string;
  status: "open" | "resolved";
  resolution: string;
  at: string;
};
export type Session = {
  id: string;
  title: string;
  mode: string;
  body: string;
  next: string;
  status: "open" | "paused";
  updatedAt: string;
};
export type Proposal = {
  id: string;
  title: string;
  baseKnowledgeVersion: number;
  records: RecordInput[];
  source: string;
  status: "pending" | "applied" | "rejected" | "obsolete";
  at: string;
  model: string;
  context: { id: string; revision: string }[];
};
export type Artifact = {
  id: string;
  title: string;
  scopeId: string;
  knowledgeVersion: number;
  sources: { id: string; revision: string }[];
  markdown: string;
  digest: string;
  at: string;
  actor: string;
};
export type Review = {
  id: string;
  artifactId: string;
  repo: string;
  pr: number;
  head: string;
  base: string;
  files: string[];
  checks: { name: string; conclusion: string | null; status: string }[];
  complete: boolean;
  explanation: string;
  evidence: string;
  verdict: "pending" | "changes_requested" | "accepted";
  observedAt: string;
  reviewedAt?: string;
  actor?: string;
};
export type Project = {
  id: string;
  owner: string;
  name: string;
  description: string;
  version: number;
  knowledgeVersion: number;
  createdAt: string;
};
export type Workspace = {
  project: Project;
  records: KnowledgeRecord[];
  links: Link[];
  notices: Notice[];
  sessions: Session[];
  proposals: Proposal[];
  artifacts: Artifact[];
  reviews: Review[];
};
export const current = (r: KnowledgeRecord) =>
  r.revisions[r.revisions.length - 1];
export const active = (r: KnowledgeRecord) =>
  !["superseded", "withdrawn", "retired", "cancelled"].includes(
    current(r).status,
  );
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function checkRecord(r: RecordInput) {
  if (!states[r.kind].includes(r.status))
    throw new DomainError("Invalid state for this record type.");
  if (r.kind === "decision" && r.status === "accepted" && !r.rationale.trim())
    throw new DomainError("An accepted decision needs your reason.");
  if (
    r.kind === "claim" &&
    ["supported", "refuted"].includes(r.status) &&
    !r.evidence.trim()
  )
    throw new DomainError("This claim assessment needs evidence.");
  if (r.kind === "question" && r.status === "answered" && !r.evidence.trim())
    throw new DomainError(
      "An answered question needs a resolution in Evidence.",
    );
  if (
    r.kind === "scope" &&
    ["ready", "active", "in_review", "accepted"].includes(r.status) &&
    !r.criteria.trim()
  )
    throw new DomainError("This scope needs observable acceptance criteria.");
}
const simple = { kind: z.string(), version: z.number().int().nonnegative() };
export const commandSchema = z.discriminatedUnion("kind", [
  z.object({ ...simple, kind: z.literal("createRecord"), record: recordInput }),
  z.object({
    ...simple,
    kind: z.literal("reviseRecord"),
    id,
    expectedRevision: id,
    record: recordInput,
    reason: text,
  }),
  z.object({
    ...simple,
    kind: z.literal("link"),
    dependent: id,
    upstream: id,
    type: z.enum(relations),
    rationale: text,
  }),
  z.object({ ...simple, kind: z.literal("retireLink"), id, reason: text }),
  z.object({
    ...simple,
    kind: z.literal("resolveNotice"),
    id,
    resolution: text,
  }),
  z.object({
    ...simple,
    kind: z.literal("saveSession"),
    id: id.optional(),
    title: text.max(180),
    mode: z.enum([
      "Capture",
      "Explore",
      "Compare",
      "Decide",
      "Specify",
      "Validate",
    ]),
    body: z.string().max(50000),
    next: z.string().max(2000),
    status: z.enum(["open", "paused"]),
  }),
  z.object({
    ...simple,
    kind: z.literal("reviewProposal"),
    id,
    accept: z.boolean(),
  }),
  z.object({ ...simple, kind: z.literal("exportArtifact"), scopeId: id }),
  z.object({
    ...simple,
    kind: z.literal("acceptReview"),
    id,
    verdict: z.enum(["accepted", "changes_requested"]),
    explanation: text,
    evidence: text,
  }),
]);
export type Command = z.infer<typeof commandSchema>;
export const candidateSchema = z
  .object({ title: text.max(180), records: z.array(recordInput).min(1).max(5) })
  .strict();
