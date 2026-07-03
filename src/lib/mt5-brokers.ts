// ─── MT5 brokers & prop firms directory ──────────────────────────
//
// Used by the "Connect MT5 Account" form to populate the broker
// dropdown and to suggest MetaTrader 5 server names for the selected
// firm. Server names are the common/known ones — they are *suggestions*
// only. The authoritative server name is always the one shown in the
// user's terminal at MT5 → File → Login to Trade Account, so the server
// field stays free-text and users can type anything.
//
// Only MT5-compatible firms are listed. Futures-only prop firms that run
// on Rithmic/Tradovate/NinjaTrader (Apex, Topstep, Tradeify, …) are
// intentionally excluded because they have no MetaTrader server.

export interface BrokerInfo {
  name: string;
  servers: string[];
}

export interface BrokerGroup {
  label: string;
  brokers: BrokerInfo[];
}

export const BROKER_GROUPS: BrokerGroup[] = [
  {
    label: "Retail Brokers",
    brokers: [
      {
        name: "Exness",
        servers: [
          "Exness-MT5Real",
          "Exness-MT5Real2",
          "Exness-MT5Real3",
          "Exness-MT5Real4",
          "Exness-MT5Real5",
          "Exness-MT5Real6",
          "Exness-MT5Real7",
          "Exness-MT5Real8",
          "Exness-MT5Trial",
        ],
      },
      {
        name: "IC Markets",
        servers: [
          "ICMarketsSC-MT5",
          "ICMarketsSC-MT5-2",
          "ICMarketsEU-MT5",
          "ICMarketsSC-Demo",
        ],
      },
      {
        name: "Pepperstone",
        servers: [
          "Pepperstone-MT5-Live01",
          "Pepperstone-MT5-Live02",
          "Pepperstone-MT5-Live03",
          "Pepperstone-MT5-Live04",
          "Pepperstone-MT5-Live05",
          "Pepperstone-MT5-Demo",
        ],
      },
      {
        name: "XM",
        servers: [
          "XMGlobal-MT5",
          "XMGlobal-MT5 2",
          "XMGlobal-MT5 3",
          "XMGlobal-MT5 4",
          "XMGlobal-MT5 5",
          "XMGlobal-MT5 6",
          "XMGlobal-MT5 7",
          "XMTrading-MT5",
        ],
      },
      {
        name: "FXTM",
        servers: ["ForexTime-MT5", "ForexTime-MT5-2", "FXTM-MT5"],
      },
      {
        name: "FBS",
        servers: ["FBS-Real", "FBS-Real-2", "FBS-Real-3", "FBS-Demo"],
      },
      {
        name: "OctaFX",
        servers: ["OctaFX-Real", "Octa-Real", "Octa-Real2", "OctaFX-Demo"],
      },
      {
        name: "RoboForex",
        servers: [
          "RoboForex-Pro",
          "RoboForex-ECN",
          "RoboForex-Prime",
          "RoboForex-Demo",
        ],
      },
      {
        name: "Tickmill",
        servers: [
          "Tickmill-Live",
          "Tickmill-Live02",
          "TickmillEU-Live",
          "TickmillUK-Live",
          "Tickmill-Demo",
        ],
      },
      {
        name: "Vantage",
        servers: [
          "VantageInternational-Live",
          "VantageInternational-Live 2",
          "VantageInternational-Live 4",
          "VantageInternational-Live 5",
          "VantageInternational-Live 6",
          "VantageInternational-Demo",
        ],
      },
      {
        name: "FP Markets",
        servers: ["FPMarkets-Live", "FPMarketsLLC-Live", "FPMarkets-Demo"],
      },
      {
        name: "OANDA",
        servers: ["OANDA-v20 Live-1", "OANDA-v20 Practice-1"],
      },
      {
        name: "FOREX.com",
        servers: ["FOREX.com-Live 534", "FOREX.com-Live", "GAINCapital-Live"],
      },
      {
        name: "HFM (HotForex)",
        servers: [
          "HFMarketsGlobal-Live",
          "HFMarketsGlobal-Live2",
          "HFMarketsSV-Live",
          "HFMarketsGlobal-Demo",
        ],
      },
      {
        name: "AvaTrade",
        servers: ["Ava-Real", "Ava-Real 2", "AvaTradeMT5", "Ava-Demo"],
      },
      {
        name: "Admirals (Admiral Markets)",
        servers: [
          "AdmiralsGroup-Live",
          "AdmiralMarkets-Live",
          "Admirals-Live",
          "AdmiralMarkets-Demo",
        ],
      },
      {
        name: "ThinkMarkets",
        servers: ["ThinkMarkets-Live", "ThinkMarkets-Live02", "ThinkMarkets-Demo"],
      },
      {
        name: "Axi",
        servers: ["AxiCorp-Live 1", "AxiCorp-US02-Live", "AxiCorp-Demo"],
      },
      {
        name: "Eightcap",
        servers: ["Eightcap-Live", "Eightcap-Live 2", "Eightcap-Real", "Eightcap-Demo"],
      },
      {
        name: "FxPro",
        servers: ["FxPro-MT5", "FxPro.com-MT5", "FxPro-MT5 Demo"],
      },
      {
        name: "Deriv",
        servers: [
          "Deriv-Server",
          "Deriv-Server-02",
          "Deriv-Server-03",
          "DerivSVG-Server",
          "DerivSVG-Server-02",
          "Deriv-Demo",
        ],
      },
      {
        name: "LiteFinance",
        servers: [
          "LiteFinance-MT5-Live",
          "LiteFinance-MT5-Demo",
          "LiteForex-MT5-Live",
        ],
      },
      {
        name: "InstaForex",
        servers: ["InstaForex-Server", "InstaForex-USA2", "InstaForex-Demo"],
      },
      {
        name: "GO Markets",
        servers: ["GOMarkets-Live", "GOMarkets-Live 2", "GOMarkets-Demo"],
      },
      {
        name: "BlackBull Markets",
        servers: ["BlackBull-Live", "BlackBull-Live 2", "BlackBull-Demo"],
      },
      {
        name: "Fusion Markets",
        servers: ["FusionMarkets-Live", "FusionMarkets-Demo"],
      },
    ],
  },
  {
    label: "Prop Firms",
    brokers: [
      {
        name: "FTMO",
        servers: ["FTMO-Server", "FTMO-Server2", "FTMO-Server3", "FTMO-Demo"],
      },
      {
        name: "FundedNext",
        servers: [
          "FundedNext-Server",
          "FundedNext-Server 2",
          "FundedNextGT-Live",
          "FundedNext-Demo",
        ],
      },
      {
        name: "The5ers",
        servers: ["The5ers-Live", "The5ers-Real", "FivePercentOnline-Real"],
      },
      {
        name: "E8 Markets",
        servers: ["E8-Server", "E8Funding-Server", "E8Markets-Demo"],
      },
      {
        name: "The Funded Trader",
        servers: ["TheFundedTrader-Server", "TFT-Server", "Eightcap-Live"],
      },
      {
        name: "FunderPro",
        servers: ["FunderPro-Server", "FunderPro-Live", "FunderPro-Demo"],
      },
      {
        name: "Alpha Capital Group",
        servers: ["AlphaCapitalGroup-Server", "AlphaCapital-Live"],
      },
      {
        name: "Blue Guardian",
        servers: ["BlueGuardian-Server", "BlueGuardianFX-Live"],
      },
      {
        name: "FundingPips",
        servers: ["FundingPips-Server", "FundingPips-Live", "FundingPips-Demo"],
      },
      {
        name: "MyFundedFX",
        servers: ["MyFundedFX-Server", "MyFundedFX-Live", "Eightcap-Live"],
      },
      {
        name: "FXIFY",
        servers: ["FXIFY-Server", "FXIFY-Live", "FXIFY-Demo"],
      },
      {
        name: "Goat Funded Trader",
        servers: ["GoatFundedTrader-Server", "GFT-Server"],
      },
      {
        name: "Instant Funding",
        servers: ["InstantFunding-Server", "InstantFundingIO-Live"],
      },
      {
        name: "Maven Trading",
        servers: ["MavenTrading-Server", "Maven-Live"],
      },
      {
        name: "BrightFunded",
        servers: ["BrightFunded-Server", "BrightFunded-Live"],
      },
      {
        name: "Hola Prime",
        servers: ["HolaPrime-Server", "HolaPrime-Live"],
      },
      {
        name: "Funded Trading Plus",
        servers: ["FundedTradingPlus-Server", "Eightcap-Live"],
      },
      {
        name: "City Traders Imperium",
        servers: ["CityTradersImperium-Server", "CTI-Live"],
      },
      {
        name: "Lark Funding",
        servers: ["LarkFunding-Server"],
      },
      {
        name: "Audacity Capital",
        servers: ["AudacityCapital-Server"],
      },
    ],
  },
  {
    label: "Other",
    brokers: [{ name: "Other", servers: [] }],
  },
];

// Flat lookup: broker name → known server names.
export const BROKER_SERVERS: Record<string, string[]> = Object.fromEntries(
  BROKER_GROUPS.flatMap((g) => g.brokers).map((b) => [b.name, b.servers])
);

// De-duplicated list of every known server, for when no broker is
// selected yet or "Other" is chosen.
export const ALL_SERVERS: string[] = [
  ...new Set(BROKER_GROUPS.flatMap((g) => g.brokers).flatMap((b) => b.servers)),
].sort();

// Server suggestions to show for the currently selected broker.
export function getServerSuggestions(broker: string): string[] {
  const servers = BROKER_SERVERS[broker];
  return servers && servers.length > 0 ? servers : ALL_SERVERS;
}
