const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { preprocessRecord, predictFraudAndAnomaly, loadModel } = require('../src/services/deepLearning');
const { LandRecord, LedgerBlock, User } = require('../src/models');
const { computeRecordHash } = require('../src/services/hashing');
const { signRecordHash, verifySignature } = require('../src/services/pqc');
const { verifyRecord } = require('../src/services/verification');
const { appendBlock, verifyFullChain } = require('../src/services/ledger');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Deep Learning Fraud & Anomaly Detection Pipeline', () => {
  test('Model artifact loads successfully and contains valid neural network weights', () => {
    const model = loadModel();
    expect(model).toBeDefined();
    expect(model.model_name).toBe('LandRecordsDeepFraudDetector');
    expect(model.architecture).toBe('Deep-MLP-Autoencoder-Hybrid');
    expect(model.classifier_weights).toBeDefined();
    expect(model.classifier_weights.coefs.length).toBe(4); // Dense 64 -> 32 -> 16 -> 3
    expect(model.autoencoder_weights).toBeDefined();
    expect(model.autoencoder_weights.coefs.length).toBe(4); // Dense 16 -> 8 -> 16 -> 20
    expect(model.scaler.mean.length).toBe(20);
    expect(model.scaler.scale.length).toBe(20);
  });

  test('Stage 1: Preprocesses raw land record into 20-dim scaled feature vector', () => {
    const record = {
      property: {
        price: 250000,
        transaction_date: '2018-05-15',
        postcode: 'BN6 8AB',
        property_type: 'Detached',
        property_type_raw: 'D',
        duration: 'Freehold',
        duration_raw: 'F',
        new_build: false,
        ppd_category: 'A',
      },
      synthetic_demo: {
        land_area: 250,
        mortgage_status: 'MORTGAGED',
        dispute_status: 'NONE',
      }
    };

    const preprocessed = preprocessRecord(record);
    expect(preprocessed.rawFeatures.length).toBe(20);
    expect(preprocessed.scaledFeatures.length).toBe(20);
    expect(preprocessed.metrics.price).toBe(250000);
    expect(preprocessed.metrics.landArea).toBe(250);
  });

  test('Stage 2: Classifies normal authentic record as VALID with low anomaly score', () => {
    const record = {
      property: {
        price: 280000,
        transaction_date: '2019-06-10',
        postcode: 'BN6 8AB',
        property_type: 'Semi-Detached',
        property_type_raw: 'S',
        duration: 'Freehold',
        duration_raw: 'F',
        new_build: false,
        ppd_category: 'A',
      },
      synthetic_demo: {
        land_area: 180,
        mortgage_status: 'UNENCUMBERED',
        dispute_status: 'NONE',
      }
    };

    const result = predictFraudAndAnomaly(record);
    expect(result.classification).toBe('VALID');
    expect(result.probabilities.valid).toBeGreaterThan(0.5);
    expect(result.anomaly_score).toBeLessThan(0.70);
    expect(result.model_version).toBeDefined();
  });

  test('Stage 2: Detects extreme price fraud / active dispute transfer as FRAUD', () => {
    const fraudRecord = {
      property: {
        price: 1, // Nominal £1 transfer
        transaction_date: '2022-01-01',
        postcode: 'BN6 8AB',
        property_type: 'Flat/Maisonette',
        property_type_raw: 'F',
        duration: 'Leasehold',
        duration_raw: 'L',
        new_build: false,
        ppd_category: 'A',
      },
      synthetic_demo: {
        land_area: 500,
        mortgage_status: 'MORTGAGED',
        dispute_status: 'ACTIVE',
        ownership_status: 'UNDER_DISPUTE',
      }
    };

    const result = predictFraudAndAnomaly(fraudRecord);
    expect(result.classification).toBe('FRAUD');
    expect(result.anomaly_flags).toContain('ACTIVE_TITLE_DISPUTE_DETECTED');
    expect(result.anomaly_flags).toContain('NOMINAL_PRICE_UNDERVALLUATION');
  });

  test('Stage 2: Detects valuation anomaly on small plot as SUSPICIOUS or FRAUD', () => {
    const suspiciousRecord = {
      property: {
        price: 45000000, // £45M on 30m2
        transaction_date: '2023-01-01',
        postcode: 'BN6 8AB',
        property_type: 'Flat/Maisonette',
        property_type_raw: 'F',
        duration: 'Leasehold',
        duration_raw: 'L',
        new_build: false,
        ppd_category: 'B',
      },
      synthetic_demo: {
        land_area: 30,
        mortgage_status: 'NONE',
        dispute_status: 'NONE',
      }
    };

    const result = predictFraudAndAnomaly(suspiciousRecord);
    expect(['SUSPICIOUS', 'FRAUD']).toContain(result.classification);
    expect(result.anomaly_flags).toContain('EXTREME_PRICE_VALUATION_OUTLIER');
  });

  test('Full 6-Stage Pipeline: Register, Predict, Hash, Sign, Ledger, Store & Verify', async () => {
    // 1. Data Preprocessing & Record creation
    const land_record_id = 'LR-999001';
    const transaction_id = 'TXN-TEST-DL-001';
    const property = {
      price: 320000,
      transaction_date: new Date('2021-04-12'),
      postcode: 'BN6 8AB',
      property_type: 'Detached',
      duration: 'Freehold',
      paon: '12',
      saon: '',
      street: 'Church Road',
      locality: 'Hassocks',
      town_city: 'Hassocks',
      district: 'Mid Sussex',
      county: 'West Sussex',
      ppd_category: 'A',
      new_build: false,
    };
    const synthetic_demo = {
      is_synthetic: true,
      parcel_id: 'PCL-999001',
      survey_number: 'SRV-9991',
      owner_name: 'Test Owner',
      land_area: 220,
      ownership_status: 'REGISTERED',
      mortgage_status: 'NONE',
      dispute_status: 'NONE',
    };

    // 2. Deep Learning Evaluation
    const dlResult = predictFraudAndAnomaly({ property, synthetic_demo });
    expect(dlResult.classification).toBe('VALID');

    // 3. Cryptographic Integrity Verification (Canonical SHA-256)
    const recordForHash = { land_record_id, transaction_id, ...property };
    const recordHash = computeRecordHash(recordForHash);
    expect(recordHash).toHaveLength(64);

    // 5. Quantum-Safe Digital Signature
    const { signature, publicKey, algorithm } = signRecordHash(recordHash);
    expect(verifySignature(recordHash, signature, publicKey)).toBe(true);

    // 6. Land Record Storage
    const record = new LandRecord({
      land_record_id,
      transaction_id,
      property,
      synthetic_demo,
      security: {
        record_hash: recordHash,
        digital_signature: signature,
        public_key: publicKey,
        pqc_algorithm: algorithm,
        signature_status: 'VALID',
        tamper_status: 'PENDING_VERIFICATION',
        signed_at: new Date(),
      },
      deep_learning: {
        classification: dlResult.classification,
        confidence: dlResult.confidence,
        anomaly_score: dlResult.anomaly_score,
        probabilities: dlResult.probabilities,
        anomaly_flags: dlResult.anomaly_flags,
      }
    });
    await record.save();

    // 4. Secure Ledger Chaining
    const block = await appendBlock({
      land_record_id,
      transaction_id,
      record_hash: recordHash,
      event_type: 'RECORD_CREATED',
      actor_id: 'TEST_OFFICER',
      actor_role: 'registration_officer',
      deep_learning: dlResult,
    });
    expect(block.block_id).toBeGreaterThanOrEqual(1);

    // Verify full pipeline
    const verification = await verifyRecord(land_record_id, 'AUDITOR_1', 'auditor');
    expect(verification.status).toBe('VERIFIED');
    expect(verification.steps.hash_match).toBe(true);
    expect(verification.steps.signature_valid).toBe(true);
    expect(verification.steps.ledger_status).toBe('VERIFIED');
    expect(verification.deep_learning.classification).toBe('VALID');
  });

  test('Document Parser: Extracts tagged entities from Text and Image buffers', async () => {
    const { extractTextAndMetadata } = require('../src/services/documentParser');
    
    // Sample text document
    const textDoc = Buffer.from(
      `HM LAND REGISTRY OFFICIAL CERTIFICATE\nLAND RECORD IDENTIFIER: LR-000001\nTRANSACTION UUID: 68FEB20C-6E83-38DA-E053-6C04A8C051AE\nCADASTRAL PARCEL ID: PAR-100200\nPostal Code: BN6 8AA\nRegistered Consideration: £350,000\nTenure: Freehold\nOwner: James Harrington\nProperty Type: Detached`
    );
    const textExtract = await extractTextAndMetadata(textDoc, 'text/plain', 'certificate.txt');
    expect(textExtract.extracted.landRecordIds).toContain('LR-000001');
    expect(textExtract.extracted.postcodes).toContain('BN6 8AA');
    expect(textExtract.structured_entities.land_record_id).toBe('LR-000001');
    expect(textExtract.structured_entities.parcel_id).toBe('PAR-100200');
    expect(textExtract.structured_entities.price).toBe(350000);
    expect(textExtract.structured_entities.tenure).toBe('Freehold');

    // Valid image buffer with OCR text
    const fs = require('fs');
    const path = require('path');
    const imagePath = path.resolve(__dirname, '../test_ocr.png');
    const imageBuffer = fs.readFileSync(imagePath);
    const imageExtract = await extractTextAndMetadata(imageBuffer, 'image/png', 'title_deed_LR-000001.png');
    expect(imageExtract.format).toBe('IMAGE (PNG)');
    expect(imageExtract.structured_entities.land_record_id).toBe('LR-000001');
  });
});
