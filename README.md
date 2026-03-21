# MentoGuard

**Autonomous FX hedging and yield optimization agent for Celo stablecoins.**

MentoGuard is an AI-powered autonomous agent that manages a dual-purpose portfolio: **CELO acts as the active hedge instrument** — rebalanced continuously against stablecoins as its price moves — while **cUSD and cEUR are the yield instruments** — deposited into Aave V3 during balanced periods to earn passive interest. The agent coordinates both roles simultaneously, 24/7, without manual intervention.

**Live Demo:** https://mentoguard.vercel.app
**Telegram Bot:** [@MentoGuardBot](https://t.me/MentoGuardBot)
**Confirmed On-Chain Swaps (Celo Mainnet):**
- CELO → cUSD: `0xe01b1a140bfd2c9727f41b0c068689d494a17bdc4fecb7ade66ef29f9c3f87a0`
- cUSD → cEUR: `0xacca0898d48e68cde32be6dbdb22fbc416b3928d26b03b883b5f4bb82862417a`

---

## What It Does

The agent runs a continuous observe → decide → act loop every 60 seconds:

1. **Observe** — Fetches live FX rates (EUR/USD, BRL/USD via Frankfurter API), reads on-chain token balances (cUSD, cEUR, CELO), checks Aave V3 positions, and fetches DeFi yield rates from DeFiLlama.

2. **Decide** — Passes full portfolio context to Hermes (NousResearch Hermes-4-70B LLM via function calling). Context includes portfolio drift, live FX rates, 24h price momentum (CELO), yield opportunities, and current Aave positions. Hermes weighs market conditions against drift thresholds — e.g. delaying a CELO buy during a strong downtrend — and chooses from: `execute_swap`, `deposit_to_aave`, `withdraw_from_aave`, or `hold`.

3. **Act** — Executes the decision on-chain:
   - Swaps via **Mento Broker** (native Celo stablecoin DEX) with automatic fallback to two-hop routing via CELO
   - Deposits to / withdraws from **Aave V3 on Celo** to earn yield on idle stablecoins
   - Sends **Telegram notifications** for every action

---

## Key Features

### CELO as the Hedge Instrument
- CELO is the active rebalancing asset — its price volatility is what creates drift and triggers swaps
- Monitors portfolio drift from user-defined target (default: 45% cUSD, 10% cEUR, 45% CELO)
- Hermes weighs **24h price momentum** before buying into CELO: delays rebalancing during strong downtrends, accelerates during uptrends
- Executes swaps via Mento Broker (`0x777A8255cA72412f0d706dc03C9D1987306B4CaD`) with two-hop fallback via CELO when a direct oracle is unavailable

### cUSD/cEUR as Yield Instruments
- Stablecoins drift slowly (EUR/USD moves ~0.5%/day) — they spend most of their time in balance
- When portfolio is balanced, idle cUSD and cEUR are **automatically deployed to Aave V3** (`0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402`) to earn yield
- Yield accumulates continuously via aTokens; agent reads live APY from DeFiLlama to confirm best available rate
- Before a rebalance swap, agent automatically withdraws the required amount from Aave — stablecoins are never locked

### Natural Language Configuration
- Users send plain text to the Telegram bot: *"set target to 60% cUSD 40% cEUR"*
- Hermes parses the intent and updates the agent config live
- Supported: target allocation, drift threshold, pause/resume, operating hours

### Constrained Autonomy (EIP-7710 Delegation Rules)
- Every swap is validated against user-defined rules before execution
- Rules: max single swap amount, max daily volume, allowed token list, operating time window, human approval threshold
- Agent cannot exceed these bounds regardless of LLM decision

### Immutable Audit Trail (Filecoin / Lighthouse)
- Every tick and rebalance is logged to Filecoin via Lighthouse Storage
- CIDs stored in Redis for retrieval
- Creates a permanent, tamper-proof record of all autonomous decisions

### Identity Verification (Self Protocol)
- Users verify their identity via Self Protocol's ZK passport verification
- Verified status unlocks higher delegation rule limits
- Verification stored on-chain via Self Protocol's smart contract

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MentoGuard Agent                         │
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Monitor  │───▶│ Hermes LLM   │───▶│ Executor             │  │
│  │          │    │ (Decide)     │    │                      │  │
│  │ FX Rates │    │ Function     │    │ Mento Broker (swap)  │  │
│  │ Balances │    │ Calling      │    │ Aave V3 (yield)      │  │
│  │ Aave Pos │    │              │    │ Filecoin (log)       │  │
│  │ DeFi APY │    └──────────────┘    └──────────────────────┘  │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
         │                                          │
         ▼                                          ▼
   Redis (state)                          Celo Mainnet
   Telegram (alerts)                      (transactions)
   Dashboard (UI)
```

### Monorepo Structure

```
mentoguard/
├── apps/
│   ├── web/              # Next.js 15 dashboard (Vercel)
│   └── telegram/         # Telegraf bot (Railway)
├── packages/
│   ├── agent-core/       # Agent loop, LLM, execution (Railway)
│   │   ├── src/
│   │   │   ├── index.ts      # Main cron loop (60s)
│   │   │   ├── monitor.ts    # FX rates, balances, yields
│   │   │   ├── llm.ts        # Hermes function calling
│   │   │   ├── executor.ts   # Swap orchestration
│   │   │   ├── mento.ts      # Mento Broker integration
│   │   │   ├── aave.ts       # Aave V3 deposit/withdraw
│   │   │   ├── yields.ts     # DeFiLlama APY fetching
│   │   │   ├── strategy.ts   # Rebalance calculation
│   │   │   ├── delegation.ts # EIP-7710 rule validation
│   │   │   └── memory.ts     # Redis + Filecoin logging
│   └── shared/           # Types, constants, utilities
```

---

## Technologies Used

| Technology | Usage |
|---|---|
| **Mento Protocol** | Primary DEX for stablecoin swaps (cUSD, cEUR, cBRL, CELO) via Broker contract |
| **Celo Blockchain** | All transactions executed on Celo mainnet (Chain ID: 42220) |
| **Aave V3 (Celo)** | Yield generation — deposit/withdraw idle stablecoins |
| **Filecoin / Lighthouse** | Immutable audit log of every agent tick and rebalance |
| **Self Protocol** | ZK passport identity verification for users |
| **NousResearch Hermes-4-70B** | LLM decision engine via OpenAI-compatible function calling |
| **Redis (Upstash)** | Shared state between agent, dashboard, and Telegram bot |
| **Next.js 15** | Dashboard — portfolio exposure, FX heatmap, yield opportunities, activity feed |
| **Telegraf** | Telegram bot with natural language command parsing |
| **viem** | On-chain reads and writes (Celo mainnet) |

---

## Deployed Contracts Integrated

| Contract | Address | Network |
|---|---|---|
| Mento Broker | `0x777A8255cA72412f0d706dc03C9D1987306B4CaD` | Celo Mainnet |
| Aave V3 Pool | `0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402` | Celo Mainnet |
| cUSD (USDm) | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | Celo Mainnet |
| cEUR (EURm) | `0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73` | Celo Mainnet |
| CELO (ERC-20) | `0x471EcE3750Da237f93B8E339c536989b8978a438` | Celo Mainnet |

---

## Live API Endpoints

All endpoints available at `https://mentoguard.vercel.app`:

| Endpoint | Description |
|---|---|
| `GET /api/portfolio` | Current token balances and USD values |
| `GET /api/fx-rates` | Live FX rates (cUSD, cEUR, cBRL, CELO) |
| `GET /api/yields` | Top Celo DeFi APY opportunities from DeFiLlama |
| `GET /api/activity` | Recent agent decisions and actions |
| `GET /api/agent-state` | Agent status, uptime, total trades |
| `POST /api/authorize` | Update delegation rules and target allocation |

---

## Agent Decision Logic

Hermes receives this context every tick:

```
Portfolio value: $X.XX
Current allocation:
  cUSD:  XX.XX% (target: 45%)
  cEUR:  XX.XX% (target: 10%)
  CELO:  XX.XX% (target: 45%)

Drift from target:
  cUSD:  +X.XX%
  cEUR:  -X.XX%
  CELO:  +X.XX%

FX rates: cEUR=$1.1555, CELO=$0.48

Market signals (24h):
  CELO: ▼3.21% (mild downtrend)

Aave V3 positions (earning yield):
  cUSD: $0.62

Yield opportunities on Celo:
  cUSD: ubeswap 4.20% APY, moola 3.80% APY
  cEUR: moola 2.90% APY

User rules:
  Drift threshold: 5%
  Max single swap: $500
```

Hermes uses this to make market-aware decisions:
- **CELO drifting + downtrend** → delay rebalance, send alert
- **CELO drifting + uptrend** → rebalance immediately
- **Portfolio balanced + stablecoins idle** → deploy to Aave
- **Rebalance needed + funds in Aave** → withdraw from Aave, then swap

Calls one of: `execute_swap`, `deposit_to_aave`, `withdraw_from_aave`, `send_alert`, or `hold`.

---

## Running Locally

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- A Celo wallet with private key
- Redis instance (Upstash free tier works)
- NousResearch API key (for Hermes)

### Setup

```bash
git clone https://github.com/Calebux/Mentoguard.git
cd mentoguard
pnpm install
```

Copy `.env.example` to `.env` and fill in:

```env
# Celo
CELO_PRIVATE_KEY=0x...
CELO_SMART_ACCOUNT_ADDRESS=0x...
CELO_RPC_URL=https://forno.celo.org

# AI
HERMES_BASE_URL=https://inference-api.nousresearch.com/v1
HERMES_API_KEY=...
HERMES_MODEL=Hermes-4-70B

# Infrastructure
REDIS_URL=rediss://...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
LIGHTHOUSE_API_KEY=...
```

### Run

```bash
# Dashboard
pnpm --filter @mentoguard/web dev

# Agent (starts 60s cron loop)
tsx packages/agent-core/src/index.ts

# Telegram bot
tsx apps/telegram/src/bot.ts
```

---

## Delegation Rules

Users set rules that the agent cannot exceed:

```typescript
{
  maxSwapAmountUSD: 500,        // Max single swap
  maxDailyVolumeUSD: 2000,      // Max daily trading volume
  allowedTokens: [              // Whitelist of swappable tokens
    "0x765DE8...",  // cUSD
    "0xD8763C...",  // cEUR
    "0x471ECE...",  // CELO
  ],
  timeWindow: {                 // Operating hours (UTC)
    startHour: 0,
    endHour: 24
  },
  requireHumanApprovalAbove: 1000  // Require approval for large swaps
}
```

These rules are validated in `delegation.ts` before every swap execution. The agent physically cannot bypass them.

---

## Telegram Bot Commands

```
/status    — Agent health, uptime, total trades
/portfolio — Current allocation and drift
/pause     — Halt all autonomous trading
/resume    — Restart autonomous trading
/history   — Last 10 swaps
/ask       — Ask Hermes anything about your portfolio

# Natural language (no slash needed):
"set target to 70% cUSD 30% cEUR"
"set threshold to 3%"
"be more aggressive"
"pause trading until Monday"
```

---

## Security

- Private key never leaves the server environment
- Delegation rules enforced in code before every transaction
- All swaps validated against token allowlist
- Human approval required above configurable threshold
- Aave interactions only with pre-approved assets

---

## Hackathon Submission

Built for the **Synthesis Agent Hack**.

This project demonstrates:
- A fully autonomous AI agent operating on a live blockchain
- Real on-chain transactions executed without human intervention
- Multi-protocol DeFi integration (Mento + Aave) with LLM decision layer
- Constrained autonomy pattern — AI agent with hard guardrails
- Permanent on-chain audit trail of all autonomous decisions
