import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

type UrlItem = {
  id: number;
  url: string;
  status: string;
  title?: string;
  html_version?: string;
  internal_links?: number;
  external_links?: number;
  broken_links?: number;
  has_login_form?: boolean;
};

type Props = {
  urls: UrlItem[];
  loadingIds: number[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onRefresh: (id: number) => void;
  onStop: (id: number) => void;
};

type SortConfig = {
  key: keyof UrlItem;
  direction: 'asc' | 'desc';
};

export const UrlList: React.FC<Props> = ({
  urls,
  loadingIds,
  selectedIds,
  onToggleSelect,
  onRefresh,
  onStop,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loginFilter, setLoginFilter] = useState<'any' | 'yes' | 'no'>('any');

  // --- Новое состояние для пагинации ---
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // --- Новое состояние для сортировки ---
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Фильтрация по поиску и фильтрам
  const filteredUrls = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return urls.filter(url => {
      if (searchTerm) {
        const match =
          url.url.toLowerCase().includes(lowerSearch) ||
          (url.title && url.title.toLowerCase().includes(lowerSearch));
        if (!match) return false;
      }
      if (statusFilter && url.status !== statusFilter) return false;

      if (loginFilter === 'yes' && !url.has_login_form) return false;
      if (loginFilter === 'no' && url.has_login_form) return false;

      return true;
    });
  }, [urls, searchTerm, statusFilter, loginFilter]);

  // Сортировка
  const sortedUrls = useMemo(() => {
    if (!sortConfig) return filteredUrls;

    return [...filteredUrls].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      // Обработка undefined и null
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bVal == null) return sortConfig.direction === 'asc' ? 1 : -1;

      // Для строк
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Для чисел и булевых
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortConfig.direction === 'asc'
          ? (aVal === bVal ? 0 : aVal ? 1 : -1)
          : (aVal === bVal ? 0 : aVal ? -1 : 1);
      }

      return 0;
    });
  }, [filteredUrls, sortConfig]);

  // Пагинация — отрезаем нужную страницу
  const paginatedUrls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUrls.slice(start, start + pageSize);
  }, [sortedUrls, currentPage]);

  const totalPages = Math.ceil(sortedUrls.length / pageSize);

  // Обработчик сортировки по колонке
  const onSort = (key: keyof UrlItem) => {
    if (sortConfig?.key === key) {
      // Если уже сортируем по этому ключу — переключаем направление
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // Иначе сортируем по новому ключу по возрастанию
      setSortConfig({ key, direction: 'asc' });
    }
    setCurrentPage(1); // при смене сортировки сбрасываем страницу
  };

  return (
    <>
      {/* Фильтры */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search URL, Title..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginRight: '1rem' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ marginRight: '1rem' }}
        >
          <option value="">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="running">Running</option>
          <option value="done">Done</option>
          <option value="error">Error</option>
        </select>
        <select
          value={loginFilter}
          onChange={e => setLoginFilter(e.target.value as 'any' | 'yes' | 'no')}
        >
          <option value="any">Any Login Form</option>
          <option value="yes">Has Login Form</option>
          <option value="no">No Login Form</option>
        </select>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th onClick={() => onSort('url')} style={{ cursor: 'pointer' }}>
                URL {sortConfig?.key === 'url' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => onSort('status')} style={{ cursor: 'pointer' }}>
                Status {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => onSort('title')} style={{ cursor: 'pointer' }}>
                Title {sortConfig?.key === 'title' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => onSort('html_version')} style={{ cursor: 'pointer' }}>
                HTML Version {sortConfig?.key === 'html_version' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => onSort('internal_links')} style={{ cursor: 'pointer' }}>
                Internal Links {sortConfig?.key === 'internal_links' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => onSort('external_links')} style={{ cursor: 'pointer' }}>
                External Links {sortConfig?.key === 'external_links' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => onSort('broken_links')} style={{ cursor: 'pointer' }}>
                Broken Links {sortConfig?.key === 'broken_links' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => onSort('has_login_form')} style={{ cursor: 'pointer' }}>
                Login Form {sortConfig?.key === 'has_login_form' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUrls.map((url) => {
              const isLoading = loadingIds.includes(url.id);
              const isSelected = selectedIds.includes(url.id);

              return (
                <tr key={url.id} style={{ opacity: isLoading ? 0.5 : 1 }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(url.id)}
                      disabled={isLoading}
                    />
                  </td>
                  <td>
                    <Link to={`/urls/${url.id}`}>{url.url}</Link>
                  </td>
                  <td>{url.status}</td>
                  <td>{url.title || '-'}</td>
                  <td>{url.html_version || '-'}</td>
                  <td>{url.internal_links ?? '-'}</td>
                  <td>{url.external_links ?? '-'}</td>
                  <td>{url.broken_links ?? '-'}</td>
                  <td>{url.has_login_form ? 'Yes' : 'No'}</td>
                  <td>
                    <button
                      onClick={() => onRefresh(url.id)}
                      disabled={isLoading}
                      style={{ marginRight: '8px' }}
                      title="Refresh URL"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => onStop(url.id)}
                      disabled={isLoading}
                      style={{ color: 'orange' }}
                      title="Stop crawling"
                    >
                      ⏹️
                    </button>
                  </td>
                </tr>
              );
            })}

            {paginatedUrls.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center' }}>
                  No results found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      <div style={{ marginTop: '1rem', userSelect: 'none' }}>
        <button
          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          style={{ marginRight: '0.5rem' }}
        >
          ← Previous
        </button>

        {[...Array(totalPages)].map((_, i) => {
          const pageNum = i + 1;
          return (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              style={{
                fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                marginRight: '0.25rem',
              }}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          style={{ marginLeft: '0.5rem' }}
        >
          Next →
        </button>
      </div>
    </>
  );
};
