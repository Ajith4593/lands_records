require('dotenv').config();
const mongoose = require('mongoose');
const { LandRecord } = require('../src/models');
const { computeRecordHash } = require('../src/services/hashing');
const { signRecordHash } = require('../src/services/pqc');

async function distributeStatuses() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/landrecords';
  await mongoose.connect(uri);
  console.log('[DISTRIBUTE] Connected to MongoDB');

  // 1. Group A: VERIFIED records (e.g. LR-000001 to LR-000020, and all LR-000050+)
  // Ensure genuine valid hashes and signatures
  const records = await LandRecord.find().sort({ land_record_id: 1 });
  console.log(`[DISTRIBUTE] Processing ${records.length} records...`);

  let verifiedCount = 0;
  let pendingCount = 0;
  let hashMismatchCount = 0;
  let sigInvalidCount = 0;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const recNum = i + 1; // 1-indexed record number

    const p = rec.property;
    const recordData = {
      land_record_id: rec.land_record_id,
      transaction_id: rec.transaction_id,
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

    const recordHash = computeRecordHash(recordData);
    const { signature, publicKey, algorithm } = signRecordHash(recordHash);

    // Realistic categorization:
    if (recNum >= 21 && recNum <= 35) {
      // ── PENDING VERIFICATION (LR-000021 to LR-000035) ──
      rec.security.record_hash = recordHash;
      rec.security.digital_signature = signature;
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'VALID';
      rec.security.tamper_status = 'PENDING_VERIFICATION';
      rec.security.verified_at = null;
      rec.security.risk_score = 15;
      rec.security.risk_band = 'LOW';
      pendingCount++;
    } else if (recNum >= 36 && recNum <= 40) {
      // ── HASH MISMATCH / TAMPERED (LR-000036 to LR-000040) ──
      // Store altered canonical hash to simulate DB direct modification
      rec.security.record_hash = 'ffffffff' + recordHash.slice(8);
      rec.security.digital_signature = signature;
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'VALID';
      rec.security.tamper_status = 'HASH_MISMATCH';
      rec.security.verified_at = new Date();
      rec.security.risk_score = 85;
      rec.security.risk_band = 'CRITICAL';
      hashMismatchCount++;
    } else if (recNum >= 41 && recNum <= 45) {
      // ── SIGNATURE INVALID (LR-000041 to LR-000045) ──
      rec.security.record_hash = recordHash;
      rec.security.digital_signature = '3045022100' + '0'.repeat(64) + '0220' + '0'.repeat(64); // Corrupted signature
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'INVALID';
      rec.security.tamper_status = 'SIGNATURE_INVALID';
      rec.security.verified_at = new Date();
      rec.security.risk_score = 90;
      rec.security.risk_band = 'CRITICAL';
      sigInvalidCount++;
    } else {
      // ── VERIFIED AUTHENTIC (All other records e.g. LR-000001 to LR-000020, LR-000046+) ──
      rec.security.record_hash = recordHash;
      rec.security.digital_signature = signature;
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'VALID';
      rec.security.tamper_status = 'VERIFIED';
      rec.security.verified_at = new Date();
      rec.security.risk_score = 0;
      rec.security.risk_band = 'LOW';
      verifiedCount++;
    }

    await rec.save();
  }

  console.log(`[DISTRIBUTE] Summary of Dataset:`);
  console.log(`  ✓ VERIFIED records:             ${verifiedCount} (e.g. LR-000001 - LR-000020, LR-000046+)`);
  console.log(`  ⧗ PENDING_VERIFICATION records: ${pendingCount} (e.g. LR-000021 - LR-000035)`);
  console.log(`  ✕ HASH_MISMATCH (Tampered):     ${hashMismatchCount} (e.g. LR-000036 - LR-000040)`);
  console.log(`  ✕ SIGNATURE_INVALID:            ${sigInvalidCount} (e.g. LR-000041 - LR-000045)`);

  await mongoose.disconnect();
}

distributeStatuses().catch(console.error);
