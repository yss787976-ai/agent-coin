import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.join(root, relative), "utf8");
const pkg = JSON.parse(await read("package.json"));

test("manifest identifies the AgentKit AQB package and exports dist", async () => {
  assert.equal(pkg.name, "@aqb-foundation/agentkit-aqb");
  assert.equal(pkg.version, "0.1.0");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.main, "./dist/index.js");
  assert.equal(pkg.exports["."].import, "./dist/index.js");
  assert.ok(pkg.peerDependencies["@coinbase/agentkit"]);
  assert.ok(pkg.dependencies["@aqb-foundation/aqb-agent"]);
  assert.ok(pkg.dependencies.zod);
  assert.ok(pkg.files.includes("dist"));
  assert.ok(pkg.files.includes("src"));

  for (const relative of [pkg.main, pkg.types, pkg.exports["."].types]) {
    await access(path.join(root, relative));
  }
});

test("source declares the three AgentKit actions with schemas", async () => {
  const source = await read("src/aqbActionProvider.ts");

  assert.match(source, /from "@coinbase\/agentkit"/);
  assert.match(source, /from "@aqb-foundation\/aqb-agent\/client"/);
  assert.match(source, /extends ActionProvider<WalletProvider>/);
  assert.match(source, /@CreateAction\(\{/);
  assert.equal(source.match(/@CreateAction\(\{/g)?.length, 3);
  assert.match(source, /name: "aqb_pay"/);
  assert.match(source, /name: "aqb_balance"/);
  assert.match(source, /name: "aqb_is_agent"/);
  assert.match(source, /Number\(network\.chainId\) === 8453/);
  assert.match(source, /export const aqbActionProvider/);
});

test("compiled output parses and applies the decorators", async () => {
  const dist = await read("dist/aqbActionProvider.js");

  assert.match(dist, /from "@coinbase\/agentkit"/);
  assert.match(dist, /from "@aqb-foundation\/aqb-agent\/client"/);
  assert.equal(dist.match(/CreateAction\(\{/g)?.length, 3);
  assert.equal(dist.match(/__decorate\(/g)?.length, 4);
  assert.match(dist, /export class AqbActionProvider extends ActionProvider/);
  assert.match(dist, /Number\(network\.chainId\) === 8453/);

  for (const relative of ["dist/index.js", "dist/aqbActionProvider.js", "test/package.test.mjs"]) {
    const result = spawnSync(process.execPath, ["--check", path.join(root, relative)], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `${relative} failed node --check:\n${result.stderr}`);
  }
});
