# UK Land-Records Integrity via Quantum-Safe Ledgers (UC-076)

> **Mandatory Prototype Disclaimer:**  
> *"Prototype system for demonstration purposes only. Not a legally authoritative land registry."*

---

## 1. Problem & Solution Overview

### The Problem
Land registry archives and real property transaction systems are foundational to national economic trust. However, conventional digital registries face two major vulnerabilities:
1. **Internal Tampering / Database Administrator Privilege Abuse:** Traditional relational databases allow privileged actors or compromised database credentials to silently alter land titles, prices, or ownership records without detection.
2. **Post-Quantum Cryptographic (PQC) Obsolescence:** Classical public key cryptography (RSA, standard ECDSA) will be vulnerable to Shor's algorithm once cryptographically relevant quantum computers (CRQCs) mature, risking future retro-forgery of recorded title deeds.

### The Solution
**UC-076 Land-Records Integrity Platform (v2)** provides a high-assurance, tamper-evident registry prototype architected around:
- **Canonical SHA-256 Record Hashing (Feature 2):** Deterministic, alphabetically sorted JSON serializations that turn property records into verifiable digests.
- **Post-Quantum Digital Signatures (Feature 3):** Dual-mode PQC signing infrastructure supporting NIST FIPS 204 (ML-DSA-65) with honest labeling of classical dev fallbacks (`ECDSA-P256 (DEV FALLBACK — NOT QUANTUM-SAFE)`).
- **Append-Only Cryptographic Ledger (Feature 4):** A sequential hash-linked block ledger stored in MongoDB, guarded with insert-only permissions and verified via complete recomputation from Genesis (`0000...0000`).
- **Dynamic 5-Stage Verification Engine (Feature 5):** Recomputes raw field hashes on the fly to detect any direct document modification.
- **Controlled Tamper Simulation (Feature 6):** Direct DB mutation studio demonstrating genuine detection and recovery.
- **Session-Based Authentication (Feature 9):** No client-side JWT token storage; server-side MongoDB-backed sessions with `httpOnly` secure cookies and centralized RBAC.
- **Quantum Security Dashboard (Feature 10):** Real-time aggregation of cryptographic posture, ledger integrity %, and alerts.

---

## 2. Dataset Explanation: Real vs. Synthetic Fields

The system ingests **`ppd_data.csv`** containing **7,632 records** across 16 columns (HM Land Registry Price Paid Data format, no header row).

| Layer | Field Name | Description | Source / Status |
|---|---|---|---|
| **PPD (Real)** | `transaction_id` | Primary transaction UUID | Real HM Land Registry |
| **PPD (Real)** | `price` | Transaction price in GBP (£) | Real HM Land Registry |
| **PPD (Real)** | `transaction_date` | Date of completion (`DD/MM/YYYY`) | Real HM Land Registry |
| **PPD (Real)** | `postcode` | UK Postal code (e.g. `BN6 8AA`) | Real HM Land Registry |
| **PPD (Real)** | `property_type` | Detached (D), Semi (S), Terraced (T), Flat (F), Other (O) | Real HM Land Registry |
| **PPD (Real)** | `new_build` | Newly built property (`Y`/`N`) | Real HM Land Registry |
| **PPD (Real)** | `duration` | Tenure: Freehold (F), Leasehold (L), Unknown (U) | Real HM Land Registry |
| **PPD (Real)** | `paon` | Primary Addressable Object Name (house number/name) | Real HM Land Registry |
| **PPD (Real)** | `saon` | Secondary Addressable Object Name (flat number) | Real HM Land Registry |
| **PPD (Real)** | `street` | Street name | Real HM Land Registry |
| **PPD (Real)** | `locality` | Locality name | Real HM Land Registry |
| **PPD (Real)** | `town_city` | Town or City | Real HM Land Registry |
| **PPD (Real)** | `district` | Local authority district | Real HM Land Registry |
| **PPD (Real)** | `county` | Administrative county | Real HM Land Registry |
| **PPD (Real)** | `ppd_category` | Standard (A) or Additional/commercial (B) | Real HM Land Registry |
| **PPD (Real)** | `record_status` | Entry status / URI identifier | Real HM Land Registry |
| **Synthetic (Demo)** | `parcel_id` | Cadastral Parcel ID (`PAR-XXXXXX`) | **`is_synthetic: true`** (Demo) |
| **Synthetic (Demo)** | `survey_number` | Survey map reference (`SUR-XXXXX-XXX`) | **`is_synthetic: true`** (Demo) |
| **Synthetic (Demo)** | `owner_name` | Synthetic owner entity name | **`is_synthetic: true`** (Demo) |
| **Synthetic (Demo)** | `land_area` | Approximate area in sq. meters | **`is_synthetic: true`** (Demo) |
| **Synthetic (Demo)** | `latitude`, `longitude` | Approximate postcode area centroid | **`is_synthetic: true`** (Demo) |
| **Synthetic (Demo)** | `ownership_status` | `REGISTERED`, `PENDING_TRANSFER`, `UNDER_DISPUTE` | **`is_synthetic: true`** (Demo) |
| **Synthetic (Demo)** | `encumbrance_status`| `NONE`, `COVENANT`, `EASEMENT` | **`is_synthetic: true`** (Demo) |
| **Synthetic (Demo)** | `dispute_status` | `NONE`, `ACTIVE` | **`is_synthetic: true`** (Demo) |

---

## 3. MongoDB Database Architecture & Collections

```text
Database: landrecords
├── users            — { user_id, username, password_hash (Argon2id), role, created_at, last_login }
├── land_records     — { land_record_id, transaction_id, property: {...}, synthetic_demo: {...}, security: {...} }
├── ledger_blocks    — { block_id, land_record_id, transaction_id, timestamp, event_type, record_hash, previous_hash, current_hash, digital_signature, actor_id, actor_role }
├── audit_logs       — { audit_id, user_id, role, action, land_record_id, timestamp, previous_state_hash, new_state_hash, signature_status }
├── documents        — { document_id, land_record_id, reference_id, filename, file_type, file_size_bytes, document_hash, uploaded_by, verification_result, uploaded_at }
└── sessions         — { _id, session: { user_id, role, username, ... }, expires }
```

### Append-Only Database Privileges
- Both `ledger_blocks` and `audit_logs` are protected by **ODM-level pre-hooks** in Mongoose that automatically reject any `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, or `findOneAndUpdate` calls.
- In production MongoDB deployments, application database users are assigned custom roles with `find` and `insert` privileges only:
```javascript
db.createRole({
  role: "appendOnlyLedgerRole",
  privileges: [
    { resource: { db: "landrecords", collection: "ledger_blocks" }, actions: [ "find", "insert" ] },
    { resource: { db: "landrecords", collection: "audit_logs" }, actions: [ "find", "insert" ] }
  ],
  roles: []
});
```

---

## 4. Post-Quantum Cryptography & Algorithm Labeling (Rule 2)

Per Non-Negotiable Rule 2, every record honestly reflects the algorithm that actually signed it:
- **ML-DSA Provider (`ML-DSA-65 (FIPS 204)`):** NIST-standardized module-lattice digital signature algorithm (via native `node-oqs` / `liboqs` bindings).
- **Classical Dev Fallback (`ECDSA-P256 (DEV FALLBACK — NOT QUANTUM-SAFE)`):** Used when native C build tools are not compiled in the environment. It is explicitly labeled across all API responses, database documents, and UI badges.

---

## 5. Session Authentication vs. JWT (Feature 9)

### Why Server-Side Sessions?
1. **Instant Server-Side Revocation:** In land registry administration, revoking an auditor or officer's session must take effect instantly without token-revocation list complexity.
2. **Zero Client Secret Handling:** Eliminates token leakage risks in `localStorage` / `sessionStorage` via `httpOnly`, `sameSite: lax/strict`, `secure` session cookies.
3. **MongoDB-Backed Persistence:** Sessions are stored directly in MongoDB via `connect-mongo`, surviving backend server restarts seamlessly.

### Pre-Configured Demo Accounts

| Role | Username | Default Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin` | `Admin@LandRecords2024` | Full access, Security Testing / Tamper studio |
| **Registration Officer** | `officer1` | `Officer@2024` | Sign records, verify records & documents |
| **Auditor** | `auditor1` | `Auditor@2024` | Read-only inspection, ledger verification, audit trails |

---

## 6. Quick Start & Execution

### Prerequisites
- Node.js >= 18 (Node v20+ recommended)
- npm >= 9

### 1. Run Automated Test Suite (All 5 Suites)
```bash
npm test
```
*Executes all 28 Jest tests using in-memory MongoDB:*
- `tests/ingestion.test.js`: Schema validation, deduplication, code normalization
- `tests/crypto.test.js`: Deterministic SHA-256 canonical hashing, PQC sign & verify, Rule 2 labeling
- `tests/ledger.test.js`: Block chaining, genesis verification, break detection, append-only guards
- `tests/tamper_demo.test.js`: Direct DB mutation detection and re-signing recovery
- `tests/auth.test.js`: Session creation/destruction, role-based route access

### 2. Start Backend (Embedded Mongo + Express API)
```bash
cd backend
npm start
```
*Backend runs on `http://localhost:5000` (auto-starts embedded MongoDB engine if local MongoDB is not running).*

### 3. Start Frontend (React + Vite)
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 7. The 10 Core Features Walkthrough

1. **Feature 1 — Data Ingestion & Normalization:** Validates 16 columns, normalizes codes, prevents duplicate `transaction_id`s, and persists to `land_records`.
2. **Feature 2 — Canonical Hashing (SHA-256):** Sorts keys alphabetically and produces reproducible 64-character hex digests.
3. **Feature 3 — Post-Quantum Digital Signature:** Signs record hashes using PQC / accurately labeled dev fallback.
4. **Feature 4 — Tamper-Evident Append-Only Ledger:** Chains blocks from genesis (`0000...0000`) and reports exact broken block on corruption.
5. **Feature 5 — Record Verification Engine:** Dynamic 5-stage recomputation pipeline with visual checkmarks tied to real backend execution.
6. **Feature 6 — Tampering Detection & Demo Simulation:** Admin studio that mutates stored MongoDB documents directly to demonstrate genuine cryptographic detection (`HASH_MISMATCH` / `TAMPERED`).
7. **Feature 7 — Document Verification:** Upload deed certificates with explicit reference IDs to verify authenticity against title hashes.
8. **Feature 8 — Append-Only Audit Trail:** Searchable, immutable log of all lifecycle events.
9. **Feature 9 — Session Authentication (No JWT):** Argon2id hashing + MongoDB session store + RBAC.
10. **Feature 10 — Quantum Security Dashboard:** Live aggregation of system posture, ledger integrity %, and alerts.

---

## 8. Limitations & Prototype Disclaimer

1. **Demonstration Purposes Only:** This application is a technical prototype developed for evaluation under UC-076. It does not constitute a legally authoritative land registry or legal title conveyance system.
2. **Dataset Nature:** The Price Paid Data (PPD) originates from HM Land Registry open data, but spatial centroids, owner entities, parcel IDs, and survey numbers are synthetically generated demo values.
3. **Cryptographic Fallback:** In development environments without compiled `liboqs` C bindings, the system uses ECDSA-P256 explicitly labeled as `ECDSA-P256 (DEV FALLBACK — NOT QUANTUM-SAFE)`.
