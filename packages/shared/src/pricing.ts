import type { BookingQuote, BookingQuoteInput, Money, PricingRule } from "./types.js";
import { toTime } from "./availability.js";

const currency = "KES" as const;

function money(amount: number): Money {
  return { amount: Math.round(amount), currency };
}

function calculateUnits(rule: PricingRule, start: string, end: string): number {
  const durationMs = toTime(end) - toTime(start);
  const hours = durationMs / (1000 * 60 * 60);

  if (rule.billingMetric === "hourly") {
    return Math.max(rule.minimumUnits, Math.ceil(hours));
  }

  if (rule.billingMetric === "daily") {
    return Math.max(rule.minimumUnits, Math.ceil(hours / 24));
  }

  if (rule.billingMetric === "weekly") {
    return Math.max(rule.minimumUnits, Math.ceil(hours / (24 * 7)));
  }

  return Math.max(rule.minimumUnits, 1);
}

export function calculateBookingQuote(input: BookingQuoteInput): BookingQuote {
  const rule = input.listing.modeRules.find((candidate) => candidate.mode === input.mode);
  if (!rule) {
    throw new Error(`Listing ${input.listing.id} does not support mode ${input.mode}`);
  }

  const units = calculateUnits(rule.pricing, input.start, input.end);
  const rentalFee = money(units * rule.pricing.rate.amount);
  const platformFee = money(rentalFee.amount * rule.pricing.platformFeeRate);
  const deposit = rule.requiresDeposit ? money(rule.pricing.deposit?.amount ?? 0) : money(0);

  return {
    mode: input.mode,
    units,
    rentalFee,
    platformFee,
    deposit,
    totalDueNow: money(rentalFee.amount + platformFee.amount + deposit.amount)
  };
}
