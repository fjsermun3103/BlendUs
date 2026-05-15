import React from 'react';

interface Props {
  tags: string[];
  activeTag: string | null;
  onTagClick: (tag: string) => void;
}

export default function TagFilter({ tags, activeTag, onTagClick }: Props) {
  return (
    <div className="tag-list" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <span 
        className={`tag ${activeTag === null ? 'active' : ''}`}
        onClick={() => onTagClick('')}
        style={{
          cursor: 'pointer',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          background: activeTag === null ? 'var(--amber-600)' : 'var(--gray-100)',
          color: activeTag === null ? 'white' : 'var(--gray-700)',
          fontWeight: 600
        }}
      >
        All
      </span>
      {tags.map(tag => (
        <span 
          key={tag}
          className={`tag ${activeTag === tag ? 'active' : ''}`}
          onClick={() => onTagClick(tag)}
          style={{
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            background: activeTag === tag ? 'var(--amber-600)' : 'var(--gray-100)',
            color: activeTag === tag ? 'white' : 'var(--gray-700)',
            fontWeight: 600
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
