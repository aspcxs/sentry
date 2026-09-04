"use client";

// frontend/components/ExpenseEntryForm.tsx
//
// Logs a new expense. Category dropdown pulls from the shared taxonomy
// (lib/categories.ts) so it can never drift from what the dashboard/
// predictor expect. Shows a live FX-converted preview as the user types.

import { useEffect, useState } from "react";
import { INK, PAPER, RULE, MONO, SANS } from "@/frontend/lib/theme";
import { CATEGORIES } from "@/backend/lib/categories";

const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY", "CNY"];

export default function ExpenseEntryForm({ onSaved }: { onSaved?: () => void }) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<{ amount: number; rate: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Live FX preview, debounced
  useEffect(() => {
    if (!amount || currency === "USD") {
      setPreview(null);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/fx?from=${currency}&to=USD&amount=${amount}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.amount !== undefined) setPreview({ amount: d.amount, rate: d.rate });
        })
        .catch(() => setPreview(null));
    }, 400);
    return () => clearTimeout(handle);
  }, [amount, currency]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), currency, category, date, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setStatus("saved");
      setAmount("");
      setNote("");
      onSaved?.();
      setTimeout(() => setStatus("idle"), 1500);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  }

  const fieldStyle: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 13,
    padding: "8px 10px",
    border: `1px solid ${RULE}`,
    background: PAPER,
    color: INK,
    width: "100%",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ background: PAPER, color: INK, fontFamily: SANS, padding: 24, maxWidth: 420 }}
    >
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.06em", color: "#6B6653", marginBottom: 14 }}>
        log expense
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{ ...fieldStyle, flex: 2 }}
        />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...fieldStyle, flex: 1 }}>
          {COMMON_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {preview && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#6B6653", marginBottom: 10 }}>
          ≈ {preview.amount.toFixed(2)} USD (rate {preview.rate.toFixed(4)})
        </div>
      )}

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ ...fieldStyle, marginBottom: 10 }}
      >
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.label}>{c.label}</option>
        ))}
      </select>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ ...fieldStyle, marginBottom: 10 }}
      />

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ ...fieldStyle, marginBottom: 14 }}
      />

      <button
        type="submit"
        disabled={status === "saving"}
        style={{
          fontFamily: MONO,
          fontSize: 13,
          padding: "10px 16px",
          background: INK,
          color: PAPER,
          border: "none",
          cursor: "pointer",
          width: "100%",
        }}
      >
        {status === "saving" ? "saving…" : status === "saved" ? "saved ✓" : "add expense"}
      </button>

      {status === "error" && (
        <div style={{ fontFamily: MONO, fontSize: 12, color: "#A0330F", marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
    </form>
  );
}
