// app/api/fx/route.ts
//
// GET /api/fx?from=INR&to=USD&amount=5000

import { NextRequest, NextResponse } from "next/server";
import { convert, listSupportedCurrencies, UnsupportedCurrencyError } from "@/backend/lib/currency";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const amountParam = req.nextUrl.searchParams.get("amount");

  if (!from || !to) {
    // No from/to given — just return the supported currency list (for populating a <select>)
    const currencies = await listSupportedCurrencies();
    return NextResponse.json({ currencies });
  }

  const amount = amountParam ? parseFloat(amountParam) : 1;
  try {
    const result = await convert(amount, from, to);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnsupportedCurrencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "FX lookup failed" }, { status: 502 });
  }
}
