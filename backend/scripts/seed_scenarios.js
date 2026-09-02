require('dotenv').config();
const mongoose = require('mongoose');
const { LandRecord } = require('../src/models');
const { computeRecordHash } = require('../src/services/hashing');
const { signRecordHash } = require('../src/services/pqc');
const { predictFraudAndAnomaly } = require('../src/services/deepLearning');

async function seedRichScenarios() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/landrecords';
  await mongoose.connect(uri);
  console.log('[SCENARIOS] Connected to MongoDB');

  const records = await LandRecord.find().sort({ land_record_id: 1 });
  console.log(`[SCENARIOS] Categorizing ${records.length} records into rich integrity states...`);

  let counts = {
    verified: 0,
    pending: 0,
    duplicate: 0,
    modified: 0,
    canceled: 0,
    sigInvalid: 0
  };

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const recNum = i + 1; // 1-indexed

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

    if (recNum >= 16 && recNum <= 25) {
      // ══════════════════════════════════════════════════════════════
      // SCENARIO 2: PENDING VERIFICATION (LR-000016 to LR-000025)
      // Legitimate data ready to be verified into perfect state on click
      // ══════════════════════════════════════════════════════════════
      rec.security.record_hash = recordHash;
      rec.security.digital_signature = signature;
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'VALID';
      rec.security.tamper_status = 'PENDING_VERIFICATION';
      rec.security.verified_at = null;
      rec.security.risk_score = 20;
      rec.security.risk_band = 'LOW';
      rec.synthetic_demo.ownership_status = 'PENDING_TRANSFER';
      rec.synthetic_demo.dispute_status = 'NONE';
      counts.pending++;

    } else if (recNum >= 26 && recNum <= 30) {
      // ══════════════════════════════════════════════════════════════
      // SCENARIO 3: DUPLICATE / FAKE SUSPECT (LR-000026 to LR-000030)
      // Cloned Parcel ID & flagged fake transaction
      // ══════════════════════════════════════════════════════════════
      rec.security.record_hash = 'dup_' + recordHash.slice(4);
      rec.security.digital_signature = signature;
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'INVALID';
      rec.security.tamper_status = 'TAMPERED';
      rec.security.verified_at = new Date();
      rec.security.risk_score = 95;
      rec.security.risk_band = 'CRITICAL';
      rec.synthetic_demo.parcel_id = `PAR-000001`; // Duplicate parcel from LR-000001
      rec.synthetic_demo.ownership_status = 'DUPLICATE_FLAGGED';
      rec.synthetic_demo.dispute_status = 'ACTIVE';
      counts.duplicate++;

    } else if (recNum >= 31 && recNum <= 35) {
      // ══════════════════════════════════════════════════════════════
      // SCENARIO 4: MODIFIED / LOW ACCURACY (LR-000031 to LR-000035)
      // Direct field value alteration causing hash mismatch
      // ══════════════════════════════════════════════════════════════
      rec.property.price = 999999; // Altered price value
      rec.security.record_hash = recordHash; // Stored hash was for original price
      rec.security.digital_signature = signature;
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'VALID';
      rec.security.tamper_status = 'HASH_MISMATCH';
      rec.security.verified_at = new Date();
      rec.security.risk_score = 80;
      rec.security.risk_band = 'HIGH';
      rec.synthetic_demo.ownership_status = 'UNDER_DISPUTE';
      rec.synthetic_demo.dispute_status = 'ACTIVE';
      counts.modified++;

    } else if (recNum >= 36 && recNum <= 40) {
      // ══════════════════════════════════════════════════════════════
      // SCENARIO 5: CANCELED / REVOKED (LR-000036 to LR-000040)
      // Formally canceled and revoked registration title
      // ══════════════════════════════════════════════════════════════
      rec.security.record_hash = recordHash;
      rec.security.digital_signature = signature;
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'NOT_SIGNED';
      rec.security.tamper_status = 'CANCELED';
      rec.security.verified_at = new Date();
      rec.security.risk_score = 90;
      rec.security.risk_band = 'CRITICAL';
      rec.synthetic_demo.ownership_status = 'CANCELED';
      rec.synthetic_demo.dispute_status = 'ACTIVE';
      counts.canceled++;

    } else if (recNum >= 41 && recNum <= 45) {
      // ══════════════════════════════════════════════════════════════
      // SCENARIO 6: SIGNATURE INVALID (LR-000041 to LR-000045)
      // Corrupted signature bytes
      // ══════════════════════════════════════════════════════════════
      rec.security.record_hash = recordHash;
      rec.security.digital_signature = '3045022100' + '0'.repeat(64) + '0220' + '0'.repeat(64);
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'INVALID';
      rec.security.tamper_status = 'SIGNATURE_INVALID';
      rec.security.verified_at = new Date();
      rec.security.risk_score = 90;
      rec.security.risk_band = 'CRITICAL';
      rec.synthetic_demo.ownership_status = 'UNDER_DISPUTE';
      rec.synthetic_demo.dispute_status = 'ACTIVE';
      counts.sigInvalid++;

    } else {
      // ══════════════════════════════════════════════════════════════
      // SCENARIO 1: VERIFIED AUTHENTIC (LR-000001 - LR-000015, LR-000046+)
      // Genuine 100% verified quantum-safe records
      // ══════════════════════════════════════════════════════════════
      rec.security.record_hash = recordHash;
      rec.security.digital_signature = signature;
      rec.security.public_key = publicKey;
      rec.security.pqc_algorithm = algorithm;
      rec.security.signature_status = 'VALID';
      rec.security.tamper_status = 'VERIFIED';
      rec.security.verified_at = new Date();
      rec.security.risk_score = 0;
      rec.security.risk_band = 'LOW';
      rec.synthetic_demo.ownership_status = 'REGISTERED';
      rec.synthetic_demo.dispute_status = 'NONE';
      counts.verified++;
    }

    const dlResult = predictFraudAndAnomaly(rec);
    rec.deep_learning = {
      classification: dlResult.classification,
      confidence: dlResult.confidence,
      anomaly_score: dlResult.anomaly_score,
      reconstruction_mse: dlResult.reconstruction_mse,
      probabilities: dlResult.probabilities,
      anomaly_flags: dlResult.anomaly_flags,
      model_version: dlResult.model_version,
      model_architecture: dlResult.model_architecture,
      evaluated_at: dlResult.evaluated_at,
    };

    await rec.save();
  }

  console.log('[SCENARIOS] Completed Setup:');
  console.log(`  ✓ VERIFIED records (Perfect Data):            ${counts.verified} (e.g. LR-000001 - LR-000015)`);
  console.log(`  ⧗ PENDING_VERIFICATION (Needs Verification): ${counts.pending} (e.g. LR-000016 - LR-000025)`);
  console.log(`  ⚠ DUPLICATE / FAKE SUSPECT:                   ${counts.duplicate} (e.g. LR-000026 - LR-000030)`);
  console.log(`  ✕ MODIFIED / LOW ACCURACY (Hash Mismatch):    ${counts.modified} (e.g. LR-000031 - LR-000035)`);
  console.log(`  ✕ CANCELED / REVOKED:                         ${counts.canceled} (e.g. LR-000036 - LR-000040)`);
  console.log(`  ✕ SIGNATURE_INVALID:                          ${counts.sigInvalid} (e.g. LR-000041 - LR-000045)`);

  await mongoose.disconnect();
}

seedRichScenarios().catch(console.error);
