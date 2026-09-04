// lib/emi.ts
//
// EMI (Equated Monthly Installment) calculator using the standard
// reducing-balance formula, plus moratorium support (interest accrues
// and capitalizes into the principal during the moratorium period —
// the common approach for student loan deferment).
//
// Formula verified by hand against a $10,000 / 8% APR / 24-month test case
// before this file was written — see the module README for the numbers.

export type EmiScheduleEntry = {
  month: number;
  type: "moratorium" | "emi";
  emi?: number;
  interest: number;
  principalPaid?: number;
  balance: number;
};

export type LoanInput = {
  principal: number;
  annualRatePct: number;
  tenureMonths: number;
  moratoriumMonths?: number; // months at the START of the loan with no payment
  startDate: string;         // ISO date, first month of the loan (or first moratorium month)
};

export type LoanSchedule = {
  emi: number;               // the EMI amount charged for the post-moratorium months
  totalInterest: number;
  totalPayable: number;
  schedule: EmiScheduleEntry[];
};

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

/** Standard reducing-balance EMI formula. */
export function calcEMI(principal: number, annualRatePct: number, tenureMonths: number): number {
  const r = annualRatePct / 12 / 100;
  if (tenureMonths <= 0) throw new Error("tenureMonths must be > 0");
  if (r === 0) return round2(principal / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  return round2((principal * r * factor) / (factor - 1));
}

/** Full month-by-month schedule, including moratorium capitalization if requested. */
export function buildSchedule(loan: LoanInput): LoanSchedule {
  const { principal, annualRatePct, tenureMonths, moratoriumMonths = 0 } = loan;
  if (moratoriumMonths >= tenureMonths) {
    throw new Error("moratoriumMonths must be less than tenureMonths");
  }

  const r = annualRatePct / 12 / 100;
  let balance = principal;
  const schedule: EmiScheduleEntry[] = [];

  for (let m = 1; m <= moratoriumMonths; m++) {
    const interest = balance * r;
    balance += interest; // capitalized — added to principal, no cash payment made
    schedule.push({ month: m, type: "moratorium", interest: round2(interest), balance: round2(balance) });
  }

  const remainingTenure = tenureMonths - moratoriumMonths;
  const emi = calcEMI(balance, annualRatePct, remainingTenure);
  let totalInterest = schedule.reduce((sum, s) => sum + s.interest, 0);

  for (let m = 1; m <= remainingTenure; m++) {
    const interest = balance * r;
    const principalPaid = emi - interest;
    balance = Math.max(balance - principalPaid, 0);
    totalInterest += interest;
    schedule.push({
      month: moratoriumMonths + m,
      type: "emi",
      emi: round2(emi),
      interest: round2(interest),
      principalPaid: round2(principalPaid),
      balance: round2(balance),
    });
  }

  return {
    emi,
    totalInterest: round2(totalInterest),
    totalPayable: round2(principal + totalInterest),
    schedule,
  };
}

/** Attach real calendar dates to a schedule for the EMI calendar UI. */
export function withDates(schedule: EmiScheduleEntry[], startDate: string) {
  const start = new Date(startDate);
  return schedule.map((entry) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + (entry.month - 1));
    return { ...entry, date: d.toISOString().slice(0, 10) };
  });
}
