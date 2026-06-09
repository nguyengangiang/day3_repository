'use strict';

// Characterisation tests — lock down current behaviour of legacy.js.
// Each test describes what the code DOES, including quirks and edge cases,
// so any future change that alters observable behaviour causes a failure.

let m;

beforeEach(() => {
  jest.resetModules();
  const db = require('./db');
  const orders = require('./orders');
  const report = require('./report');
  m = { ...db, ...orders, ...report };
});

// ── formatCurrency ────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats zero as $0.00', () => {
    expect(m.formatCurrency(0)).toBe('$0.00');
  });

  it('formats a value under 1 000 with no comma', () => {
    expect(m.formatCurrency(4.5)).toBe('$4.50');
  });

  it('inserts a comma at the thousands boundary', () => {
    expect(m.formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('inserts two commas for a value in the millions', () => {
    expect(m.formatCurrency(1234567.89)).toBe('$1,234,567.89');
  });

  it('rounds up at the second decimal place when the digit warrants it', () => {
    expect(m.formatCurrency(1.006)).toBe('$1.01');
  });

  // IEEE-754 quirk: 1.005 * 100 evaluates to 100.4999…, so Math.round rounds DOWN
  it('1.005 rounds down to $1.00 due to floating-point representation', () => {
    expect(m.formatCurrency(1.005)).toBe('$1.00');
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe('findById', () => {
  it('returns the matching customer row for a known id', () => {
    expect(m.findById('customers', 1)).toEqual({
      id: 1, name: 'Hanoi Garment Co', tier: 'A', discount: 0.1, city: 'Hanoi',
    });
  });

  it('returns the matching product row for a known id', () => {
    expect(m.findById('products', 101)).toEqual({
      id: 101, name: 'T-Shirt Basic', price: 4.5, category: 'TOP', stock: 1200,
    });
  });

  it('returns null for an id that does not exist in the table', () => {
    expect(m.findById('customers', 9999)).toBeNull();
  });

  // Uses == not === — a string key coerces to match a numeric id
  it('matches string "1" against numeric id 1 via loose equality', () => {
    expect(m.findById('customers', '1')).toEqual(m.findById('customers', 1));
  });
});

// ── findAll ───────────────────────────────────────────────────────────────────

describe('findAll', () => {
  it('returns all 5 customer rows', () => {
    expect(m.findAll('customers')).toHaveLength(5);
  });

  it('returns all 8 product rows', () => {
    expect(m.findAll('products')).toHaveLength(8);
  });

  it('returns all 10 order rows', () => {
    expect(m.findAll('orders')).toHaveLength(10);
  });

  it('returns a direct reference to the live data array — mutations are visible', () => {
    const arr = m.findAll('customers');
    arr[0].name = 'MUTATED';
    expect(m.findById('customers', 1).name).toBe('MUTATED');
  });
});

// ── findLinesByOrderId ────────────────────────────────────────────────────────

describe('findLinesByOrderId', () => {
  it('returns the two line items for order 1001', () => {
    expect(m.findLinesByOrderId(1001)).toEqual([
      { orderId: 1001, productId: 101, quantity: 200 },
      { orderId: 1001, productId: 104, quantity: 50 },
    ]);
  });

  it('returns three line items for order 1002', () => {
    expect(m.findLinesByOrderId(1002)).toHaveLength(3);
  });

  it('returns an empty array when no lines match', () => {
    expect(m.findLinesByOrderId(9999)).toEqual([]);
  });
});

// ── getQueryCount ─────────────────────────────────────────────────────────────

describe('getQueryCount', () => {
  it('starts at 0 on a fresh module load', () => {
    expect(m.getQueryCount()).toBe(0);
  });

  it('increments by 1 for each findById() call', () => {
    m.findById('customers', 1);
    expect(m.getQueryCount()).toBe(1);
    m.findById('customers', 2);
    expect(m.getQueryCount()).toBe(2);
  });

  it('increments by 1 for a findAll() call', () => {
    m.findAll('customers');
    expect(m.getQueryCount()).toBe(1);
  });

  it('increments by 1 for a findLinesByOrderId() call', () => {
    m.findLinesByOrderId(1001);
    expect(m.getQueryCount()).toBe(1);
  });

  it('accumulates across mixed call types', () => {
    m.findById('customers', 1);    // 1
    m.findAll('products');          // 2
    m.findLinesByOrderId(1001);     // 3
    expect(m.getQueryCount()).toBe(3);
  });
});

// ── calculateOrderTotal ───────────────────────────────────────────────────────

describe('calculateOrderTotal', () => {
  // Order 1001: DONE, customer tier-A (10% disc), 250 units — no bulk
  // Gross: 4.5×200 + 11.5×50 = 1475.  After 10% disc → 1327.50.  +8% tax → 1433.70
  it('applies tier discount and tax to a DONE order (1001)', () => {
    expect(m.calculateOrderTotal(1001)).toBe(1433.7);
  });

  // Order 1002: DONE, customer tier-B (5% disc), exactly 500 units — bulk adds 3%
  // Gross: 7.25×120 + 14×80 + 4.5×300 = 3340.  After 8% disc → 3072.80.  +8% tax → 3318.62
  it('adds 3% bulk discount when total units reach exactly 500 (1002)', () => {
    expect(m.calculateOrderTotal(1002)).toBe(3318.62);
  });

  // Order 1003: CANCEL — discount applied but tax branch is skipped
  // Gross: 12×40 = 480.  After 10% disc → 432.  No tax.
  it('skips the 8% tax for a CANCEL order (1003)', () => {
    expect(m.calculateOrderTotal(1003)).toBe(432);
  });

  // Order 1005: OPEN — the code treats OPEN identically to DONE (tax IS applied)
  // Gross: 5.75×500 = 2875.  Customer tier-C discount=0, bulk → discount=0.03.  After 3% → 2788.75.  +8% → 3011.85
  it('applies tax to an OPEN order the same as DONE (1005)', () => {
    expect(m.calculateOrderTotal(1005)).toBe(3011.85);
  });
});

// ── validateOrder ─────────────────────────────────────────────────────────────

describe('validateOrder', () => {
  it('returns OK for a valid DONE order (1001)', () => {
    expect(m.validateOrder(1001)).toBe('OK');
  });

  it('returns OK for a valid OPEN order (1005)', () => {
    expect(m.validateOrder(1005)).toBe('OK');
  });

  it('returns NG for an order id that does not exist', () => {
    expect(m.validateOrder(9999)).toBe('NG: no order');
  });

  it('returns NG for a cancelled order (1003)', () => {
    expect(m.validateOrder(1003)).toBe('NG: cancelled');
  });

  it('returns NG when a line quantity exceeds product stock', () => {
    // Inject an oversized quantity directly via the live reference
    const lines = m.findAll('orderLines');
    const original = lines[0].quantity;
    lines[0].quantity = 99999; // productId 101, stock=1200
    expect(m.validateOrder(1001)).toBe('NG: not enough stock for T-Shirt Basic');
    lines[0].quantity = original; // restore so other tests are unaffected
  });
});

// ── getOrdersByStatus ─────────────────────────────────────────────────────────

describe('getOrdersByStatus', () => {
  it('returns 3 OPEN orders', () => {
    expect(m.getOrdersByStatus('OPEN')).toHaveLength(3);
  });

  it('returns the correct shape for the first OPEN order (1005)', () => {
    expect(m.getOrdersByStatus('OPEN')[0]).toEqual({
      id: 1005,
      date: '2026-02-09',
      customer: 'Hue Trading',
      city: 'Hue',
      lines: 1,
      units: 500,
    });
  });

  it('returns correct unit sum for a multi-line OPEN order (1007)', () => {
    const order1007 = m.getOrdersByStatus('OPEN').find(r => r.id === 1007);
    expect(order1007).toEqual({
      id: 1007,
      date: '2026-02-21',
      customer: 'Can Tho Apparel',
      city: 'Can Tho',
      lines: 2,
      units: 320, // 220 + 100
    });
  });

  it('returns 6 DONE orders', () => {
    expect(m.getOrdersByStatus('DONE')).toHaveLength(6);
  });

  it('returns 1 CANCEL order and its id is 1003', () => {
    const result = m.getOrdersByStatus('CANCEL');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1003);
  });

  it('returns an empty array for an unrecognised status', () => {
    expect(m.getOrdersByStatus('PENDING')).toEqual([]);
  });
});

// ── getTopProducts ────────────────────────────────────────────────────────────

describe('getTopProducts', () => {
  it('returns top 1 product with correct unit count', () => {
    expect(m.getTopProducts(1)).toEqual([{ name: 'T-Shirt Basic', units: 650 }]);
  });

  it('returns top 3 products in descending order', () => {
    expect(m.getTopProducts(3)).toEqual([
      { name: 'T-Shirt Basic', units: 650 },
      { name: 'Polo Shirt',    units: 270 },
      { name: 'Track Shorts',  units: 130 },
    ]);
  });

  it('excludes OPEN order lines from the totals', () => {
    // Order 1005 (OPEN) contains 500 Track Shorts — should NOT be counted
    const trackShorts = m.getTopProducts(10).find(r => r.name === 'Track Shorts');
    expect(trackShorts.units).toBe(130); // only from order 1008 (DONE)
  });

  it('excludes CANCEL order lines from the totals', () => {
    // Order 1003 (CANCEL) contains 40 Hoodie Fleece — should NOT be counted
    const hoodie = m.getTopProducts(10).find(r => r.name === 'Hoodie Fleece');
    expect(hoodie.units).toBe(75); // only from order 1008 (DONE)
  });

  it('returns an empty array when limit is 0', () => {
    expect(m.getTopProducts(0)).toEqual([]);
  });

  it('returns all 8 products when limit exceeds the catalogue size', () => {
    expect(m.getTopProducts(100)).toHaveLength(8);
  });
});

// ── generateMonthlyReport ─────────────────────────────────────────────────────

describe('generateMonthlyReport', () => {
  it('includes the month in the report header', () => {
    expect(m.generateMonthlyReport('2026-01')).toContain('MONTHLY ORDER REPORT  2026-01');
  });

  it('lists all three January orders including the cancelled one', () => {
    const report = m.generateMonthlyReport('2026-01');
    expect(report).toContain('Order #1001');
    expect(report).toContain('Order #1002');
    expect(report).toContain('Order #1003');
  });

  it('marks the cancelled order as excluded from totals', () => {
    expect(m.generateMonthlyReport('2026-01')).toContain('** CANCELLED — excluded from totals **');
  });

  it('counts 2 orders for January (CANCEL excluded)', () => {
    expect(m.generateMonthlyReport('2026-01')).toContain('Orders counted: 2');
  });

  // Grand total = calculateOrderTotal(1001) + calculateOrderTotal(1002) = 1433.70 + 3318.62 = 4752.32
  it('grand total for January is $4,752.32', () => {
    expect(m.generateMonthlyReport('2026-01')).toContain('Grand total:    $4,752.32');
  });

  // OPEN orders (1005, 1007) are included in the February count — same as DONE
  it('includes OPEN orders in the count and grand total (February has 4)', () => {
    expect(m.generateMonthlyReport('2026-02')).toContain('Orders counted: 4');
  });

  it('returns zeros for a month with no matching orders', () => {
    const report = m.generateMonthlyReport('2025-12');
    expect(report).toContain('Orders counted: 0');
    expect(report).toContain('Grand total:    $0.00');
  });
});

// ── updateOrderStatus ─────────────────────────────────────────────────────────

describe('updateOrderStatus', () => {
  it('returns ERR for an unknown order id', () => {
    expect(m.updateOrderStatus(9999, 'DONE')).toBe('ERR|9999|no such order');
  });

  it('returns ERR for an unrecognised status string', () => {
    expect(m.updateOrderStatus(1001, 'SHIPPED')).toBe('ERR|1001|bad status SHIPPED');
  });

  it('returns ERR when the order is already CANCEL', () => {
    expect(m.updateOrderStatus(1003, 'OPEN')).toBe('ERR|1003|already cancelled');
  });

  it('returns ERR when trying to reopen a DONE order', () => {
    expect(m.updateOrderStatus(1002, 'OPEN')).toBe('ERR|1002|cannot reopen');
  });

  // There is no guard against setting the same status — DONE→DONE succeeds
  it('allows a DONE→DONE no-op transition', () => {
    expect(m.updateOrderStatus(1001, 'DONE')).toBe('OK|1001|DONE->DONE|Hanoi Garment Co');
  });

  it('returns a pipe-delimited OK log line for a valid OPEN→DONE transition', () => {
    expect(m.updateOrderStatus(1005, 'DONE')).toBe('OK|1005|OPEN->DONE|Hue Trading');
  });

  it('mutates the record in-place — findById() sees the updated status', () => {
    m.updateOrderStatus(1005, 'DONE');
    expect(m.findById('orders', 1005).status).toBe('DONE');
  });

  it('allows DONE→CANCEL', () => {
    expect(m.updateOrderStatus(1001, 'CANCEL')).toBe('OK|1001|DONE->CANCEL|Hanoi Garment Co');
  });

  it('blocks all further changes once an order is cancelled', () => {
    m.updateOrderStatus(1001, 'CANCEL');
    expect(m.updateOrderStatus(1001, 'DONE')).toBe('ERR|1001|already cancelled');
  });
});
