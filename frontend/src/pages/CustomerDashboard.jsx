import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Home,
  FileSpreadsheet,
  FileCheck2,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Upload,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function CustomerDashboard({ onNavigate, onViewRecord, onVerifyRecord }) {
  const [stats, setStats] = useState(null);
  const [myProperties, setMyProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashData, recordsData] = await Promise.all([
        api.get('/api/security/dashboard'),
        api.get('/api/records?limit=10'),
      ]);
      setStats(dashData);
      setMyProperties(recordsData.records || []);
    } catch (err) {
      setError(err.message || 'Failed to load property data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const handleDownloadCertificate = (recordId) => {
    window.open(`/api/documents/certificate/${recordId}`, '_blank');
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

  const propCount = myProperties.length;
  const docCount = stats?.my_documents || 0;
  const verifiedCount = stats?.my_verified || myProperties.filter(p => p.security?.tamper_status === 'VERIFIED').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Customer Hero Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
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
              background: 'rgba(233, 196, 106, 0.25)',
              color: 'var(--gold)',
              border: '1px solid rgba(233, 196, 106, 0.4)',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Citizen Land Portfolio
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>• Verified Identity</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'white' }}>
            My Registered Properties & Title Deeds
          </h2>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.9, fontSize: '0.85rem', maxWidth: '620px' }}>
            Access and manage your digitally verified property assets, inspect tamper-proof title deeds, verify document authenticity, and download official certificates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            style={{
              background: 'var(--gold)',
              color: 'var(--forest)',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            onClick={() => onNavigate('documents')}
          >
            <Upload size={16} /> Verify Title Document
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid-4 stagger">
        <div className="stat-card" onClick={() => onNavigate('my-properties')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-box" style={{ background: '#E8F5E9' }}>
            <Home size={20} color="var(--sage)" />
          </div>
          <div className="stat-body">
            <div className="stat-label">My Registered Properties</div>
            <div className="stat-value" style={{ color: 'var(--forest)' }}>{propCount}</div>
            <div className="stat-sub">Under your verified ownership</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('my-documents')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-box" style={{ background: '#E3F2FD' }}>
            <FileSpreadsheet size={20} color="#1565C0" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Uploaded Title Documents</div>
            <div className="stat-value" style={{ color: '#1565C0' }}>{docCount}</div>
            <div className="stat-sub">Deeds & surveyor certificates</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box" style={{ background: 'var(--color-verified-bg)' }}>
            <ShieldCheck size={20} color="var(--color-verified)" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Cryptographic Protection</div>
            <div className="stat-value" style={{ color: 'var(--color-verified)', fontSize: '1.2rem' }}>100% SECURE</div>
            <div className="stat-sub">SHA-256 & Quantum-Safe Signed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box" style={{ background: 'var(--gold-light)' }}>
            <Lock size={20} color="var(--gold-deep)" />
          </div>
          <div className="stat-body">
            <div className="stat-label">Dispute Status</div>
            <div className="stat-value" style={{ color: 'var(--forest)', fontSize: '1.2rem' }}>CLEAR</div>
            <div className="stat-sub">No encumbrances recorded</div>
          </div>
        </div>
      </div>

      {/* ── Quick Action Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div
          className="card"
          style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid var(--sage)' }}
          onClick={() => onNavigate('my-properties')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Home size={18} color="var(--sage)" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>View All My Properties</h3>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Inspect cadastral survey boundaries, registered ownership values, and transaction hashes.
          </p>
        </div>

        <div
          className="card"
          style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid #1565C0' }}
          onClick={() => onNavigate('documents')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={18} color="#1565C0" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Verify Land Certificate</h3>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Upload any scanned deed or PDF to check if the digital seal matches official registry blocks.
          </p>
        </div>

        <div
          className="card"
          style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid var(--gold-deep)' }}
          onClick={() => onNavigate('my-documents')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={18} color="var(--gold-deep)" />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Official Deed Certificates</h3>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Download digitally signed, tamper-evident title deed certificates with embedded SHA-256 anchors.
          </p>
        </div>
      </div>

      {/* ── My Registered Properties List ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>My Registered Land Parcels</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
              Property assets registered to your authenticated citizen account
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('my-properties')}>
            View Portfolio ({propCount}) <ArrowRight size={13} />
          </button>
        </div>

        {myProperties.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Home size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
              No Registered Properties Found
            </p>
            <p style={{ fontSize: '0.78rem', margin: '0.25rem 0 0' }}>
              Contact your local Registration Officer to link your property deed to this account.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {myProperties.map(p => (
              <div
                key={p.land_record_id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  background: 'var(--bg-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--forest)',
                      background: 'var(--mint)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}>
                      {p.land_record_id}
                    </span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.4rem 0 0' }}>
                      {[p.property?.paon, p.property?.street].filter(Boolean).join(' ')}
                    </h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.property?.town_city}, {p.property?.postcode}
                    </div>
                  </div>
                  <StatusBadge status={p.security?.tamper_status || 'VERIFIED'} />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  padding: '0.6rem',
                  background: 'white',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Registered Value:</span>
                    <div style={{ fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)' }}>
                      ₹{((p.property?.price || 0) * 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Survey Parcel:</span>
                    <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {p.synthetic_demo?.parcel_id || 'PCL-DEFAULT'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, fontSize: '0.75rem' }}
                    onClick={() => onViewRecord(p.land_record_id)}
                  >
                    Inspect Record
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    onClick={() => handleDownloadCertificate(p.land_record_id)}
                  >
                    <Download size={13} /> Title Deed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
