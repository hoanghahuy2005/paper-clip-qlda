import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("built worker imports in plain Node without workspace TypeScript loaders", async () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../dist/worker.js", import.meta.url))], { timeout: 10_000, encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});
