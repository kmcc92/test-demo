export interface CheckoutSession {
  certificateId: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  gasUsed: string;
  gasPrice: string;
}

function seededInt(n: number): number {
  return (((n * 1664525 + 1013904223) & 0x7fffffff) >>> 0);
}

function seededHex(seed: number, length: number): string {
  const chars = "0123456789abcdef";
  let s = seed;
  let out = "";
  for (let i = 0; i < length; i++) {
    s = seededInt(s);
    out += chars[s % 16];
  }
  return out;
}

// seed must be captured at event time (Date.now()), never computed during render.
export function generateCheckoutSession(productId: string, seed: number): CheckoutSession {
  const idHash = productId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const s1 = seededInt(seed ^ idHash);
  const txHash = `0x${seededHex(s1, 64)}`;
  const blockNumber = 24_000_000 + (s1 % 999_983);
  const certPart = seededHex(seededInt(s1 + 7), 8).toUpperCase();
  const certificateId = `TEST-${certPart.slice(0, 4)}-${certPart.slice(4)}`;

  return {
    certificateId,
    txHash,
    blockNumber,
    timestamp: new Date(seed).toISOString(),
    gasUsed: "247,832",
    gasPrice: "34 gwei",
  };
}
