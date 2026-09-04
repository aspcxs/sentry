// app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { expenseStore } from "@/backend/lib/store";
import { convert, UnsupportedCurrencyError } from "@/backend/lib/currency";
import { getCategoryByLabel } from "@/backend/lib/categories";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const all = await expenseStore.all();
  const filtered = category ? all.filter((e) => e.category === category) : all;
  return NextResponse.json({ expenses: filtered });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amount, currency, category, date, note } = body;

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (!currency) {
    return NextResponse.json({ error: "currency is required" }, { status: 400 });
  }
  if (!getCategoryByLabel(category)) {
    return NextResponse.json({ error: `Unknown category: ${category}` }, { status: 400 });
  }

  let amountUsd: number;
  try {
    const result = await convert(amount, currency, "USD");
    amountUsd = result.amount;
  } catch (err) {
    if (err instanceof UnsupportedCurrencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "FX conversion failed, try again" }, { status: 502 });
  }

  const expense = await expenseStore.add({
    id: randomUUID(),
    amount,
    currency: currency.toUpperCase(),
    amountUsd,
    category,
    date: date ?? new Date().toISOString().slice(0, 10),
    note,
  });

  return NextResponse.json({ expense }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const removed = await expenseStore.remove(id);
  if (!removed) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
