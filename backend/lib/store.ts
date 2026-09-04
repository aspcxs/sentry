// lib/store.ts
//
// ARCHITECTURE NOTE — read this before deploying:
// This is a JSON-file-backed store. It's the fastest way to get a working
// full-stack demo running locally (`npm run dev`) with zero setup — no DB
// to provision in a one-week timeline.
//
// It will NOT persist correctly if deployed to Vercel (or most serverless
// hosts): their filesystem is read-only/ephemeral in production, so writes
// here disappear between requests. This mirrors the same serverless
// constraint that made Sidharth precompute Prophet forecasts instead of
// running them live — same category of risk, different module.
//
// If this needs to be live (not just demoed locally) before submission,
// swap this file for a real store — Supabase, Turso, or Vercel KV all have
// free tiers and a similar get/set shape to what's here. Nothing above this
// layer (API routes, components) needs to change if the function signatures
// below stay the same.

import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "backend", "data");

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

export type Expense = {
  id: string;
  amount: number;
  currency: string;
  amountUsd: number;      // converted at entry time, for cross-category aggregation
  category: string;       // must match a label in lib/categories.ts
  date: string;            // ISO date
  note?: string;
};

export type Loan = {
  id: string;
  label: string;
  principal: number;
  annualRatePct: number;
  tenureMonths: number;
  moratoriumMonths: number;
  startDate: string;
};

export const expenseStore = {
  all: () => readJson<Expense[]>("expenses.json", []),
  add: async (expense: Expense) => {
    const all = await readJson<Expense[]>("expenses.json", []);
    all.push(expense);
    await writeJson("expenses.json", all);
    return expense;
  },
  remove: async (id: string) => {
    const all = await readJson<Expense[]>("expenses.json", []);
    const next = all.filter((e) => e.id !== id);
    await writeJson("expenses.json", next);
    return next.length !== all.length;
  },
};

export const loanStore = {
  all: () => readJson<Loan[]>("loans.json", []),
  add: async (loan: Loan) => {
    const all = await readJson<Loan[]>("loans.json", []);
    all.push(loan);
    await writeJson("loans.json", all);
    return loan;
  },
  update: async (id: string, patch: Partial<Loan>) => {
    const all = await readJson<Loan[]>("loans.json", []);
    const idx = all.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch };
    await writeJson("loans.json", all);
    return all[idx];
  },
};
