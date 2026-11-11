// In-memory localStorage so the persisted store works under Node tests.
const data = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k) => data.get(k) ?? null,
  setItem: (k, v) => void data.set(k, String(v)),
  removeItem: (k) => void data.delete(k),
  clear: () => data.clear(),
  key: (i) => [...data.keys()][i] ?? null,
  get length() {
    return data.size;
  },
} satisfies Storage;
