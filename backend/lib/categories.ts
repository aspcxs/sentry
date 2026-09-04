// lib/categories.ts
//
// SINGLE SOURCE OF TRUTH for spending categories across all of Sentry.
// This closes the "category alignment" gap flagged between the Budget
// Tracker and the AI Overspend Predictor — both should import from here
// instead of hardcoding category names/budgets independently.
//
// If Sidharth's data-pipeline scripts (generate_synthetic_data.py) are
// regenerated, mirror this list there too so category names match exactly
// (Python can't import a .ts file directly — keep the two in sync manually,
// or later add a small build step that exports this as JSON both sides read).

export type Category = {
  id: string;               // stable key, used in API payloads
  label: string;            // display name — must match Sidharth's forecasts.json "category" field
  defaultMonthlyBudget: number; // USD, user can override per-user later
};

export const CATEGORIES: Category[] = [
  { id: "groceries_food", label: "Groceries & Food", defaultMonthlyBudget: 400 },
  { id: "shopping_personal", label: "Shopping & Personal", defaultMonthlyBudget: 180 },
  { id: "transport", label: "Transport", defaultMonthlyBudget: 120 },
  { id: "subscriptions_entertainment", label: "Subscriptions & Entertainment", defaultMonthlyBudget: 100 },
  { id: "rent_utilities", label: "Rent & Utilities", defaultMonthlyBudget: 900 },
  { id: "remittance_family", label: "Remittance / Family Support", defaultMonthlyBudget: 300 },
];

export function getCategoryByLabel(label: string): Category | undefined {
  return CATEGORIES.find((c) => c.label === label);
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
