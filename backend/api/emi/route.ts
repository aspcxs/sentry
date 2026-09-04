// app/api/emi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { loanStore } from "@/backend/lib/store";
import { buildSchedule, withDates } from "@/backend/lib/emi";

export async function GET() {
  const loans = await loanStore.all();
  const withSchedules = loans.map((loan) => {
    const result = buildSchedule({
      principal: loan.principal,
      annualRatePct: loan.annualRatePct,
      tenureMonths: loan.tenureMonths,
      moratoriumMonths: loan.moratoriumMonths,
      startDate: loan.startDate,
    });
    return {
      ...loan,
      emi: result.emi,
      totalInterest: result.totalInterest,
      totalPayable: result.totalPayable,
      schedule: withDates(result.schedule, loan.startDate),
    };
  });
  return NextResponse.json({ loans: withSchedules });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { label, principal, annualRatePct, tenureMonths, moratoriumMonths, startDate } = body;

  if (typeof principal !== "number" || principal <= 0) {
    return NextResponse.json({ error: "principal must be a positive number" }, { status: 400 });
  }
  if (typeof tenureMonths !== "number" || tenureMonths <= 0) {
    return NextResponse.json({ error: "tenureMonths must be a positive number" }, { status: 400 });
  }

  const loan = await loanStore.add({
    id: randomUUID(),
    label: label ?? "Loan",
    principal,
    annualRatePct: annualRatePct ?? 0,
    tenureMonths,
    moratoriumMonths: moratoriumMonths ?? 0,
    startDate: startDate ?? new Date().toISOString().slice(0, 10),
  });

  return NextResponse.json({ loan }, { status: 201 });
}
