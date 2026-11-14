import { ActionProvider, CreateAction, type Network, type WalletProvider } from "@coinbase/agentkit";
import { z } from "zod";
import { AqbAgent } from "@aqb-foundation/aqb-agent/client";

/// AQB is deployed on Base mainnet only; AgentKit selects this provider there.
export const AQB_CHAIN_ID = 8453 as const;
export const AQB_TOKEN_ADDRESS = "0x2C54F202B565086B6d8D2226Edb67AC3E14C39d1";
export const AQB_REGISTRY_ADDRESS = "0xAa964f6ea767f0D709b268abBFdd8B6C2Beef3eB";

const AQB_DECIMALS = 18n;
const USDC_DECIMALS = 6n;

export interface AqbActionProviderConfig {
  /** Payer key for aqb_pay. Falls back to AQB_PRIVATE_KEY. */
  privateKey?: string;
  /** AQB token address override. */
  token?: string;
  /** AgentRegistry address override. */
  registry?: string;
  /** Base JSON-RPC endpoint. Defaults to https://mainnet.base.org. */
  rpc?: string;
}

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Expected a 0x-prefixed 20-byte EVM address");

const amountSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/, "Expected a decimal AQB amount with up to 18 decimals")
  .refine((value) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) > 0n || BigInt(fraction.padEnd(18, "0")) > 0n;
  }, "Amount must be greater than zero");

export const aqbPaySchema = z.object({
  to: addressSchema.describe("Recipient address. The recipient must be a registered AQB agent."),
  amount: amountSchema.describe("Amount of AQB to send, for example 0.25."),
});

export const aqbBalanceSchema = z.object({
  address: addressSchema.describe("Address whose AQB and USDC balances should be read."),
});

export const aqbIsAgentSchema = z.object({
  address: addressSchema.describe("Address to check in the AQB AgentRegistry."),
});

export type AqbPayArgs = z.infer<typeof aqbPaySchema>;
export type AqbBalanceArgs = z.infer<typeof aqbBalanceSchema>;
export type AqbIsAgentArgs = z.infer<typeof aqbIsAgentSchema>;

function parseAqb(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** AQB_DECIMALS + BigInt(fraction.padEnd(Number(AQB_DECIMALS), "0"));
}

function formatUnits(value: bigint, decimals: bigint): string {
  const base = 10n ** decimals;
  const whole = value / base;
  const fraction = (value % base).toString().padStart(Number(decimals), "0").replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction}` : whole.toString();
}

/**
 * AgentKit actions for AQB, an agent-only USD-pegged credit token on Base.
 *
 * aqb_pay transfers AQB to a registered agent, aqb_balance reads AQB and USDC
 * balances, and aqb_is_agent checks AgentRegistry membership.
 */
export class AqbActionProvider extends ActionProvider<WalletProvider> {
  private readonly config: AqbActionProviderConfig;

  constructor(config: AqbActionProviderConfig = {}) {
    super("aqb", ["aqb"]);
    this.config = { ...config };
  }

  @CreateAction({
    name: "aqb_pay",
    description:
      "Send AQB on Base to another registered AQB agent. Use aqb_is_agent first when the recipient is unknown. Returns the transaction hash.",
    schema: aqbPaySchema,
  })
  async aqbPay(_walletProvider: WalletProvider, args: AqbPayArgs): Promise<string> {
    const privateKey = this.config.privateKey || process.env.AQB_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        "aqb_pay requires a payer key: pass { privateKey } to aqbActionProvider() or set AQB_PRIVATE_KEY",
      );
    }

    const agent = this.createAgent(privateKey);
    const txHash = await agent.pay(args.to, parseAqb(args.amount));

    return JSON.stringify({
      action: "aqb_pay",
      chainId: AQB_CHAIN_ID,
      to: args.to,
      amount: args.amount,
      txHash,
    });
  }

  @CreateAction({
    name: "aqb_balance",
    description: "Read the AQB and USDC balances of an address on Base. AQB has 18 decimals, USDC has 6.",
    schema: aqbBalanceSchema,
  })
  async aqbBalance(_walletProvider: WalletProvider, args: AqbBalanceArgs): Promise<string> {
    const agent = this.createAgent();
    const [aqb, usdc] = await Promise.all([
      agent.balance(args.address),
      agent.usdBalance(args.address),
    ]);

    return JSON.stringify({
      action: "aqb_balance",
      chainId: AQB_CHAIN_ID,
      address: args.address,
      aqb: formatUnits(aqb, AQB_DECIMALS),
      aqbWei: aqb.toString(),
      usdc: formatUnits(usdc, USDC_DECIMALS),
      usdcMicros: usdc.toString(),
    });
  }

  @CreateAction({
    name: "aqb_is_agent",
    description:
      "Check whether an address is registered in the AQB AgentRegistry on Base. Only registered agents can receive AQB.",
    schema: aqbIsAgentSchema,
  })
  async aqbIsAgent(_walletProvider: WalletProvider, args: AqbIsAgentArgs): Promise<string> {
    const agent = this.createAgent();
    const isAgent = await agent.isAgent(args.address);

    return JSON.stringify({
      action: "aqb_is_agent",
      chainId: AQB_CHAIN_ID,
      address: args.address,
      isAgent,
    });
  }

  supportsNetwork(network: Network): boolean {
    return Number(network.chainId) === 8453;
  }

  private createAgent(privateKey?: string): AqbAgent {
    return new AqbAgent({
      chain: "base",
      privateKey,
      token: this.config.token || AQB_TOKEN_ADDRESS,
      registry: this.config.registry || AQB_REGISTRY_ADDRESS,
      rpc: this.config.rpc,
    });
  }
}

export const aqbActionProvider = (config: AqbActionProviderConfig = {}): AqbActionProvider =>
  new AqbActionProvider(config);
