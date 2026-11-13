// ElizaOS plugin: pay a registered AQB agent on Base.
// Register the plugin in your character's plugins array and set AQB_KEY.
import { parseUnits } from "ethers";
import { AqbAgent } from "@aqb-foundation/aqb-agent/client";

const PAY_RE = /\bpay\s+(\d+(?:\.\d+)?)\s*AQB\s+to\s+(0x[0-9a-fA-F]{40})\b/i;

function makeAgent(runtime) {
  const key =
    runtime?.getSetting?.("AQB_KEY") ||
    runtime?.character?.settings?.secrets?.AQB_KEY ||
    process.env.AQB_KEY ||
    process.env.PRIVATE_KEY;
  if (!key) throw new Error("AQB_KEY is not configured");
  return new AqbAgent({
    chain: "base",
    privateKey: key,
    token: runtime?.getSetting?.("AQB_TOKEN") || process.env.AQB_TOKEN,
    registry: runtime?.getSetting?.("AQB_REGISTRY") || process.env.AQB_REGISTRY,
    rpc: runtime?.getSetting?.("AQB_RPC") || process.env.AQB_RPC,
  });
}

export const aqbPlugin = {
  name: "aqb",
  description: "AQB: USD-pegged agent credit on Base. Pay a registered agent in AQB.",

  actions: [
    {
      name: "AQB_PAY",
      similes: ["PAY_AGENT_AQB", "SEND_AQB", "AQB_TRANSFER"],
      description: "Pay a registered AQB agent. Example: pay 0.25 AQB to 0xAgentAddress",
      validate: async (_runtime, message) => PAY_RE.test(message?.content?.text || ""),
      handler: async (runtime, message, _state, _options, callback) => {
        const text = message?.content?.text || "";
        const m = text.match(PAY_RE);
        if (!m) {
          await callback?.({ text: "Usage: pay <amount> AQB to <0x address>" });
          return false;
        }
        const [, amount, to] = m;
        try {
          const me = makeAgent(runtime);
          if (!(await me.isAgent(to))) {
            await callback?.({ text: `${to} is not a registered AQB agent.` });
            return false;
          }
          const tx = await me.pay(to, parseUnits(amount, 18));
          await callback?.({ text: `Paid ${amount} AQB to ${to}. Tx: ${tx}` });
          return true;
        } catch (e) {
          await callback?.({ text: `AQB payment failed: ${e.shortMessage || e.message || e}` });
          return false;
        }
      },
      examples: [
        [
          { user: "user", content: { text: "pay 0.25 AQB to 0x9eA52810f31768b1886cba9eAf917F4152f53042" } },
          { user: "agent", content: { text: "Paid 0.25 AQB. Tx: 0x..." } },
        ],
      ],
    },
  ],

  providers: [],
  evaluators: [],
};
