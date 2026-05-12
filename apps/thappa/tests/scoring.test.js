/**
 * Tests for the Thappa scoring algorithm
 */

const { calculateScore, getRiskBand } = require('../src/scoring/algorithm');

describe('Thappa Scoring Algorithm', () => {
  test('starts at 500 with no transactions', () => {
    const result = calculateScore([]);
    expect(result.compositeScore).toBe(500);
    expect(result.totalTxn).toBe(0);
  });

  test('adds 50 for each PAID transaction', () => {
    const txns = [
      { status: 'PAID', rating: 'NEUTRAL' },
      { status: 'PAID', rating: 'NEUTRAL' },
    ];
    const result = calculateScore(txns);
    expect(result.compositeScore).toBe(600); // 500 + 50 + 50
    expect(result.paid).toBe(2);
  });

  test('subtracts 100 for each NOT_PAID transaction', () => {
    const txns = [{ status: 'NOT_PAID', rating: 'NEUTRAL' }];
    const result = calculateScore(txns);
    expect(result.compositeScore).toBe(400); // 500 - 100
    expect(result.defaults).toBe(1);
  });

  test('subtracts 30 for each PARTIAL transaction', () => {
    const txns = [{ status: 'PARTIAL', rating: 'NEUTRAL' }];
    const result = calculateScore(txns);
    expect(result.compositeScore).toBe(470); // 500 - 30
    expect(result.partial).toBe(1);
  });

  test('adds 20 for GOOD rating', () => {
    const txns = [{ status: 'PAID', rating: 'GOOD' }];
    const result = calculateScore(txns);
    expect(result.compositeScore).toBe(570); // 500 + 50 + 20
  });

  test('subtracts 50 for BAD rating', () => {
    const txns = [{ status: 'NOT_PAID', rating: 'BAD' }];
    const result = calculateScore(txns);
    expect(result.compositeScore).toBe(350); // 500 - 100 - 50
  });

  test('caps score at 1000', () => {
    const txns = Array(20).fill({ status: 'PAID', rating: 'GOOD' });
    const result = calculateScore(txns);
    expect(result.compositeScore).toBe(1000);
  });

  test('floors score at 0', () => {
    const txns = Array(10).fill({ status: 'NOT_PAID', rating: 'BAD' });
    const result = calculateScore(txns);
    expect(result.compositeScore).toBe(0);
  });

  test('mixed transactions produce correct score', () => {
    const txns = [
      { status: 'PAID', rating: 'GOOD' },     // +50 +20 = +70
      { status: 'NOT_PAID', rating: 'BAD' },  // -100 -50 = -150
      { status: 'PAID', rating: 'NEUTRAL' },  // +50
    ];
    const result = calculateScore(txns);
    // 500 + 70 - 150 + 50 = 470
    expect(result.compositeScore).toBe(470);
  });
});

describe('Risk Bands', () => {
  test('score 850 is EXCELLENT', () => {
    const band = getRiskBand(850);
    expect(band.label).toBe('EXCELLENT');
    expect(band.recommendation).toBe('TRUST');
  });

  test('score 700 is GOOD', () => {
    const band = getRiskBand(700);
    expect(band.label).toBe('GOOD');
  });

  test('score 450 is MODERATE', () => {
    const band = getRiskBand(450);
    expect(band.label).toBe('MODERATE');
    expect(band.recommendation).toBe('CAUTION');
  });

  test('score 200 is RISKY', () => {
    const band = getRiskBand(200);
    expect(band.label).toBe('RISKY');
    expect(band.recommendation).toBe('NO CREDIT');
    expect(band.risk).toBe('HIGH');
  });

  test('score 0 is RISKY', () => {
    const band = getRiskBand(0);
    expect(band.label).toBe('RISKY');
  });

  test('score 1000 is EXCELLENT', () => {
    const band = getRiskBand(1000);
    expect(band.label).toBe('EXCELLENT');
  });
});
