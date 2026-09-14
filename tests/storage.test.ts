import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { afterEach, expect, it, vi } from "vitest";
import { createProject, readProject, transaction } from "../src/server/store";

async function resetLocalStore() {
  const state = globalThis as {
    prajaLocal?: Promise<{ close?: () => Promise<void> }>;
    prajaQueue?: Promise<unknown>;
    prajaLocalLock?: Promise<{ close?: () => Promise<void> }>;
    prajaLocalLockRegistered?: boolean;
  };
  const db = await state.prajaLocal?.catch(() => undefined);
  await db?.close?.().catch(() => {});
  const lock = await state.prajaLocalLock?.catch(() => undefined);
  await lock?.close?.().catch(() => {});
  state.prajaLocal = undefined;
  state.prajaQueue = undefined;
  state.prajaLocalLock = undefined;
  state.prajaLocalLockRegistered = undefined;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await resetLocalStore();
});

it("repository transactions preserve prior project state on failed changes", async () => {
  const cwd = process.cwd();
  const dir = await mkdtemp(path.join(tmpdir(), "praja-storage-"));
  try {
    vi.stubEnv("PRAJA_LOCAL_DEV", "1");
    vi.stubEnv("NODE_ENV", "test");
    process.chdir(dir);
    const project = await createProject(
      "alice",
      "Field notes",
      "Explore field research",
    );
    const changed = {
      ...project,
      project: {
        ...project.project,
        name: "Changed in transaction",
      },
    };
    await expect(
      transaction(async (db) => {
        await db.query("UPDATE projects SET state=$1 WHERE id=$2", [
          JSON.stringify(changed),
          project.project.id,
        ]);
        throw new Error("conflict");
      }),
    ).rejects.toThrow("conflict");
    const restored = await readProject("alice", project.project.id);
    expect(restored.project.name).toBe(project.project.name);
    expect(restored.project.version).toBe(project.project.version);
  } finally {
    await resetLocalStore();
    process.chdir(cwd);
    await rm(dir, { recursive: true, force: true });
  }
});
