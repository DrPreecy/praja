import { createHash, randomUUID } from "node:crypto";
import {
  active,
  checkRecord,
  current,
  DomainError,
  type Artifact,
  type Command,
  type KnowledgeRecord,
  type Proposal,
  type RecordInput,
  type Review,
  type Workspace,
} from "./model";

const stamp = () => new Date().toISOString();
export function emptyWorkspace(
  owner: string,
  name: string,
  description: string,
): Workspace {
  return {
    project: {
      id: randomUUID(),
      owner,
      name,
      description,
      version: 0,
      knowledgeVersion: 0,
      createdAt: stamp(),
    },
    records: [],
    links: [],
    notices: [],
    sessions: [],
    proposals: [],
    artifacts: [],
    reviews: [],
  };
}
export function authorize(w: Workspace, actor: string) {
  if (w.project.owner !== actor)
    throw new DomainError("Project not found.", 404);
}
export function record(w: Workspace, id: string) {
  const r = w.records.find((r) => r.id === id);
  if (!r) throw new DomainError("Record not found.", 404);
  return r;
}
function changed(w: Workspace) {
  w.project.knowledgeVersion++;
  for (const p of w.proposals)
    if (p.status === "pending") p.status = "obsolete";
}
function addRecord(
  w: Workspace,
  input: RecordInput,
  actor: string,
  origin: "human" | "ai" = "human",
) {
  checkRecord(input);
  const r: KnowledgeRecord = {
    id: randomUUID(),
    revisions: [
      {
        ...input,
        id: randomUUID(),
        at: stamp(),
        actor,
        origin,
        changeReason: "Created",
      },
    ],
  };
  w.records.push(r);
  return r;
}
function transition(previous: RecordInput, next: RecordInput) {
  if (previous.kind !== next.kind)
    throw new DomainError(
      "Record type cannot change; create a linked record instead.",
    );
  if (
    ["superseded", "withdrawn", "retired", "cancelled"].includes(
      previous.status,
    )
  )
    throw new DomainError(
      "Historical records cannot be reactivated. Create a new record.",
    );
  if (previous.kind === "scope" && previous.status === "accepted")
    throw new DomainError(
      "Accepted scopes are historical. Create a new scope for further work.",
    );
  if (previous.status === next.status) return;
  if (
    previous.kind === "decision" &&
    previous.status === "accepted" &&
    next.status === "draft"
  )
    throw new DomainError(
      "An accepted decision cannot become a draft. Revise it with a reason.",
    );
  if (previous.kind === "scope") {
    const allowed: Record<string, string[]> = {
      draft: ["ready", "cancelled"],
      ready: ["draft", "active", "cancelled"],
      active: ["in_review", "cancelled"],
      in_review: ["active", "accepted", "cancelled"],
      accepted: [],
    };
    if (!allowed[previous.status]?.includes(next.status))
      throw new DomainError("Invalid work-scope transition.");
  }
}
export function apply(w: Workspace, actor: string, cmd: Command): Workspace {
  authorize(w, actor);
  if (cmd.version !== w.project.version)
    throw new DomainError(
      "This project changed. Refresh before applying your change.",
      409,
    );
  switch (cmd.kind) {
    case "createRecord": {
      if (cmd.record.kind === "scope" && cmd.record.status !== "draft")
        throw new DomainError("Start a scope as draft.");
      addRecord(w, cmd.record, actor);
      changed(w);
      break;
    }
    case "reviseRecord": {
      const r = record(w, cmd.id),
        prev = current(r);
      if (prev.id !== cmd.expectedRevision)
        throw new DomainError("The record revision changed.", 409);
      checkRecord(cmd.record);
      transition(prev, cmd.record);
      if (
        cmd.record.kind === "scope" &&
        ["ready", "active", "accepted"].includes(cmd.record.status) &&
        w.notices.some((n) => n.recordId === r.id && n.status === "open")
      )
        throw new DomainError(
          "Resolve impact notices before advancing this scope.",
        );
      if (cmd.record.kind === "scope" && cmd.record.status === "accepted")
        throw new DomainError(
          "Delivery acceptance is not enabled in this preview. Record implementation findings as evidence without claiming verified completion.",
        );
      r.revisions.push({
        ...cmd.record,
        id: randomUUID(),
        at: stamp(),
        actor,
        origin: "human",
        changeReason: cmd.reason,
      });
      for (const l of w.links.filter(
        (l) => !l.retiredAt && l.upstream === r.id,
      )) {
        let n = w.notices.find(
          (n) =>
            n.recordId === l.dependent &&
            n.upstreamId === r.id &&
            n.status === "open",
        );
        if (n) n.sourceRevision = prev.id;
        else {
          n = {
            id: randomUUID(),
            recordId: l.dependent,
            upstreamId: r.id,
            sourceRevision: prev.id,
            status: "open",
            resolution: "",
            at: stamp(),
          };
          w.notices.push(n);
        }
      }
      changed(w);
      break;
    }
    case "link": {
      record(w, cmd.dependent);
      record(w, cmd.upstream);
      if (cmd.dependent === cmd.upstream)
        throw new DomainError("A record cannot depend on itself.");
      if (
        w.links.some(
          (l) =>
            !l.retiredAt &&
            l.dependent === cmd.dependent &&
            l.upstream === cmd.upstream &&
            l.type === cmd.type,
        )
      )
        throw new DomainError("This relationship already exists.");
      w.links.push({
        id: randomUUID(),
        dependent: cmd.dependent,
        upstream: cmd.upstream,
        type: cmd.type,
        rationale: cmd.rationale,
        actor,
        at: stamp(),
      });
      changed(w);
      break;
    }
    case "retireLink": {
      const l = w.links.find((l) => l.id === cmd.id);
      if (!l || l.retiredAt)
        throw new DomainError("Active relationship not found.", 404);
      l.retiredAt = stamp();
      l.retiredReason = cmd.reason;
      changed(w);
      break;
    }
    case "resolveNotice": {
      const n = w.notices.find((n) => n.id === cmd.id);
      if (!n) throw new DomainError("Notice not found.", 404);
      n.status = "resolved";
      n.resolution = cmd.resolution;
      changed(w);
      break;
    }
    case "saveSession": {
      const existing = cmd.id
        ? w.sessions.find((s) => s.id === cmd.id)
        : undefined;
      if (cmd.id && !existing) throw new DomainError("Session not found.", 404);
      const s = {
        id: existing?.id ?? randomUUID(),
        title: cmd.title,
        mode: cmd.mode,
        body: cmd.body,
        next: cmd.next,
        status: cmd.status,
        updatedAt: stamp(),
      };
      if (existing) Object.assign(existing, s);
      else w.sessions.push(s);
      break;
    }
    case "reviewProposal": {
      const p = w.proposals.find((p) => p.id === cmd.id);
      if (!p) throw new DomainError("Proposal not found.", 404);
      if (!cmd.accept) {
        if (!["pending", "obsolete"].includes(p.status))
          throw new DomainError("Proposal already reviewed.");
        p.status = "rejected";
        break;
      }
      if (
        p.status !== "pending" ||
        p.baseKnowledgeVersion !== w.project.knowledgeVersion
      )
        throw new DomainError(
          "Proposal is stale. Generate a new proposal from current context.",
          409,
        );
      for (const r of p.records) {
        checkRecord(r);
        if (r.kind === "scope" && r.status !== "draft")
          throw new DomainError("AI scopes must start as drafts.");
      }
      for (const r of p.records)
        addRecord(w, { ...r, source: p.source }, actor, "ai");
      p.status = "applied";
      changed(w);
      break;
    }
    case "exportArtifact":
      w.artifacts.push(assemble(w, cmd.scopeId, actor));
      break;
    case "acceptReview": {
      const r = w.reviews.find((r) => r.id === cmd.id);
      if (!r) throw new DomainError("Review not found.", 404);
      const a = w.artifacts.find((a) => a.id === r.artifactId)!;
      if (cmd.verdict === "accepted" && (!r.complete || artifactStale(w, a)))
        throw new DomainError("Review is incomplete or its contract is stale.");
      if (
        cmd.verdict === "accepted" &&
        r.checks.some(
          (c) => c.status !== "completed" || c.conclusion !== "success",
        )
      )
        throw new DomainError(
          "Repository checks include missing, skipped, pending or unsuccessful results.",
        );
      Object.assign(r, {
        verdict: cmd.verdict,
        explanation: cmd.explanation,
        evidence: cmd.evidence,
        reviewedAt: stamp(),
        actor,
      });
      break;
    }
  }
  w.project.version++;
  return w;
}
export function artifactStale(w: Workspace, a: Artifact) {
  return a.knowledgeVersion !== w.project.knowledgeVersion;
}
export function assemble(
  w: Workspace,
  scopeId: string,
  actor: string,
): Artifact {
  const scope = current(record(w, scopeId));
  if (scope.kind !== "scope") throw new DomainError("Choose a work scope.");
  if (!scope.criteria.trim())
    throw new DomainError(
      "Add observable acceptance criteria before approving a handoff.",
    );
  const seen = new Set([scopeId]);
  const queue = [scopeId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const l of w.links.filter((l) => !l.retiredAt && l.dependent === id)) {
      if (!seen.has(l.upstream)) {
        seen.add(l.upstream);
        queue.push(l.upstream);
      }
    }
  }
  // All active project constraints are visible. Explicit links supply the rest of the scoped context.
  for (const r of w.records)
    if (
      active(r) &&
      current(r).kind === "intent" &&
      current(r).status === "active"
    )
      seen.add(r.id);
  if (w.notices.some((n) => seen.has(n.recordId) && n.status === "open"))
    throw new DomainError(
      "Resolve the relevant impact notices before approving this handoff.",
    );
  const selected = w.records.filter((r) => seen.has(r.id));
  if (selected.some((r) => !active(r)))
    throw new DomainError(
      "The scope references withdrawn or superseded knowledge. Revise its relationships first.",
    );
  const id = randomUUID(),
    at = stamp();
  const markdown = `# ${scope.title}\n\nProject: ${w.project.name}\n\nArtifact: ${id}\nApproved by: ${actor}\nApproved at: ${at}\n\n## Implementation scope\n${scope.body}\n\n## Exclusions\n${scope.exclusions || "Not specified — clarify before extending scope."}\n\n## Acceptance criteria\n${scope.criteria}\n\n## Referenced knowledge\n${selected
    .map((r) => {
      const v = current(r);
      return `### ${v.title}\nID: ${r.id} / revision ${v.id}\nType: ${v.kind}; state: ${v.status}\n\n${v.body}\n\nReason: ${v.rationale || "Not provided"}\nEvidence: ${v.evidence || "Not provided; do not infer verification"}\n`;
    })
    .join("\n")}\n## Open project questions\n${
    w.records
      .filter(
        (r) =>
          current(r).kind === "question" &&
          ["open", "deferred"].includes(current(r).status),
      )
      .map((r) => "- " + current(r).title)
      .join("\n") || "None recorded; this is not proof of completeness."
  }\n\n## Agent boundary\nRead existing repository instructions. This snapshot authorizes only the stated scope. Report missing decisions, dependency changes, unrun checks and deviations. Do not silently expand requirements. A successful build is not proof of behavioral acceptance.\n`;
  return {
    id,
    title: scope.title,
    scopeId,
    knowledgeVersion: w.project.knowledgeVersion,
    sources: selected.map((r) => ({ id: r.id, revision: current(r).id })),
    markdown,
    digest: createHash("sha256").update(markdown).digest("hex"),
    at,
    actor,
  };
}
export function appendProposal(
  w: Workspace,
  actor: string,
  p: Omit<Proposal, "id" | "at" | "status">,
) {
  authorize(w, actor);
  if (p.baseKnowledgeVersion !== w.project.knowledgeVersion)
    throw new DomainError(
      "Project knowledge changed during generation. Nothing was applied.",
      409,
    );
  w.proposals.push({ ...p, id: randomUUID(), at: stamp(), status: "pending" });
  w.project.version++;
}
export function appendReview(
  w: Workspace,
  actor: string,
  r: Omit<Review, "id" | "verdict" | "explanation" | "evidence">,
) {
  authorize(w, actor);
  const a = w.artifacts.find((a) => a.id === r.artifactId);
  if (!a) throw new DomainError("Artifact not found.", 404);
  w.reviews.push({
    ...r,
    id: randomUUID(),
    verdict: "pending",
    explanation: "",
    evidence: "",
  });
  w.project.version++;
}
