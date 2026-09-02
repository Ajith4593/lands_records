const {
  validateSchema,
  validateAndNormalize,
  parseCsvFile,
  resolveCsvPath
} = require('../src/services/ingestion');
const fs = require('fs');

describe('Data Ingestion & Schema Normalization (Feature 1)', () => {
  const validSampleRows = [
    [
      '68FEB20C-6E83-38DA-E053-6C04A8C051AE',
      '35126',
      '30/10/2017',
      'BN6 8AA',
      'O',
      'N',
      'F',
      '',
      'HASSOCKS DELIVERY OFFICE, 36',
      'KEYMER ROAD',
      'KEYMER',
      'HASSOCKS',
      'MID SUSSEX',
      'WEST SUSSEX',
      'B',
      'A'
    ],
    [
      '2A289EA0-D5CE-CDC8-E050-A8C063054829',
      '175000',
      '24/07/2009',
      'BN6 8AB',
      'S',
      'N',
      'F',
      '',
      '29',
      'KEYMER ROAD',
      'KEYMER',
      'HASSOCKS',
      'MID SUSSEX',
      'WEST SUSSEX',
      'A',
      'A'
    ]
  ];

  test('Schema validation passes on valid 16-column dataset', () => {
    const errors = validateSchema(validSampleRows);
    expect(errors).toHaveLength(0);
  });

  test('Schema validation rejects mismatched column counts', () => {
    const invalidRows = [['ID1', '1000', '01/01/2020']]; // only 3 cols
    const errors = validateSchema(invalidRows);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Column count mismatch');
  });

  test('Schema validation halts on non-numeric price or invalid date format', () => {
    const badPriceRows = [
      ['ID1', 'NOT_A_PRICE', '30/10/2017', 'BN6 8AA', 'O', 'N', 'F', '', '', 'ROAD', '', 'TOWN', 'DIST', 'CNTY', 'B', 'A']
    ];
    const errorsPrice = validateSchema(badPriceRows);
    expect(errorsPrice.some(e => e.includes('price'))).toBe(true);

    const badDateRows = [
      ['ID1', '150000', '2017-10-30', 'BN6 8AA', 'O', 'N', 'F', '', '', 'ROAD', '', 'TOWN', 'DIST', 'CNTY', 'B', 'A']
    ];
    const errorsDate = validateSchema(badDateRows);
    expect(errorsDate.some(e => e.includes('date'))).toBe(true);
  });

  test('validateAndNormalize maps property codes and adds synthetic demo fields with is_synthetic: true', () => {
    const result = validateAndNormalize(validSampleRows);
    expect(result.valid).toBe(true);
    expect(result.rows).toHaveLength(2);

    const first = result.rows[0];
    expect(first.transaction_id).toBe('68FEB20C-6E83-38DA-E053-6C04A8C051AE');
    expect(first.property.price).toBe(35126);
    expect(first.property.property_type).toBe('Other');
    expect(first.property.duration).toBe('Freehold');
    expect(first.property.new_build).toBe(false);

    // Rule 0.1 non-negotiable requirement
    expect(first.synthetic_demo.is_synthetic).toBe(true);
    expect(first.synthetic_demo.parcel_id).toBeDefined();
    expect(first.synthetic_demo.owner_name).toBeDefined();
  });

  test('Deduplication prevents duplicate transaction_ids', () => {
    const duplicateRows = [validSampleRows[0], validSampleRows[0]];
    const result = validateAndNormalize(duplicateRows);
    expect(result.rows).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
  });

  test('Real CSV file resolution and ingestion spot-check', () => {
    const csvPath = resolveCsvPath();
    expect(fs.existsSync(csvPath)).toBe(true);

    const parsed = parseCsvFile(csvPath);
    expect(parsed.length).toBeGreaterThan(7000);

    const errors = validateSchema(parsed.slice(0, 20));
    expect(errors).toHaveLength(0);
  });
});
