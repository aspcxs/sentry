// app/api/dashboard/route.ts
//
// Aggregates logged expenses against budgets, by category. This is the
// "foundational data layer" endpoint — Sidharth's predictor and the main
// dashboard UI both read from here (or from expenses.json directly) rather
// than each recomputing totals independently.

import { NextResponse } from "next/server";
import { expenseStore } from "@/backend/lib/store";
import { CATEGORIES } from "@/backend/lib/categories";

export async function GET() {
  const expenses = await expenseStore.all();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const byCategory = CATEGORIES.map((cat) => {
    const monthExpenses = expenses.filter(
      (e) => e.category === cat.label && new Date(e.date) >= monthStart
    );
    const spent = monthExpenses.reduce((sum, e) => sum + e.amountUsd, 0);
    return {
      category: cat.label,
      budget: cat.defaultMonthlyBudget,
      spentUsd: Math.round(spent * 100) / 100,
      remainingUsd: Math.round((cat.defaultMonthlyBudget - spent) * 100) / 100,
      percentUsed: cat.defaultMonthlyBudget > 0
        ? Math.round((spent / cat.defaultMonthlyBudget) * 100)
        : 0,
      transactionCount: monthExpenses.length,
    };
  });

  const totalSpent = byCategory.reduce((sum, c) => sum + c.spentUsd, 0);
  const totalBudget = byCategory.reduce((sum, c) => sum + c.budget, 0);

  return NextResponse.json({
    month: monthStart.toISOString().slice(0, 7),
    totalSpentUsd: Math.round(totalSpent * 100) / 100,
    totalBudgetUsd: totalBudget,
    categories: byCategory,
  });
}
