"use strict";

const { NodeOperationError } = require("n8n-workflow");
const { parseUnits } = require("ethers");

const AQB_TOKEN = "0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1";
const AQB_REGISTRY = "0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB";
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const PRIVATE_KEY_RE = /^0x[0-9a-fA-F]{64}$/;
const AMOUNT_RE = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;

function requireAddress(node, value, field, itemIndex) {
  if (!ADDRESS_RE.test(value)) {
    throw new NodeOperationError(
      node,
      `${field} must be a 0x-prefixed 20-byte EVM address`,
      { itemIndex },
    );
  }
  return value;
}

class AqbPay {
  constructor() {
    this.description = {
      displayName: "AQB Pay",
      name: "aqbPay",
      icon: "file:aqb.svg",
      group: ["output"],
      version: [1],
      subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
      description: "Pay AQB, an agent-only USD-pegged credit token on Base",
      defaults: {
        name: "AQB Pay",
      },
      inputs: ["main"],
      outputs: ["main"],
      credentials: [
        {
          name: "aqbApi",
          required: true,
        },
      ],
      properties: [
        {
          displayName: "Resource",
          name: "resource",
          type: "options",
          noDataExpression: true,
          options: [
            {
              name: "Payment",
              value: "payment",
            },
          ],
          default: "payment",
        },
        {
          displayName: "Operation",
          name: "operation",
          type: "options",
          noDataExpression: true,
          displayOptions: {
            show: {
              resource: ["payment"],
            },
          },
          options: [
            {
              name: "Pay Agent",
              value: "pay",
              action: "Pay an AQB agent",
              description: "Send AQB to a registered agent on Base",
            },
          ],
          default: "pay",
        },
        {
          displayName: "Recipient",
          name: "to",
          type: "string",
          required: true,
          default: "",
          placeholder: "0x0000000000000000000000000000000000000000",
          description: "Registered AQB agent address on Base",
          displayOptions: {
            show: {
              resource: ["payment"],
              operation: ["pay"],
            },
          },
        },
        {
          displayName: "Amount",
          name: "amount",
          type: "string",
          required: true,
          default: "",
          placeholder: "0.25",
          description: "Amount of AQB to send, with up to 18 decimals",
          displayOptions: {
            show: {
              resource: ["payment"],
              operation: ["pay"],
            },
          },
        },
        {
          displayName: "Account",
          name: "account",
          type: "string",
          default: "",
          placeholder: "0x0000000000000000000000000000000000000000",
          description:
            "Optional PQ smart-account address. Leave empty to pay from the credential EOA.",
          displayOptions: {
            show: {
              resource: ["payment"],
              operation: ["pay"],
            },
          },
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const credentials = await this.getCredentials("aqbApi");
    const resource = this.getNodeParameter("resource", 0);
    const operation = this.getNodeParameter("operation", 0);

    if (resource !== "payment" || operation !== "pay") {
      throw new NodeOperationError(
        this.getNode(),
        `Unsupported AQB operation: ${resource}/${operation}`,
      );
    }

    const privateKey = String(credentials.privateKey || "");
    if (!PRIVATE_KEY_RE.test(privateKey)) {
      throw new NodeOperationError(
        this.getNode(),
        "AQB API private key must be a 0x-prefixed 32-byte hex string",
      );
    }

    const rpc = String(credentials.rpcUrl || "https://mainnet.base.org").trim();
    const { AqbAgent } = await import("@aqb-foundation/aqb-agent/client");
    const agent = new AqbAgent({
      chain: "base",
      privateKey,
      token: AQB_TOKEN,
      registry: AQB_REGISTRY,
      rpc,
    });

    const output = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const to = requireAddress(
          this.getNode(),
          String(this.getNodeParameter("to", i)).trim(),
          "Recipient",
          i,
        );
        const amount = String(this.getNodeParameter("amount", i)).trim();
        const account = String(this.getNodeParameter("account", i, "") || "").trim();

        if (!AMOUNT_RE.test(amount)) {
          throw new NodeOperationError(
            this.getNode(),
            "Amount must be a decimal AQB value with up to 18 decimals",
            { itemIndex: i },
          );
        }

        const value = parseUnits(amount, 18);
        if (value <= 0n) {
          throw new NodeOperationError(this.getNode(), "Amount must be greater than zero", {
            itemIndex: i,
          });
        }

        if (account) {
          requireAddress(this.getNode(), account, "Account", i);
        }

        const txHash = account
          ? await agent.payFromAccount(account, to, value)
          : await agent.pay(to, value);

        output.push({
          json: {
            ...items[i].json,
            success: true,
            chainId: 8453,
            to,
            amount,
            from: account || agent.signer?.address || null,
            txHash,
          },
        });
      } catch (error) {
        if (error instanceof NodeOperationError) {
          throw error;
        }
        throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
      }
    }

    return [output];
  }
}

module.exports = { AqbPay, Aqb: AqbPay };
