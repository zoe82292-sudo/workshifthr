import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 50;

export function useTablePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    page: currentPage,
    setPage,
    pageItems,
    totalPages,
    totalItems: items.length,
    pageSize,
    showingFrom: items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
    showingTo: Math.min(currentPage * pageSize, items.length),
  };
}

type TablePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  showingFrom: number;
  showingTo: number;
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  totalPages,
  totalItems,
  showingFrom,
  showingTo,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="table-pagination">
      <span className="table-pagination__meta">
        Showing {showingFrom}–{showingTo} of {totalItems}
      </span>
      <div className="table-pagination__actions">
        <button
          type="button"
          className="button button-secondary button-small"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="table-pagination__page">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="button button-secondary button-small"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
