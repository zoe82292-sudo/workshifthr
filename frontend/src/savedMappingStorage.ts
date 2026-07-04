import type { ColumnMapping } from "./types";

const LOCAL_KEY = "shiftworkshr:savedColumnMapping";

export function loadLocalColumnMapping(): ColumnMapping | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ColumnMapping;
  } catch {
    return null;
  }
}

export function saveLocalColumnMapping(mapping: ColumnMapping): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(mapping));
}
