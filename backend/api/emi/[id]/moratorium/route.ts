// app/api/emi/[id]/moratorium/route.ts
//
// POST /api/emi/{loanId}/moratorium  { "moratoriumMonths": 6 }
// Updates the loan's moratorium period; the schedule is recalculated on
// every GET /api/emi read (buildSchedule is cheap — no need to persist it).

import { NextRequest, NextResponse } from "next/server";
import { loanStore } from "@/backend/lib/store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { moratoriumMonths } = body;

  if (typeof moratoriumMonths !== "number" || moratoriumMonths < 0) {
    return NextResponse.json({ error: "moratoriumMonths must be a non-negative number" }, { status: 400 });
  }

  const updated = await loanStore.update(params.id, { moratoriumMonths });
  if (!updated) {
    return NextResponse.json({ error: "loan not found" }, { status: 404 });
  }
  return NextResponse.json({ loan: updated });
}
