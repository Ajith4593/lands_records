import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Key, 
  FileCode, 
  AlertTriangle, 
  History, 
  Layers, 
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  MapPin,
  Download
} from 'lucide-react';
import { StatusBadge, PqcBadge } from '../components/StatusBadge';
import { SyntheticBadge } from '../components/SyntheticBadge';

export function RecordDetail({ recordId, onBack, onVerifyRecord }) {
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState({ ledger_events: [], audit_events: [] });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const [recData, histData] = await Promise.all([
        api.get(`/api/records/${recordId}`),
        api.get(`/api/records/${recordId}/history`),
      ]);
      setRecord(recData);
      setHistory(histData);
    } catch (err) {
      console.error('Failed to load record details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) fetchRecord();
  }, [recordId]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !record) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--color-info)', margin: '0 auto 1rem auto' }} />
        <h3>Loading Land Record Details...</h3>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="card">
        <h3>Record Not Found</h3>
        <p>Could not locate record with identifier: {recordId}</p>
        <button className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }} onClick={onBack}>
          <ArrowLeft size={14} /> Back to Records
        </button>
      </div>
    );
  }

  const p = record.property || {};
  const s = record.synthetic_demo || {};
  const sec = record.security || {};

  // Construct canonical JSON view
  const canonicalFields = {
    county: p.county || null,
    district: p.district || null,
    duration: p.duration || null,
    land_record_id: record.land_record_id,
    locality: p.locality || null,
    new_build: p.new_build,
    paon: p.paon || null,
    postcode: p.postcode || null,
    ppd_category: p.ppd_category || null,
    price: p.price,
    property_type: p.property_type || null,
    saon: p.saon || null,
    street: p.street || null,
    town_city: p.town_city || null,
    transaction_date: p.transaction_date ? String(p.transaction_date).slice(0, 10) : null,
    transaction_id: record.transaction_id,
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-outline btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Records
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusBadge status={sec.tamper_status} />
          <PqcBadge algorithm={sec.pqc_algorithm} />
          <a
            href={`/api/documents/certificate/${record.land_record_id}`}
            download={`Title_Deed_${record.land_record_id}.txt`}
            className="btn btn-outline btn-sm"
            title="Download cryptographically verifiable Title Deed Certificate"
          >
            <Download size={14} />
            <span>Download Deed</span>
          </a>
          <button
            id="btn-verify-record-now"
            className="btn btn-primary"
            onClick={() => onVerifyRecord(record.land_record_id)}
          >
            <ShieldCheck size={16} />
            Verify Record Integrity
          </button>
        </div>
      </div>

      {/* Record Title Banner */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-info)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{record.land_record_id}</h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem', color: 'var(--color-info)' }}>
              Transaction UUID: {record.transaction_id}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Registered Price</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹{p.price?.toLocaleString('en-IN') || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('overview')}
        >
          Property & Title Details
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'crypto' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('crypto')}
        >
          Canonical Hash & PQC Signature
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('history')}
        >
          Ledger & Audit History ({history.ledger_events.length + history.audit_events.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid-2">
          {/* Real PPD Data Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Real UK Price Paid Data (PPD)</h3>
              <span className="badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                Official Dataset
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Address:</span>
                <span style={{ fontWeight: 500, textAlign: 'right' }}>
                  {[p.paon, p.saon, p.street].filter(Boolean).join(', ') || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Postcode:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-info)' }}>{p.postcode || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Town / City:</span>
                <span>{p.town_city || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>District & County:</span>
                <span>{p.district}, {p.county}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Property Type:</span>
                <span>{p.property_type} ({p.property_type_raw})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tenure Duration:</span>
                <span>{p.duration} ({p.duration_raw})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Transaction Date:</span>
                <span>{p.transaction_date ? new Date(p.transaction_date).toLocaleDateString('en-IN') : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>PPD Category:</span>
                <span>{p.ppd_category_label || p.ppd_category}</span>
              </div>
            </div>
          </div>

          {/* Synthetic Demo Attributes Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Synthetic Demo Attributes</h3>
              <SyntheticBadge />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Registered Owner:</span>
                <span style={{ fontWeight: 600 }}>{s.owner_name || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Parcel Identifier:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{s.parcel_id || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Survey Number:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{s.survey_number || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Land Area:</span>
                <span>{s.land_area ? `${s.land_area} sq.m` : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ownership Status:</span>
                <span>{s.ownership_status || 'REGISTERED'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Encumbrance Status:</span>
                <span>{s.encumbrance_status || 'NONE'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Dispute Flag:</span>
                <span style={{ color: s.dispute_status === 'ACTIVE' ? 'var(--color-tampered)' : 'var(--color-verified)' }}>
                  {s.dispute_status || 'NONE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Approx. Centroid:</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {s.latitude ? `${s.latitude}, ${s.longitude}` : 'N/A'} (postcode centroid)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CRYPTO & CANONICAL HASH */}
      {activeTab === 'crypto' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Canonical Hash Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FileCode size={18} color="var(--color-info)" />
                Canonical Record JSON (Feature 2)
              </h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => copyToClipboard(JSON.stringify(canonicalFields, null, 2))}
              >
                {copied ? <Check size={14} color="var(--color-verified)" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <p style={{ marginBottom: '1rem' }}>
              Standardized alphabetically-sorted key representation used to generate reproducible SHA-256 digests.
            </p>
            <pre className="code-box">{JSON.stringify(canonicalFields, null, 2)}</pre>
          </div>

          {/* Stored Hash & PQC Signature Details */}
          <div className="grid-2">
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>
                <Key size={18} color="var(--color-pqc)" />
                Post-Quantum Signature Info (Feature 3)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Signature Algorithm:</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {sec.pqc_algorithm || 'ECDSA-P256 (DEV FALLBACK — NOT QUANTUM-SAFE)'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Stored Record Hash (SHA-256):</div>
                  <div className="hash-pill">{sec.record_hash || 'Uncalculated'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Digital Signature:</div>
                  <div className="hash-pill" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                    {sec.digital_signature || 'Not signed'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Public Verification Key:</div>
                  <div className="hash-pill" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                    {sec.public_key || 'Not available'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>
                <ShieldCheck size={18} color="var(--color-verified)" />
                Explainable Risk Engine (Rule 12)
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: 'var(--radius-full)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700,
                  backgroundColor: (sec.risk_score || 0) > 40 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: (sec.risk_score || 0) > 40 ? '#f87171' : '#34d399',
                  border: `2px solid ${(sec.risk_score || 0) > 40 ? 'var(--color-tampered)' : 'var(--color-verified)'}`
                }}>
                  {sec.risk_score || 0}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    Risk Band: {sec.risk_band || 'LOW'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Deterministic weighted rules engine
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Fired Indicators:</div>
                {sec.risk_indicators?.length > 0 ? (
                  <ul style={{ paddingLeft: '1.25rem', color: 'var(--color-tampered)' }}>
                    {sec.risk_indicators.map((ind, idx) => (
                      <li key={idx}><strong>+{ind.points} pts:</strong> {ind.description}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--color-verified)', fontSize: '0.85rem' }}>
                    ✓ No risk indicators fired. Record cryptographic posture is clean.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEDGER & AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="grid-2">
          {/* Ledger Blocks for this record */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Layers size={18} color="var(--color-info)" />
                Ledger Blocks ({history.ledger_events?.length || 0})
              </h3>
            </div>
            {history.ledger_events?.length === 0 ? (
              <p>No ledger blocks recorded for this title.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.ledger_events.map((b) => (
                  <div key={b.block_id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                      <span>Block #{b.block_id}</span>
                      <span className="badge badge-info">{b.event_type}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {new Date(b.timestamp).toLocaleString()} • Actor: {b.actor_id} ({b.actor_role})
                    </div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <div className="hash-pill" style={{ fontSize: '0.7rem' }}>Hash: {b.current_hash?.slice(0, 32)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Trail for this record */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <History size={18} color="var(--color-pqc)" />
                Audit Trail ({history.audit_events?.length || 0})
              </h3>
            </div>
            {history.audit_events?.length === 0 ? (
              <p>No audit events logged for this record.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.audit_events.map((a) => (
                  <div key={a.audit_id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                      <span>{a.action}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Actor: {a.user_id} ({a.role})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
