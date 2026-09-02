import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  FilePlus2,
  FileCheck2,
  FileText,
  Key,
  Database,
  Layers,
  ArrowRight,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge, PqcBadge } from '../components/StatusBadge';

export function OfficerDashboard({ onNavigate, onViewRecord, onVerifyRecord }) {
  const [stats, setStats] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOfficerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashData, recordsData] = await Promise.all([
        api.get('/api/security/dashboard'),
        api.get('/api/records?limit=6'),
      ]);
      setStats(dashData);
      setRecentRecords(recordsData.records || []);
    } catch (err) {
      setError(err.message || 'Failed to load officer dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficerData();
  }, []);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="grid-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw className="animate-spin" size={20} color="var(--sage)" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const total = stats?.total_records || 0;
  const verified = stats?.verified || 0;
  const pendingDocs = stats?.pending_documents || 0;
  const signedByMe = stats?.signed_by_me || stats?.verified || 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Officer Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
        color: 'white',
        padding: '1.5rem 1.75rem',
        border: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Registration Officer Portal
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>• Operational Zone: Active</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'white' }}>
            Land Records Registration & Issuance
          </h2>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.9, fontSize: '0.85rem', maxWidth: '600px' }}>
            Register new property deeds, enter cadastral survey details, sign digital records with cryptographic keys, and process pending document verifications.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            style={{
              background: 'white',
              color: '#0D47A1',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            onClick={() => onNavigate('register-land')}
          >
            <PlusCircle size={16} /> Register New Land
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid-4 stagger">
        <div className="stat-card" onClick={() => onNavigate('records')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-box" style={{ background: '#E3F2FD' }}>
            <Database size={20} color="#1565C0" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Total Registry Records</div>
            <div className="stat-value" style={{ color: '#1565C0' }}>{total.toLocaleString('en-IN')}</div>
            <div className="stat-sub">Active registry database</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box" style={{ background: '#E8F5E9' }}>
            <CheckCircle2 size={20} color="var(--color-verified)" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Signed & Verified</div>
            <div className="stat-value" style={{ color: 'var(--color-verified)' }}>{verified.toLocaleString('en-IN')}</div>
            <div className="stat-sub">Cryptographically signed</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('documents')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-box" style={{ background: '#FFF3E0' }}>
            <FileText size={20} color="#E65100" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Pending Title Deeds</div>
            <div className="stat-value" style={{ color: '#E65100' }}>{pendingDocs}</div>
            <div className="stat-sub">Awaiting verification</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box" style={{ background: 'var(--color-pqc-bg)' }}>
            <Key size={20} color="var(--color-pqc)" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Signing Key Status</div>
            <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--color-pqc)' }}>ACTIVE</div>
            <div className="stat-sub">ECDSA / Dilithium Ready</div>
          </div>
        </div>
      </div>

      {/* ── Quick Action Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div
          className="card"
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            borderLeft: '4px solid #1565C0',
            transition: 'all 0.2s ease',
          }}
          onClick={() => onNavigate('register-land')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlusCircle size={18} color="#1565C0" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Register New Land Record</h3>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Input owner details, cadastral survey, plot boundary, and generate canonical SHA-256 hash.
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            borderLeft: '4px solid var(--sage)',
            transition: 'all 0.2s ease',
          }}
          onClick={() => onNavigate('documents')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--color-verified-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCheck2 size={18} color="var(--color-verified)" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Verify Title Deeds</h3>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Upload PDF certificates, verify extracted metadata, and cross-match with ledger blocks.
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            borderLeft: '4px solid var(--color-pqc)',
            transition: 'all 0.2s ease',
          }}
          onClick={() => onNavigate('records')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--color-pqc-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={18} color="var(--color-pqc)" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Sign Unsigned Records</h3>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Inspect pending registration requests and digitally sign them to seal into the blockchain.
          </p>
        </div>
      </div>

      {/* ── Recent Registration Activity Table ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Recent Land Registrations</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
              Latest land records submitted and registered in the platform
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('records')}>
            View All Records ({total}) <ArrowRight size={13} />
          </button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Owner / Parcel</th>
                <th>Location / Postcode</th>
                <th>Consideration</th>
                <th>Tamper Status</th>
                <th>Signature</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.map(r => (
                <tr key={r.land_record_id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--forest)' }}>
                      {r.land_record_id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      {r.synthetic_demo?.owner_name || 'Registered Citizen'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {r.synthetic_demo?.parcel_id || 'PCL-DEFAULT'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem' }}>{r.property?.town_city || 'City'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {r.property?.postcode}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    ₹{((r.property?.price || 0) * 100).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <StatusBadge status={r.security?.tamper_status || 'PENDING_VERIFICATION'} />
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: r.security?.signature_status === 'VALID' ? 'var(--color-verified)' : 'var(--color-warning)',
                    }}>
                      {r.security?.signature_status === 'VALID' ? '✓ Signed' : '⚠ Pending'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => onViewRecord(r.land_record_id)}
                      >
                        Inspect
                      </button>
                      <button
                        className="btn btn-primary btn-xs"
                        onClick={() => onVerifyRecord(r.land_record_id)}
                      >
                        Verify
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
