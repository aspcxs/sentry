"use client";

// frontend/components/EMICalendar.tsx
//
// Shows each loan's month-by-month schedule. Ledger table, not an actual
// calendar grid — matches the register aesthetic and is far more legible
// for a payment schedule than a month-grid would be.

import { useEffect, useState } from "react";
import { INK, PAPER, RULE, ROW_HIGHLIGHT, MONO, SANS, RISK_MED } from "@/frontend/lib/theme";

type ScheduleEntry = {
  month: number;
  date: string;
  type: "moratorium" | "emi";
  emi?: number;
  interest: number;
  principalPaid?: number;
  balance: number;
};

type Loan = {
  id: string;
  label: string;
  principal: number;
  annualRatePct: number;
  tenureMonths: number;
  moratoriumMonths: number;
  emi: number;
  totalInterest: number;
  totalPayable: number;
  schedule: ScheduleEntry[];
};

export default function EMICalendar() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingMoratorium, setPendingMoratorium] = useState<string>("");

  function refresh() {
    fetch("/api/emi")
      .then((r) => r.json())
      .then((d) => {
        setLoans(d.loans);
        setSelected((prev) => prev ?? d.loans[0]?.id ?? null);
      });
  }

  useEffect(refresh, []);

  const active = loans.find((l) => l.id === selected);

  async function applyMoratorium() {
    if (!active) return;
    const months = parseInt(pendingMoratorium, 10);
    if (isNaN(months) || months < 0) return;
    await fetch(`/api/emi/${active.id}/moratorium`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moratoriumMonths: months }),
    });
    setPendingMoratorium("");
    refresh();
  }

  return (
    <div style={{ background: PAPER, color: INK, fontFamily: SANS }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${RULE}` }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.06em", color: "#6B6653" }}>
          emi schedule
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${RULE}` }}>
        {loans.map((loan) => (
          <button
            key={loan.id}
            onClick={() => setSelected(loan.id)}
            style={{
              padding: "10px 18px",
              fontFamily: MONO,
              fontSize: 12,
              border: "none",
              borderRight: `1px solid ${RULE}`,
              background: loan.id === selected ? ROW_HIGHLIGHT : "transparent",
              cursor: "pointer",
            }}
          >
            {loan.label}
          </button>
        ))}
      </div>

      {active && (
        <div style={{ padding: "16px 24px" }}>
          <div style={{ fontFamily: MONO, fontSize: 12, marginBottom: 12, color: "#6B6653" }}>
            principal {active.principal} · {active.annualRatePct}% APR · {active.tenureMonths}mo ·
            {" "}EMI {active.emi} · total interest {active.totalInterest}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <input
              type="number"
              min={0}
              placeholder="Moratorium months"
              value={pendingMoratorium}
              onChange={(e) => setPendingMoratorium(e.target.value)}
              style={{
                fontFamily: MONO, fontSize: 12, padding: "6px 8px",
                border: `1px solid ${RULE}`, background: PAPER, color: INK, width: 160,
              }}
            />
            <button
              onClick={applyMoratorium}
              style={{
                fontFamily: MONO, fontSize: 12, padding: "6px 12px",
                background: INK, color: PAPER, border: "none", cursor: "pointer",
              }}
            >
              apply moratorium
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${INK}`, textAlign: "right" }}>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>month</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>date</th>
                <th style={{ padding: "4px 8px" }}>type</th>
                <th style={{ padding: "4px 8px" }}>interest</th>
                <th style={{ padding: "4px 8px" }}>principal</th>
                <th style={{ padding: "4px 8px" }}>balance</th>
              </tr>
            </thead>
            <tbody>
              {active.schedule.map((row) => (
                <tr key={row.month} style={{ borderBottom: `1px solid ${RULE}`, textAlign: "right" }}>
                  <td style={{ textAlign: "left", padding: "4px 8px" }}>{row.month}</td>
                  <td style={{ textAlign: "left", padding: "4px 8px" }}>{row.date}</td>
                  <td style={{ padding: "4px 8px", color: row.type === "moratorium" ? RISK_MED : INK }}>
                    {row.type}
                  </td>
                  <td style={{ padding: "4px 8px" }}>{row.interest.toFixed(2)}</td>
                  <td style={{ padding: "4px 8px" }}>{row.principalPaid?.toFixed(2) ?? "—"}</td>
                  <td style={{ padding: "4px 8px" }}>{row.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
