/** Explainable risk engine — Rule 12 compliance. No opaque/random scores. */
const RISK_RULES = [
  { rule: 'hash_mismatch',         points: 40, description: 'Record hash does not match recomputed hash' },
  { rule: 'signature_invalid',     points: 30, description: 'Digital signature is invalid' },
  { rule: 'ledger_broken',         points: 20, description: 'Ledger chain is broken at or before this block' },
  { rule: 'duplicate_transaction', points: 25, description: 'Duplicate transaction ID detected' },
  { rule: 'never_verified',        points: 10, description: 'Record has never been verified since creation' },
  { rule: 'price_anomaly',         points: 10, description: 'Price is zero, negative or statistically extreme' },
  { rule: 'invalid_postcode',      points:  5, description: 'Postcode does not match UK format' },
  { rule: 'missing_field',         points:  5, description: 'Required address field is missing' },
  { rule: 'disputed',              points: 15, description: 'Record has an active dispute flag (synthetic)' },
  { rule: 'unresolved_alert',      points: 10, description: 'Record has unresolved security alerts' },
];

function computeRiskScore(flags = {}) {
  const fired = [];
  let total = 0;
  for (const r of RISK_RULES) {
    if (flags[r.rule]) {
      fired.push({ rule: r.rule, points: r.points, description: r.description });
      total += r.points;
    }
  }
  total = Math.min(total, 100);
  const band = total <= 20 ? 'LOW' : total <= 50 ? 'MEDIUM' : total <= 80 ? 'HIGH' : 'CRITICAL';
  return { risk_score: total, risk_band: band, indicators_fired: fired, indicators_count: fired.length };
}

function getRulesReference() { return RISK_RULES; }

module.exports = { computeRiskScore, getRulesReference };
