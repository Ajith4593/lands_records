import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Home,
  Download,
  ShieldCheck,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  FileText,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge, PqcBadge } from '../components/StatusBadge';

export function MyProperties({ onViewRecord, onVerifyRecord }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchMyRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/api/records?limit=50');
      setRecords(data.records || []);
    } catch (err) {
      setError(err.message || 'Failed to load your property records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRecords();
  }, []);

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.land_record_id?.toLowerCase().includes(q) ||
      r.property?.street?.toLowerCase().includes(q) ||
      r.property?.town_city?.toLowerCase().includes(q) ||
      r.property?.postcode?.toLowerCase().includes(q)
    );
  });

  const handleDownloadCertificate = (id) => {
    window.open(`/api/documents/certificate/${id}`, '_blank');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Home size={22} color="var(--forest)" /> My Registered Property Portfolio
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            All title deeds and land parcels authenticated to your citizen identity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by ID, street, postcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
              }}
            />
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchMyRecords} title="Refresh">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && records.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={24} color="var(--sage)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Retrieving your property assets...</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <div>{error}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Home size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>No matching properties</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            {search ? 'No properties matched your search term.' : 'You have no registered properties linked to your account yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
          {filtered.map(r => (
            <div
              key={r.land_record_id}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                borderTop: '4px solid var(--forest)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--forest)',
                    background: 'var(--mint)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                  }}>
                    {r.land_record_id}
                  </span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.4rem 0 0' }}>
                    {[r.property?.paon, r.property?.street].filter(Boolean).join(' ') || 'Registered Parcel'}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                    <MapPin size={12} />
                    {r.property?.town_city}, {r.property?.postcode}
                  </div>
                </div>
                <StatusBadge status={r.security?.tamper_status || 'VERIFIED'} />
              </div>

              {/* Property Details Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.6rem',
                padding: '0.75rem',
                background: 'var(--bg-subtle)',
                borderRadius: '6px',
                fontSize: '0.75rem',
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Registered Price</span>
                  <span style={{ fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                    ₹{((r.property?.price || 0) * 100).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Cadastral Survey</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {r.synthetic_demo?.parcel_id || 'PCL-DEFAULT'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Tenure Type</span>
                  <span style={{ fontWeight: 600 }}>
                    {r.property?.duration === 'F' ? 'Freehold' : r.property?.duration === 'L' ? 'Leasehold' : r.property?.duration || 'Freehold'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Registration Date</span>
                  <span style={{ fontWeight: 600 }}>
                    {r.property?.transaction_date ? new Date(r.property.transaction_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Cryptographic Hash snippet */}
              <div style={{
                padding: '0.5rem 0.6rem',
                background: 'var(--bg-muted)',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                <strong>SHA-256:</strong> {r.security?.record_hash || 'PENDING'}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1, fontSize: '0.75rem' }}
                  onClick={() => onViewRecord(r.land_record_id)}
                >
                  Inspect Deed
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                  onClick={() => handleDownloadCertificate(r.land_record_id)}
                >
                  <Download size={13} /> Official Title Deed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
