/**
 * Verification Service — UC-076 Architecture
 *
 * Implements:
 *   1. Data Preprocessing & Deep Learning Fraud / Anomaly Detection
 *   2. Cryptographic Integrity Verification (Canonical SHA-256 hash recomputation)
 *   3. Quantum-Safe Digital Signature Verification on recomputed hash
 *   4. Append-Only Secure Ledger Full-Chain Recomputation
 *   5. Explainable Risk & Segregation of Duties Analysis
 */
const { LandRecord } = require('../models');
const { computeRecordHash } = require('./hashing');
const { verifySignature } = require('./pqc');
const { verifyFullChain } = require('./ledger');
const { appendAuditLog } = require('./audit');
const { computeRiskScore } = require('./risk');
const { predictFraudAndAnomaly } = require('./deepLearning');

function buildRecordDataForHash(record) {
  const p = record.property || record;
  return {
    land_record_id: record.land_record_id,
    transaction_id: record.transaction_id,
    price: p.price,
    transaction_date: p.transaction_date,
    postcode: p.postcode,
    property_type: p.property_type,
    duration: p.duration,
    paon: p.paon,
    saon: p.saon,
    street: p.street,
    locality: p.locality,
    town_city: p.town_city,
    district: p.district,
    county: p.county,
    ppd_category: p.ppd_category,
    new_build: p.new_build,
  };
}

async function verifyRecord(land_record_id, actor_id, actor_role, req) {
  const record = await LandRecord.findOne({
    $or: [{ land_record_id }, { transaction_id: land_record_id }]
  });
  if (!record) return { error: 'Record not found', status: 'NOT_FOUND' };

  // Stage 1 & 2: Data Preprocessing & Deep Learning Fraud / Anomaly Model
  const deepLearningResult = predictFraudAndAnomaly(record);

  // Stage 3: Cryptographic Integrity Verification (Canonical hash recomputation)
  const recordData = buildRecordDataForHash(record);
  const computedHash = computeRecordHash(recordData);
  const storedHash = record.security?.record_hash || '';
  const hashMatch = computedHash === storedHash;

  // Quantum-Safe signature verification against RECOMPUTED hash
  let sigValid = false;
  if (record.security?.digital_signature) {
    sigValid = verifySignature(computedHash, record.security.digital_signature, record.security.public_key);
  }

  // Full ledger chain recomputation from Genesis
  const ledgerResult = await verifyFullChain();
  const ledgerOk = ledgerResult.status === 'VERIFIED';

  // Overall status determination
  let status;
  if (!hashMatch) status = 'HASH_MISMATCH';
  else if (!sigValid && record.security?.digital_signature) status = 'SIGNATURE_INVALID';
  else if (!ledgerOk) status = 'LEDGER_BROKEN';
  else if (hashMatch && sigValid) status = 'VERIFIED';
  else status = 'PENDING_VERIFICATION';

  // Segregation of duties flag
  const isSelfVerified = actor_id && record.created_by && String(actor_id) === String(record.created_by);

  // Risk score calculation
  const riskResult = computeRiskScore({
    hash_mismatch: !hashMatch,
    signature_invalid: !sigValid && !!record.security?.digital_signature,
    ledger_broken: !ledgerOk,
    never_verified: !record.security?.verified_at,
    disputed: record.synthetic_demo?.dispute_status === 'ACTIVE' || deepLearningResult.classification === 'FRAUD',
    price_anomaly: deepLearningResult.anomaly_score > 0.60 || deepLearningResult.classification === 'SUSPICIOUS',
  });

  // Update record fields
  record.security = record.security || {};
  record.security.tamper_status = status;
  record.security.verified_at = new Date();
  if (actor_id) record.verified_by = actor_id;
  record.security.risk_score = riskResult.risk_score;
  record.security.risk_band = riskResult.risk_band;
  record.security.risk_indicators = riskResult.indicators_fired;

  // Save deep learning results to record
  record.deep_learning = {
    classification: deepLearningResult.classification,
    confidence: deepLearningResult.confidence,
    anomaly_score: deepLearningResult.anomaly_score,
    reconstruction_mse: deepLearningResult.reconstruction_mse,
    probabilities: deepLearningResult.probabilities,
    anomaly_flags: deepLearningResult.anomaly_flags,
    model_version: deepLearningResult.model_version,
    model_architecture: deepLearningResult.model_architecture,
    evaluated_at: deepLearningResult.evaluated_at,
  };

  await record.save();

  // Audit event log
  await appendAuditLog({
    user_id: actor_id,
    role: actor_role,
    action: status === 'VERIFIED' ? 'RECORD_VERIFIED' : 'TAMPER_DETECTED',
    land_record_id: record.land_record_id,
    previous_state_hash: storedHash,
    new_state_hash: computedHash,
    signature_status: sigValid ? 'VALID' : 'INVALID',
    details: {
      status,
      ledger: ledgerResult.status,
      deep_learning: deepLearningResult.classification,
      anomaly_score: deepLearningResult.anomaly_score,
    },
    req
  });

  return {
    land_record_id: record.land_record_id,
    status,
    steps: {
      hash_recomputed: computedHash,
      hash_match: hashMatch,
      hash_status: hashMatch ? 'MATCH' : 'MISMATCH',
      signature_valid: sigValid,
      signature_status: sigValid ? 'VALID' : 'INVALID',
      ledger_status: ledgerOk ? 'VERIFIED' : 'BROKEN',
      ledger_detail: ledgerResult,
      deep_learning_status: deepLearningResult.classification,
      deep_learning_detail: deepLearningResult,
    },
    deep_learning: deepLearningResult,
    pqc_algorithm: record.security.pqc_algorithm,
    is_self_verified: isSelfVerified,
    risk: riskResult,
    tampered: !['VERIFIED', 'PENDING_VERIFICATION'].includes(status),
    verified_at: record.security.verified_at,
  };
}

module.exports = { verifyRecord, buildRecordDataForHash };
