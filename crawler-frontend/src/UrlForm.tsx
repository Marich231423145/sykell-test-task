import React, { useState } from 'react';

type Props = {
  onAddUrl: (url: string) => void;
};

export const UrlForm: React.FC<Props> = ({ onAddUrl }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAddUrl(url.trim());
      setUrl('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="url"
        placeholder="Enter URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <button type="submit">Add URL</button>
    </form>
  );
};
