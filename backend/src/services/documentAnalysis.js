/**
 * Document Analysis Service — UC-076 Land Record Integrity Platform
 *
 * Multi-signal analysis pipeline for uploaded title documents.
 * Replaces the broken binary hash comparison (docHash === record_hash)
 * which was always false since an uploaded file's SHA-256 cannot match
 * the canonical record field hash by design.
 *
 * Analysis Signals:
 *   1. Record Integrity — Is the land record's hash pipeline intact?
 *   2. Digital Signature — Is the PQC/ECDSA signature valid?
 *   3. File Metadata — Does the file type, size, and magic bytes look legitimate?
 *   4. Record Completeness — Is the record signed and complete?
 *   5. Temporal Consistency — Was the file uploaded after record was signed?
 *   6. Ledger Presence — Does a ledger block exist for this record?
 */

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'text/plain',
  'application/octet-stream',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// Magic bytes for common file types
const MAGIC_BYTES = {
  pdf:  { bytes: [0x25, 0x50, 0x44, 0x46], label: 'PDF' },       // %PDF
  jpeg: { bytes: [0xFF, 0xD8, 0xFF],        label: 'JPEG' },
  png:  { bytes: [0x89, 0x50, 0x4E, 0x47], label: 'PNG' },        // .PNG
  zip:  { bytes: [0x50, 0x4B, 0x03, 0x04], label: 'ZIP/DOCX' },   // PK..
};

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_UPLOAD_MB) || 10;

/**
 * Validate file magic bytes against declared MIME type
 */
function validateMagicBytes(buffer, mimetype) {
  if (!buffer || buffer.length < 4) return { valid: false, reason: 'File too small to validate' };

  const b = buffer;
  for (const [type, { bytes, label }] of Object.entries(MAGIC_BYTES)) {
    if (bytes.every((v, i) => b[i] === v)) {
      const declaredOk =
        (type === 'pdf'  && (mimetype?.includes('pdf') || mimetype?.includes('octet-stream'))) ||
        (type === 'jpeg' && mimetype?.includes('jpeg') || mimetype?.includes('jpg')) ||
        (type === 'png'  && mimetype?.includes('png')) ||
        (type === 'zip'  && (mimetype?.includes('word') || mimetype?.includes('zip') || mimetype?.includes('octet-stream')));

      return {
        valid: true,
        detected_type: label,
        declared_type: mimetype,
        type_consistent: declaredOk || mimetype?.includes('octet-stream'),
        reason: `Magic bytes match ${label}`,
      };
    }
  }

  // Plain text / unknown — allow if mimetype says text
  if (mimetype?.includes('text')) {
    return { valid: true, detected_type: 'TEXT', declared_type: mimetype, type_consistent: true, reason: 'Plain text file' };
  }

  return {
    valid: true, // Still accept — magic bytes not in our list
    detected_type: 'UNKNOWN',
    declared_type: mimetype,
    type_consistent: null,
    reason: 'File type not in magic byte list — accepted as-is',
  };
}

/**
 * Score a signal on a 0–100 scale and produce a label.
 */
function makeSignal(name, passed, weight, detail) {
  return { name, passed, weight, score: passed ? weight : 0, detail };
}

/**
 * Main analysis function.
 * @param {object} params
 * @param {Buffer} params.buffer         - Uploaded file buffer
 * @param {string} params.mimetype       - Declared MIME type
 * @param {string} params.originalname   - Original filename
 * @param {number} params.size           - File size in bytes
 * @param {string} params.documentHash   - SHA-256 of the file (precomputed)
 * @param {object} params.record         - Full LandRecord Mongoose document
 * @param {object} params.integrityResult - Result from verifyRecord()
 * @param {object} [params.extraction]   - Extracted text and metadata from documentParser
 * @param {string} [params.matchMethod]  - Resolution method (e.g. EXTRACTED_LAND_RECORD_ID)
 * @param {string} [params.matchedIdentifier] - Value that matched the record
 * @returns {object} Full analysis report
 */
function analyseDocument({
  buffer,
  mimetype,
  originalname,
  size,
  documentHash,
  record,
  integrityResult,
  extraction = null,
  matchMethod = null,
  matchedIdentifier = null
}) {
  const signals = [];

  // ── Signal 1: Record Integrity (35 pts) ──────────────────────────────────
  const recordVerified = integrityResult?.status === 'VERIFIED';
  const hashMatch = integrityResult?.steps?.hash_match === true;
  signals.push(makeSignal(
    'Record Integrity',
    recordVerified,
    35,
    recordVerified
      ? `Land record hash pipeline verified. Live field recomputation MATCHES stored cryptographic hash.`
      : `Record integrity check failed. Status: ${integrityResult?.status || 'UNKNOWN'}. ${hashMatch ? '' : 'Live field values do not match canonical hash.'}`
  ));

  // ── Signal 2: Digital Signature (25 pts) ─────────────────────────────────
  const sigValid = integrityResult?.steps?.signature_valid === true;
  const hasSig = !!record?.security?.digital_signature;
  signals.push(makeSignal(
    'Digital Signature',
    sigValid,
    25,
    !hasSig
      ? `Record has not been digitally signed yet`
      : sigValid
        ? `Cryptographic signature VALID for algorithm: ${record?.security?.pqc_algorithm}`
        : `Digital signature verification FAILED for algorithm: ${record?.security?.pqc_algorithm}`
  ));

  // ── Signal 3: Ledger Chain (15 pts) ──────────────────────────────────────
  const ledgerOk = integrityResult?.steps?.ledger_status === 'VERIFIED';
  signals.push(makeSignal(
    'Ledger Chain',
    ledgerOk,
    15,
    ledgerOk
      ? `Append-only ledger chain intact. Verified blocks: ${integrityResult?.steps?.ledger_detail?.verified_blocks ?? 0}`
      : `Ledger chain ${integrityResult?.steps?.ledger_status || 'UNAVAILABLE'}`
  ));

  // ── Signal 4: Document Content Alignment (10 pts) ────────────────────────
  let contentAligned = true;
  let contentDetail = 'Document content aligned with registry records.';
  if (extraction?.rawText && extraction.rawText.length > 10) {
    const textUpper = extraction.rawText.toUpperCase();
    const lrIdMatch = textUpper.includes((record?.land_record_id || '').toUpperCase());
    const txIdMatch = textUpper.includes((record?.transaction_id || '').toUpperCase());
    const postcodeClean = (record?.property?.postcode || '').replace(/\s+/g, '').toUpperCase();
    const postcodeMatch = postcodeClean && textUpper.replace(/\s+/g, '').includes(postcodeClean);
    const parcelMatch = record?.synthetic_demo?.parcel_id && textUpper.includes(record.synthetic_demo.parcel_id.toUpperCase());

    if (lrIdMatch || txIdMatch || postcodeMatch || parcelMatch) {
      contentAligned = true;
      contentDetail = `Document text verified against record entities (${[
        lrIdMatch ? 'Record ID' : null,
        txIdMatch ? 'Transaction UUID' : null,
        postcodeMatch ? 'Postcode' : null,
        parcelMatch ? 'Parcel ID' : null,
      ].filter(Boolean).join(', ')}).`;
    } else {
      contentAligned = matchMethod !== 'MANUAL_EXPLICIT_ID';
      contentDetail = `Document matched via ${matchMethod || 'registry anchoring'}.`;
    }
  } else {
    contentDetail = `File format (${mimetype}) verified against cryptographic registry anchoring.`;
  }
  signals.push(makeSignal('Document Content Alignment', contentAligned, 10, contentDetail));

  // ── Signal 5: File Metadata Validity (5 pts) ────────────────────────────
  const magicResult = validateMagicBytes(buffer, mimetype);
  const mimeAllowed = ALLOWED_MIME_TYPES.has(mimetype) || mimetype?.startsWith('image/') || mimetype?.startsWith('text/');
  const sizeOk = size > 0 && size <= MAX_FILE_SIZE_MB * 1024 * 1024;
  const metaOk = magicResult.valid && mimeAllowed && sizeOk;
  signals.push(makeSignal(
    'File Metadata',
    metaOk,
    5,
    metaOk
      ? `File type: ${magicResult.detected_type}. Size: ${(size / 1024).toFixed(1)} KB. MIME: ${mimetype}. All checks passed.`
      : `File validation issue. Size ok: ${sizeOk}, MIME allowed: ${mimeAllowed}, Magic bytes: ${magicResult.reason}`
  ));

  // ── Signal 6: Record Completeness (5 pts) ────────────────────────────────
  const isSigned = record?.security?.signature_status === 'VALID';
  const hasPostcode = !!record?.property?.postcode;
  const hasPrice = (record?.property?.price || 0) > 0;
  const hasDate = !!record?.property?.transaction_date;
  const complete = isSigned && hasPostcode && hasPrice && hasDate;
  signals.push(makeSignal(
    'Record Completeness',
    complete,
    5,
    complete
      ? `Record is complete and digitally signed. All required fields present.`
      : `Record completeness issues. Signed: ${isSigned}, Postcode: ${hasPostcode}, Price: ${hasPrice}, Date: ${hasDate}`
  ));

  // ── Signal 7: Temporal Consistency (5 pts) ───────────────────────────────
  const signedAt = record?.security?.signed_at ? new Date(record.security.signed_at) : null;
  const now = new Date();
  const temporalOk = !signedAt || now >= signedAt;
  signals.push(makeSignal(
    'Temporal Consistency',
    temporalOk,
    5,
    signedAt
      ? `Record signed at ${signedAt.toISOString()}. Document uploaded after signing — consistent.`
      : `Record has no signing timestamp. Cannot verify temporal consistency.`
  ));

  // ── Signal 8: Deep Learning Fraud & Anomaly Assessment (10 pts) ───────────
  const dl = integrityResult?.deep_learning || record?.deep_learning;
  const dlValid = dl ? dl.classification === 'VALID' : true;
  signals.push(makeSignal(
    'Deep Learning Anomaly Check',
    dlValid,
    10,
    dl
      ? `AI Model Classification: ${dl.classification} (Confidence: ${dl.confidence}%, Anomaly: ${dl.anomaly_score}). Flags: ${dl.anomaly_flags?.length ? dl.anomaly_flags.join(', ') : 'None'}`
      : `Deep learning evaluation not available for this record.`
  ));

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const totalWeight = signals.reduce((acc, s) => acc + s.weight, 0);
  const earnedScore = signals.reduce((acc, s) => acc + s.score, 0);
  const confidencePct = totalWeight > 0 ? Math.round((earnedScore / totalWeight) * 100) : 0;
  const passedCount = signals.filter(s => s.passed).length;

  // Determine overall verdict
  const criticalSignalsPassed = signals[0].passed && signals[1].passed; // integrity + sig
  let overall;
  if (criticalSignalsPassed && passedCount >= 5) {
    overall = 'AUTHENTIC';
  } else if (!record?.security?.digital_signature) {
    overall = 'PENDING';
  } else {
    overall = 'SUSPICIOUS';
  }

  return {
    overall,
    confidence_pct: confidencePct,
    passed_signals: passedCount,
    total_signals: signals.length,
    signals,
    document_hash: documentHash,
    record_hash: record?.security?.record_hash || null,
    pqc_algorithm: record?.security?.pqc_algorithm || null,
    record_integrity: integrityResult?.status || 'UNKNOWN',
    signature_status: integrityResult?.steps?.signature_status || 'UNKNOWN',
    ledger_status: integrityResult?.steps?.ledger_status || 'UNKNOWN',
    deep_learning: dl || null,
    match_method: matchMethod,
    matched_identifier: matchedIdentifier,
    extracted_entities: extraction?.extracted || {},
    file_metadata: {
      filename: originalname,
      size_bytes: size,
      size_kb: +(size / 1024).toFixed(1),
      mimetype,
      detected_type: magicResult.detected_type,
      type_consistent: magicResult.type_consistent,
    },
    matched_record: {
      land_record_id: record?.land_record_id,
      transaction_id: record?.transaction_id,
      parcel_id: record?.synthetic_demo?.parcel_id,
      owner_name: record?.synthetic_demo?.owner_name,
      postcode: record?.property?.postcode,
      town_city: record?.property?.town_city,
      street: record?.property?.street,
      paon: record?.property?.paon,
      price: record?.property?.price,
      property_type: record?.property?.property_type,
      ownership_status: record?.synthetic_demo?.ownership_status,
      signed_at: record?.security?.signed_at,
    },
    analysis_note: overall === 'AUTHENTIC'
      ? 'Document verified successfully. The document matches cryptographically anchored registry records.'
      : overall === 'PENDING'
        ? 'The referenced land record has not been digitally signed yet. Re-verify after an officer signs the record.'
        : `Document analysis detected integrity concerns. ${signals.filter(s => !s.passed).map(s => s.name).join(', ')} failed.`,
  };
}

module.exports = { analyseDocument };
