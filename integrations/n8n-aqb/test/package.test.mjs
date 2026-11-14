import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const Module = require("node:module");
const read = (relative) => readFile(path.join(root, relative), "utf8");
const pkg = JSON.parse(await read("package.json"));

test("package manifest is a valid n8n community node", async () => {
  assert.equal(pkg.name, "n8n-nodes-aqb");
  assert.equal(pkg.version, "0.1.0");
  assert.ok(pkg.keywords.includes("n8n-community-node-package"));
  assert.equal(pkg.main, "dist/nodes/Aqb/Aqb.node.js");
  assert.equal(pkg.n8n.n8nNodesApiVersion, 1);
  assert.deepEqual(pkg.n8n.nodes, ["dist/nodes/Aqb/Aqb.node.js"]);
  assert.deepEqual(pkg.n8n.credentials, ["dist/credentials/AqbApi.credentials.js"]);
  assert.ok(pkg.dependencies.ethers);
  assert.ok(pkg.dependencies["@aqb-foundation/aqb-agent"]);
  assert.ok(pkg.peerDependencies["n8n-workflow"]);

  for (const relative of [pkg.main, ...pkg.n8n.credentials, ...pkg.n8n.nodes]) {
    await access(path.join(root, relative));
  }
});

test("node and credential classes load without n8n installed", () => {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "n8n-workflow") {
      return {
        NodeOperationError: class NodeOperationError extends Error {
          constructor(node, message, options = {}) {
            super(String(message?.message ?? message));
            this.name = "NodeOperationError";
            this.node = node;
            this.itemIndex = options.itemIndex;
          }
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const { AqbPay } = require("../dist/nodes/Aqb/Aqb.node.js");
    assert.equal(typeof AqbPay, "function");
    const node = new AqbPay();
    assert.equal(node.description.name, "aqbPay");
    assert.equal(node.description.credentials[0].name, "aqbApi");
    assert.equal(typeof node.execute, "function");

    const properties = Object.fromEntries(
      node.description.properties.map((property) => [property.name, property]),
    );
    assert.ok(properties.resource);
    assert.ok(properties.operation);
    assert.equal(properties.to.required, true);
    assert.equal(properties.amount.required, true);
    assert.ok(properties.account);
    assert.equal(properties.account.type, "string");

    const { AqbApi } = require("../dist/credentials/AqbApi.credentials.js");
    const credential = new AqbApi();
    assert.equal(credential.name, "aqbApi");
    const credentialProperties = Object.fromEntries(
      credential.properties.map((property) => [property.name, property]),
    );
    assert.equal(credentialProperties.privateKey.typeOptions.password, true);
    assert.equal(credentialProperties.privateKey.required, true);
    assert.equal(credentialProperties.rpcUrl.default, "https://mainnet.base.org");
  } finally {
    Module._load = originalLoad;
  }
});

test("execute rejects a malformed payer key before any network call", async () => {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "n8n-workflow") {
      return { NodeOperationError: class NodeOperationError extends Error {} };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const { AqbPay } = require("../dist/nodes/Aqb/Aqb.node.js");
    const node = new AqbPay();
    const context = {
      getInputData: () => [{ json: {} }],
      getCredentials: async () => ({ privateKey: "not-a-key", rpcUrl: "" }),
      getNodeParameter: (name, _index, fallback) => {
        if (name === "resource") return "payment";
        if (name === "operation") return "pay";
        return fallback;
      },
      getNode: () => ({ name: "aqbPay" }),
    };

    await assert.rejects(node.execute.call(context), /private key/i);
  } finally {
    Module._load = originalLoad;
  }
});

test("codex, icon, credential, and sources are present with valid syntax", async () => {
  const codex = JSON.parse(await read("dist/nodes/Aqb/Aqb.node.json"));
  assert.equal(codex.node, "n8n-nodes-aqb.aqbPay");
  await access(path.join(root, "dist/nodes/Aqb/aqb.svg"));

  for (const relative of [
    "nodes/Aqb/AqbPay.node.js",
    "nodes/Aqb/Aqb.node.json",
    "credentials/AqbApi.credentials.js",
    "build.mjs",
    "dist/nodes/Aqb/Aqb.node.js",
    "dist/credentials/AqbApi.credentials.js",
  ]) {
    await access(path.join(root, relative));
  }

  for (const relative of [
    "nodes/Aqb/AqbPay.node.js",
    "credentials/AqbApi.credentials.js",
    "dist/nodes/Aqb/Aqb.node.js",
    "dist/credentials/AqbApi.credentials.js",
    "build.mjs",
    "test/package.test.mjs",
  ]) {
    const result = spawnSync(process.execPath, ["--check", path.join(root, relative)], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `${relative} failed node --check:\n${result.stderr}`);
  }
});
