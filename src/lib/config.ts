/**
 * Platform fee percentage taken by PartyTap on each released Work Tab payment.
 * Change here (and the PLATFORM_FEE_PERCENT Supabase secret) to adjust.
 */
export const PLATFORM_FEE_PERCENT = 8;

export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
}

export function calculateNetPayout(amount: number): number {
  return Math.round((amount - calculatePlatformFee(amount)) * 100) / 100;
}
