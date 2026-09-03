# SmartSplit Frontend

SmartSplit is a non-custodial Sui payment coordination dApp. It lets users select multiple recipients, calculate equal or itemized shares, and send the payments in one wallet-approved transaction. The current prototype targets the Sui Testnet.

## Problem

Shared expenses are still difficult to settle. One person often pays the full bill, then sends several separate transfers and manually follows up with friends. This creates fragmented payments, forgotten debts, unclear records, and the risk that a multi-party settlement only completes partially.

## What SmartSplit Solves

SmartSplit turns one shared expense into a coordinated payment workflow. The payer selects all recipients, enters or detects the bill amount, reviews each share, and approves one programmable transaction block. Sui executes the transfers atomically, so the payment either completes for everyone or fails without leaving a partial settlement. Users keep control of their funds through their own wallets, while readable SuiNS names, receipt storage on Walrus, and payment requests make coordination easier to verify.

## Features

- Multi-recipient SUI payment splitting through a programmable transaction.
- Equal and uneven/itemized split modes.
- SuiNS forward lookup for `.sui` recipient names and reverse lookup on profiles.
- Optional receipt upload to Walrus testnet storage.
- Browser OCR with Tesseract to detect a likely receipt total and prefill the bill amount.
- Payment requests using **Receive from them**, with incoming requests shown on the home page.
- Google zkLogin authentication, Sui address derivation, and proof retrieval.
- Sui wallet connection through `@mysten/dapp-kit-react` and gRPC clients.

## Requirements

- Node.js 18 or newer.
- A Sui-compatible browser wallet for payment testing.
- Sui Testnet SUI for transaction fees and transfers.
- A running backend for profiles, communities, and payment requests.

## Setup

Install dependencies:

```powershell
npm install
```

Create `frontend/.env` with:

```env
VITE_PACKAGE_ID=0x24e97be01d4bb8762ad5e4175f1b169034a1b3c51288e6f4a7030edbda49c1df
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

The Google OAuth client must allow this redirect URI:

```text
http://localhost:5173/auth/callback
```

Walrus uses the Sui Testnet publisher and aggregator by default. Override them only when needed:

```env
VITE_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
VITE_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
```

## Run Locally

Start the backend in one terminal:

```powershell
npm --prefix ../backend run start
```

Start the frontend in another terminal:

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

When Firebase credentials are unavailable, the backend uses temporary in-memory payment-request storage. Requests are lost when the backend restarts. Configure `GOOGLE_APPLICATION_CREDENTIALS` or provide `backend/firebase-key.json` for persistent Firestore storage.

## Demo Flow

1. Connect a funded Sui Testnet wallet.
2. Open **Split** and select two or more recipients.
3. Enter a purpose and total amount, or upload a receipt image.
4. Verify the OCR-detected amount and currency.
5. Review the calculated shares and approve the wallet transaction.
6. Use **Receive from them** to create payment requests instead of sending immediately.
7. Search for a `.sui` name to resolve it to a recipient address.

The payment flow is non-custodial: SmartSplit builds the transaction, and the user wallet signs it. A failed transfer causes the atomic transaction to fail rather than partially completing.

## zkLogin Status

The Google zkLogin prototype currently:

- Creates an ephemeral Ed25519 keypair and nonce.
- Uses the live Sui epoch when starting authentication.
- Derives a deterministic Sui address from the Google ID token and user salt.
- Requests and stores a proof from the Mysten prover service.

The current payment transaction flow still requires a connected Sui wallet. zkLogin proof-based transaction signing is not yet connected to the split-payment executor.

## Commands

```powershell
npm run dev       # Start Vite development server
npm run build     # TypeScript check and production build
npm run lint      # Run Oxlint
npm run preview   # Preview the production build
```

## Deployment

Build the frontend with `npm run build`, then serve the generated `dist/` directory from a static host. Configure the production OAuth redirect URI, backend API URL/proxy, and Walrus endpoints for the target environment.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
