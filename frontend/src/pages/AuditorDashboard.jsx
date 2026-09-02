import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  ShieldCheck,
  AlertTriangle,
  Layers,
  History,
  FileCheck2,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Download,
  Lock,
  Search,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function AuditorDashboard({ onNavigate, onViewRecord, onVerifyRecord }) {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const [ledgerResult, setLedgerResult] = useState(null);

  const fetchAuditorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashData, alertsData] = await Promise.all([
        api.get('/api/security/dashboard'),
        api.get('/api/security/alerts?limit=5'),
      ]);
      setStats(dashData);
      setAlerts(alertsData.alerts || []);
    } catch (err) {
      setError(err.message || 'Failed to load auditor dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditorData();
  }, []);

  const handleRunLedgerAudit = async () => {
    try {
      setVerifyingLedger(true);
      const res = await api.get('/api/ledger/verify');
      setLedgerResult(res);
      await fetchAuditorData();
    } catch (err) {
      console.error('Ledger verification failed:', err);
    } finally {
      setVerifyingLedger(false);
    }
  };

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
  const tampered = stats?.tampered || 0;
  const invalidSig = stats?.invalid_signatures || 0;
  const isLedgerOk = stats?.ledger?.status === 'VERIFIED';
  const pending = Math.max(0, total - verified - tampered);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Auditor Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #E65100 0%, #BF360C 100%)',
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
              Independent Audit Console
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>• Scope: Full Read & Verify Authority</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'white' }}>
            Cryptographic Integrity & Chain Verification
          </h2>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.9, fontSize: '0.85rem', maxWidth: '640px' }}>
            Perform non-destructive mathematical verification across all canonical SHA-256 hashes, post-quantum digital signatures, ledger block hashes, and chronological audit entries.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            style={{
              background: 'white',
              color: '#BF360C',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            onClick={handleRunLedgerAudit}
            disabled={verifyingLedger}
          >
            <RefreshCw size={15} className={verifyingLedger ? 'animate-spin' : ''} />
            {verifyingLedger ? 'Verifying Chain...' : 'Run Ledger Audit'}
          </button>
        </div>
      </div>

      {ledgerResult && (
        <div className={`alert ${ledgerResult.status === 'VERIFIED' ? 'alert-success' : 'alert-danger'} animate-fade-in`}>
          <ShieldCheck size={18} />
          <div>
            <strong>Ledger Verification Completed:</strong> Verified {ledgerResult.verified_blocks} of {ledgerResult.total_blocks} blocks.
            Status: <span style={{ fontWeight: 700 }}>{ledgerResult.status}</span>.
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid-4 stagger">
        <div className="stat-card" onClick={() => onNavigate('records')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-box" style={{ background: '#E8F5E9' }}>
            <CheckCircle2 size={20} color="var(--color-verified)" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Verified Intact Records</div>
            <div className="stat-value" style={{ color: 'var(--color-verified)' }}>{verified.toLocaleString('en-IN')}</div>
            <div className="stat-sub">Passed 5-stage verification</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('security-reports')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-box" style={{ background: tampered > 0 ? '#FFEBEE' : '#E8F5E9' }}>
            {tampered > 0 ? <AlertTriangle size={20} color="var(--color-tampered)" /> : <ShieldCheck size={20} color="var(--color-verified)" />}
          </div>
          <div className="stat-body">
            <div className="stat-label">Tamper Discrepancies</div>
            <div className="stat-value" style={{ color: tampered > 0 ? 'var(--color-tampered)' : 'var(--color-verified)' }}>
              {tampered}
            </div>
            <div className="stat-sub">{tampered > 0 ? 'Cryptographic mismatch flagged' : 'No compromises detected'}</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('ledger')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-box" style={{ background: isLedgerOk ? 'var(--color-verified-bg)' : 'var(--color-tampered-bg)' }}>
            <Layers size={20} color={isLedgerOk ? 'var(--color-verified)' : 'var(--color-tampered)'} />
          </div>
          <div className="stat-body">
            <div className="stat-label">Ledger Chain Integrity</div>
            <div className="stat-value" style={{ color: isLedgerOk ? 'var(--color-verified)' : 'var(--color-tampered)' }}>
              {stats?.ledger_integrity_pct ?? 100}%
            </div>
            <div className="stat-sub">{isLedgerOk ? 'Genesis block hash unbroken' : 'Chain broken at block'}</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('audit')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-box" style={{ background: '#FFF3E0' }}>
            <History size={20} color="#E65100" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Audit Logs Logged</div>
            <div className="stat-value" style={{ color: '#E65100' }}>Active</div>
            <div className="stat-sub">Append-only ODM enforcement</div>
          </div>
        </div>
      </div>

      {/* ── Auditor Tasks & Tools Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div
          className="card"
          style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid #E65100' }}
          onClick={() => onNavigate('verify')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCheck2 size={18} color="#E65100" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>5-Stage Verification</h3>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Recompute canonical SHA-256 hash, verify post-quantum signature against public key, check ledger ancestry & risk flags.
          </p>
        </div>

        <div
          className="card"
          style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid var(--color-info)' }}
          onClick={() => onNavigate('ledger')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--color-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={18} color="var(--color-info)" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Ledger Chain Inspector</h3>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Walk backward from latest block to genesis, validating that each block's previous_hash matches the SHA-256 of its parent.
          </p>
        </div>

        <div
          className="card"
          style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid var(--color-pqc)' }}
          onClick={() => onNavigate('security-reports')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--color-pqc-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} color="var(--color-pqc)" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Audit Security Reports</h3>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Review tamper simulations, signature invalidations, and export certified compliance audit reports for government regulators.
          </p>
        </div>
      </div>

      {/* ── Recent Security Alerts Review ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Active Integrity & Security Alerts</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
              Real-time anomaly detections recorded across registry operations
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('security-reports')}>
            View All Reports <ArrowRight size={13} />
          </button>
        </div>

        {alerts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} color="var(--color-verified)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--forest)', margin: 0 }}>
              Zero Cryptographic Anomalies Detected
            </p>
            <p style={{ fontSize: '0.78rem', margin: '0.25rem 0 0' }}>
              All records, signatures, and blocks match their expected mathematical states.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.map(a => (
              <div
                key={a.alert_id}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'var(--color-tampered-bg)' : 'var(--color-warning-bg)',
                  border: `1px solid ${a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'var(--color-tampered-border)' : 'var(--color-warning-border)'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <AlertTriangle size={18} color={a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'var(--color-tampered)' : 'var(--color-warning)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {a.title || a.alert_type}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(a.detected_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                    {a.description}
                  </p>
                  {a.land_record_id && (
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        Target: {a.land_record_id}
                      </span>
                      <button
                        className="btn btn-outline btn-xs"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.68rem' }}
                        onClick={() => onVerifyRecord(a.land_record_id)}
                      >
                        Run Verification
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
