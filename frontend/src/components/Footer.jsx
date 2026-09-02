import React from 'react';
import { ShieldCheck, Lock, Hash, Layers } from 'lucide-react';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-tech-pills">
        <span className="footer-pill"><Hash size={10} /> SHA-256 Canonical Hashing</span>
        <span className="footer-pill"><ShieldCheck size={10} /> ECDSA-P256 / ML-DSA-65</span>
        <span className="footer-pill"><Layers size={10} /> Append-Only Ledger</span>
        <span className="footer-pill"><Lock size={10} /> Argon2id · Session Auth</span>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        UC-076 · Bhumi Abhilekha Land Records Integrity Platform · Not legally authoritative
      </p>
    </footer>
  );
}
