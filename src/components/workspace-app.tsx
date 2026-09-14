"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Layers,
  BookOpen,
  LayoutDashboard,
  PanelLeft,
  Send,
  Check,
  GitBranch,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  current,
  kinds,
  states,
  type Workspace,
  type Project,
  type RecordInput,
  type KnowledgeRecord,
} from "@/domain/model";

const blank: RecordInput = {
  kind: "question",
  title: "",
  body: "",
  status: "open",
  rationale: "",
  evidence: "",
  criteria: "",
  exclusions: "",
  source: "",
};
const snapshotRecord = (record: RecordInput): RecordInput => ({
  kind: record.kind,
  title: record.title,
  body: record.body,
  status: record.status,
  rationale: record.rationale,
  evidence: record.evidence,
  criteria: record.criteria,
  exclusions: record.exclusions,
  source: record.source,
});
async function api(path: string, data?: unknown) {
  const r = await fetch(
    path,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : undefined,
  );
  const v = await r.json();
  if (!r.ok) throw new Error(v.error ?? "Request failed");
  return v;
}
export default function WorkspaceApp({ localDev = false }: { localDev?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]),
    [w, setW] = useState<Workspace | null>(null),
    [page, setPage] = useState("Overview"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [creating, setCreating] = useState(false);
  const [name, setName] = useState(""),
    [description, setDescription] = useState("");
  const [draft, setDraft] = useState<RecordInput>(blank),
    [editing, setEditing] = useState<KnowledgeRecord | null>(null),
    [reason, setReason] = useState(""),
    [showRecord, setShowRecord] = useState(false);
  const [sessionId, setSessionId] = useState<string>(),
    [sessionTitle, setSessionTitle] = useState(""),
    [mode, setMode] = useState("Explore"),
    [notes, setNotes] = useState(""),
    [next, setNext] = useState("");
  const [prompt, setPrompt] = useState(""),
    [context, setContext] = useState<string[]>([]),
    [dep, setDep] = useState(""),
    [up, setUp] = useState(""),
    [linkReason, setLinkReason] = useState(""),
    [retiringLinkId, setRetiringLinkId] = useState(""),
    [retireReason, setRetireReason] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    api("/api/projects")
      .then(setProjects)
      .catch((e) => setError(e.message));
  }, []);
  async function open(id: string) {
    await run(async () => {
      setW(await api("/api/projects/" + id));
      setPage("Overview");
      setSessionId(undefined);
      setNotes("");
      setSessionTitle("");
      setNext("");
      setContext([]);
      setShowRecord(false);
    });
  }
  async function command(data: object) {
    if (!w) return;
    const updated = await api("/api/projects/" + w.project.id, {
      ...data,
      version: w.project.version,
    });
    setW(updated);
    return updated as Workspace;
  }
  const counts = w
    ? {
        questions: w.records.filter(
          (r) => current(r).kind === "question" && current(r).status === "open",
        ).length,
        decisions: w.records.filter(
          (r) =>
            current(r).kind === "decision" && current(r).status === "accepted",
        ).length,
        notices: w.notices.filter((n) => n.status === "open").length,
      }
    : null;
  const recordName = (id: string) => {
    const record = w?.records.find((r) => r.id === id);
    return record ? current(record).title : "Unknown record";
  };
  function download(a: Workspace["artifacts"][number]) {
    const blob = new Blob([a.markdown + `\n<!-- sha256: ${a.digest} -->\n`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `praja-${a.id}.md`;
    el.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-icon">p</span>praja
          <span className="alpha">PREVIEW</span>
        </Link>
        <div className="project-label">YOUR WORKSPACE</div>
        <select
          aria-label="Select project"
          value={w?.project.id ?? ""}
          onChange={(e) => open(e.target.value)}
        >
          <option value="" disabled>
            Select a project
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button className="quiet new-project" onClick={() => setCreating(true)}>
          <Plus size={16} /> New project
        </button>
        <nav>
          {[
            [LayoutDashboard, "Overview"],
            [PanelLeft, "Workspace"],
            [BookOpen, "Knowledge"],
            [GitBranch, "Delivery"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Layers;
            return (
              <button
                key={String(label)}
                className={page === label ? "nav active" : "nav"}
                onClick={() => setPage(String(label))}
              >
                <I size={18} />
                {String(label)}
                {label === "Knowledge" && w && (
                  <small>{w.records.length}</small>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-dot" /> Human-led. AI-supported.
          <p>Your thinking, made durable.</p>
          {localDev ? (
            <p>Local development mode uses the built-in developer identity.</p>
          ) : (
            <a aria-label="Sign in with GitHub" href="/api/auth/signin">
              Sign in with GitHub <ArrowUpRight size={13} />
            </a>
          )}
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Projects <span className="slash">/</span>{" "}
            {w?.project.name ?? "Your next idea"}
          </span>
          <span className="top-status">
            <span className="small-dot" />{" "}
            {busy ? "Saving / working…" : "Your decisions. Your direction."}
          </span>
        </header>
        <div className="content">
          {error && (
            <div role="alert" className="alert">
              {error}{" "}
              <button
                className="quiet"
                onClick={() => (w ? open(w.project.id) : setError(""))}
              >
                Refresh / dismiss
              </button>
            </div>
          )}
          {(creating || !projects.length) && (
            <section className="card create">
              <div className="eyebrow">A PLACE TO BEGIN</div>
              <h2>Create a project</h2>
              <p>Start with what you know. The rest can be questions.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const value = await api("/api/projects", {
                      name,
                      description,
                    });
                    setW(value);
                    setProjects([...projects, value.project]);
                    setCreating(false);
                    setName("");
                    setDescription("");
                  });
                }}
              >
                <label>
                  Project name
                  <input
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="What are you working on?"
                  />
                </label>
                <label>
                  Initial idea
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="An incomplete thought is a good start."
                  />
                </label>
                <button disabled={busy} className="primary">
                  Create project <ArrowRight size={16} />
                </button>
                {projects.length > 0 && (
                  <button
                    type="button"
                    className="quiet"
                    onClick={() => setCreating(false)}
                  >
                    Cancel
                  </button>
                )}
              </form>
            </section>
          )}
          {!w && projects.length > 0 && !creating && (
            <section className="hero">
              <div className="eyebrow">ROOM FOR YOUR NEXT IDEA</div>
              <h1>
                Think it through.
                <br />
                <em>Build it well.</em>
              </h1>
              <p>Select a project to pick up where you left off.</p>
              {projects.map((p) => (
                <button
                  className="card project-card"
                  key={p.id}
                  onClick={() => open(p.id)}
                >
                  {p.name}
                  <ArrowRight size={18} />
                </button>
              ))}
            </section>
          )}
          {w && page === "Overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">PROJECT OVERVIEW</div>
                  <h1>{w.project.name}</h1>
                  <p>{w.project.description || "Your project starts here."}</p>
                </div>
                <button
                  className="primary"
                  onClick={() => setPage("Workspace")}
                >
                  Continue thinking <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="metrics">
                {[
                  [
                    counts!.questions,
                    "Open questions",
                    "Space for what you don’t know",
                  ],
                  [
                    counts!.decisions,
                    "Accepted decisions",
                    "Direction you have chosen",
                  ],
                  [
                    counts!.notices,
                    "Needs a fresh look",
                    "Changes with downstream impact",
                  ],
                ].map(([n, title, sub]) => (
                  <div className="card metric" key={title}>
                    <div className="eyebrow">{title}</div>
                    <strong>{n}</strong>
                    <p>{sub}</p>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="card">
                  <div className="section-title">
                    <h2>A clear next step</h2>
                    <span className="tag">YOUR WORK</span>
                  </div>
                  <p>
                    Explore a question, compare options, or turn a decision into
                    a small, testable scope. There is no mandatory sequence.
                  </p>
                  <button
                    className="action-row"
                    onClick={() => setPage("Workspace")}
                  >
                    <PanelLeft />
                    <span>
                      <b>Open your working session</b>
                      <small>
                        Capture the thought before you structure it.
                      </small>
                    </span>
                    <ArrowRight />
                  </button>
                  <button
                    className="action-row"
                    onClick={() => {
                      setPage("Knowledge");
                      setDraft(blank);
                      setEditing(null);
                      setShowRecord(true);
                    }}
                  >
                    <Plus />
                    <span>
                      <b>Record something that matters</b>
                      <small>
                        A question, assumption, constraint, decision or scope.
                      </small>
                    </span>
                    <ArrowRight />
                  </button>
                </section>
                <section className="card tinted">
                  <div className="eyebrow">HOW PRAJA WORKS</div>
                  <h2>
                    Keep the reasoning
                    <br />
                    connected to the work.
                  </h2>
                  <p>
                    Original notes stay intact. Knowledge has a history. AI
                    proposes; you decide.
                  </p>
                  <div className="mini-step">
                    01 <span>Explore without a rigid process</span>
                  </div>
                  <div className="mini-step">
                    02 <span>Make important outcomes explicit</span>
                  </div>
                  <div className="mini-step">
                    03 <span>Prepare a bounded handoff</span>
                  </div>
                </section>
              </div>
              <section className="card">
                <h2>Recent work</h2>
                {w.records
                  .slice(-4)
                  .reverse()
                  .map((r) => (
                    <button
                      className="record-row"
                      key={r.id}
                      onClick={() => {
                        setPage("Knowledge");
                        setEditing(r);
                        setDraft(current(r));
                        setShowRecord(true);
                      }}
                    >
                      <span className="tag">{current(r).kind}</span>
                      <b>{current(r).title}</b>
                      <small>{current(r).status}</small>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                {!w.records.length && (
                  <p>
                    No durable records yet. You don’t need to fill a template to
                    begin.
                  </p>
                )}
              </section>
            </>
          )}
          {w && page === "Workspace" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">FOCUSED WORK</div>
                  <h1>Room to think.</h1>
                  <p>Work freely. Make structure when it becomes useful.</p>
                </div>
                <button
                  className="quiet"
                  onClick={() => {
                    setSessionId(undefined);
                    setSessionTitle("");
                    setNotes("");
                    setNext("");
                  }}
                >
                  New session <Plus size={16} />
                </button>
              </div>
              <div className="work-grid">
                <section className="card">
                  <label>
                    Resume a session
                    <select
                      value={sessionId ?? ""}
                      onChange={(e) => {
                        const s = w.sessions.find(
                          (s) => s.id === e.target.value,
                        );
                        if (s) {
                          setSessionId(s.id);
                          setSessionTitle(s.title);
                          setMode(s.mode);
                          setNotes(s.body);
                          setNext(s.next);
                        }
                      }}
                    >
                      <option value="">New session</option>
                      {w.sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} · {s.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="inline">
                    <label className="grow">
                      Session title
                      <input
                        value={sessionTitle}
                        onChange={(e) => setSessionTitle(e.target.value)}
                        placeholder="What would you like to work through?"
                      />
                    </label>
                    <label>
                      Work mode
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                      >
                        {[
                          "Capture",
                          "Explore",
                          "Compare",
                          "Decide",
                          "Specify",
                          "Validate",
                        ].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Your working notes
                    <textarea
                      className="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="An observation. A rough idea. A difficult trade-off. Start here."
                    />
                  </label>
                  <label>
                    Where to pick up next
                    <input
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                    />
                  </label>
                  <div className="inline">
                    <button
                      disabled={busy || !sessionTitle.trim()}
                      className="primary"
                      onClick={() =>
                        run(async () => {
                          const value = await command({
                            kind: "saveSession",
                            id: sessionId,
                            title: sessionTitle,
                            mode,
                            body: notes,
                            next,
                            status: "paused",
                          });
                          if (value && !sessionId)
                            setSessionId(value.sessions.at(-1)?.id);
                        })
                      }
                    >
                      Save & pause <Check size={16} />
                    </button>
                    <button
                      className="quiet"
                      onClick={() => {
                        setDraft({ ...blank, body: notes, source: notes });
                        setEditing(null);
                        setShowRecord(true);
                        setPage("Knowledge");
                      }}
                    >
                      Make a record <ArrowRight size={16} />
                    </button>
                  </div>
                  <p className="hint">
                    Notes are saved when you choose Save & pause. Unsaved edits
                    are not project knowledge.
                  </p>
                </section>
                <section className="card ai-panel">
                  <Sparkles size={22} />
                  <h2>
                    A thinking partner,
                    <br />
                    not a decision-maker.
                  </h2>
                  <p>
                    Select the knowledge AI may use. It will propose draft
                    records for your review.
                  </p>
                  <div className="context-list">
                    {w.records.map((r) => (
                      <label className="check" key={r.id}>
                        <input
                          type="checkbox"
                          checked={context.includes(r.id)}
                          onChange={(e) =>
                            setContext(
                              e.target.checked
                                ? [...context, r.id]
                                : context.filter((id) => id !== r.id),
                            )
                          }
                        />
                        {current(r).title}
                      </label>
                    ))}
                    {!w.records.length && (
                      <p className="hint">
                        No records selected. Project name, initial idea and your
                        request will be sent.
                      </p>
                    )}
                  </div>
                  <label>
                    What should we explore?
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Challenge this assumption. What evidence would change our mind?"
                    />
                  </label>
                  <button
                    disabled={busy || !prompt.trim()}
                    className="primary"
                    onClick={() =>
                      run(async () => {
                        setW(
                          await api(`/api/projects/${w.project.id}/propose`, {
                            prompt,
                            recordIds: context,
                          }),
                        );
                      })
                    }
                  >
                    Prepare proposal <Sparkles size={15} />
                  </button>
                  <p className="hint">
                    Your selected data goes to the configured AI provider.
                    Nothing is accepted automatically.
                  </p>
                  {w.proposals
                    .slice()
                    .reverse()
                    .map((p) => (
                      <div className="proposal" key={p.id}>
                        <span className="tag">
                          {p.status} · {p.model}
                        </span>
                        <h3>{p.title}</h3>
                        {p.records.map((r, i) => (
                          <details key={i}>
                            <summary>
                              {r.kind}: {r.title}
                            </summary>
                            <p>{r.body}</p>
                            <p>{r.rationale}</p>
                          </details>
                        ))}
                        <small>
                          {p.context.length} source revisions · knowledge
                          version {p.baseKnowledgeVersion}
                        </small>
                        {p.status === "pending" && (
                          <div className="inline">
                            <button
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  await command({
                                    kind: "reviewProposal",
                                    id: p.id,
                                    accept: true,
                                  });
                                })
                              }
                            >
                              Accept these drafts
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  await command({
                                    kind: "reviewProposal",
                                    id: p.id,
                                    accept: false,
                                  });
                                })
                              }
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </section>
              </div>
            </>
          )}
          {w && page === "Knowledge" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">DURABLE PROJECT CONTEXT</div>
                  <h1>
                    What you know.
                    <br />
                    <em>And what you don’t.</em>
                  </h1>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setEditing(null);
                    setDraft(blank);
                    setReason("");
                    setShowRecord(true);
                  }}
                >
                  <Plus size={16} /> New record
                </button>
              </div>
              {counts!.notices > 0 && (
                <section className="card attention">
                  <h2>Revisit after a change</h2>
                  {w.notices
                    .filter((n) => n.status === "open")
                    .map((n) => (
                      <div className="notice" key={n.id}>
                        <b>{recordName(n.recordId)}</b>
                        <p>
                          Linked knowledge changed: {recordName(n.upstreamId)}
                        </p>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const value = new FormData(e.currentTarget).get(
                              "resolution",
                            );
                            run(async () => {
                              await command({
                                kind: "resolveNotice",
                                id: n.id,
                                resolution: value,
                              });
                            });
                          }}
                        >
                          <input
                            required
                            name="resolution"
                            aria-label="Review resolution"
                            placeholder="What did you check or change?"
                          />
                          <button disabled={busy}>Resolve with reason</button>
                        </form>
                      </div>
                    ))}
                </section>
              )}
              {showRecord && (
                <section className="card">
                  <h2>
                    {editing ? "Revise record" : "Make an outcome durable"}
                  </h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        const record = snapshotRecord(draft);
                        await command(
                          editing
                            ? {
                                kind: "reviseRecord",
                                id: editing.id,
                                expectedRevision: current(editing).id,
                                record,
                                reason,
                              }
                            : {
                                kind: "createRecord",
                                record,
                              },
                        );
                        setShowRecord(false);
                      });
                    }}
                  >
                    <div className="inline">
                      <label>
                        Kind
                        <select
                          disabled={!!editing}
                          value={draft.kind}
                          onChange={(e) => {
                            const kind = e.target.value as RecordInput["kind"];
                            setDraft({
                              ...draft,
                              kind,
                              status: states[kind][0],
                            });
                          }}
                        >
                          {kinds.map((k) => (
                            <option key={k}>{k}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          value={draft.status}
                          onChange={(e) =>
                            setDraft({ ...draft, status: e.target.value })
                          }
                        >
                          {states[draft.kind].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {(
                      [
                        "title",
                        "body",
                        "rationale",
                        "evidence",
                        "criteria",
                        "exclusions",
                        "source",
                      ] as const
                    ).map((field) => (
                      <label key={field}>
                        {
                          {
                            title: "Title",
                            body: "Statement / description",
                            rationale: "Reasoning and trade-offs",
                            evidence: "Evidence / resolution",
                            criteria: "Observable acceptance criteria",
                            exclusions: "Explicit exclusions",
                            source: "Original source / input",
                          }[field]
                        }
                        {field === "title" ? (
                          <input
                            required
                            value={draft[field]}
                            onChange={(e) =>
                              setDraft({ ...draft, [field]: e.target.value })
                            }
                          />
                        ) : (
                          <textarea
                            required={field === "body"}
                            value={draft[field]}
                            onChange={(e) =>
                              setDraft({ ...draft, [field]: e.target.value })
                            }
                          />
                        )}
                      </label>
                    ))}
                    {editing && (
                      <label>
                        Why is this changing?
                        <input
                          required
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </label>
                    )}
                    <div className="inline">
                      <button className="primary" disabled={busy}>
                        Save record <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRecord(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                  {editing && (
                    <details>
                      <summary>
                        Revision history ({editing.revisions.length})
                      </summary>
                      {editing.revisions
                        .slice()
                        .reverse()
                        .map((v) => (
                          <article key={v.id}>
                            <h4>
                              {v.title} · {v.status}
                            </h4>
                            <p>{v.body}</p>
                            <small>
                              {v.at} · {v.actor} · {v.origin}
                              <br />
                              {v.changeReason}
                            </small>
                          </article>
                        ))}
                    </details>
                  )}
                </section>
              )}
              <section className="card">
                {w.records.map((r) => (
                  <button
                    key={r.id}
                    className="record-row"
                    onClick={() => {
                      setEditing(r);
                      setDraft(current(r));
                      setReason("");
                      setShowRecord(true);
                    }}
                  >
                    <span className="tag">{current(r).kind}</span>
                    <b>{current(r).title}</b>
                    <small>
                      {current(r).status} · r{r.revisions.length}
                    </small>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
                {!w.records.length && (
                  <p>
                    Keep free thinking in Workspace. Record a statement when you
                    need to question, reference, decide or implement it.
                  </p>
                )}
              </section>
              {w.records.length > 1 && (
                <section className="card">
                  <h2>Connect the reasoning</h2>
                  <p>
                    A change to the upstream record raises one direct review
                    notice. It does not automatically invalidate your decision.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        await command({
                          kind: "link",
                          dependent: dep,
                          upstream: up,
                          type: "depends_on",
                          rationale: linkReason,
                        });
                        setLinkReason("");
                      });
                    }}
                  >
                    <div className="inline">
                      {[
                        ["Dependent record", dep, setDep],
                        ["Depends on", up, setUp],
                      ].map(([label, value, set]) => (
                        <label className="grow" key={String(label)}>
                          {String(label)}
                          <select
                            required
                            value={String(value)}
                            onChange={(e) =>
                              (set as (s: string) => void)(e.target.value)
                            }
                          >
                            <option value="">Select a record</option>
                            {w.records.map((r) => (
                              <option key={r.id} value={r.id}>
                                {current(r).title}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <label>
                      Why does this relationship matter?
                      <input
                        required
                        value={linkReason}
                        onChange={(e) => setLinkReason(e.target.value)}
                      />
                    </label>
                    <button disabled={busy}>Confirm relationship</button>
                  </form>
                  {w.links.map((l) => (
                    <div className="relationship" key={l.id}>
                      {recordName(l.dependent)} → {recordName(l.upstream)}
                      <small>
                        {l.rationale}
                        {l.retiredAt ? (
                          ` · Retired: ${l.retiredReason}`
                        ) : (
                          <>
                            <button
                              className="quiet"
                              onClick={() => {
                                setRetiringLinkId(l.id);
                                setRetireReason("");
                              }}
                            >
                              Retire relationship
                            </button>
                            {retiringLinkId === l.id && (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  run(async () => {
                                    await command({
                                      kind: "retireLink",
                                      id: l.id,
                                      reason: retireReason,
                                    });
                                    setRetiringLinkId("");
                                    setRetireReason("");
                                  });
                                }}
                              >
                                <label>
                                  Why is this relationship no longer applicable?
                                  <input
                                    required
                                    value={retireReason}
                                    onChange={(e) =>
                                      setRetireReason(e.target.value)
                                    }
                                  />
                                </label>
                                <div>
                                  <button disabled={busy}>Confirm retire</button>
                                  <button
                                    className="quiet"
                                    type="button"
                                    onClick={() => {
                                      setRetiringLinkId("");
                                      setRetireReason("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </>
                        )}
                      </small>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {w && page === "Delivery" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    FROM REASONING TO IMPLEMENTATION
                  </div>
                  <h1>A bounded handoff.</h1>
                  <p>
                    Approve a scope, preserve its context, and bring the result
                    back for review.
                  </p>
                </div>
              </div>
              <section className="card">
                <h2>Implementation scopes</h2>
                <p>
                  Each handoff includes acceptance criteria, exclusions, linked
                  knowledge and open questions. Relevant unresolved impact
                  notices block publication.
                </p>
                {w.records
                  .filter((r) => current(r).kind === "scope")
                  .map((r) => (
                    <div className="record-row" key={r.id}>
                      <b>{current(r).title}</b>
                      <span className="tag">{current(r).status}</span>
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await command({
                              kind: "exportArtifact",
                              scopeId: r.id,
                            });
                          })
                        }
                      >
                        Approve handoff <ArrowUpRight size={15} />
                      </button>
                    </div>
                  ))}
                {!w.records.some((r) => current(r).kind === "scope") && (
                  <button
                    onClick={() => {
                      setDraft({ ...blank, kind: "scope", status: "draft" });
                      setEditing(null);
                      setShowRecord(true);
                      setPage("Knowledge");
                    }}
                  >
                    Define a work scope <Plus size={16} />
                  </button>
                )}
              </section>
              {w.artifacts
                .slice()
                .reverse()
                .map((a) => (
                  <section className="card" key={a.id}>
                    <div className="section-title">
                      <h2>{a.title}</h2>
                      <span
                        className={
                          "tag " +
                          (a.knowledgeVersion !== w.project.knowledgeVersion
                            ? "warning"
                            : "")
                        }
                      >
                        {a.knowledgeVersion !== w.project.knowledgeVersion
                          ? "Knowledge changed — historical"
                          : "Current snapshot"}
                      </span>
                    </div>
                    <p>
                      Approved {new Date(a.at).toLocaleString()} ·{" "}
                      {a.sources.length} pinned revisions
                    </p>
                    <details>
                      <summary>Read the implementation contract</summary>
                      <pre>{a.markdown}</pre>
                    </details>
                    <p className="hint">SHA-256: {a.digest}</p>
                    <button onClick={() => download(a)}>
                      Download Markdown <ArrowUpRight size={16} />
                    </button>
                    <p className="hint">
                      Commit this snapshot through your normal Git workflow.
                      Praja does not overwrite repository files or infer that
                      implementation is complete.
                    </p>
                  </section>
                ))}
              <section className="card tinted">
                <h2>The implementation boundary</h2>
                <p>
                  Run coding tools in your development environment. Review the
                  diff, test the acceptance criteria and record findings back in
                  Knowledge. Automated GitHub pull-request inspection is not
                  enabled in this preview. Scope acceptance remains blocked
                  until a revision-bound delivery review is supported.
                </p>
                <a
                  href="https://github.com/DrPreecy/praja"
                  target="_blank"
                  rel="noreferrer"
                >
                  Praja repository <ArrowUpRight size={15} />
                </a>
              </section>
            </>
          )}
        </div>
        <footer>
          Praja <span>Make the thinking part of the work.</span>
          <small>Early working preview</small>
        </footer>
      </main>
    </div>
  );
}
