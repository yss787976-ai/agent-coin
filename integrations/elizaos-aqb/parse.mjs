export const PAY_RE = /\bpay\s+(\d+(?:\.\d+)?)\s*AQB\s+to\s+(0x[0-9a-fA-F]{40})\b/i;

export function parsePayCommand(text) {
  const m = String(text || "").match(PAY_RE);
  if (!m) return null;
  return { amount: m[1], to: m[2] };
}
