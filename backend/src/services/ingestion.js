/**
 * CSV Ingestion Pipeline — Feature 1
 * Rule 11: Schema validates BEFORE column mapping.
 * Rule 0.1: synthetic fields always have is_synthetic: true.
 * Idempotent seeding via unique index on transaction_id.
 */
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const crypto = require('crypto');
const { nanoid } = require('nanoid');

const EXPECTED_COLS = 16;
const COLUMN_NAMES = [
  'transaction_id', 'price', 'transaction_date', 'postcode',
  'property_type', 'new_build', 'duration', 'paon', 'saon',
  'street', 'locality', 'town_city', 'district', 'county',
  'ppd_category', 'record_status'
];

const PROPERTY_TYPE_MAP = { D:'Detached', S:'Semi-Detached', T:'Terraced', F:'Flat/Maisonette', O:'Other' };
const DURATION_MAP = { F:'Freehold', L:'Leasehold', U:'Unknown' };
const PPD_MAP = { A:'Standard Price Paid transaction', B:'Additional category/transaction type' };

const UK_POSTCODE = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

// Approximate postcode area centroids for demo map
const POSTCODE_CENTROIDS = {
  BN6:[50.9216,-0.1478], BN1:[50.8229,-0.1363], BN2:[50.8283,-0.1116],
  RH:[51.2361,-0.1878], GU:[51.2362,-0.5704], KT:[51.3891,-0.3040],
  TW:[51.4513,-0.3456], SW:[51.4658,-0.1652], SE:[51.5006,-0.0543],
  EC:[51.5155,-0.0922], WC:[51.5174,-0.1200], N:[51.5710,-0.1072],
  NW:[51.5490,-0.1836], E:[51.5280,0.0400], M:[53.4808,-2.2426],
  L:[53.4084,-2.9916], B:[52.4862,-1.8904], G:[55.8617,-4.2583]
};

const SYNTHETIC_NAMES = [
  'James Harrington','Priya Sharma','Mohammed Al-Rashid','Emily Chen',
  'Robert O\'Brien','Fatima Malik','David Okonkwo','Sarah Fitzgerald',
  'Raj Patel','Laura Stevens','Arjun Mehta','Sophie Beaumont'
];

function getApproxCoords(postcode) {
  if (!postcode) return [null, null];
  const prefix = postcode.trim().toUpperCase().replace(/\s+/g,'').slice(0,3);
  for (const k of [prefix, prefix.slice(0,2), prefix.slice(0,1)]) {
    if (POSTCODE_CENTROIDS[k]) {
      const [lat, lon] = POSTCODE_CENTROIDS[k];
      const jitter = () => (Math.random()-0.5)*0.1;
      return [+(lat+jitter()).toFixed(6), +(lon+jitter()).toFixed(6)];
    }
  }
  return [null, null];
}

function syntheticFields(txnId, postcode) {
  // Deterministic from transaction_id so reruns are stable
  const seed = parseInt(crypto.createHash('md5').update(txnId).digest('hex').slice(0,8), 16);
  const rng = (max) => Math.abs(seed * 1103515245 + 12345) % max;
  const [lat, lon] = getApproxCoords(postcode);
  const statuses = ['REGISTERED','PENDING_TRANSFER','UNDER_DISPUTE'];
  const mort = ['MORTGAGED','UNENCUMBERED','PARTIALLY_REDEEMED'];
  const enc = ['NONE','COVENANT','EASEMENT'];
  const disp = ['NONE','NONE','NONE','NONE','ACTIVE'];
  return {
    is_synthetic: true,
    parcel_id: `PAR-${(seed % 900000)+100000}`,
    survey_number: `SUR-${(seed % 90000)+10000}-${(seed % 900)+100}`,
    owner_id: `OWN-${(seed % 900000)+100000}`,
    owner_name: SYNTHETIC_NAMES[rng(SYNTHETIC_NAMES.length)],
    land_area: +((rng(4950)+50)).toFixed(2),
    latitude: lat, longitude: lon,
    location_label: 'Approximate Location (postcode centroid)',
    ownership_status: statuses[rng(statuses.length)],
    mortgage_status: mort[rng(mort.length)],
    encumbrance_status: enc[rng(enc.length)],
    dispute_status: disp[rng(disp.length)],
  };
}

// ── Schema Validation (Rule 11) ─────────────────────────────────────────────
function validateSchema(records) {
  const errors = [];
  if (!records.length) { errors.push('CSV has no data rows'); return errors; }

  // Column count check
  const first = records[0];
  if (first.length !== EXPECTED_COLS) {
    errors.push(`Column count mismatch: expected ${EXPECTED_COLS}, found ${first.length}. Ingestion halted.`);
    return errors;
  }

  // Spot-check first 20 rows
  const sample = records.slice(0, 20);
  const dateRe = /^\d{2}\/\d{2}\/\d{4}$/;
  const validPT = new Set(['D','S','T','F','O']);
  const validNB = new Set(['Y','N']);
  const validDur = new Set(['F','L','U']);

  for (const [i, row] of sample.entries()) {
    const price = parseFloat(row[1]);
    if (isNaN(price)) errors.push(`Row ${i+1}: col 2 (price) not numeric: '${row[1]}'`);
    if (!dateRe.test((row[2]||'').trim())) errors.push(`Row ${i+1}: col 3 (date) not DD/MM/YYYY: '${row[2]}'`);
    if (!validPT.has((row[4]||'').trim())) errors.push(`Row ${i+1}: col 5 (property_type) invalid: '${row[4]}'`);
    if (!validNB.has((row[5]||'').trim())) errors.push(`Row ${i+1}: col 6 (new_build) invalid: '${row[5]}'`);
    if (!validDur.has((row[6]||'').trim())) errors.push(`Row ${i+1}: col 7 (duration) invalid: '${row[6]}'`);
    if (errors.length > 5) { errors.push('...too many validation errors, halting'); break; }
  }
  return errors;
}

// ── Normalize one row ────────────────────────────────────────────────────────
function normalizeRow(row, idx, seenIds) {
  const get = (i) => (row[i] || '').trim();

  const txnId = get(0);
  if (!txnId) return { error: { row: idx, field: 'transaction_id', reason: 'empty' } };
  if (seenIds.has(txnId)) return { error: { row: idx, field: 'transaction_id', reason: `duplicate: ${txnId}` } };
  seenIds.add(txnId);

  const priceRaw = parseFloat(get(1));
  if (isNaN(priceRaw) || priceRaw <= 0) return { error: { row: idx, field: 'price', reason: `invalid: ${get(1)}` } };

  let txnDate;
  try {
    const [d, m, y] = get(2).split('/');
    txnDate = new Date(Date.UTC(+y, +m-1, +d));
    if (isNaN(txnDate.getTime())) throw new Error();
  } catch { return { error: { row: idx, field: 'transaction_date', reason: `invalid: ${get(2)}` } }; }

  const ptRaw = get(4).toUpperCase();
  const nbRaw = get(5).toUpperCase();
  const durRaw = get(6).toUpperCase();
  const postcode = get(3);

  return {
    data: {
      transaction_id: txnId,
      property: {
        price: priceRaw,
        transaction_date: txnDate,
        postcode: postcode || null,
        property_type: PROPERTY_TYPE_MAP[ptRaw] || 'Other',
        property_type_raw: ptRaw,
        new_build: nbRaw === 'Y' ? true : nbRaw === 'N' ? false : null,
        duration: DURATION_MAP[durRaw] || 'Unknown',
        duration_raw: durRaw,
        paon: get(7) || null, saon: get(8) || null, street: get(9) || null,
        locality: get(10) || null, town_city: get(11) || null,
        district: get(12) || null, county: get(13) || null,
        ppd_category: get(14).toUpperCase(),
        ppd_category_label: PPD_MAP[get(14).toUpperCase()] || get(14),
        record_status: get(15) || null,
      },
      synthetic_demo: syntheticFields(txnId, postcode),
      _postcode_valid: UK_POSTCODE.test(postcode),
    }
  };
}

// ── Public API ────────────────────────────────────────────────────────────────
function resolveCsvPath(customPath) {
  const path = require('path');
  const candidates = [
    customPath,
    process.env.CSV_PATH,
    path.resolve(__dirname, '../../../ppd_data.csv'),
    path.resolve(__dirname, '../../../ppd_data(1).csv'),
    path.resolve(__dirname, '../../ppd_data.csv'),
    path.resolve(__dirname, '../../ppd_data(1).csv'),
    path.resolve(__dirname, '../data/ppd_data.csv'),
    path.resolve(process.cwd(), 'ppd_data.csv'),
    path.resolve(process.cwd(), 'ppd_data(1).csv'),
    path.resolve(process.cwd(), '../ppd_data.csv'),
    path.resolve(process.cwd(), '../ppd_data(1).csv'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0] || path.resolve(process.cwd(), 'ppd_data.csv');
}

function parseCsvFile(filepath) {
  const resolved = resolveCsvPath(filepath);
  const content = fs.readFileSync(resolved, 'utf8');
  return parse(content, { relax_quotes: true, skip_empty_lines: true });
}

function validateAndNormalize(records) {
  const schemaErrors = validateSchema(records);
  if (schemaErrors.length) return { valid: false, errors: schemaErrors, rows: [] };

  const seenIds = new Set();
  const valid = [], invalid = [], duplicates = [];

  for (let i = 0; i < records.length; i++) {
    const result = normalizeRow(records[i], i+1, seenIds);
    if (result.error) {
      if (result.error.reason?.startsWith('duplicate')) duplicates.push(result.error);
      else invalid.push(result.error);
    } else {
      valid.push(result.data);
    }
  }
  return { valid: true, rows: valid, invalid, duplicates, total: records.length };
}

module.exports = { parseCsvFile, validateAndNormalize, validateSchema, resolveCsvPath, EXPECTED_COLS, COLUMN_NAMES };

