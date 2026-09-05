import { useEffect, useState } from "react";

// Purely client-side - these lists are small enough (hackathon scale) that
// fetching everything and slicing in the browser is simpler than teaching
// every list endpoint page/limit params for no real benefit yet.
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // If the underlying list shrinks (a filter changes, a row gets archived)
  // and the current page no longer exists, snap back to the last valid one.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return { page, setPage, totalPages, pageItems };
}
