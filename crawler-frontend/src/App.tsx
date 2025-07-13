import React, { useState, useEffect } from 'react';
import { UrlForm } from './UrlForm';
import { UrlList } from './UrlList';
import { UrlDetails } from './UrlDetails';
import './App.css';
import { Routes, Route } from 'react-router-dom';

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
  is_active?: boolean;
};

const App: React.FC = () => {
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchUrls = async () => {
    try {
      const res = await fetch('http://localhost:8080/urls');
      if (!res.ok) throw new Error('Failed to fetch URLs');
      const data = await res.json();
      setUrls(data);
    } catch (error) {
      alert('Error fetching URLs');
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const addUrl = async (url: string) => {
    try {
      const res = await fetch('http://localhost:8080/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error('Failed to add URL');
      await fetchUrls();
    } catch (error) {
      alert('Error adding URL');
    }
  };

  const refreshUrl = async (id: number) => {
    setLoadingIds((prev) => [...prev, id]);
    try {
      const res = await fetch(`http://localhost:8080/urls/${id}/refresh`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to refresh URL');
      await fetchUrls();
    } catch (error) {
      alert('Failed to refresh URL');
    } finally {
      setLoadingIds((prev) => prev.filter((loadingId) => loadingId !== id));
    }
  };

  const handleStop = async (id: number) => {
    setLoadingIds((prev) => [...prev, id]);
    try {
      const res = await fetch(`http://localhost:8080/urls/${id}/stop`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to stop crawling');
      await fetchUrls();
      setUrls((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, is_active: false } : u
        )
      );
    } catch (error) {
      alert('Error stopping crawling');
    } finally {
      setLoadingIds((prev) => prev.filter((loadingId) => loadingId !== id));
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const deleteSelectedUrls = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.length} selected URLs?`
      )
    )
      return;

    setLoadingIds((prev) => [...prev, ...selectedIds]);

    try {
      for (const id of selectedIds) {
        const res = await fetch(`http://localhost:8080/urls/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(`Failed to delete URL with id ${id}`);
      }
      await fetchUrls();
      clearSelection();
    } catch (error: any) {
      alert(error.message || 'Failed to delete selected URLs');
    } finally {
      setLoadingIds((prev) =>
        prev.filter((id) => !selectedIds.includes(id))
      );
    }
  };

  const refreshSelectedUrls = async () => {
    if (selectedIds.length === 0) return;

    setLoadingIds((prev) => [...prev, ...selectedIds]);

    try {
      for (const id of selectedIds) {
        const res = await fetch(`http://localhost:8080/urls/${id}/refresh`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error(`Failed to refresh URL with id ${id}`);
      }
      await fetchUrls();
      clearSelection();
    } catch (error: any) {
      alert(error.message || 'Failed to refresh selected URLs');
    } finally {
      setLoadingIds((prev) =>
        prev.filter((id) => !selectedIds.includes(id))
      );
    }
  };

  return (
    <div className="container">
      <h1>URL Crawler Dashboard</h1>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <UrlForm onAddUrl={addUrl} />

              <div style={{ margin: '1rem 0' }}>
                <button
                  onClick={refreshSelectedUrls}
                  disabled={selectedIds.length === 0}
                >
                  Refresh Selected ({selectedIds.length})
                </button>

                <button
                  onClick={deleteSelectedUrls}
                  disabled={selectedIds.length === 0}
                  style={{ marginLeft: '1rem', color: 'red' }}
                >
                  Delete Selected ({selectedIds.length})
                </button>
              </div>

              <UrlList
                urls={urls}
                loadingIds={loadingIds}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectId}
                onRefresh={refreshUrl}
                onStop={handleStop}
              />
            </>
          }
        />
        <Route path="/urls/:id" element={<UrlDetails />} />
      </Routes>
    </div>
  );
};

export default App;
