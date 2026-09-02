import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  ShieldCheck, Search, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Key, Layers, Hash, ArrowLeft, ArrowRight,
  ShieldAlert, Clock
} from 'lucide-react';
import { StatusBadge, PqcBadge } from '../components/StatusBadge';

export function VerifyRecord({ initialRecordId = '', onViewRecord }) {
  const [recordIdInput, setRecordIdInput] = useState(initialRecordId || 'LR-000001');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialRecordId) {
      setRecordIdInput(initialRecordId);
      runVerification(initialRecordId);
    }
  }, [initialRecordId]);

  const runVerification = async (targetId = recordIdInput) => {
    if (!targetId?.trim()) return;
    try {
      setVerifying(true);
      setError(null);
      setResult(null);
      const data = await api.post(`/api/records/${targetId.trim()}/verify`, {});
      setResult(data);
    } catch (err) {
      setError(err.message || 'Verification execution failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    runVerification();
  };

  const isPass = result?.status === 'VERIFIED';
  const steps = result?.steps || {};

  const pipelineSteps = [
    {
      label: 'Raw Fields',
      sublabel: 'Source',
      icon: Hash,
      status: result ? 'pass' : 'pending',
      detail: 'Current property field values used as canonical input',
    },
    {
      label: 'SHA-256',
      sublabel: 'Hashing',
      icon: Key,
      status: result ? (steps.hash_recomputed ? 'pass' : 'fail') : 'pending',
      detail: steps.hash_recomputed
        ? steps.hash_recomputed.slice(0, 16) + '…'
        : 'Not yet computed',
    },
    {
      label: 'Hash Check',
      sublabel: 'Comparison',
      icon: steps.hash_match ? CheckCircle2 : XCircle,
      status: result ? (steps.hash_match ? 'pass' : 'fail') : 'pending',
      detail: result ? (steps.hash_match ? 'Hash matches stored value' : 'MISMATCH — tamper detected!') : '—',
    },
    {
      label: 'PQC Signature',
      sublabel: 'Cryptography',
      icon: Key,
      status: result ? (steps.signature_valid ? 'pass' : 'fail') : 'pending',
      detail: result ? (steps.signature_valid ? 'Signature VALID' : 'Signature INVALID') : '—',
    },
    {
      label: 'Ledger Chain',
      sublabel: 'Blockchain',
      icon: Layers,
      status: result ? (steps.ledger_status === 'VERIFIED' ? 'pass' : 'fail') : 'pending',
      detail: result ? `${steps.ledger_detail?.verified_blocks || 0} blocks verified` : '—',
    },
    {
      label: 'Final Verdict',
      sublabel: 'Outcome',
      icon: isPass ? CheckCircle2 : (result ? XCircle : Clock),
      status: result ? (isPass ? 'pass' : 'fail') : 'pending',
      detail: result ? result.status : 'Awaiting verification',
    },
  ];

  const statusColors = {
    pass: 'var(--color-verified)',
    fail: 'var(--color-tampered)',
    pending: 'var(--text-muted)',
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={24} color="var(--forest)" />
            Record Verification Engine
          </h1>
          <p className="page-subtitle">
            Execute the full 5-stage cryptographic pipeline: fresh SHA-256 recomputation from raw fields, PQC signature check, and full ledger chain traversal.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="card">
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '280px' }}>
            <label className="form-label" htmlFor="input-verify-id">
              Land Record ID or Transaction UUID
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-verify-id"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem' }}
                placeholder="e.g. LR-000001 or full Transaction UUID"
                value={recordIdInput}
                onChange={e => setRecordIdInput(e.target.value)}
              />
              <Search
                size={15}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>
          <button
            id="btn-run-verification"
            type="submit"
            className="btn btn-primary"
            disabled={verifying}
            style={{ alignSelf: 'flex-end' }}
          >
            {verifying
              ? <><RefreshCw size={15} className="animate-spin" /> Recalculating Hashes…</>
              : <><ShieldCheck size={15} /> Run 5-Stage Verification</>
            }
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick presets:</span>
          {['LR-000001', 'LR-000002', 'LR-000010', 'LR-000050'].map(preset => (
            <button
              key={preset}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}
              onClick={() => {
                setRecordIdInput(preset);
                runVerification(preset);
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">
          <XCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <strong>Verification Failed</strong>
            <p style={{ margin: '0.1rem 0 0', color: 'var(--color-tampered)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Pipeline Visualization */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <ShieldCheck size={17} color="var(--forest)" />
            5-Stage Verification Pipeline
          </h3>
          {result && <StatusBadge status={result.status} />}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0',
          overflowX: 'auto',
          padding: '1rem 0 0.5rem',
        }}>
          {pipelineSteps.map((step, i, arr) => {
            const Icon = step.icon;
            const color = statusColors[step.status];
            const bgMap = {
              pass: 'var(--color-verified-bg)',
              fail: 'var(--color-tampered-bg)',
              pending: 'var(--bg-subtle)',
            };
            return (
              <React.Fragment key={i}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '0.4rem', flex: 1, minWidth: '80px', textAlign: 'center',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-full)',
                    border: `2px solid ${color}`,
                    background: bgMap[step.status],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color,
                    flexShrink: 0,
                    transition: 'all 0.3s ease',
                  }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {step.detail}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ padding: '0 2px', paddingTop: '12px', color: 'var(--border-strong)', flexShrink: 0 }}>
                    <ArrowRight size={14} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Full Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Outcome Banner */}
          <div className={`card ${isPass ? 'card-verified' : 'card-tampered'}`} style={{
            background: isPass ? 'var(--color-verified-bg)' : 'var(--color-tampered-bg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Verification Outcome for {result.land_record_id}
                </div>
                <h2 style={{ color: isPass ? 'var(--color-verified)' : 'var(--color-tampered)', fontSize: '1.5rem' }}>
                  {isPass ? '✓ CRYPTOGRAPHIC INTEGRITY VERIFIED' : '✕ INTEGRITY COMPROMISED / TAMPER DETECTED'}
                </h2>
                <p style={{ fontSize: '0.8375rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                  Verified at {new Date(result.verified_at).toLocaleString()} ·{' '}
                  Algorithm: <span style={{ fontFamily: 'var(--font-mono)' }}>{result.pqc_algorithm}</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <StatusBadge status={result.status} />
                <button className="btn btn-outline btn-sm" onClick={() => onViewRecord(result.land_record_id)}>
                  View Record <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Steps */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
              <Hash size={17} color="var(--forest)" />
              Pipeline Step Details
            </h3>
            <div className="pipeline-stepper">
              {/* Step 1 */}
              <div className={`pipeline-step ${steps.hash_recomputed ? 'pass' : 'fail'}`}>
                <div className={`step-icon-box ${steps.hash_recomputed ? 'pass' : 'fail'}`}>
                  <Hash size={16} />
                </div>
                <div className="step-content">
                  <div className="step-title">
                    <span>1. Canonical SHA-256 Recomputed</span>
                    <span className="badge badge-verified">COMPUTED</span>
                  </div>
                  <div className="step-desc">
                    Fresh hash from current property fields. Digest:
                    <div className="hash-pill" style={{ marginTop: '0.3rem' }}>{steps.hash_recomputed}</div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`pipeline-step ${steps.hash_match ? 'pass' : 'fail'}`}>
                <div className={`step-icon-box ${steps.hash_match ? 'pass' : 'fail'}`}>
                  {steps.hash_match ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </div>
                <div className="step-content">
                  <div className="step-title">
                    <span>2. Stored Hash Comparison</span>
                    <span className={`badge ${steps.hash_match ? 'badge-verified' : 'badge-tampered'}`}>
                      {steps.hash_match ? 'MATCH' : 'MISMATCH'}
                    </span>
                  </div>
                  <div className="step-desc">
                    {steps.hash_match
                      ? 'Recomputed hash matches the stored record hash exactly. No tampering detected.'
                      : '⚠ MISMATCH: Stored hash does not match current field values. Record may have been modified without re-signing.'}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`pipeline-step ${steps.signature_valid ? 'pass' : 'fail'}`}>
                <div className={`step-icon-box ${steps.signature_valid ? 'pass' : 'fail'}`}>
                  <Key size={16} />
                </div>
                <div className="step-content">
                  <div className="step-title">
                    <span>3. Post-Quantum Signature Verification</span>
                    <span className={`badge ${steps.signature_valid ? 'badge-verified' : 'badge-tampered'}`}>
                      {steps.signature_valid ? 'VALID' : 'INVALID'}
                    </span>
                  </div>
                  <div className="step-desc">
                    Signature verified against the <strong>freshly recomputed hash</strong> (not stored hash).
                    Algorithm: <span className="text-mono">{result.pqc_algorithm}</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`pipeline-step ${steps.ledger_status === 'VERIFIED' ? 'pass' : 'fail'}`}>
                <div className={`step-icon-box ${steps.ledger_status === 'VERIFIED' ? 'pass' : 'fail'}`}>
                  <Layers size={16} />
                </div>
                <div className="step-content">
                  <div className="step-title">
                    <span>4. Append-Only Ledger Chain</span>
                    <span className={`badge ${steps.ledger_status === 'VERIFIED' ? 'badge-verified' : 'badge-tampered'}`}>
                      {steps.ledger_status}
                    </span>
                  </div>
                  <div className="step-desc">
                    Full chain traversed from genesis block (<span className="text-mono">0000…0000</span>).
                    Verified blocks: {steps.ledger_detail?.verified_blocks || 0} / {steps.ledger_detail?.total_blocks || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk + Governance */}
          <div className="grid-2">
            <div className="card card-gold">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>
                <ShieldAlert size={17} color="var(--gold-deep)" />
                Risk Assessment
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 56, height: 56,
                  borderRadius: 'var(--radius-full)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800,
                  background: (result.risk?.risk_score || 0) > 40 ? 'var(--color-tampered-bg)' : 'var(--color-verified-bg)',
                  color: (result.risk?.risk_score || 0) > 40 ? 'var(--color-tampered)' : 'var(--color-verified)',
                  border: `2px solid ${(result.risk?.risk_score || 0) > 40 ? 'var(--color-tampered-border)' : 'var(--color-verified-border)'}`,
                }}>
                  {result.risk?.risk_score || 0}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    Risk Band: <span style={{ color: (result.risk?.risk_score || 0) > 40 ? 'var(--color-tampered)' : 'var(--color-verified)' }}>
                      {result.risk?.risk_band || 'LOW'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {result.risk?.indicators_count || 0} rule(s) fired
                  </div>
                </div>
              </div>
              {result.risk?.indicators_fired?.length > 0 ? (
                <ul style={{ paddingLeft: '1rem', fontSize: '0.8125rem', color: 'var(--color-tampered)' }}>
                  {result.risk.indicators_fired.map((ind, i) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>
                      <strong>+{ind.points} pts:</strong> {ind.description}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--color-verified)', fontSize: '0.825rem' }}>
                  ✓ All risk criteria satisfied. No indicators fired.
                </p>
              )}
            </div>

            <div className="card card-forest">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>
                <ShieldCheck size={17} color="var(--forest)" />
                Governance & Audit
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div className="info-row">
                  <span className="info-key">Segregation of Duties</span>
                  <span className="info-val" style={{ color: result.is_self_verified ? 'var(--color-warning)' : 'var(--color-verified)', fontSize: '0.825rem' }}>
                    {result.is_self_verified ? '⚠ Verified by Creator' : '✓ Independent Verifier'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Audit Event</span>
                  <span className="info-val text-mono" style={{ fontSize: '0.78rem' }}>
                    {isPass ? 'RECORD_VERIFIED' : 'TAMPER_DETECTED'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Recomputation Mode</span>
                  <span className="info-val" style={{ color: 'var(--color-info)', fontSize: '0.78rem' }}>
                    Dynamic Zero-Trust
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Verified At</span>
                  <span className="info-val" style={{ fontSize: '0.78rem' }}>
                    {new Date(result.verified_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
