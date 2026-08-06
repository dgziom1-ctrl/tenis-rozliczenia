import type React from 'react';

interface FieldLabelProps {
  children: React.ReactNode;
}

export default function FieldLabel({ children }: FieldLabelProps) {
  return (
    <label style={{
      display: 'block',
      fontFamily: 'var(--font-display)', fontSize: '0.9rem',
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--co-dim)', marginBottom: 8,
    }}>
      {children}
    </label>
  );
}
