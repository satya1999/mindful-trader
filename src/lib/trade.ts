export type Market = "forex" | "crypto" | "stocks";
export type Direction = "buy" | "sell";
export type EmotionBefore = "calm" | "fear" | "greed" | "fomo" | "revenge";
export type EmotionAfter = "satisfaction" | "regret" | "frustration" | "overconfidence";
export type Tag = "perfect_setup" | "mistake" | "emotional";

export const EMOTIONS_BEFORE: EmotionBefore[] = ["calm", "fear", "greed", "fomo", "revenge"];
export const EMOTIONS_AFTER: EmotionAfter[] = ["satisfaction", "regret", "frustration", "overconfidence"];
export const TAGS: { value: Tag; label: string }[] = [
  { value: "perfect_setup", label: "Perfect Setup" },
  { value: "mistake", label: "Mistake" },
  { value: "emotional", label: "Emotional Trade" },
];

export function calcRR(entry: number, sl: number, tp: number, direction: Direction): number | null {
  if (!entry || !sl || !tp) return null;
  const risk = direction === "buy" ? entry - sl : sl - entry;
  const reward = direction === "buy" ? tp - entry : entry - tp;
  if (risk <= 0 || reward <= 0) return null;
  return +(reward / risk).toFixed(2);
}

export function calcPnL(entry: number, exit: number, size: number, direction: Direction): number {
  const diff = direction === "buy" ? exit - entry : entry - exit;
  return +(diff * size).toFixed(2);
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(digits) + "%";
}

export const EMOTION_LABEL: Record<string, string> = {
  calm: "Calm", fear: "Fear", greed: "Greed", fomo: "FOMO", revenge: "Revenge",
  satisfaction: "Satisfaction", regret: "Regret", frustration: "Frustration", overconfidence: "Overconfidence",
};
