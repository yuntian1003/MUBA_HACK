# SmartSplit — Programmable Multi-Party Payment Coordination on Sui

> **Atomic, non-custodial expense splitting and multi-party payment coordination powered by Sui Programmable Transaction Blocks (PTBs).**

---

## 💡 Problem Statement

Traditional expense sharing and group payment apps (Splitwise, Venmo, manual bank transfers) suffer from:
1. **Manual reconciliation friction:** Users have to coordinate payments one by one, leading to awkward follow-ups and unpaid IOUs.
2. **Custodial & fragmentation risk:** Platforms hold user funds or require centralized clearing houses with high latency and foreign transaction fees.
3. **Execution failure:** If a multi-step group transfer fails midway, state becomes desynchronized and funds can be lost or stuck.

### The SmartSplit Solution
**SmartSplit** turns payment coordination into an atomic, programmable primitive on Sui:
- **Zero Custody:** SmartSplit never holds custody of funds. Users connect their own Sui-compatible wallets.
- **Single Atomic PTB:** Distribute funds to $N$ recipients in a single transaction with one signature. If any recipient fails, the entire transaction reverts atomically with zero fund loss.
- **Sub-Second Finality & Cheap Gas:** Powered by Sui's Mysticeti consensus and object-centric architecture with predictable, fraction-of-a-cent gas fees.

---

## 🌐 On-Chain Package & Deployment

- **Network:** Sui Testnet
- **Package ID:** [`0x24e97be01d4bb8762ad5e4175f1b169034a1b3c51288e6f4a7030edbda49c1df`](https://testnet.suivision.xyz/package/0x24e97be01d4bb8762ad5e4175f1b169034a1b3c51288e6f4a7030edbda49c1df)
- **Upgrade Cap:** `0x563b222700d37a44f86a07f7902f5a231ad4ec82587d6aac21473c0fcbf1736c`
- **Move Edition:** 2024

---

## 🏗️ Architecture & How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      SmartSplit Web dApp                    │
│      (React 19 + TypeScript + Vite + @mysten/dapp-kit)      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       (Wallet Sign Request)          (Metadata & Profiles)
               ▼                               ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│   Sui Wallet / zkLogin      │  │     Express API Backend    │
│  (One-click signature)      │  │    (Firebase / Firestore)  │
└──────────────┬──────────────┘  └────────────────────────────┘
               │
               ▼ Single Atomic PTB Execution
┌─────────────────────────────────────────────────────────────┐
│                     Sui Network (Testnet)                   │
│                                                             │
│  1. `splitCoins(tx.gas, [shares...])`                       │
│  2. `smartsplit::execute_equal_split`                       │
│  3. Distribute shares to Recipient 1, 2, ... N              │
│  4. Emit `SplitExecuted` & `RecipientPaid` events           │
│  5. Return exact dust remainder to Payer                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- Node.js (v18+)
- Sui CLI (`sui --version` >= 1.30.0)

### 1. Clone & Install
```sh
git clone https://github.com/yuntian1003/MUBA_HACK.git
cd MUBA_HACK
npm install
```

### 2. Run the Development Server
```sh
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Move Smart Contract Development & Testing
```sh
# Run unit tests
npm run test:move

# Build Move package
npm run build:move
```

---

## 🧪 Move Unit Testing

Unit tests cover equal splits, multi-recipient distribution, exact dust return, and security abort boundaries:
```text
Running Move unit tests
[ PASS ] smartsplit::smartsplit_tests::execute_equal_split_aborts_on_empty_recipients
[ PASS ] smartsplit::smartsplit_tests::execute_equal_split_aborts_on_zero_payment
[ PASS ] smartsplit::smartsplit_tests::execute_equal_split_distributes_funds_and_returns_dust
Test result: OK. Total tests: 3; passed: 3; failed: 0
```

---

## 🤖 AI Tool Declaration

In compliance with hackathon transparency guidelines:
- **AI Coding Assistant:** Google Antigravity IDE (Gemini 3.7)
- **Sui MCP Server:** Used `https://sui.mcp.kapa.ai` for Sui documentation indexing and Move 2024 / `@mysten/dapp-kit` pattern compliance.
