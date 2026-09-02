import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Search, ChevronLeft, ChevronRight, Eye, ShieldCheck, RefreshCw, Database, CheckCircle2, AlertTriangle, Clock
} from 'lucide-react';
import { StatusBadge, PqcBadge } from '../components/StatusBadge';
import { SyntheticBadge } from '../components/SyntheticBadge';

export function LandRecords({ onViewRecord, onVerifyRecord }) {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifyingId, setVerifyingId] = useState(null);
  const [inlineNotice, setInlineNotice] = useState(null);

  const fetchRecords = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: targetPage, limit: 15 });
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter) params.append('tamper_status', statusFilter);
      const data = await api.get(`/api/records?${params.toString()}`);
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err) {
      console.error('Failed to fetch land records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(1); }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecords(1);
  };

  const handleQuickVerify = async (e, recordId) => {
    e.stopPropagation();
    try {
      setVerifyingId(recordId);
      const res = await api.post(`/api/records/${recordId}/verify`);
      
      // Update record in state in real-time
      setRecords(prev => prev.map(r => {
        if (r.land_record_id === recordId) {
          return {
            ...r,
            security: {
              ...r.security,
              tamper_status: res.status,
              verified_at: res.verified_at || new Date(),
            }
          };
        }
        return r;
      }));

      setInlineNotice({
        recordId,
        status: res.status,
        text: `Record ${recordId} verified in real time. Status: ${res.status}`
      });

      setTimeout(() => setInlineNotice(null), 4000);
    } catch (err) {
      console.error('Quick verify error:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={24} color="var(--forest)" />
            Bhumi Abhilekha — Land Registry Dataset
          </h1>
          <p className="page-subtitle">
            Browse and verify property registration records with cryptographic hashes, PQC signatures, and real-time ledger anchoring.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <SyntheticBadge label="Synthetic Owner Fields" />
          <button className="btn btn-outline btn-sm" onClick={() => fetchRecords(page)}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Toast Notice */}
      {inlineNotice && (
        <div className="card animate-fade-in" style={{
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          borderLeft: `4px solid ${inlineNotice.status === 'VERIFIED' ? 'var(--color-verified)' : 'var(--color-tampered)'}`,
          background: inlineNotice.status === 'VERIFIED' ? 'var(--color-verified-bg)' : 'var(--color-tampered-bg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          {inlineNotice.status === 'VERIFIED' ? <CheckCircle2 size={18} color="var(--color-verified)" /> : <AlertTriangle size={18} color="var(--color-tampered)" />}
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {inlineNotice.text}
          </span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <input
              id="input-record-search"
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
              placeholder="Search by Land Record ID, Transaction UUID, Postcode, Street, Town..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
          <div style={{ minWidth: '200px' }}>
            <select
              id="select-status-filter"
              className="form-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Integrity Statuses</option>
              <option value="VERIFIED">✓ Verified</option>
              <option value="PENDING_VERIFICATION">⧗ Pending Verification</option>
              <option value="TAMPERED">⚠ Duplicate / Tampered Suspect</option>
              <option value="HASH_MISMATCH">✕ Hash Mismatch (Modified)</option>
              <option value="CANCELED">✕ Canceled / Revoked</option>
              <option value="SIGNATURE_INVALID">✕ Signature Invalid</option>
            </select>
          </div>
          <button id="btn-search-submit" type="submit" className="btn btn-primary">
            <Search size={14} /> Search
          </button>
        </form>
      </div>

      {/* Records Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Record ID</th>
              <th>Property Details</th>
              <th>Location</th>
              <th style={{ textAlign: 'right' }}>Price (₹)</th>
              <th>Integrity</th>
              <th>Signature</th>
              <th>SHA-256 Hash (Prefix)</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                  <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--sage)', margin: '0 auto' }} />
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading dataset...</p>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No matching records found.
                </td>
              </tr>
            ) : (
              records.map(r => (
                <tr
                  key={r.land_record_id}
                  onClick={() => onViewRecord(r.land_record_id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)', fontSize: '0.825rem' }}>
                      {r.land_record_id}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {r.transaction_id?.slice(0, 14)}…
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      {[r.property?.paon, r.property?.saon, r.property?.street].filter(Boolean).join(', ') || 'Address unspecified'}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {r.property?.property_type} · {r.property?.duration}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-info)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {r.property?.postcode || 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {[r.property?.town_city, r.property?.district].filter(Boolean).join(', ')}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text-primary)' }}>
                    ₹{r.property?.price?.toLocaleString('en-IN') || 0}
                  </td>
                  <td>
                    <StatusBadge status={r.security?.tamper_status} />
                  </td>
                  <td>
                    <PqcBadge algorithm={r.security?.pqc_algorithm} />
                  </td>
                  <td>
                    {r.security?.record_hash ? (
                      <span className="hash-pill" style={{ fontSize: '0.68rem' }}>
                        {r.security.record_hash.slice(0, 16)}…
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={e => { e.stopPropagation(); onViewRecord(r.land_record_id); }}
                        title="View record details"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        className={`btn btn-sm ${r.security?.tamper_status === 'PENDING_VERIFICATION' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={e => handleQuickVerify(e, r.land_record_id)}
                        disabled={verifyingId === r.land_record_id}
                        title="Run real-time integrity verification"
                      >
                        {verifyingId === r.land_record_id ? (
                          <RefreshCw className="animate-spin" size={13} />
                        ) : (
                          <ShieldCheck size={13} />
                        )}
                        <span>{r.security?.tamper_status === 'PENDING_VERIFICATION' ? 'Verify Now' : 'Re-verify'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          Page {page} of {pages} · {total.toLocaleString('en-IN')} total records
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            id="btn-prev-page"
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => fetchRecords(page - 1)}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            id="btn-next-page"
            className="btn btn-outline btn-sm"
            disabled={page >= pages}
            onClick={() => fetchRecords(page + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
