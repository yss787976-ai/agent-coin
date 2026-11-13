// LangChain JS tools for AQB agent payments on Base.
// The agent can discover a peer, check balances, and pay in AQB.
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { parseUnits, formatEther } from "ethers";
import { AqbAgent, discover } from "@aqb-foundation/aqb-agent/client";

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "expected an EVM address");

export function createAqbTools({ privateKey, token, registry, rpc, chain = "base" } = {}) {
  const key = privateKey || process.env.AQB_KEY || process.env.PRIVATE_KEY;
  if (!key) throw new Error("AQB_KEY is required");
  const me = new AqbAgent({ chain, privateKey: key, token, registry, rpc });

  const aqbDiscover = tool(
    async ({ host }) => JSON.stringify(await discover(host)),
    {
      name: "aqb_discover",
      description: "Read an AQB discovery document from /.well-known/agent-coin.json on a host.",
      schema: z.object({ host: z.string().min(1) }),
    }
  );

  const aqbBalance = tool(
    async ({ address: who }) => JSON.stringify({
      address: who.toLowerCase(),
      aqb: formatEther(await me.balance(who)),
      usdc: (await me.usdBalance(who)).toString(),
    }),
    {
      name: "aqb_balance",
      description: "Read AQB and USDC balances for an address on Base.",
      schema: z.object({ address }),
    }
  );

  const aqbIsAgent = tool(
    async ({ address: who }) => JSON.stringify({
      address: who.toLowerCase(),
      isAgent: await me.isAgent(who),
    }),
    {
      name: "aqb_is_agent",
      description: "Check whether an address is a registered AQB agent (only agents can receive AQB).",
      schema: z.object({ address }),
    }
  );

  const aqbPay = tool(
    async ({ to, amount }) => {
      const tx = await me.pay(to, parseUnits(amount, 18));
      return JSON.stringify({ tx, to: to.toLowerCase(), aqb: amount });
    },
    {
      name: "aqb_pay",
      description: "Pay another registered AQB agent on Base. Amount is in AQB, e.g. 0.25.",
      schema: z.object({ to: address, amount: z.string().regex(/^\d+(\.\d+)?$/) }),
    }
  );

  return [aqbDiscover, aqbBalance, aqbIsAgent, aqbPay];
}
