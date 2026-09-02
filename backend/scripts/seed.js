/**
 * Database Seeding Script — UC-076
 * Idempotent: unique index on transaction_id prevents duplicates on restart.
 * Rule 11: validates schema before mapping.
 * Rule 2: signs each record with actual algorithm (labeled accurately).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const argon2 = require('argon2');
const { nanoid } = require('nanoid');
const { LandRecord, LedgerBlock, AuditLog, User } = require('../src/models');
const { parseCsvFile, validateAndNormalize, resolveCsvPath } = require('../src/services/ingestion');
const { computeRecordHash } = require('../src/services/hashing');
const { signRecordHash } = require('../src/services/pqc');
const { appendBlock } = require('../src/services/ledger');
const { appendAuditLog } = require('../src/services/audit');
const { predictFraudAndAnomaly } = require('../src/services/deepLearning');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/landrecords';
const CSV_PATH = resolveCsvPath(process.env.CSV_PATH);

const BATCH_SIZE = 200;

async function seedUsers() {
  const users = [
    { username: 'admin', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@LandRecords2024',
      role: 'administrator', full_name: 'System Administrator' },
    { username: 'officer1', password: 'Officer@2024',
      role: 'registration_officer', full_name: 'Registration Officer' },
    { username: 'auditor1', password: 'Auditor@2024',
      role: 'auditor', full_name: 'Land Auditor' },
    { username: 'customer1', password: 'Customer@2024',
      role: 'customer', full_name: 'Rajesh Kumar', email: 'rajesh.kumar@example.com' },
    { username: 'customer2', password: 'Customer@2024B',
      role: 'customer', full_name: 'Priya Sharma', email: 'priya.sharma@example.com' },
  ];

  const createdUsers = [];
  for (const u of users) {
    const exists = await User.findOne({ username: u.username });
    if (!exists) {
      const hash = await argon2.hash(u.password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
      const newUser = await new User({
        user_id: `USR-${nanoid(8)}`,
        username: u.username,
        password_hash: hash,
        role: u.role,
        full_name: u.full_name,
        email: u.email || undefined,
      }).save();
      createdUsers.push(newUser);
      console.log(`  [SEED] Created user: ${u.username} (${u.role})`);
    } else {
      createdUsers.push(exists);
    }
  }
  return createdUsers;
}

/**
 * After records are seeded, assign ownership of some records to customer users.
 * This links records to customers via owner_user_id for RBAC filtering.
 */
async function assignCustomerOwnership() {
  const customers = await User.find({ role: 'customer' }).lean();
  if (customers.length === 0) {
    console.log('[SEED] No customer users found — skipping ownership assignment');
    return;
  }

  // Check if ownership already assigned
  const ownedCount = await LandRecord.countDocuments({ owner_user_id: { $exists: true, $ne: null } });
  if (ownedCount > 0) {
    console.log(`[SEED] ${ownedCount} records already have owners — skipping ownership assignment`);
    return;
  }

  // Assign first 5 records to customer1, next 5 to customer2
  const records = await LandRecord.find().sort({ land_record_id: 1 }).limit(10).lean();

  for (let i = 0; i < records.length; i++) {
    const customerIdx = i < 5 ? 0 : Math.min(1, customers.length - 1);
    const customer = customers[customerIdx];
    await LandRecord.updateOne(
      { _id: records[i]._id },
      {
        $set: {
          owner_user_id: customer.user_id,
          'synthetic_demo.owner_id': customer.user_id,
          'synthetic_demo.owner_name': customer.full_name,
        }
      }
    );
    console.log(`  [SEED] Assigned ${records[i].land_record_id} → ${customer.username} (${customer.user_id})`);
  }
}

async function seedRecords() {
  // Check idempotency
  const existing = await LandRecord.countDocuments();
  if (existing > 0) {
    console.log(`[SEED] ${existing} records already present — skipping CSV import (idempotent)`);
    return { skipped: true, existing };
  }

  console.log('[SEED] Loading CSV from:', CSV_PATH);
  let rawRecords;
  try {
    rawRecords = parseCsvFile(CSV_PATH);
  } catch (err) {
    console.error('[SEED] Failed to read CSV:', err.message);
    process.exit(1);
  }

  console.log(`[SEED] CSV loaded: ${rawRecords.length} rows`);
  const { valid, invalid, duplicates, rows, errors } = validateAndNormalize(rawRecords);

  if (!valid) {
    console.error('[SEED] Schema validation FAILED. Halting ingestion.');
    for (const e of errors) console.error(' >', e);
    process.exit(1);
  }

  console.log(`[SEED] Schema valid. Rows: ${rows.length} valid, ${invalid.length} invalid, ${duplicates.length} duplicates`);

  let inserted = 0, signed = 0, counter = existing;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const toInsert = [];

    for (const row of batch) {
      counter++;
      const land_record_id = `LR-${String(counter).padStart(6, '0')}`;

      const recordForHash = {
        land_record_id,
        transaction_id: row.transaction_id,
        ...row.property,
      };

      const recordHash = computeRecordHash(recordForHash);
      const { signature, publicKey, algorithm } = signRecordHash(recordHash);
      const dlResult = predictFraudAndAnomaly({ property: row.property, synthetic_demo: row.synthetic_demo });

      toInsert.push({
        land_record_id,
        transaction_id: row.transaction_id,
        property: row.property,
        synthetic_demo: row.synthetic_demo,
        security: {
          record_hash: recordHash,
          digital_signature: signature,
          public_key: publicKey,
          pqc_algorithm: algorithm, // Rule 2: exact algorithm stored per record
          signature_status: 'VALID',
          tamper_status: 'PENDING_VERIFICATION',
          signed_at: new Date(),
          risk_score: dlResult.classification === 'SUSPICIOUS' ? 25 : dlResult.classification === 'FRAUD' ? 65 : 0,
          risk_band: dlResult.classification === 'SUSPICIOUS' ? 'MEDIUM' : dlResult.classification === 'FRAUD' ? 'HIGH' : 'LOW',
          risk_indicators: dlResult.anomaly_flags.map(f => ({ rule: f, points: 15, description: f })),
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
      });
    }

    // Bulk insert with ordered:false to continue past duplicate key errors
    try {
      const result = await LandRecord.insertMany(toInsert, { ordered: false });
      inserted += result.length;
    } catch (err) {
      if (err.code === 11000) {
        inserted += err.insertedDocs?.length || 0;
        console.log(`  [SEED] Batch ${Math.floor(i/BATCH_SIZE)+1}: some duplicates skipped`);
      } else throw err;
    }

    process.stdout.write(`\r[SEED] Progress: ${Math.min(i+BATCH_SIZE, rows.length)}/${rows.length} records...`);
  }
  console.log();

  // Create ledger blocks for inserted records (batch)
  console.log('[SEED] Creating ledger entries...');
  const insertedRecords = await LandRecord.find().sort({ created_at: 1 }).lean();
  for (const rec of insertedRecords) {
    try {
      await appendBlock({
        land_record_id: rec.land_record_id,
        transaction_id: rec.transaction_id,
        record_hash: rec.security.record_hash,
        event_type: 'RECORD_CREATED',
        actor_id: 'SYSTEM',
        actor_role: 'system',
        deep_learning: rec.deep_learning,
      });
      signed++;
    } catch (err) {
      if (!err.message?.includes('duplicate')) console.error('Ledger err:', err.message);
    }
  }

  console.log(`[SEED] Done. Inserted: ${inserted}, Ledger blocks: ${signed}`);
  return { inserted, signed, invalid: invalid.length, duplicates: duplicates.length };
}

async function main(uri = MONGO_URI) {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
    console.log('[SEED] MongoDB connected');
  }

  // Create indexes
  await LandRecord.collection.createIndex({ transaction_id: 1 }, { unique: true });
  await LandRecord.collection.createIndex({ land_record_id: 1 }, { unique: true });
  await LandRecord.collection.createIndex({ 'property.postcode': 1 });
  await LandRecord.collection.createIndex({ owner_user_id: 1 });
  await LedgerBlock.collection.createIndex({ block_id: 1 }, { unique: true });
  await AuditLog.collection.createIndex({ land_record_id: 1 });

  console.log('[SEED] Seeding users...');
  await seedUsers();

  console.log('[SEED] Seeding land records...');
  const stats = await seedRecords();

  console.log('[SEED] Assigning customer ownership...');
  await assignCustomerOwnership();

  console.log('[SEED] Seed complete:', stats);
  return stats;
}

if (require.main === module) {
  main()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(err => {
      console.error('[SEED] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { seedUsers, seedRecords, assignCustomerOwnership, main };
