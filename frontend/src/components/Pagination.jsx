import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 50,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(totalItems, currentPage * pageSize)

  const handlePage = (p) => {
    if (p >= 1 && p <= totalPages && p !== currentPage) {
      onPageChange(p)
    }
  }

  // Calculate visible page range (e.g. max 5 buttons)
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - 2)
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  if (totalItems <= pageSize && pageSizeOptions.length <= 1) {
    return null
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '10px',
        fontSize: '12px',
        color: '#475569',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>
          Showing <strong>{startItem.toLocaleString('en-IN')}</strong> to{' '}
          <strong>{endItem.toLocaleString('en-IN')}</strong> of{' '}
          <strong>{totalItems.toLocaleString('en-IN')}</strong> records
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          onClick={() => handlePage(1)}
          disabled={currentPage <= 1}
          title="First Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
            color: currentPage <= 1 ? '#94a3b8' : '#1e293b',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          type="button"
          onClick={() => handlePage(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
            color: currentPage <= 1 ? '#94a3b8' : '#1e293b',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={14} />
        </button>

        {getPageNumbers().map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handlePage(num)}
            style={{
              minWidth: '28px',
              height: '26px',
              padding: '0 6px',
              borderRadius: '4px',
              border: num === currentPage ? '1px solid #2563eb' : '1px solid #cbd5e1',
              background: num === currentPage ? '#2563eb' : '#ffffff',
              color: num === currentPage ? '#ffffff' : '#334155',
              fontWeight: num === currentPage ? '700' : '500',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          onClick={() => handlePage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Next Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
            color: currentPage >= totalPages ? '#94a3b8' : '#1e293b',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => handlePage(totalPages)}
          disabled={currentPage >= totalPages}
          title="Last Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
            color: currentPage >= totalPages ? '#94a3b8' : '#1e293b',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}
