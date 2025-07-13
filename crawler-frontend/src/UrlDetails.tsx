import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LinksChart } from './LinksChart'; // Импортируем компонент графика

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
  broken_links_list?: { broken_url: string; status_code: number }[];
};

export const UrlDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [urlData, setUrlData] = useState<UrlItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchUrlDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8080/urls/${id}`);
        if (!res.ok) throw new Error('Failed to fetch URL details');
        const data = await res.json();
        setUrlData(data);
      } catch {
        alert('Error fetching URL details');
      } finally {
        setLoading(false);
      }
    };

    fetchUrlDetails();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!urlData) return <p>No details found for this URL.</p>;

  const internal = urlData.internal_links ?? 0;
  const external = urlData.external_links ?? 0;
  const broken = urlData.broken_links ?? 0;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Details for URL: {urlData.url}</h2>
      <p><strong>Status:</strong> {urlData.status}</p>
      <p><strong>Title:</strong> {urlData.title || '-'}</p>
      <p><strong>HTML Version:</strong> {urlData.html_version || '-'}</p>
      <p><strong>Internal Links:</strong> {internal}</p>
      <p><strong>External Links:</strong> {external}</p>
      <p><strong>Broken Links:</strong> {broken}</p>
      <p><strong>Has Login Form:</strong> {urlData.has_login_form ? 'Yes' : 'No'}</p>

      <h3>Link Distribution</h3>
      <LinksChart internal={internal} external={external} broken={broken} />

      {urlData.broken_links_list && urlData.broken_links_list.length > 0 && (
        <>
          <h3>Broken Links</h3>
          <ul>
            {urlData.broken_links_list.map((link, i) => (
              <li key={i}>
                <a href={link.broken_url} target="_blank" rel="noreferrer">{link.broken_url}</a> — {link.status_code}
              </li>
            ))}
          </ul>
        </>
      )}

      <Link to="/">← Back to list</Link>
    </div>
  );
};
