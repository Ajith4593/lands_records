/**
 * PQC Signature Service — UC-076 Land Record Integrity Platform
 *
 * Rule 2: Every record's pqc_algorithm field reflects what ACTUALLY signed it.
 * Dev fallback: ECDSA-P256 (clearly labeled, never mislabeled as ML-DSA).
 *
 * Interface: SignatureProvider (sign, verify, algorithmLabel)
 * Factory: createProvider() reads PQC_PROVIDER env var.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FALLBACK_LABEL = 'ECDSA-P256 (DEV FALLBACK — NOT QUANTUM-SAFE)';
const KEYPAIR_FILE = path.resolve(__dirname, '../../.pqc_keypair.json');

// ── ECDSA-P256 Dev Fallback ─────────────────────────────────────────────────

class ECDSADevFallback {
  get algorithmLabel() { return FALLBACK_LABEL; }

  generateKeypair() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { privateKey, publicKey };
  }

  sign(messageHex, privateKeyPem) {
    const sign = crypto.createSign('SHA256');
    sign.update(Buffer.from(messageHex, 'utf8'));
    return sign.sign(privateKeyPem, 'hex');
  }

  verify(messageHex, signatureHex, publicKeyPem) {
    if (!publicKeyPem || !signatureHex) return false;
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(Buffer.from(messageHex, 'utf8'));
      return verify.verify(publicKeyPem, Buffer.from(signatureHex, 'hex'));
    } catch (e) {
      return false;
    }
  }
}

// ── ML-DSA Provider (conditional — requires native oqs bindings) ─────────────

class MLDSAProvider {
  constructor() {
    try {
      this._oqs = require('node-oqs');
      this._available = true;
    } catch {
      this._available = false;
    }
  }
  get algorithmLabel() { return 'ML-DSA-65 (FIPS 204)'; }

  generateKeypair() {
    if (!this._available) throw new Error('node-oqs not available');
    const kem = new this._oqs.Signature('ML-DSA-65');
    const publicKey = kem.generateKeypair();
    return { privateKey: kem.exportSecretKey(), publicKey };
  }
  sign(messageHex, secretKey) {
    if (!this._available) throw new Error('node-oqs not available');
    const sig = new this._oqs.Signature('ML-DSA-65', secretKey);
    return sig.sign(Buffer.from(messageHex, 'utf8')).toString('hex');
  }
  verify(messageHex, signatureHex, publicKey) {
    if (!this._available || !publicKey || !signatureHex) return false;
    try {
      const sig = new this._oqs.Signature('ML-DSA-65');
      return sig.verify(
        Buffer.from(messageHex, 'utf8'),
        Buffer.from(signatureHex, 'hex'),
        Buffer.isBuffer(publicKey) ? publicKey : Buffer.from(publicKey, 'base64')
      );
    } catch { return false; }
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────

function createProvider() {
  const pqcProvider = (process.env.PQC_PROVIDER || 'ecdsa_dev_fallback').toLowerCase();
  if (pqcProvider === 'ml_dsa') {
    const p = new MLDSAProvider();
    if (p._available) return p;
    console.warn('[PQC] ML-DSA requested but node-oqs unavailable — using ECDSA dev fallback (Rule 2 honesty enforced)');
  }
  return new ECDSADevFallback();
}

const provider = createProvider();

// ── Persistent Authority Keypair ──────────────────────────────────────────
let _keypair = null;
function getOrCreateKeypair() {
  if (_keypair) return _keypair;

  // 1. Check environment variables
  const envPriv = process.env.PQC_PRIVATE_KEY;
  const envPub = process.env.PQC_PUBLIC_KEY;
  if (envPriv && envPub) {
    _keypair = { privateKey: envPriv, publicKey: envPub };
    return _keypair;
  }

  // 2. Check persistent key file
  try {
    if (fs.existsSync(KEYPAIR_FILE)) {
      const data = JSON.parse(fs.readFileSync(KEYPAIR_FILE, 'utf8'));
      if (data.privateKey && data.publicKey) {
        _keypair = data;
        return _keypair;
      }
    }
  } catch (err) {
    console.warn('[PQC] Warning reading persistent key file:', err.message);
  }

  // 3. Generate new keypair and persist it
  _keypair = provider.generateKeypair();
  try {
    fs.writeFileSync(KEYPAIR_FILE, JSON.stringify(_keypair, null, 2), 'utf8');
    console.log('[PQC] Generated and saved authority keypair to:', KEYPAIR_FILE);
  } catch (err) {
    console.warn('[PQC] Could not persist keypair to file:', err.message);
  }

  return _keypair;
}

/**
 * Sign a record hash. Returns { signature, publicKey, algorithm }.
 * Rule 2: algorithm is always the actual algorithm used.
 */
function signRecordHash(recordHashHex) {
  const { privateKey, publicKey } = getOrCreateKeypair();
  const signature = provider.sign(recordHashHex, privateKey);
  return { signature, publicKey, algorithm: provider.algorithmLabel };
}

/**
 * Verify a signature against a FRESHLY RECOMPUTED hash.
 * Uses the publicKey provided on the record (or authority public key).
 */
function verifySignature(recordHashHex, signatureHex, publicKeyPem) {
  try {
    const keyToUse = publicKeyPem || getOrCreateKeypair().publicKey;
    return provider.verify(recordHashHex, signatureHex, keyToUse);
  } catch { return false; }
}

module.exports = {
  provider,
  signRecordHash,
  verifySignature,
  getOrCreateKeypair,
  FALLBACK_LABEL,
};
