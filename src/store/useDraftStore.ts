import { create } from "zustand";
import type { ParsedReceipt, ReceiptItem } from "../domain/types";

/**
 * Temporary state carried from screen B (Add expense) to screen C (Assign
 * items). Not persisted: a refresh starts a new expense.
 */
interface DraftState {
  groupId?: string;
  merchant: string;
  items: ReceiptItem[];
  detectedTotalCents?: number;
  confidence?: number;
  /** True when OCR failed and the user is entering items by hand (US-04). */
  manual: boolean;
  receiptImageUrl?: string;
  startFromReceipt: (groupId: string, parsed: ParsedReceipt, imageUrl?: string) => void;
  startManual: (groupId: string, imageUrl?: string) => void;
  setItems: (items: ReceiptItem[]) => void;
  clear: () => void;
}

export const useDraftStore = create<DraftState>()((set) => ({
  merchant: "",
  items: [],
  manual: false,
  startFromReceipt: (groupId, parsed, receiptImageUrl) =>
    set({
      groupId,
      merchant: parsed.merchant,
      items: parsed.items.map((i) => ({ ...i, assignees: [] })),
      detectedTotalCents: parsed.detectedTotalCents,
      confidence: parsed.confidence,
      manual: false,
      receiptImageUrl,
    }),
  startManual: (groupId, receiptImageUrl) =>
    set({ groupId, merchant: "", items: [], detectedTotalCents: undefined, confidence: undefined, manual: true, receiptImageUrl }),
  setItems: (items) => set({ items }),
  clear: () => set({ groupId: undefined, merchant: "", items: [], detectedTotalCents: undefined, confidence: undefined, manual: false, receiptImageUrl: undefined }),
}));
