"use strict";

class AqbApi {
  constructor() {
    this.name = "aqbApi";
    this.displayName = "AQB API";
    this.documentationUrl = "https://agentqubit.pages.dev";
    this.properties = [
      {
        displayName: "Private Key",
        name: "privateKey",
        type: "string",
        typeOptions: {
          password: true,
        },
        default: "",
        required: true,
        description:
          "0x-prefixed 32-byte private key of the paying EOA or PQ smart-account owner",
      },
      {
        displayName: "RPC URL",
        name: "rpcUrl",
        type: "string",
        default: "https://mainnet.base.org",
        required: true,
        description: "Base mainnet JSON-RPC endpoint",
      },
    ];
  }
}

module.exports = { AqbApi };
