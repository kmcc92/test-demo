import { beforeEach, vi } from "vitest";

// Node.js 22 defines a non-functional localStorage stub that conflicts with jsdom.
// Replace it with an in-memory implementation so lib/ storage modules work in tests.
const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
  get length() {
    return Object.keys(store).length;
  },
});

beforeEach(() => {
  localStorage.clear();
});
