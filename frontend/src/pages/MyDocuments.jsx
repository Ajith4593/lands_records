import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  FileSpreadsheet,
  FileCheck2,
  Upload,
  Download,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function MyDocuments({ onViewRecord }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const fetchMyDocs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/api/documents?limit=50');
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message || 'Failed to load your documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDocs();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);

    try {
      setUploading(true);
      setUploadResult(null);
      const res = await api.post('/api/documents/verify', formData);
      setUploadResult(res);
      fetchMyDocs();
    } catch (err) {
      alert(err.message || 'Document verification failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Upload Action */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={22} color="var(--forest)" /> My Uploaded Title Documents & Verification
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Upload title deeds, certificates, or survey reports to run multi-signal cryptographic verification.
          </p>
        </div>

        <div>
          <label className="btn btn-primary" style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Upload size={16} />
            {uploading ? 'Verifying Document...' : 'Upload Deed for Verification'}
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.json,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Verification Result Banner */}
      {uploadResult && (
        <div className={`alert ${uploadResult.overall === 'AUTHENTIC' ? 'alert-success' : 'alert-danger'} animate-fade-in`}>
          <ShieldCheck size={20} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Verification Result: {uploadResult.overall} ({uploadResult.confidence_pct}% Confidence)
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem' }}>
              Matched Record: <strong>{uploadResult.land_record_id}</strong> via {uploadResult.match_method}. Passed {uploadResult.passed_signals} integrity checks.
            </p>
          </div>
        </div>
      )}

      {/* Document History Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Document Verification History</h3>
          <button className="btn btn-outline btn-sm" onClick={fetchMyDocs}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {loading && documents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <RefreshCw className="animate-spin" size={24} color="var(--sage)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading documents...</span>
          </div>
        ) : error ? (
          <div className="alert alert-danger" style={{ margin: '1rem' }}>
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>No documents uploaded yet</h3>
            <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              Use the upload button above to verify your property deeds.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document ID</th>
                  <th>Filename / Size</th>
                  <th>Linked Record</th>
                  <th>Uploaded Date</th>
                  <th>Verification Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(d => (
                  <tr key={d.document_id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--forest)' }}>
                        {d.document_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{d.filename}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {d.file_size_bytes ? `${Math.round(d.file_size_bytes / 1024)} KB` : 'Unknown size'}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-xs"
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                        onClick={() => onViewRecord(d.land_record_id)}
                      >
                        {d.land_record_id}
                      </button>
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString() : '—'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: d.verification_result === 'AUTHENTIC' ? 'var(--color-verified-bg)' : 'var(--color-tampered-bg)',
                        color: d.verification_result === 'AUTHENTIC' ? 'var(--color-verified)' : 'var(--color-tampered)',
                      }}>
                        {d.verification_result === 'AUTHENTIC' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {d.verification_result || 'AUTHENTIC'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => onViewRecord(d.land_record_id)}
                      >
                        View Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
