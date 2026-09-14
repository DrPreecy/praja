import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
it("PostgreSQL transactions preserve prior state on failed changes", async () => {
  const db = new PGlite();
  await db.exec(
    "CREATE TABLE project (id text PRIMARY KEY, state jsonb NOT NULL)",
  );
  await db.query("INSERT INTO project VALUES ($1,$2)", [
    "a",
    JSON.stringify({ version: 1 }),
  ]);
  await expect(
    db.transaction(async (tx) => {
      await tx.query("UPDATE project SET state=$1 WHERE id=$2", [
        JSON.stringify({ version: 2 }),
        "a",
      ]);
      throw new Error("conflict");
    }),
  ).rejects.toThrow("conflict");
  const result = await db.query<{ state: { version: number } }>(
    "SELECT state FROM project WHERE id=$1",
    ["a"],
  );
  expect(result.rows[0].state.version).toBe(1);
  await db.close();
});
