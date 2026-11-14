// The AQB SDK ships JavaScript without declaration files. This ambient module
// gives TypeScript the subset used by the AgentKit action provider.
declare module "@aqb-foundation/aqb-agent/client" {
  export interface AqbAgentOptions {
    rpc?: string;
    chain?: "base" | "base-sepolia" | number;
    privateKey?: string;
    token?: string;
    registry?: string;
  }

  export class AqbAgent {
    constructor(options: AqbAgentOptions);
    readonly chainId: number;
    readonly signer: { address: string } | null;
    balance(address?: string): Promise<bigint>;
    usdBalance(address?: string): Promise<bigint>;
    isAgent(address?: string): Promise<boolean>;
    pay(to: string, amount: bigint): Promise<string>;
    payFromAccount(account: string, to: string, amount: bigint, scheme?: "ecdsa" | "pq"): Promise<string>;
  }

  export function discover(host: string): Promise<unknown>;
  export const CHAINS: Record<string, number>;
  export const USDC: Record<number, string>;
}
