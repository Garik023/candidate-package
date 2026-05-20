interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}

export function Pagination({ total, limit, offset, onPageChange }: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (offset > 0) {
      onPageChange(Math.max(0, offset - limit));
    }
  };

  const handleNext = () => {
    if (offset + limit < total) {
      onPageChange(offset + limit);
    }
  };

  const handlePageClick = (page: number) => {
    onPageChange((page - 1) * limit);
  };

  const getVisiblePages = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="pagination">
      <button
        className="btn btn-sm"
        onClick={handlePrev}
        disabled={offset === 0}
      >
        ← Prev
      </button>
      
      <div className="pagination-pages">
        {getVisiblePages().map((page) => (
          <button
            key={page}
            className={`btn btn-sm ${page === currentPage ? 'btn-primary' : ''}`}
            onClick={() => handlePageClick(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        className="btn btn-sm"
        onClick={handleNext}
        disabled={offset + limit >= total}
      >
        Next →
      </button>

      <span className="pagination-info">
        {offset + 1}-{Math.min(offset + limit, total)} of {total}
      </span>
    </div>
  );
}
