const express = require('express');
const { LandRecord } = require('../models');
const { requireAuth, requireRole, requireOwnership } = require('../middleware/auth');
const { computeRecordHash } = require('../services/hashing');
const { signRecordHash } = require('../services/pqc');
const { appendBlock } = require('../services/ledger');
const { verifyRecord } = require('../services/verification');
const { appendAuditLog } = require('../services/audit');

const router = express.Router();

// GET /api/records — paginated list with search/filter
// Customer: only own records. Officer: all. Auditor: all (read). Admin: all.
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const skip = (page - 1) * limit;

    const filter = {};

    // Customer ownership filter — only their records
    if (req.session.role === 'customer') {
      filter.owner_user_id = req.session.user_id;
    }

    if (req.query.q) {
      const q = req.query.q.trim();
      filter['$or'] = [
        { land_record_id: { $regex: q, $options: 'i' } },
        { transaction_id: { $regex: q, $options: 'i' } },
        { 'property.postcode': { $regex: q, $options: 'i' } },
        { 'property.street': { $regex: q, $options: 'i' } },
        { 'property.town_city': { $regex: q, $options: 'i' } },
      ];
    }
    if (req.query.tamper_status) filter['security.tamper_status'] = req.query.tamper_status;
    if (req.query.postcode) filter['property.postcode'] = { $regex: req.query.postcode, $options: 'i' };
    if (req.query.town_city) filter['property.town_city'] = { $regex: req.query.town_city, $options: 'i' };
    if (req.query.property_type) filter['property.property_type'] = req.query.property_type;

    const [records, total] = await Promise.all([
      LandRecord.find(filter).skip(skip).limit(limit).lean(),
      LandRecord.countDocuments(filter)
    ]);

    res.json({ records, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// GET /api/records/:id — Customer: ownership enforced
router.get('/:id', requireAuth, requireOwnership('record'), async (req, res) => {
  try {
    // If ownership middleware already resolved the record (for customers), use it
    if (req.resolvedRecord) {
      await appendAuditLog({
        user_id: req.session.user_id, role: req.session.role,
        action: 'RECORD_VIEWED', land_record_id: req.resolvedRecord.land_record_id, req
      });
      return res.json(req.resolvedRecord);
    }

    const record = await LandRecord.findOne({
      $or: [{ land_record_id: req.params.id }, { transaction_id: req.params.id }]
    }).lean();
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await appendAuditLog({
      user_id: req.session.user_id, role: req.session.role,
      action: 'RECORD_VIEWED', land_record_id: record.land_record_id, req
    });

    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// POST /api/records/:id/sign — sign a record (Admin + Registration Officer only)
router.post('/:id/sign', requireAuth, requireRole('administrator', 'registration_officer'), async (req, res) => {
  try {
    const record = await LandRecord.findOne({
      $or: [{ land_record_id: req.params.id }, { transaction_id: req.params.id }]
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const recordData = {
      land_record_id: record.land_record_id,
      transaction_id: record.transaction_id,
      ...record.property.toObject?.() || record.property,
    };

    const recordHash = computeRecordHash(recordData);
    const { signature, publicKey, algorithm } = signRecordHash(recordHash);

    record.security.record_hash = recordHash;
    record.security.digital_signature = signature;
    record.security.public_key = publicKey;
    record.security.pqc_algorithm = algorithm; // Rule 2: always exact algorithm
    record.security.signature_status = 'VALID';
    record.security.tamper_status = 'PENDING_VERIFICATION';
    record.security.signed_at = new Date();

    await record.save();

    // Append to ledger
    await appendBlock({
      land_record_id: record.land_record_id,
      transaction_id: record.transaction_id,
      record_hash: recordHash,
      event_type: 'RECORD_SIGNED',
      actor_id: req.session.user_id,
      actor_role: req.session.role,
    });

    await appendAuditLog({
      user_id: req.session.user_id, role: req.session.role,
      action: 'RECORD_SIGNED', land_record_id: record.land_record_id,
      new_state_hash: recordHash, signature_status: 'VALID', req
    });

    res.json({ message: 'Record signed', land_record_id: record.land_record_id,
      algorithm, record_hash: recordHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signing failed' });
  }
});

// POST /api/records/:id/verify — full pipeline verification
// Admin, Officer, Auditor: any record. Customer: only own records.
router.post('/:id/verify', requireAuth, requireOwnership('record'), async (req, res) => {
  try {
    // Auditors can verify but not modify — verification is read-oriented
    const result = await verifyRecord(
      req.params.id,
      req.session.user_id,
      req.session.role,
      req
    );
    if (result.error) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/records/evaluate — Preprocess & evaluate arbitrary land record with Deep Learning
router.post('/evaluate', requireAuth, async (req, res) => {
  try {
    const { predictFraudAndAnomaly } = require('../services/deepLearning');
    const result = predictFraudAndAnomaly(req.body);
    res.json(result);
  } catch (err) {
    console.error('[DEEP LEARNING] Evaluation error:', err);
    res.status(500).json({ error: 'Evaluation failed: ' + err.message });
  }
});

// POST /api/records — Register a new land record (Admin + Officer only)
// Executes the 6-Stage Pipeline:
// 1. Data Preprocessing -> 2. Deep Learning Fraud/Anomaly -> 3. Integrity Verification ->
// 4. Secure Ledger -> 5. Quantum-Safe Signature -> 6. Land Record Storage
router.post('/', requireAuth, requireRole('administrator', 'registration_officer'), async (req, res) => {
  try {
    const { nanoid } = require('nanoid');
    const { predictFraudAndAnomaly } = require('../services/deepLearning');
    const { computeRiskScore } = require('../services/risk');

    const body = req.body;
    if (!body.property) return res.status(400).json({ error: 'Property data required' });

    // Generate IDs
    const count = await LandRecord.countDocuments();
    const land_record_id = `LR-${String(count + 1).padStart(6, '0')}`;
    const transaction_id = body.transaction_id || `TXN-${nanoid(12)}`;

    // Stage 1: Data Preprocessing
    const property = {
      price: parseFloat(body.property.price) || 0,
      transaction_date: body.property.transaction_date ? new Date(body.property.transaction_date) : new Date(),
      postcode: (body.property.postcode || '').trim(),
      property_type: body.property.property_type || 'Unknown',
      new_build: body.property.new_build === true || body.property.new_build === 'true',
      duration: body.property.duration || 'Unknown',
      paon: body.property.paon || '',
      saon: body.property.saon || '',
      street: body.property.street || '',
      locality: body.property.locality || '',
      town_city: body.property.town_city || '',
      district: body.property.district || '',
      county: body.property.county || '',
    };

    const synthetic_demo = {
      is_synthetic: true,
      parcel_id: body.parcel_id || `PCL-${nanoid(6)}`,
      survey_number: body.survey_number || `SRV-${nanoid(4)}`,
      owner_id: body.owner_user_id || req.session.user_id,
      owner_name: body.owner_name || 'Registered Owner',
      land_area: parseFloat(body.land_area) || 120,
      ownership_status: 'REGISTERED',
      mortgage_status: 'NONE',
      encumbrance_status: 'NONE',
      dispute_status: 'NONE',
    };

    // Stage 2: Deep Learning Fraud & Anomaly Detection Model
    const dlResult = predictFraudAndAnomaly({ property, synthetic_demo });

    // Stage 3: Integrity Verification (Canonical SHA-256 digest)
    const recordForHash = { land_record_id, transaction_id, ...property };
    const recordHash = computeRecordHash(recordForHash);

    // Stage 5: Quantum-Safe Digital Signature
    const { signature, publicKey, algorithm } = signRecordHash(recordHash);

    // Initial Risk Score
    const riskResult = computeRiskScore({
      never_verified: true,
      price_anomaly: dlResult.classification === 'SUSPICIOUS' || dlResult.anomaly_score > 0.60,
      disputed: dlResult.classification === 'FRAUD',
    });

    // Stage 6: Land Record Storage (MongoDB persistent store)
    const newRecord = new LandRecord({
      land_record_id,
      transaction_id,
      property,
      synthetic_demo,
      owner_user_id: body.owner_user_id || null,
      security: {
        record_hash: recordHash,
        digital_signature: signature,
        public_key: publicKey,
        pqc_algorithm: algorithm,
        signature_status: 'VALID',
        tamper_status: 'PENDING_VERIFICATION',
        signed_at: new Date(),
        risk_score: riskResult.risk_score,
        risk_band: riskResult.risk_band,
        risk_indicators: riskResult.indicators_fired,
      },
      deep_learning: {
        classification: dlResult.classification,
        confidence: dlResult.confidence,
        anomaly_score: dlResult.anomaly_score,
        reconstruction_mse: dlResult.reconstruction_mse,
        probabilities: dlResult.probabilities,
        anomaly_flags: dlResult.anomaly_flags,
        model_version: dlResult.model_version,
        model_architecture: dlResult.model_architecture,
        evaluated_at: dlResult.evaluated_at,
      },
      created_by: req.session.user_id,
    });

    await newRecord.save();

    // Stage 4: Secure Ledger (Append-only hash chaining)
    await appendBlock({
      land_record_id,
      transaction_id,
      record_hash: recordHash,
      event_type: 'RECORD_CREATED',
      actor_id: req.session.user_id,
      actor_role: req.session.role,
      deep_learning: dlResult,
    });

    // Append Audit Trail
    await appendAuditLog({
      user_id: req.session.user_id,
      role: req.session.role,
      action: 'LAND_RECORD_CREATED',
      land_record_id,
      new_state_hash: recordHash,
      details: {
        classification: dlResult.classification,
        anomaly_score: dlResult.anomaly_score,
      },
      req,
    });

    res.status(201).json({
      message: 'Land record registered successfully',
      land_record_id,
      transaction_id,
      algorithm,
      deep_learning: dlResult,
    });
  } catch (err) {
    console.error('[RECORDS] Create error:', err);
    res.status(500).json({ error: 'Failed to register land record: ' + err.message });
  }
});

// GET /api/records/:id/history — Customer: only own record history
router.get('/:id/history', requireAuth, requireOwnership('record'), async (req, res) => {
  try {
    const { LedgerBlock, AuditLog } = require('../models');
    const recordId = req.resolvedRecord?.land_record_id || req.params.id;

    const record = req.resolvedRecord || await LandRecord.findOne({
      $or: [{ land_record_id: req.params.id }, { transaction_id: req.params.id }]
    }).lean();
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const [ledgerEvents, auditEvents] = await Promise.all([
      LedgerBlock.find({ land_record_id: record.land_record_id }).sort({ block_id: 1 }).lean(),
      AuditLog.find({ land_record_id: record.land_record_id }).sort({ timestamp: -1 }).lean(),
    ]);

    res.json({ land_record_id: record.land_record_id, ledger_events: ledgerEvents, audit_events: auditEvents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
