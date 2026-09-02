import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Clock, Key, Layers, Hash } from 'lucide-react';

export function StatusBadge({ status }) {
  const map = {
    VERIFIED:             { cls: 'badge-verified',  label: '✓ VERIFIED',          icon: CheckCircle2 },
    AUTHENTIC:            { cls: 'badge-verified',  label: '✓ AUTHENTIC',          icon: CheckCircle2 },
    HASH_MISMATCH:        { cls: 'badge-tampered',  label: '✕ HASH MISMATCH',      icon: XCircle },
    TAMPERED:             { cls: 'badge-tampered',  label: '✕ TAMPERED',           icon: XCircle },
    SIGNATURE_INVALID:    { cls: 'badge-tampered',  label: '✕ SIGNATURE INVALID',  icon: XCircle },
    LEDGER_BROKEN:        { cls: 'badge-tampered',  label: '✕ LEDGER BROKEN',      icon: XCircle },
    SUSPICIOUS:           { cls: 'badge-tampered',  label: '⚠ SUSPICIOUS',         icon: AlertTriangle },
    CANCELED:             { cls: 'badge-tampered',  label: '✕ CANCELED',           icon: XCircle },
    DISPUTED:             { cls: 'badge-warning',   label: '⚠ DISPUTED',           icon: AlertTriangle },
    UNDER_DISPUTE:        { cls: 'badge-warning',   label: '⚠ UNDER DISPUTE',      icon: AlertTriangle },
    DUPLICATE_FLAGGED:    { cls: 'badge-tampered',  label: '⚠ DUPLICATE SUSPECT',  icon: AlertTriangle },
    PENDING_VERIFICATION: { cls: 'badge-pending',   label: '⧗ PENDING',            icon: Clock },
    PENDING:              { cls: 'badge-pending',   label: '⧗ PENDING',            icon: Clock },
    VALID:                { cls: 'badge-verified',  label: '✓ VALID',              icon: CheckCircle2 },
    INVALID:              { cls: 'badge-tampered',  label: '✕ INVALID',            icon: XCircle },
    EMPTY:                { cls: 'badge-pending',   label: '— EMPTY',              icon: Clock },
    NOT_SIGNED:           { cls: 'badge-pending',   label: '⧗ UNSIGNED',           icon: Clock },
    COMPROMISED:          { cls: 'badge-tampered',  label: '✕ COMPROMISED',        icon: XCircle },
  };

  const cfg = map[status] || { cls: 'badge-pending', label: status || '—', icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.cls}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

export function PqcBadge({ algorithm }) {
  if (!algorithm) return <span className="badge badge-pending"><Clock size={10} /> UNSIGNED</span>;
  const isReal = algorithm.includes('ML-DSA') || algorithm.includes('FIPS');
  return (
    <span className={`badge ${isReal ? 'badge-pqc' : 'badge-warning'}`} title={algorithm}>
      <Key size={10} />
      {isReal ? 'ML-DSA-65' : 'ECDSA-P256'}
    </span>
  );
}

export function TamperStatusBadge({ status }) {
  return <StatusBadge status={status} />;
}
