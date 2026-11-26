import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../src/ui/polling.ts", import.meta.url), "utf8");
const compiled = transformSync(source, { loader: "ts", format: "esm", target: "es2022" }).code;
const { snapshotFreshness, startSnapshotPolling } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("freshness distinguishes unknown, stale and active data", () => {
  const now = Date.parse("2026-11-25T12:00:00Z");
  assert.equal(snapshotFreshness(null, null, now), "unknown");
  assert.equal(snapshotFreshness({ generatedAt: "invalid" }, null, now), "stale");
  assert.equal(snapshotFreshness({ generatedAt: new Date(now - 31_000).toISOString() }, null, now), "stale");
  assert.equal(snapshotFreshness({ generatedAt: new Date(now - 1_000).toISOString() }, new Error("offline"), now), "stale");
  assert.equal(snapshotFreshness({ generatedAt: new Date(now - 1_000).toISOString() }, null, now), "active");
});

test("polling refreshes on schedule and cleanup prevents cross-company carryover", async () => {
  const waitFor = async (predicate) => { const deadline=Date.now()+2000; while(!predicate()&&Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,20)); assert.ok(predicate(),"timer fired twice"); };
  let a = 0; let b = 0;
  const stopA = startSnapshotPolling(() => a++, 10);
  await waitFor(() => a >= 2);
  stopA();
  const aAtSwitch = a;
  const stopB = startSnapshotPolling(() => b++, 10);
  await waitFor(() => b >= 2);
  stopB();
  assert.ok(aAtSwitch >= 2);
  assert.equal(a, aAtSwitch);
  assert.ok(b >= 2);
});
