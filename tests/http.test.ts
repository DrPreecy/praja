import { describe, expect, it } from "vitest";
import { body } from "../src/server/http";

describe("request body handling", () => {
  it("accepts same-origin browser writes", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: {
        origin: "http://127.0.0.1:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ok: true }),
    });
    await expect(body(request)).resolves.toEqual({ ok: true });
  });

  it("accepts non-browser writes without an origin header", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });
    await expect(body(request)).resolves.toEqual({ ok: true });
  });

  it("rejects cross-origin writes when an origin header is present", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: {
        origin: "https://attacker.invalid",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ok: true }),
    });
    await expect(body(request)).rejects.toThrow("Cross-origin");
  });

  it("rejects oversized requests from content-length before buffering", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "100001",
      },
      body: JSON.stringify({ ok: true }),
    });
    await expect(body(request)).rejects.toThrow("too large");
  });

  it("rejects oversized multibyte payloads after reading", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "😀".repeat(30000) }),
    });
    await expect(body(request)).rejects.toThrow("too large");
  });

  it("rejects an empty request body with a clear error", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "   ",
    });
    await expect(body(request)).rejects.toThrow("body is required");
  });
});
