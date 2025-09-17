import { useState } from "react";

// Use env var on Netlify; fall back to localhost in dev
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4242";

// (Keep this false if you want the card button to stay as a placeholder)
const FIAT_ENABLED = false;

export default function App() {
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [loadingFiat, setLoadingFiat] = useState(false);
  const [showCardSetup, setShowCardSetup] = useState(false);

  const payCrypto = async () => {
    setLoadingCrypto(true);
    try {
      const r = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1999 }), // $19.99
      });
      const data = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(data));
      window.location.href = data.url;
    } catch (e) {
      alert("Crypto payment init failed. Check server logs.");
      console.error(e);
      setLoadingCrypto(false);
    }
  };

  const payFiat = async () => {
    if (!FIAT_ENABLED) {
      setShowCardSetup(true);
      return;
    }
    setLoadingFiat(true);
    try {
      const r = await fetch(`${API_BASE}/api/checkout-fiat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1999 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(data));
      window.location.href = data.url;
    } catch (e) {
      alert("Card payment init failed. Check server logs.");
      console.error(e);
      setLoadingFiat(false);
    }
  };

  const btn = {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    cursor: "pointer",
    fontSize: "16px",
  };

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
      <h1>Test Store</h1>
      <p>Buy Test Product ($19.99)</p>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={payCrypto} disabled={loadingCrypto} style={btn}>
          {loadingCrypto ? "Redirecting…" : "Pay with Crypto (USDC)"}
        </button>

        <button onClick={payFiat} disabled={loadingFiat} style={btn}>
          {FIAT_ENABLED ? (loadingFiat ? "Redirecting…" : "Pay with Card (USD → USDC)") : "Pay with Card (Requires setup)"}
        </button>
      </div>

      {!FIAT_ENABLED && (
        <>
          <p style={{ marginTop: 12, color: "#6b7280" }}>
          </p>
          {showCardSetup && (
            <div style={{ marginTop: 18, textAlign: "left", background: "#fafafa", border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Enable “Card → USDC” </h3>
              <ol style={{ lineHeight: 1.6 }}>
                <li>Once the KYC will be done, We can accept fiat payments - DHRUV</li>
              </ol>
            
            </div>
          )}
        </>
      )}
    </div>
  );
}
