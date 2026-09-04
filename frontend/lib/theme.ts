// frontend/lib/theme.ts
//
// Same tokens used in Sidharth's OverspendForecastChart.tsx, pulled out here
// so this module matches without copy-pasting hex codes around. Worth
// eventually having ALL frontend modules (including Sidharth's and Alen's)
// import from one shared theme file so a palette tweak only happens once.

export const INK = "#14171F";
export const PAPER = "#F7F5EF";
export const RULE = "#D9D4C7";
export const ROW_HIGHLIGHT = "#EFEBDD";
export const RISK_HIGH = "#A0330F";
export const RISK_MED = "#8A6116";
export const RISK_SAFE = "#2F5D45";
export const MONO = "'IBM Plex Mono', ui-monospace, monospace";
export const SANS = "'IBM Plex Sans', system-ui, sans-serif";

export function riskColor(percentUsed: number): string {
  if (percentUsed >= 100) return RISK_HIGH;
  if (percentUsed >= 75) return RISK_MED;
  return RISK_SAFE;
}
