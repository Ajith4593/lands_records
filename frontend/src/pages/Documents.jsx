import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { 
  FileText, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  FileCode,
  ArrowRight,
  FileCheck,
  Download,
  Search,
  Sparkles,
  Layers,
  Copy,
  Check,
  FileUp,
  MapPin,
  Building2,
  Tag,
  Hash,
  Clock,
  CheckCircle
} from 'lucide-react';
import { StatusBadge, PqcBadge } from '../components/StatusBadge';

export function Documents({ onViewRecord }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [manualReferenceId, setManualReferenceId] = useState('');
  
  const [verifying, setVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [documentsList, setDocumentsList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [downloadingSample, setDownloadingSample] = useState(false);

  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      setLoadingList(true);
      const data = await api.get('/api/documents');
      setDocumentsList(data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const runVerification = async (fileToVerify, refId = manualReferenceId) => {
    if (!fileToVerify) return;

    try {
      setVerifying(true);
      setError(null);
      setResult(null);

      setVerifyStep('Computing document SHA-256 digest & extracting text...');
      await new Promise(r => setTimeout(r, 200));

      const formData = new FormData();
      formData.append('document', fileToVerify);
      if (refId && refId.trim()) {
        formData.append('reference_id', refId.trim());
      }

      setVerifyStep('Matching live registry dataset & quantum-safe ledger...');
      const data = await api.post('/api/documents/verify', formData);

      setResult(data);
      fetchDocuments();
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.message || 'Document verification failed');
    } finally {
      setVerifying(false);
      setVerifyStep('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setError(null);
      runVerification(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
      runVerification(file);
    }
  };

  const handleDownloadSampleDeed = async (recordId) => {
    try {
      setDownloadingSample(true);
      const res = await fetch(`/api/documents/certificate/${recordId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to download deed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Title_Deed_${recordId}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Sample download error:', err);
      setError('Could not download deed: ' + err.message);
    } finally {
      setDownloadingSample(false);
    }
  };

  const copyText = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isAuthentic = result?.overall === 'AUTHENTIC';
  const isPending = result?.overall === 'PENDING';
  const isSuspicious = result?.overall === 'SUSPICIOUS';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileCheck size={28} style={{ color: 'var(--sage)' }} />
            Document Integrity Verification
          </h1>
          <p style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
            Upload any digital title deed, transfer deed, or PDF certificate. The system performs real-time inspection, extracts cryptographic identifiers from document text, and verifies authenticity against the append-only ledger.
          </p>
        </div>

        {/* Quick Sample Downloads across Scenarios */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            Download Scenario Test Deeds:
          </span>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline btn-sm"
              style={{ borderColor: 'var(--color-verified-border)', color: 'var(--color-verified)' }}
              onClick={() => handleDownloadSampleDeed('LR-000001')}
              disabled={downloadingSample}
              title="Download authentic verified deed for LR-000001"
            >
              <Download size={13} />
              <span>LR-000001 (Verified)</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ borderColor: 'var(--color-warning-border)', color: 'var(--color-warning)' }}
              onClick={() => handleDownloadSampleDeed('LR-000016')}
              disabled={downloadingSample}
              title="Download pending deed for LR-000016 (Pending Verification)"
            >
              <Download size={13} />
              <span>LR-000016 (Pending)</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ borderColor: 'var(--color-tampered-border)', color: 'var(--color-tampered)' }}
              onClick={() => handleDownloadSampleDeed('LR-000026')}
              disabled={downloadingSample}
              title="Download duplicate suspect deed for LR-000026"
            >
              <Download size={13} />
              <span>LR-000026 (Duplicate)</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ borderColor: 'var(--color-tampered-border)', color: 'var(--color-tampered)' }}
              onClick={() => handleDownloadSampleDeed('LR-000031')}
              disabled={downloadingSample}
              title="Download modified / low accuracy deed for LR-000031"
            >
              <Download size={13} />
              <span>LR-000031 (Modified)</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ borderColor: 'var(--color-tampered-border)', color: 'var(--color-tampered)' }}
              onClick={() => handleDownloadSampleDeed('LR-000036')}
              disabled={downloadingSample}
              title="Download canceled / revoked deed for LR-000036"
            >
              <Download size={13} />
              <span>LR-000036 (Canceled)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload & Real-Time Verification Card */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <form onSubmit={(e) => { e.preventDefault(); runVerification(selectedFile); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Modern Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--sage)' : selectedFile ? 'var(--color-verified-border)' : 'var(--border-strong)'}`,
              background: isDragging ? 'var(--sage-mist)' : selectedFile ? 'rgba(16, 185, 129, 0.03)' : 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '2.25rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
            }}
          >
            <input
              ref={fileInputRef}
              id="doc-file-input"
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.txt,.json,.doc,.docx"
            />

            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: selectedFile ? 'var(--color-verified-bg)' : 'var(--bg-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: selectedFile ? 'var(--color-verified)' : 'var(--sage)',
              marginBottom: '0.25rem'
            }}>
              {verifying ? <RefreshCw className="animate-spin" size={28} /> : selectedFile ? <FileCheck size={28} /> : <FileUp size={28} />}
            </div>

            {selectedFile ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'} • Click or drop another file to verify in real time
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  Click to select or drag and drop any title deed or PDF certificate
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Supported formats: PDF, Images (PNG/JPG), TXT, JSON, DOCX up to 10MB (Auto-verifies on selection)
                </div>
              </div>
            )}
          </div>

          {/* Manual Reference ID Input - Always Visible */}
          <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <label className="form-label" htmlFor="doc-reference-id" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <Tag size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                Land Record ID (Optional - helps auto-detection)
              </label>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Leave blank for automatic OCR detection
              </span>
            </div>
            <input
              id="doc-reference-id"
              type="text"
              className="form-input"
              placeholder="e.g. LR-000001, LR-000002, or leave blank for auto-detection"
              value={manualReferenceId}
              onChange={(e) => setManualReferenceId(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>💡 Quick fill:</span>
              {['LR-000001', 'LR-000002', 'LR-000010'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', fontFamily: 'var(--font-mono)' }}
                  onClick={() => setManualReferenceId(preset)}
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setManualReferenceId('')}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              id="btn-verify-document"
              type="submit"
              className="btn btn-primary"
              disabled={verifying || !selectedFile}
              style={{ minWidth: '220px', padding: '0.65rem 1.5rem', fontWeight: 600 }}
            >
              {verifying ? <RefreshCw className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
              <span>{verifying ? (verifyStep || 'Verifying Document...') : 'Re-Run Verification'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Error Output */}
      {error && (
        <div className="card animate-fade-in" style={{ borderColor: 'var(--color-warning-border)', background: 'rgba(245, 158, 11, 0.05)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle color="var(--color-warning)" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--color-warning)', fontSize: '1rem', fontWeight: 700 }}>Auto-Detection Notice</h3>
              <p style={{ color: 'var(--text-primary)', marginTop: '0.35rem', fontSize: '0.9rem', lineHeight: 1.5 }}>{error}</p>
              
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  💡 How to fix this:
                </p>
                <ul style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginLeft: '1.2rem', lineHeight: 1.6 }}>
                  <li>Enter a <strong>Land Record ID</strong> (e.g. LR-000001) in the field above</li>
                  <li>Or ensure your document contains a valid Land Record ID in the text</li>
                  <li>Or name your file with the ID (e.g. "LR-000001.pdf")</li>
                  <li>Or download a sample deed using the buttons at the top and re-upload it</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Result Card */}
      {result && (
        <div className="card animate-fade-in" style={{
          borderLeft: `6px solid ${isAuthentic ? 'var(--color-verified)' : isPending ? 'var(--color-warning)' : 'var(--color-tampered)'}`,
          background: isAuthentic ? 'rgba(16, 185, 129, 0.03)' : isPending ? 'rgba(245, 158, 11, 0.03)' : 'rgba(239, 68, 68, 0.03)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}>
          {/* Result Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Live Document Verification Report
                </span>
                {result.match_method && (
                  <span style={{
                    fontSize: '0.725rem',
                    padding: '0.15rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--sage-mist)',
                    color: 'var(--forest)',
                    fontWeight: 600
                  }}>
                    Matched ({result.match_method.replace(/_/g, ' ')})
                  </span>
                )}
              </div>
              <h2 style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: isAuthentic ? 'var(--color-verified)' : isPending ? 'var(--color-warning)' : 'var(--color-tampered)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {isAuthentic ? <CheckCircle2 size={24} /> : isPending ? <Clock size={24} /> : <AlertTriangle size={24} />}
                {isAuthentic
                  ? 'DOCUMENT IS AUTHENTIC & CRYPTOGRAPHICALLY VERIFIED'
                  : isPending
                    ? 'RECORD PENDING REGISTRATION OFFICER VERIFICATION'
                    : 'SUSPICIOUS DOCUMENT / RECORD MISMATCH DETECTED'}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                {result.analysis_note}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
              <StatusBadge status={result.overall} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isAuthentic ? 'var(--color-verified)' : isPending ? 'var(--color-warning)' : 'var(--color-tampered)' }}>
                {result.confidence_pct}% Integrity Trust Score
              </span>
            </div>
          </div>

          {/* Matched Land Record Card */}
          {result.matched_record && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Building2 size={18} style={{ color: 'var(--sage)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Matched Land Record:</span>
                  <span
                    style={{
                      color: 'var(--color-info)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '1.05rem'
                    }}
                    onClick={() => onViewRecord && onViewRecord(result.land_record_id)}
                  >
                    {result.land_record_id}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Document ID: <strong style={{ color: 'var(--text-primary)' }}>{result.document_id}</strong>
                </div>
              </div>

              <div className="grid-3" style={{ fontSize: '0.85rem', marginTop: '0.25rem', gap: '0.75rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>REGISTERED OWNER</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{result.matched_record.owner_name || 'HM Land Registry Owner'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>PROPERTY LOCATION</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {[result.matched_record.paon, result.matched_record.street, result.matched_record.town_city].filter(Boolean).join(', ') || result.matched_record.postcode || 'UK Land Registry'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>REGISTERED PRICE / STATUS</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    £{(result.matched_record.price || 0).toLocaleString()} ({result.matched_record.ownership_status || 'REGISTERED'})
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* 7 Verification Signals Breakdown */}
          {result.signals && result.signals.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                Multi-Signal Integrity Evaluation ({result.passed_signals} / {result.total_signals} Passed)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {result.signals.map((sig, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface)',
                      border: `1px solid ${sig.passed ? 'var(--color-verified-border)' : 'var(--color-tampered-border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {sig.passed ? <CheckCircle2 size={16} color="var(--color-verified)" /> : <XCircle size={16} color="var(--color-tampered)" />}
                        {sig.name}
                      </span>
                      <span style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        color: sig.passed ? 'var(--color-verified)' : 'var(--color-tampered)'
                      }}>
                        {sig.passed ? `+${sig.weight} pts` : '0 pts'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {sig.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cryptographic Hashes & Signatures Inspector */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            fontSize: '0.85rem'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Uploaded Document SHA-256 Digest:</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => copyText(result.document_hash, 'docHash')}
                  style={{ padding: '0.1rem 0.4rem', fontSize: '0.725rem' }}
                >
                  {copiedKey === 'docHash' ? <Check size={12} color="var(--color-verified)" /> : <Copy size={12} />}
                  <span>{copiedKey === 'docHash' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="hash-pill" style={{ marginTop: '0.25rem', wordBreak: 'break-all' }}>
                {result.document_hash}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Canonical Title Record Hash:</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => copyText(result.record_hash, 'recHash')}
                  style={{ padding: '0.1rem 0.4rem', fontSize: '0.725rem' }}
                >
                  {copiedKey === 'recHash' ? <Check size={12} color="var(--color-verified)" /> : <Copy size={12} />}
                  <span>{copiedKey === 'recHash' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="hash-pill" style={{ marginTop: '0.25rem', wordBreak: 'break-all' }}>
                {result.record_hash || 'PENDING'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>RECORD INTEGRITY</span>
                <strong style={{ color: result.record_integrity === 'VERIFIED' ? 'var(--color-verified)' : 'var(--color-tampered)' }}>
                  {result.record_integrity}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>PQC / DIGITAL SIGNATURE</span>
                <strong style={{ color: result.signature_status === 'VALID' ? 'var(--color-verified)' : 'var(--color-tampered)' }}>
                  {result.signature_status}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>LEDGER CHAIN</span>
                <strong style={{ color: result.ledger_status === 'VERIFIED' ? 'var(--color-verified)' : 'var(--color-tampered)' }}>
                  {result.ledger_status}
                </strong>
              </div>
              {result.pqc_algorithm && (
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>ALGORITHM</span>
                  <PqcBadge algorithm={result.pqc_algorithm} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--color-info)' }} />
            Recent Document Verifications ({documentsList.length})
          </h3>
          <button className="btn btn-outline btn-sm" onClick={fetchDocuments}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document ID</th>
                <th>File Name & Size</th>
                <th>Matched Record</th>
                <th>Document SHA-256</th>
                <th>Verdict</th>
                <th>Verified At</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading documents...</td>
                </tr>
              ) : documentsList.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No verified documents in registry yet. Upload a title deed above to verify.
                  </td>
                </tr>
              ) : (
                documentsList.map((doc) => (
                  <tr key={doc.document_id}>
                    <td style={{ fontWeight: 600 }}>{doc.document_id}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{doc.filename}</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {(doc.file_size_bytes / 1024).toFixed(1)} KB • {doc.file_type || 'Document'}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{ color: 'var(--color-info)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                        onClick={() => onViewRecord && onViewRecord(doc.land_record_id)}
                      >
                        {doc.land_record_id}
                      </span>
                    </td>
                    <td>
                      <span className="hash-pill" style={{ fontSize: '0.7rem' }} title={doc.document_hash}>
                        {doc.document_hash?.slice(0, 20)}...
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={doc.verification_result} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(doc.uploaded_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
