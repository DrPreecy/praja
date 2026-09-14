import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { mkdir } from "node:fs/promises";
import { authorize, emptyWorkspace } from "../domain/workspace";
import { DomainError, type Workspace } from "../domain/model";

type Client = {
  query: (sql: string, args?: unknown[]) => Promise<{ rows: any[] }>;
};
const globalDb = globalThis as unknown as {
  prajaPool?: Pool;
  prajaLocal?: Promise<PGlite>;
  prajaQueue?: Promise<unknown>;
};
export const localMode = () =>
  process.env.PRAJA_LOCAL_DEV === "1" && process.env.NODE_ENV !== "production";
const schema = `CREATE TABLE IF NOT EXISTS projects (id uuid PRIMARY KEY, owner text NOT NULL, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()); CREATE INDEX IF NOT EXISTS projects_owner ON projects(owner);`;
async function local() {
  if (!globalDb.prajaLocal)
    globalDb.prajaLocal = (async () => {
      await mkdir(".local-data", { recursive: true });
      const db = new PGlite(".local-data/db");
      await db.exec(schema);
      return db;
    })();
  return globalDb.prajaLocal;
}
export async function transaction<T>(
  fn: (db: Client) => Promise<T>,
): Promise<T> {
  if (localMode()) {
    const run = (globalDb.prajaQueue ?? Promise.resolve())
      .catch(() => {})
      .then(async () => {
        const db = await local();
        return db.transaction((tx) => fn(tx as unknown as Client));
      });
    globalDb.prajaQueue = run;
    return run;
  }
  if (!process.env.DATABASE_URL)
    throw new DomainError(
      "Configure DATABASE_URL, or use the documented local development mode.",
      503,
    );
  globalDb.prajaPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
  const db = await globalDb.prajaPool.connect();
  try {
    await db.query("BEGIN");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
export async function migrate() {
  await transaction(async (db) => {
    await db.query(schema);
  });
}
export async function listProjects(owner: string) {
  return transaction(async (db) =>
    (
      await db.query(
        "SELECT state FROM projects WHERE owner=$1 ORDER BY updated_at DESC",
        [owner],
      )
    ).rows.map((r) => (r.state as Workspace).project),
  );
}
export async function createProject(
  owner: string,
  name: string,
  description: string,
) {
  const w = emptyWorkspace(owner, name, description);
  await transaction((db) =>
    db.query("INSERT INTO projects(id,owner,state) VALUES($1,$2,$3)", [
      w.project.id,
      owner,
      JSON.stringify(w),
    ]),
  );
  return w;
}
export async function readProject(owner: string, id: string) {
  return transaction(async (db) => {
    const row = (
      await db.query("SELECT state FROM projects WHERE id=$1 AND owner=$2", [
        id,
        owner,
      ])
    ).rows[0];
    if (!row) throw new DomainError("Project not found.", 404);
    return row.state as Workspace;
  });
}
export async function mutateProject(
  owner: string,
  id: string,
  fn: (w: Workspace) => void,
) {
  return transaction(async (db) => {
    const row = (
      await db.query(
        "SELECT state FROM projects WHERE id=$1 AND owner=$2 FOR UPDATE",
        [id, owner],
      )
    ).rows[0];
    if (!row) throw new DomainError("Project not found.", 404);
    const w = row.state as Workspace;
    authorize(w, owner);
    fn(w);
    await db.query(
      "UPDATE projects SET state=$1,updated_at=now() WHERE id=$2 AND owner=$3",
      [JSON.stringify(w), id, owner],
    );
    return w;
  });
}
