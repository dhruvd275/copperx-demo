// server/index.js
// ESM file. Add "type": "module" to server/package.json.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch"; // npm i node-fetch@2

dotenv.config();

const app = express();
app.use(express.json());

// Allow local dev + your deployed frontend origin(s)
const allowed = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: ${origin} not allowed`));
  }
}));

// Health
app.get("/", (_req, res) => res.send("Copperx server is running"));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Helpers
const centsToUsdcUnits = (centsIn) => {
  const cents = Number.isFinite(Number(centsIn)) ? Math.trunc(Number(centsIn)) : 1999;
  return (BigInt(cents) * 1_000_000n).toString(); // 1 USDC = 100,000,000 units
};

// Build success/cancel URLs from FRONTEND_URL
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const successUrl = `${FRONTEND_URL}/success`;
const cancelUrl = `${FRONTEND_URL}/cancel`;

// === CRYPTO CHECKOUT (USDC) ===
app.post("/api/checkout", async (req, res) => {
  try {
    const apiKey = process.env.COPPERX_API_KEY;
    if (!apiKey) return res.status(500).json({ message: "Missing COPPERX_API_KEY in .env" });

    const usdcUnits = centsToUsdcUnits(req.body?.amount);
    const body = {
      mode: "payment",
      successUrl,
      cancelUrl,
      lineItems: {
        data: [
          {
            priceData: {
              currency: "usdc",
              unitAmount: usdcUnits,
              productData: { name: "Test Product (Crypto)", description: "Pay with crypto (USDC)" },
            },
          },
        ],
      },
    };

    const resp = await fetch("https://api.copperx.dev/api/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("Copperx error (crypto):", resp.status, data);
      return res.status(502).json({ message: "Copperx api error", status: resp.status, details: data });
    }

    const url = data.url || data.checkoutUrl || data.redirectUrl;
    if (!url) return res.status(500).json({ message: "No checkout URL in Copperx response", details: data });

    return res.json({ url });
  } catch (err) {
    console.error("Server error (crypto):", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// === FIAT CHECKOUT (CARD) ===
// Note: For “card → USDC”, use the Option A dashboard wiring you chose.
// This endpoint just creates the card checkout session (Stripe under the hood).
app.post("/api/checkout-fiat", async (req, res) => {
  try {
    const apiKey = process.env.COPPERX_API_KEY;
    if (!apiKey) return res.status(500).json({ message: "Missing COPPERX_API_KEY in .env" });

    const cents = Number.isFinite(Number(req.body?.amount)) ? Math.trunc(Number(req.body.amount)) : 1999;
    const body = {
      mode: "payment",
      successUrl,
      cancelUrl,
      lineItems: {
        data: [
          {
            priceData: {
              currency: "usd",
              unitAmount: cents,
              productData: { name: "Test Product (Card)", description: "Pay with card (USD)" },
            },
          },
        ],
      },
    };

    const resp = await fetch("https://api.copperx.dev/api/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("Copperx error (fiat):", resp.status, data);
      return res.status(502).json({ message: "Copperx api error", status: resp.status, details: data });
    }

    const url = data.url || data.checkoutUrl || data.redirectUrl;
    if (!url) return res.status(500).json({ message: "No checkout URL in Copperx response", details: data });

    return res.json({ url });
  } catch (err) {
    console.error("Server error (fiat):", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// (Optional) Webhook for post-payment actions
app.post("/api/webhook/copperx", async (req, res) => {
  try {
    console.log("Webhook event:", JSON.stringify(req.body || {}, null, 2));
    res.status(200).json({ received: true });
  } catch {
    res.status(200).json({ received: true });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`server on :${PORT}`));
