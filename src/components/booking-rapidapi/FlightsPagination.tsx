import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Props {
  currentPage: number;
  totalCount: number | null;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/**
 * Paginação numérica para resultados de voos.
 * A API devolve ~15 voos por página (pageNo).
 */
export function FlightsPagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: Props) {
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : null;

  const go = (p: number) => {
    if (p < 1) return;
    if (totalPages && p > totalPages) return;
    onPageChange(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPages = (): (number | "ellipsis-prev" | "ellipsis-next")[] => {
    if (!totalPages) return [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis-prev" | "ellipsis-next")[] = [1];
    if (currentPage > 3) pages.push("ellipsis-prev");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let p = start; p <= end; p++) pages.push(p);
    if (currentPage < totalPages - 2) pages.push("ellipsis-next");
    pages.push(totalPages);
    return pages;
  };

  const pages = getPages();

  return (
    <div className="space-y-3 pt-4">
      {totalCount !== null && totalPages !== null && (
        <p className="text-xs text-muted-foreground text-center">
          Página <strong className="text-foreground">{currentPage}</strong> de{" "}
          <strong className="text-foreground">{totalPages.toLocaleString("pt-BR")}</strong> ·{" "}
          <strong className="text-foreground">{totalCount.toLocaleString("pt-BR")}</strong> voos no total
        </p>
      )}

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                go(currentPage - 1);
              }}
              className={
                currentPage <= 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {pages.map((p, idx) =>
            p === "ellipsis-prev" || p === "ellipsis-next" ? (
              <PaginationItem key={`${p}-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    go(p);
                  }}
                  isActive={p === currentPage}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          {!totalPages && (
            <PaginationItem>
              <PaginationLink href="#" isActive className="cursor-default">
                {currentPage}
              </PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                go(currentPage + 1);
              }}
              className={
                totalPages && currentPage >= totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
