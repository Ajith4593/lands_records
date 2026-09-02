const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { LandRecord, Document } = require('../models');
const { requireAuth, requireRole, requireOwnership } = require('../middleware/auth');
const { computeDocumentHash } = require('../services/hashing');
const { verifyRecord } = require('../services/verification');
const { appendAuditLog } = require('../services/audit');
const { analyseDocument } = require('../services/documentAnalysis');
const { resolveLandRecord, extractTextAndMetadata } = require('../services/documentParser');
const { nanoid } = require('nanoid');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (parseInt(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
      'text/plain', 'application/json', 'application/octet-stream',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const mimeOk = allowed.some(t => file.mimetype.startsWith(t.split('/')[0])) || allowed.includes(file.mimetype);
    if (mimeOk) cb(null, true);
    else cb(new Error('File type not allowed. Supported: PDF, PNG, JPG, TXT, JSON, DOC/DOCX'));
  }
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Rate limit exceeded — too many document verification requests' }
});

// POST /api/documents/verify — auto-detects land record from uploaded document (PDF, Image, Text)
// Permission: Accessible by all roles including citizens/customers, registration officers, auditors, admins
router.post('/verify', requireAuth, verifyLimiter, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded. Please select a title deed, image, or certificate file.' });
    }

    const explicitRef = req.body?.reference_id || req.body?.referenceId || null;

    // Auto-detect and resolve LandRecord directly from document content (PDF, Image, Text)
    const resolution = await resolveLandRecord({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      explicitReferenceId: explicitRef,
    });

    const record = resolution.record;

    if (!record) {
      return res.status(404).json({
        error: 'Could not auto-detect a matching land record from the uploaded document.',
        details: 'No matching Land Record ID (e.g. LR-000001), Transaction UUID, Parcel ID, Postcode, or anchored hash was detected in the document.',
        extracted_entities: resolution.metadata.extracted,
        extracted_information: resolution.metadata.structured_entities,
        document_hash: resolution.documentHash,
        file_name: req.file.originalname,
        format: resolution.metadata.format,
      });
    }

    const documentHash = resolution.documentHash || computeDocumentHash(req.file.buffer);

    // Run full cryptographic integrity & deep learning verification on the resolved record
    const integrityResult = await verifyRecord(
      record.land_record_id,
      req.session.user_id,
      req.session.role,
      req
    );

    // Run multi-signal document analysis
    const analysisReport = analyseDocument({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      size: req.file.size,
      documentHash,
      record,
      integrityResult,
      extraction: resolution.metadata,
      matchMethod: resolution.matchMethod,
      matchedIdentifier: resolution.matchedIdentifier,
    });

    // Persist document verification history
    const doc = new Document({
      document_id: `DOC-${nanoid(10)}`,
      land_record_id: record.land_record_id,
      reference_id: explicitRef || record.land_record_id,
      filename: req.file.originalname,
      file_type: req.file.mimetype,
      file_size_bytes: req.file.size,
      document_hash: documentHash,
      uploaded_by: req.session.user_id,
      verification_result: analysisReport.overall,
      is_synthetic: false,
      verification_detail: analysisReport,
    });
    await doc.save();

    await appendAuditLog({
      user_id: req.session.user_id,
      role: req.session.role,
      action: 'DOCUMENT_VERIFIED',
      land_record_id: record.land_record_id,
      details: {
        document_id: doc.document_id,
        result: analysisReport.overall,
        confidence_pct: analysisReport.confidence_pct,
        passed_signals: analysisReport.passed_signals,
        match_method: resolution.matchMethod,
        detected_format: resolution.metadata.format,
      },
      req,
    });

    res.json({
      ...analysisReport,
      document_id: doc.document_id,
      land_record_id: record.land_record_id,
      transaction_id: record.transaction_id,
      match_method: resolution.matchMethod,
      matched_identifier: resolution.matchedIdentifier,
      detected_format: resolution.metadata.format,
      extracted_information: resolution.metadata.structured_entities,
      extracted_entities: resolution.metadata.extracted,
      PROTOTYPE_DISCLAIMER: process.env.PROTOTYPE_DISCLAIMER,
    });
  } catch (err) {
    console.error('[DOCS] Document verification error:', err);
    res.status(500).json({ error: 'Document verification failed: ' + err.message });
  }
});

// GET /api/documents/certificate/:id — Download authentic digital title deed certificate
// Customer: ownership check via requireOwnership
router.get('/certificate/:id', requireAuth, requireOwnership('record'), async (req, res) => {
  try {
    const record = req.resolvedRecord || await LandRecord.findOne({
      $or: [{ land_record_id: req.params.id }, { transaction_id: req.params.id }]
    }).lean();

    if (!record) {
      return res.status(404).json({ error: 'Land record not found' });
    }

    const p = record.property || {};
    const s = record.synthetic_demo || {};
    const sec = record.security || {};

    const certificateContent = `================================================================================
           HM LAND REGISTRY — OFFICIAL DIGITAL TITLE DEED CERTIFICATE
================================================================================

LAND RECORD IDENTIFIER:   ${record.land_record_id}
TRANSACTION UUID:         ${record.transaction_id}
CADASTRAL PARCEL ID:      ${s.parcel_id || 'N/A'}
SURVEY REFERENCE:         ${s.survey_number || 'N/A'}

--------------------------------------------------------------------------------
1. PROPERTY REGISTER DETAILS
--------------------------------------------------------------------------------
Address:                  ${[p.paon, p.saon, p.street].filter(Boolean).join(', ')}
Town / City:              ${p.town_city || 'N/A'}
District:                 ${p.district || 'N/A'}
County:                   ${p.county || 'N/A'}
Postal Code:              ${p.postcode || 'N/A'}
Tenure Type:              ${p.duration === 'F' ? 'Freehold' : p.duration === 'L' ? 'Leasehold' : p.duration || 'Unknown'}
Property Category:        ${p.property_type || 'N/A'} (New Build: ${p.new_build || 'N'})

--------------------------------------------------------------------------------
2. PROPRIETORSHIP & FINANCIAL REGISTER
--------------------------------------------------------------------------------
Registered Owner:         ${s.owner_name || 'HM Land Registry Record Holder'}
Registered Consideration: £${(p.price || 0).toLocaleString()}
Transaction Date:         ${p.transaction_date ? new Date(p.transaction_date).toISOString().slice(0, 10) : 'N/A'}
Ownership Status:         ${s.ownership_status || 'REGISTERED'}
Encumbrance Status:       ${s.encumbrance_status || 'NONE'}
Dispute Status:           ${s.dispute_status || 'NONE'}

--------------------------------------------------------------------------------
3. QUANTUM-SAFE CRYPTOGRAPHIC ANCHOR
--------------------------------------------------------------------------------
Canonical Record Hash (SHA-256):
${sec.record_hash || 'PENDING_SIGNATURE'}

Digital Signature Algorithm:
${sec.pqc_algorithm || 'ECDSA-P256 (DEV FALLBACK — NOT QUANTUM-SAFE)'}

Digital Signature:
${sec.digital_signature || 'UNSIGNED'}

Public Key / Verification Key:
${sec.public_key || 'N/A'}

Signing Timestamp:
${sec.signed_at ? new Date(sec.signed_at).toISOString() : 'N/A'}

================================================================================
PROTOTYPE DISCLAIMER:
Prototype system for demonstration purposes only. Not a legally authoritative land registry.
================================================================================
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Title_Deed_${record.land_record_id}.txt"`);
    res.send(certificateContent);
  } catch (err) {
    console.error('[DOCS] Certificate export error:', err);
    res.status(500).json({ error: 'Failed to generate certificate: ' + err.message });
  }
});

// GET /api/documents — list documents (most recent first)
// Customer: only their documents (uploaded by them or linked to their records)
// Auditor: all (read-only). Admin: all. Officer: all.
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    let filter = {};

    if (req.session.role === 'customer') {
      // Customer sees documents they uploaded OR documents for records they own
      const ownedRecords = await LandRecord.find({ owner_user_id: req.session.user_id }, 'land_record_id').lean();
      const ownedRecordIds = ownedRecords.map(r => r.land_record_id);
      filter = {
        $or: [
          { uploaded_by: req.session.user_id },
          { land_record_id: { $in: ownedRecordIds } },
        ]
      };
    }

    const docs = await Document.find(filter)
      .sort({ uploaded_at: -1 })
      .limit(limit)
      .lean();
    res.json({ documents: docs, total: docs.length });
  } catch (err) {
    console.error('[DOCS] List error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

module.exports = router;
