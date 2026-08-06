import type React from 'react';

interface FieldLabelProps {
  children: React.ReactNode;
  /**
   * `id` pola, które ta etykieta opisuje. Pomijamy je tylko tam, gdzie pod
   * spodem nie ma jednego pola formularza (np. grupa przycisków wyboru sportu)
   * — wtedy renderujemy zwykły nagłówek, żeby nie tworzyć etykiety donikąd.
   */
  htmlFor?: string;
}

export default function FieldLabel({ children, htmlFor }: FieldLabelProps) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag htmlFor={htmlFor} style={{
      display: 'block',
      fontFamily: 'var(--font-display)', fontSize: '0.9rem',
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--co-dim)', marginBottom: 8,
    }}>
      {children}
    </Tag>
  );
}
