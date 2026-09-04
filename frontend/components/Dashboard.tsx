"use client";

// frontend/components/Dashboard.tsx
//
// Main landing view: budget-vs-spend per category, same ledger-register
// pattern as Sidharth's forecast chart. Reads from /api/dashboard.

import { useEffect, useState } from "react";
import { INK, PAPER, RULE, MONO, SANS, riskColor } from "@/frontend/lib/theme";

type CategorySummary = {
  category: string;
  budget: number;
  spentUsd: number;
  remainingUsd: number;
  percentUsed: number;
  transactionCount: number;
};

type DashboardData = {
  month: string;
  totalSpentUsd: number;
  totalBudgetUsd: number;
  categories: CategorySummary[];
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div style={{ fontFamily: MONO, color: INK, padding: 24, fontSize: 13 }}>
        loading ledger…
      </div>
    );
  }

  const overallPercent = data.totalBudgetUsd > 0
    ? Math.round((data.totalSpentUsd / data.totalBudgetUsd) * 100)
    : 0;

  return (
    <div style={{ background: PAPER, color: INK, fontFamily: SANS }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${RULE}` }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.06em", color: "#6B6653" }}>
          budget register — {data.month}
        </div>
        <div style={{ fontSize: 15, marginTop: 4 }}>
          {data.totalSpentUsd.toFixed(0)} / {data.totalBudgetUsd.toFixed(0)} USD spent this month
          <span style={{ fontFamily: MONO, color: riskColor(overallPercent), marginLeft: 8, fontSize: 12 }}>
            ({overallPercent}%)
          </span>
        </div>
      </div>

      <div>
        {data.categories.map((cat) => (
          <div
            key={cat.category}
            style={{
              padding: "12px 24px",
              borderBottom: `1px solid ${RULE}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>{cat.category}</div>
              <div style={{ height: 4, background: RULE, marginTop: 6, position: "relative" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(cat.percentUsed, 100)}%`,
                    background: riskColor(cat.percentUsed),
                  }}
                />
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 13, marginLeft: 20, textAlign: "right", minWidth: 120 }}>
              <div>{cat.spentUsd.toFixed(0)} / {cat.budget}</div>
              <div style={{ fontSize: 11, color: riskColor(cat.percentUsed) }}>
                {cat.percentUsed}% used
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
