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
});
