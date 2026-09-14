import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
const origin = "http://127.0.0.1:3107";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3107",
  ],
  {
    env: { ...process.env, PRAJA_LOCAL_DEV: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (v) => (logs += v));
child.stderr.on("data", (v) => (logs += v));
async function request(path: string, data?: unknown, requestOrigin = origin) {
  return new Promise<{ status: number; data: any }>((resolve, reject) => {
    const req = httpRequest(
      origin + path,
      {
        method: data ? "POST" : "GET",
        headers: { "Content-Type": "application/json", Origin: requestOrigin },
        timeout: 15000,
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode ?? 500, data: JSON.parse(text) });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("HTTP test timed out")));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}
try {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      const r = await request("/api/projects");
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert(ready, logs);
  const crossOriginRead = await request("/api/projects", undefined, "https://docs.example");
  assert.equal(crossOriginRead.status, 200);
  const created = await request("/api/projects", {
    name: "HTTP integration " + Date.now(),
    description: "Persistence contract test",
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id = created.data.project.id,
    path = "/api/projects/" + id;
  const record = {
    kind: "scope",
    title: "Save an observation",
    body: "Persist a text note",
    status: "draft",
    rationale: "",
    evidence: "",
    criteria: "Saved text survives reload",
    exclusions: "No attachments",
    source: "Human input",
  };
  const denied = await request(
    path,
    { kind: "createRecord", version: 0, record },
    "https://attacker.invalid",
  );
  assert.equal(denied.status, 403);
  const added = await request(path, {
    kind: "createRecord",
    version: 0,
    record,
  });
  assert.equal(added.status, 200);
  assert.equal(added.data.records.length, 1);
  const stale = await request(path, {
    kind: "createRecord",
    version: 0,
    record,
  });
  assert.equal(stale.status, 409);
  const read = await request(path);
  assert.equal(read.data.records.length, 1);
  assert.equal(read.data.project.version, 1);
  const exported = await request(path, {
    kind: "exportArtifact",
    version: 1,
    scopeId: read.data.records[0].id,
  });
  assert.equal(exported.status, 200);
  assert.match(
    exported.data.artifacts[0].markdown,
    /Saved text survives reload/,
  );
  assert.equal(exported.data.artifacts[0].sources.length, 1);
  const final = await request(path);
  assert.equal(final.data.artifacts.length, 1);
  assert.equal(final.data.records[0].revisions.length, 1);
  console.log(
    "PASS: HTTP owner-scoped persistence, cross-origin rejection, stale-write protection and pinned export.",
  );
} catch (e) {
  console.error(logs);
  throw e;
} finally {
  child.kill("SIGTERM");
}
