import React from 'react';
import { FlaskConical } from 'lucide-react';

export function SyntheticBadge({ label = 'SYNTHETIC DEMO DATA' }) {
  return (
    <span className="badge badge-synthetic" style={{ gap: '0.3rem' }}>
      <FlaskConical size={9} />
      {label}
    </span>
  );
}
