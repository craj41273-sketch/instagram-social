import { MAX_TRUST_FILL, TRUST_DENOMINATOR_FACTOR } from "@/lib/privacy/constants";

/** MIN(100, (valid hypes / (eligible users × 0.20)) × 100), rounded to an integer. */
export function calculateTrustFillPercent(
  validHypes: number,
  eligibleUsers: number,
): number {
  const denominator = eligibleUsers * TRUST_DENOMINATOR_FACTOR;
  return denominator > 0
    ? Math.min(MAX_TRUST_FILL, Math.round((validHypes / denominator) * 100))
    : 0;
}
