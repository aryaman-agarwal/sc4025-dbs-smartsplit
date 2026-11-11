import type { ParsedReceipt } from "../domain/types";

/**
 * Demo receipts returned by the mock parser. Totals are internally consistent
 * (subtotal + 10% SC + 9% GST on both), except "smudged-receipt", which has a
 * deliberate $1 mismatch to demo the reconciliation warning (US-04).
 */
export const SAMPLE_RECEIPTS: { id: string; label: string; parsed: ParsedReceipt }[] = [
  {
    id: "jumbo-seafood",
    label: "Seafood dinner · 5 items",
    parsed: {
      merchant: "Jumbo Seafood (Riverside Point)",
      items: [
        { id: "i1", name: "Chilli crab (1kg)", priceCents: 9800 },
        { id: "i2", name: "Cereal prawns", priceCents: 3200 },
        { id: "i3", name: "Mantou (10 pcs)", priceCents: 800 },
        { id: "i4", name: "Kailan with garlic", priceCents: 1800 },
        { id: "i5", name: "Lime juice x3", priceCents: 1500 },
      ],
      serviceChargeCents: 1710,
      gstCents: 1693,
      detectedTotalCents: 20503,
      confidence: 0.92,
    },
  },
  {
    id: "hall-supper",
    label: "Hall supper · 4 items",
    parsed: {
      merchant: "Prata House (Jurong West)",
      items: [
        { id: "i1", name: "Plain prata x4", priceCents: 520 },
        { id: "i2", name: "Egg prata x2", priceCents: 360 },
        { id: "i3", name: "Maggi goreng", priceCents: 650 },
        { id: "i4", name: "Teh tarik x3", priceCents: 600 },
      ],
      serviceChargeCents: 213,
      gstCents: 211,
      detectedTotalCents: 2554,
      confidence: 0.81,
    },
  },
  {
    id: "smudged-receipt",
    label: "Smudged receipt · mismatch demo",
    parsed: {
      merchant: "Cafe (partially read)",
      items: [
        { id: "i1", name: "Flat white", priceCents: 650 },
        { id: "i2", name: "Big breakfast", priceCents: 2200 },
      ],
      serviceChargeCents: 285,
      gstCents: 282,
      detectedTotalCents: 3517,
      confidence: 0.48,
    },
  },
];
