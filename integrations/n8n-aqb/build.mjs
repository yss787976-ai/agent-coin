import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const sourceNodeDir = path.join(root, "nodes", "Aqb");
const outNodeDir = path.join(dist, "nodes", "Aqb");
const sourceCredentialDir = path.join(root, "credentials");
const outCredentialDir = path.join(dist, "credentials");

await rm(dist, { recursive: true, force: true });
await mkdir(outNodeDir, { recursive: true });
await mkdir(outCredentialDir, { recursive: true });

await cp(path.join(sourceNodeDir, "AqbPay.node.js"), path.join(outNodeDir, "Aqb.node.js"));
await cp(path.join(sourceNodeDir, "Aqb.node.json"), path.join(outNodeDir, "Aqb.node.json"));
await cp(path.join(sourceNodeDir, "aqb.svg"), path.join(outNodeDir, "aqb.svg"));
await cp(
  path.join(sourceCredentialDir, "AqbApi.credentials.js"),
  path.join(outCredentialDir, "AqbApi.credentials.js"),
);

const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const manifestFiles = [pkg.main, ...pkg.n8n.credentials, ...pkg.n8n.nodes];
for (const relative of manifestFiles) {
  await access(path.join(root, relative));
}

const syntaxFiles = [
  "build.mjs",
  "nodes/Aqb/AqbPay.node.js",
  "credentials/AqbApi.credentials.js",
  "dist/nodes/Aqb/Aqb.node.js",
  "dist/credentials/AqbApi.credentials.js",
  "test/package.test.mjs",
];

for (const relative of syntaxFiles) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, relative)], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(`${relative} failed node --check:\n${result.stderr}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`built ${pkg.name}@${pkg.version}: ${manifestFiles.length} manifest entries, ${syntaxFiles.length} syntax checks`);
