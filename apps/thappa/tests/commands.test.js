/**
 * Tests for command parsers
 */

const { parseCheckCommand } = require('../src/commands/check');
const { parseReportCommand } = require('../src/commands/report');

describe('CHECK command parser', () => {
  test('parses valid CHECK command', () => {
    const result = parseCheckCommand('CHECK Rajesh Kumar 9823');
    expect(result).toEqual({ name: 'Rajesh Kumar', phoneLast4: '9823' });
  });

  test('parses single-word name', () => {
    const result = parseCheckCommand('CHECK Rani 9876');
    expect(result).toEqual({ name: 'Rani', phoneLast4: '9876' });
  });

  test('returns null for missing phone', () => {
    const result = parseCheckCommand('CHECK Rajesh Kumar');
    expect(result).toBeNull();
  });

  test('returns null for non-4-digit phone', () => {
    const result = parseCheckCommand('CHECK Rajesh Kumar 98234');
    expect(result).toBeNull();
  });

  test('returns null for empty command', () => {
    const result = parseCheckCommand('CHECK');
    expect(result).toBeNull();
  });

  test('is case-insensitive for CHECK keyword', () => {
    const result = parseCheckCommand('check Rani Devi 9876');
    expect(result).toEqual({ name: 'Rani Devi', phoneLast4: '9876' });
  });
});

describe('REPORT command parser', () => {
  test('parses valid full REPORT command', () => {
    const result = parseReportCommand('REPORT Rajesh Kumar 9823 500 NOT_PAID BAD');
    expect(result).toEqual({
      name: 'Rajesh Kumar',
      phoneLast4: '9823',
      amount: 500,
      status: 'NOT_PAID',
      rating: 'BAD',
    });
  });

  test('parses PAID GOOD report', () => {
    const result = parseReportCommand('REPORT Rani Devi 9876 200 PAID GOOD');
    expect(result).toEqual({
      name: 'Rani Devi',
      phoneLast4: '9876',
      amount: 200,
      status: 'PAID',
      rating: 'GOOD',
    });
  });

  test('normalizes status aliases', () => {
    const result = parseReportCommand('REPORT Test User 1234 100 DEFAULT BAD');
    expect(result?.status).toBe('NOT_PAID');
  });

  test('normalizes rating aliases', () => {
    const result = parseReportCommand('REPORT Test User 1234 100 PAID GREAT');
    expect(result?.rating).toBe('GOOD');
  });

  test('returns null for incomplete command', () => {
    const result = parseReportCommand('REPORT Rajesh Kumar 9823');
    expect(result).toBeNull();
  });

  test('returns null for invalid amount', () => {
    const result = parseReportCommand('REPORT Test User 1234 abc PAID GOOD');
    expect(result).toBeNull();
  });
});
