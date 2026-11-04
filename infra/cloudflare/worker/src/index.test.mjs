// node --test infra/cloudflare/worker/src/index.test.mjs
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "./index.js";

const ENV = { ORIGIN_URL: "https://origin.example", ORIGIN_AUTH_TOKEN: "test-origin-secret" };
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

async function forwarded(headers, cf, method = "GET", path = "/demo/status") {
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url: String(url), headers: init.headers }; return new Response("{}"); };
  const request = new Request(`https://api-bosquevivo.progarlabs.com${path}`, { method, headers });
  if (cf !== undefined) Object.defineProperty(request, "cf", { value: cf });
  await worker.fetch(request, ENV);
  return seen;
}

test("the country comes only from request.cf and the IP from Cloudflare", async () => {
  const { headers } = await forwarded(
    { "CF-Connecting-IP": "203.0.113.7", "X-Bosque-Visitor-Country": "CL", "X-Bosque-Visitor-IP": "198.51.100.9" },
    { country: "RU" },
  );
  assert.equal(headers.get("X-Bosque-Visitor-Country"), "RU");
  assert.equal(headers.get("X-Bosque-Visitor-IP"), "203.0.113.7");
  assert.equal(headers.get("X-Bosque-Origin"), "test-origin-secret");
});

test("client values never survive when Cloudflare gives no data", async () => {
  const { headers } = await forwarded(
    { "X-Bosque-Visitor-Country": "CL", "X-Bosque-Visitor-IP": "198.51.100.9", "X-Forwarded-For": "198.51.100.1" },
    {},
  );
  assert.equal(headers.get("X-Bosque-Visitor-Country"), null);
  assert.equal(headers.get("X-Bosque-Visitor-IP"), null);
});

test("a request without request.cf forwards no country", async () => {
  const { headers } = await forwarded({ "X-Bosque-Visitor-Country": "CL" }, undefined);
  assert.equal(headers.get("X-Bosque-Visitor-Country"), null);
});

test("a client cannot replace the origin secret or the upstream host", async () => {
  const { headers, url } = await forwarded({ "X-Bosque-Origin": "forged" }, { country: "CL" }, "GET", "/parks");
  assert.equal(headers.get("X-Bosque-Origin"), "test-origin-secret");
  assert.equal(new URL(url).host, "origin.example");
  globalThis.fetch = async () => { throw new Error("must not be called"); };
  const escape = new Request("https://api-bosquevivo.progarlabs.com//evil.example/x");
  assert.equal((await worker.fetch(escape, ENV)).status, 400);
});

test("other hosts get 404 and never reach the origin", async () => {
  globalThis.fetch = async () => { throw new Error("must not be called"); };
  const response = await worker.fetch(new Request("https://other.example/"), ENV);
  assert.equal(response.status, 404);
});
