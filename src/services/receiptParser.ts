import type { ParsedReceipt } from "../domain/types";
import { SAMPLE_RECEIPTS } from "../data/sampleReceipts";

/**
 * Receipt OCR interface (US-04).
 *
 * The MVP uses MockReceiptParser so the demo needs no API keys. To use a real
 * model later (e.g. a vision LLM, Donut or LayoutLM behind an API), write a
 * class that implements ReceiptParser and swap it in `receiptParser` below.
 * Nothing else in the app needs to change.
 */
export interface ReceiptParser {
  /** Parse an uploaded photo. Throw to trigger the manual-entry fallback. */
  parseImage(file: File): Promise<ParsedReceipt>;
  /** Parse one of the bundled demo receipts by id. */
  parseSample(sampleId: string): Promise<ParsedReceipt>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockReceiptParser implements ReceiptParser {
  constructor(private latencyMs = 1200) {}

  async parseSample(sampleId: string): Promise<ParsedReceipt> {
    await delay(this.latencyMs);
    const sample = SAMPLE_RECEIPTS.find((s) => s.id === sampleId);
    if (!sample) throw new Error("We couldn't read this receipt. Enter the items manually.");
    return structuredClone(sample.parsed);
  }

  /**
   * A real photo can't be parsed offline. The mock matches a demo receipt if
   * the file name contains its id (e.g. "jumbo-seafood.jpg"); otherwise it
   * fails so the team can demo the manual fallback.
   */
  async parseImage(file: File): Promise<ParsedReceipt> {
    const match = SAMPLE_RECEIPTS.find((s) => file.name.toLowerCase().includes(s.id));
    if (match) return this.parseSample(match.id);
    await delay(this.latencyMs);
    throw new Error("We couldn't read this receipt. Enter the items manually.");
  }
}

export const receiptParser: ReceiptParser = new MockReceiptParser();
