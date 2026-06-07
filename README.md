# ⚡ OmniPay

OmniPay is a decentralized cross-chain invoice and checkout payment gateway designed as a Telegram Mini App. It allows merchants to request payments settled in EVM Stablecoins (Base USDC, Polygon USDT) while allowing buyers to pay instantly using **TON** or **TON USDT** via their favorite TON wallets (like Tonkeeper, Tonhub, or Telegram Wallet).

Built for the **STON.fi Vibe Coding Hackathon Cohort 2**.

---

## 🚀 Key Features
- **Cross-Chain Atomic Swaps:** Powered by the new **STON.fi Omniston SDK (v1beta8)** using HTLC-based order settlements in a sandbox environment.
- **TON Wallet Integration:** Connects seamlessly to TON wallets using `@tonconnect/ui-react`.
- **Live RFQ Price Streaming:** Utilizes WebSocket subscription streams (`useRfq`) to fetch real-time quotes of the exact TON required to settle the EVM invoice.
- **Route Visualization:** Shows an animated step-by-step transaction route from TON to the destination EVM wallet.
- **Premium UX:** Sleek dark-mode glassmorphism styling, responsive layouts, and confetti success celebrations.

---

## 🛠️ Architecture

```
Buyer (TON Wallet)
   │
   ├── Connects TON Wallet ➔ Subscribes to Omniston RFQ Live Quote Stream
   │
   └── Confirms Swap ➔ Signs TON message payload (via TonConnect)
         │
         └── STON.fi Resolvers perform HTLC Swap ➔ Settles USDC/USDT directly to Merchant EVM Wallet
```

---

## ⚙️ Running Locally

### 1. Start the Backend Server
Provides in-memory invoice logging and status updates:
```bash
cd server
npm install
npm run dev
```
*(Runs on http://localhost:3001)*

### 2. Start the Frontend Client
The React/Vite interface:
```bash
cd client
npm install
npm run dev
```
*(Runs on http://localhost:5173)*

---

## 📦 Tech Stack
- **Frontend:** React, Vite, TypeScript, Lucide Icons, Canvas Confetti
- **Web3 Integration:** `@ston-fi/omniston-sdk-react`, `@tonconnect/ui-react`
- **Backend:** Express, Node.js, UUID, CORS
