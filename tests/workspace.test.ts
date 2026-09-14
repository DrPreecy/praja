import { describe, it, expect } from "vitest";
import { apply, emptyWorkspace } from "../src/domain/workspace";
import { appendProposal, assemble } from "../src/domain/workspace";
import {
  current,
  recordInput,
  type Workspace,
  type RecordInput,
} from "../src/domain/model";
const input = (over: Partial<RecordInput> = {}) =>
  recordInput.parse({
    kind: "claim",
    title: "Offline use",
    body: "Users may work offline.",
    status: "assumed",
    ...over,
  });
const make = () =>
  emptyWorkspace("alice", "Field notes", "Explore field research");
function add(w: Workspace, over: Partial<RecordInput> = {}) {
  apply(w, "alice", {
    kind: "createRecord",
    version: w.project.version,
    record: input(over),
  });
  return w.records.at(-1)!;
}
describe("human-led project contracts", () => {
  it("prevents another owner from accessing a project", () => {
    const w = make();
    expect(() =>
      apply(w, "bob", { kind: "createRecord", version: 0, record: input() }),
    ).toThrow("not found");
    expect(w.records).toHaveLength(0);
  });
  it("rejects stale writes and preserves original revision", () => {
    const w = make(),
      r = add(w),
      v = current(r);
    expect(() =>
      apply(w, "alice", { kind: "createRecord", version: 0, record: input() }),
    ).toThrow("changed");
    apply(w, "alice", {
      kind: "reviseRecord",
      version: 1,
      id: r.id,
      expectedRevision: v.id,
      record: input({ body: "Offline use is optional." }),
      reason: "Interview clarified use",
    });
    expect(r.revisions).toHaveLength(2);
    expect(r.revisions[0]).toEqual(v);
  });
  it("requires evidence before calling an assumption supported", () => {
    expect(() => add(make(), { status: "supported" })).toThrow("evidence");
  });
  it("requires rationale before accepting a decision", () => {
    expect(() => add(make(), { kind: "decision", status: "accepted" })).toThrow(
      "reason",
    );
  });
  it("creates direct notices and blocks a dependent handoff until reviewed", () => {
    const w = make(),
      claim = add(w),
      scope = add(w, {
        kind: "scope",
        status: "draft",
        criteria: "Works without a connection",
      });
    apply(w, "alice", {
      kind: "link",
      version: w.project.version,
      dependent: scope.id,
      upstream: claim.id,
      type: "depends_on",
      rationale: "Offline behavior determines storage",
    });
    const before = current(claim);
    apply(w, "alice", {
      kind: "reviseRecord",
      version: w.project.version,
      id: claim.id,
      expectedRevision: before.id,
      record: input({ body: "Connection is always available." }),
      reason: "Field visit",
    });
    expect(w.notices).toHaveLength(1);
    expect(() => assemble(w, scope.id, "alice")).toThrow("notices");
    apply(w, "alice", {
      kind: "resolveNotice",
      version: w.project.version,
      id: w.notices[0].id,
      resolution: "Offline support remains an explicit resilience choice.",
    });
    expect(assemble(w, scope.id, "alice").sources).toHaveLength(2);
  });
  it("does not silently apply AI proposals and invalidates them after changes", () => {
    const w = make();
    appendProposal(w, "alice", {
      title: "Explore offline",
      records: [input()],
      baseKnowledgeVersion: 0,
      source: "What is uncertain?",
      model: "test",
      context: [],
    });
    expect(w.records).toHaveLength(0);
    add(w);
    expect(w.proposals[0].status).toBe("obsolete");
    expect(() =>
      apply(w, "alice", {
        kind: "reviewProposal",
        id: w.proposals[0].id,
        accept: true,
        version: w.project.version,
      }),
    ).toThrow("stale");
  });
  it("records AI origin only after explicit human application", () => {
    const w = make();
    appendProposal(w, "alice", {
      title: "Explore",
      records: [input()],
      baseKnowledgeVersion: 0,
      source: "Original request",
      model: "test",
      context: [],
    });
    apply(w, "alice", {
      kind: "reviewProposal",
      version: w.project.version,
      id: w.proposals[0].id,
      accept: true,
    });
    expect(current(w.records[0]).origin).toBe("ai");
    expect(current(w.records[0]).actor).toBe("alice");
  });
  it("keeps immutable snapshots after later knowledge changes", () => {
    const w = make(),
      scope = add(w, {
        kind: "scope",
        status: "draft",
        criteria: "A reader can save a note",
      });
    apply(w, "alice", {
      kind: "exportArtifact",
      version: w.project.version,
      scopeId: scope.id,
    });
    const original = JSON.stringify(w.artifacts[0]);
    add(w);
    expect(JSON.stringify(w.artifacts[0])).toBe(original);
    expect(w.artifacts[0].knowledgeVersion).not.toBe(
      w.project.knowledgeVersion,
    );
  });
  it("will not reactivate historical decisions", () => {
    const w = make(),
      r = add(w, { kind: "decision", status: "withdrawn" });
    expect(() =>
      apply(w, "alice", {
        kind: "reviseRecord",
        version: 1,
        id: r.id,
        expectedRevision: current(r).id,
        record: input({ kind: "decision", status: "draft" }),
        reason: "Changed mind",
      }),
    ).toThrow("Historical");
  });
  it("rejects unexpected record fields rather than accepting hidden AI actions", () => {
    expect(() => recordInput.parse({ ...input(), approve: true })).toThrow();
  });
});
