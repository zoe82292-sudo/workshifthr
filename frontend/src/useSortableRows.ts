import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

type SortableValue = string | number | null | undefined;

function compareValues(a: SortableValue, b: SortableValue, direction: SortDirection): number {
  const left = a ?? "";
  const right = b ?? "";
  if (typeof left === "number" && typeof right === "number") {
    return direction === "asc" ? left - right : right - left;
  }
  const leftText = String(left).toLowerCase();
  const rightText = String(right).toLowerCase();
  if (leftText < rightText) return direction === "asc" ? -1 : 1;
  if (leftText > rightText) return direction === "asc" ? 1 : -1;
  return 0;
}

export function useSortableRows<T extends object>(
  rows: T[],
  defaultKey?: keyof T,
) {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((left, right) =>
      compareValues(
        left[sortKey] as SortableValue,
        right[sortKey] as SortableValue,
        sortDirection,
      ),
    );
  }, [rows, sortKey, sortDirection]);

  function toggleSort(key: keyof T) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  function sortLabel(key: keyof T, label: string) {
    if (sortKey !== key) return label;
    return `${label} ${sortDirection === "asc" ? "↑" : "↓"}`;
  }

  return { sortedRows, sortKey, sortDirection, toggleSort, sortLabel };
}
