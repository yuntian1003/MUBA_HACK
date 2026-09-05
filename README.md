# SmartSplit

> Atomic, non-custodial expense splitting and multi-party payment coordination powered by Sui.

SmartSplit helps groups coordinate shared expenses without a centralized wallet. Users connect their own Sui-compatible wallet, choose recipients, calculate equal or custom shares, and approve a single programmable transaction. The app also combines payment requests, friend and community management, readable SuiNS identities, receipt OCR, and Walrus receipt uploads in one workflow.

## Live Demo

The frontend is deployed on Vercel:

**[https://muba-hack.vercel.app/](https://muba-hack.vercel.app/)**

The production frontend is configured to use the deployed backend API at `https://smartsplit-backend-g1zf.onrender.com` unless `VITE_API_URL` is provided. The app currently targets Sui Testnet.

## What SmartSplit Does

- **Multi-recipient payments:** Send SUI to several recipients from one wallet-approved PTB.
- **Equal and custom splits:** Divide an expense evenly or enter itemized amounts per recipient.
- **Payment requests:** Create requests for friends, view incoming requests, pay them from the home page, or decline them.
- **Friends:** Find contacts through SuiNS, send and manage friend requests, remove friends, and start payments or payment requests.
- **Communities:** Create groups, select members, and prefill a split with a community's members.
- **Profiles:** Edit display name, email, avatar color, and linked wallet or zkLogin identity.
- **SuiNS identity:** Resolve `.sui` names to addresses and look up a primary name from an address.
- **Receipt workflow:** Upload receipt images to Walrus Testnet and use browser-side Tesseract OCR to detect likely totals.
- **Transaction status:** Wait for Sui indexing, display success or failure feedback, and link completed payments to SuiVision.
- **Google zkLogin prototype:** Derive a deterministic Sui address and retrieve a zkLogin proof. Payment signing still uses a connected wallet.

## How Payments Work

The current frontend creates a direct Sui PTB with the wallet's gas coin:

1. Split the gas coin into the requested shares with `splitCoins`.
2. Transfer each share with `transferObjects`.
3. Ask the connected wallet to sign and execute the transaction.
4. Wait for the transaction to be indexed before refreshing the UI.

This is non-custodial: SmartSplit never receives or stores user funds. If a transfer in the PTB fails, the transaction fails atomically rather than leaving a partial settlement.

The Move package also contains reusable `execute_equal_split` and `execute_custom_split` entry functions. It emits `SplitExecuted` and `RecipientPaid` events and returns rounding dust or excess payment to the payer. The current frontend payment path uses direct wallet PTBs rather than calling those Move entry functions; the package is published, built, and unit tested independently.
Sui Primitives Behind SmartSplit

## Primitives SmartSplit Uses

SmartSplit combines four Sui ecosystem primitives to make group payments easier to use, while keeping payment execution non-custodial.

| Primitive    | What it does in SmartSplit                                           |
| ------------ | -------------------------------------------------------------------- |
| **Sui PTBs** | Execute multi-recipient payments in one wallet-approved transaction. |
| **zkLogin**  | Provides Web2-style onboarding and Sui identity.                     |
| **SuiNS**    | Makes recipient addresses human-readable.                            |
| **Walrus**   | Stores receipt images through decentralized storage.                 |

### 1) Sui Programmable Transaction Blocks (PTBs)

**The payment execution layer.**

SmartSplit uses PTBs to compose multiple payment operations into a single programmable transaction.

The current frontend splits the payer's gas coin into the requested shares and transfers them to multiple recipients.

```text
Payer
  │
  ▼
One wallet approval
  │
  ▼
Sui PTB
  ├──► Recipient A
  ├──► Recipient B
  └──► Recipient C
```

**What this enables:**

* Multi-recipient transfers
* Equal and custom splits
* One wallet approval
* Atomic execution
* Non-custodial settlement

> **One signature. Multiple payments.**

### 2) zkLogin

**The onboarding layer.**

zkLogin allows users to authenticate through familiar Web2 identity providers such as Google without requiring them to begin with a traditional seed phrase.

SmartSplit uses zkLogin to:

* Authenticate users through Google
* Derive a deterministic Sui address
* Retrieve a zkLogin proof
* Link a zkLogin identity to a user profile

The current implementation is a **zkLogin prototype**. Authentication and address derivation are supported, but proof-based transaction signing is not yet connected to the payment executor. Payment signing currently uses a connected Sui-compatible wallet.

> **Web2-style onboarding. Sui-native identity.**

### 3) SuiNS

**The identity layer.**

SuiNS provides human-readable names for Sui addresses.

Instead of copying long hexadecimal addresses, users can search for names such as:

```text
alex.sui
```

SmartSplit uses SuiNS to:

* Resolve `.sui` names to addresses
* Look up a primary name from an address
* Find friends and recipients using readable identities
* Reduce errors when selecting payment recipients

> **Pay people, not hexadecimal strings.**

### 4) Walrus

**The receipt-storage layer.**

Walrus provides decentralized storage for receipt images and other application data.

In SmartSplit, users can upload a receipt image to Walrus Testnet. The browser then uses Tesseract OCR to detect likely totals from the uploaded receipt.

```text
Receipt image
      │
      ▼
Walrus Testnet
      │
      ▼
Receipt reference
      │
      ▼
Browser-side OCR
      │
      ▼
Detected bill total
```

SmartSplit uses Walrus for:

* Decentralized receipt uploads
* Receipt references
* Receipt evidence associated with the expense workflow

OCR runs locally in the browser. Receipt metadata is not currently written on-chain or attached to payment requests.

> **Receipts stored separately. Payments settled on Sui.**

### Why These Primitives Matter

Each primitive solves a different part of the group-payment experience:

```text
zkLogin  →  Accessible onboarding
SuiNS    →  Human-readable identities
Walrus   →  Decentralized receipt storage
PTBs     →  Atomic multi-recipient payments
```

Together, they help SmartSplit turn a complicated payment workflow into a simple experience:

**Choose → Split → Sign once → Everyone gets paid.**

## Architecture

```text
React 19 + TypeScript + Vite frontend
  |-- @mysten/dapp-kit-react and Sui gRPC clients
  |-- Sui wallet transaction signing on Testnet
  |-- SuiNS, Walrus, Tesseract OCR, React Query
  |
  +--> Express backend
  |      |-- Profiles and identity linking
  |      |-- Friends and friend requests
  |      |-- Communities
  |      +-- Payment requests and status updates
  |
  +--> Sui Testnet
         +-- Direct wallet PTBs for current UI payments
         +-- Published SmartSplit Move package
```

### Frontend

The React app is in `frontend/`. Routes include Home, Split, History, Community, Friends, Profile, and the zkLogin callback. Sui access uses `SuiGrpcClient` through `@mysten/dapp-kit-react`; the default network is Testnet, with Mainnet also registered.

### Backend

The Express service is in `backend/`. It provides API routes for users, profiles, communities, friends, friend requests, and payment requests. When Firebase credentials are available, data is persisted in Firestore. Without credentials, the backend uses in-memory storage and data is lost when the process restarts.

### Move package

The Sui Move package is in `smartsplit/`. It supports equal and custom splits, validates recipients and amounts, emits payment events, and refunds dust or excess payment to the payer.

## On-Chain Package

- **Network:** Sui Testnet
- **Package:** [`0x24e97be01d4bb8762ad5e4175f1b169034a1b3c51288e6f4a7030edbda49c1df`](https://testnet.suivision.xyz/package/0x24e97be01d4bb8762ad5e4175f1b169034a1b3c51288e6f4a7030edbda49c1df)
- **Upgrade capability:** `0x563b222700d37a44f86a07f7902f5a231ad4ec82587d6aac21473c0fcbf1736c`
- **Move edition:** 2024
- **Published metadata:** [`smartsplit/Published.toml`](smartsplit/Published.toml)

## Local Setup

### Prerequisites

- Node.js 18 or newer
- A Sui-compatible browser wallet
- Sui CLI for Move builds and tests
- Sui Testnet SUI for transaction fees and payment testing

### Install dependencies

The repository has separate root, frontend, and backend package manifests:

```powershell
npm install
npm --prefix frontend install
npm --prefix backend install
```

### Configure the frontend

Create `frontend/.env`:

```env
VITE_PACKAGE_ID=0x24e97be01d4bb8762ad5e4175f1b169034a1b3c51288e6f4a7030edbda49c1df
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

The Google OAuth client must allow this authorized JavaScript origins during local development:
```text
http://localhost:5173
https://muba-hack.vercel.app
```

The Google OAuth client must allow this redirect URI during local development:

```text
http://localhost:5173/auth/callback
https://muba-hack.vercel.app/auth/callback
```

Optional overrides:

```env
VITE_API_URL=https://smartsplit-backend-g1zf.onrender.com
VITE_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
VITE_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
```

### Configure persistence

The backend uses Firestore when either `FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS` is configured. A local service account file can also be placed at `backend/firebase-key.json`. Keep service-account credentials out of source control.

### Run the app

Run both frontend and backend together:

```powershell
npm run dev
```

Or run them separately:

```powershell
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` requests to `http://localhost:3000` in development.

## Commands

From the repository root:

```powershell
npm run dev          # Start frontend and backend concurrently
npm run build        # Build the frontend
npm run test:move    # Run Move unit tests
npm run build:move   # Build the Move package
```

Frontend-only commands:

```powershell
cd frontend
npm run dev
npm run build
npm run lint
npm run preview
```

Backend-only commands:

```powershell
cd backend
npm run dev
npm start
```

## Move Tests

The Move suite currently has six passing tests covering:

- Equal distribution and dust refunds
- Uneven/custom distribution and change refunds
- Empty recipient validation
- Zero-payment validation
- Recipient and amount vector mismatches
- Insufficient payment validation

Run them with:

```powershell
npm run test:move
```

## Product Notes

- Payment requests and profile/community data are off-chain coordination data; payment execution remains wallet-controlled on Sui.
- Receipt uploads are stored on Walrus Testnet, while OCR runs locally in the browser. Receipt metadata is not currently written on-chain or attached to payment requests.
- The in-app History page tracks payment-request records. Full wallet transaction history is available through the linked SuiVision explorer pages.
- zkLogin currently authenticates and derives an address, but proof-based transaction signing is not yet connected to the payment executor.

## AI Tool Declaration

In compliance with hackathon transparency guidelines:

- **AI coding assistant:** Google Antigravity IDE (Gemini 3.7)
- **Sui MCP server:** `https://sui.mcp.kapa.ai` was used for Sui documentation indexing and Move 2024 and `@mysten/dapp-kit` pattern compliance.
