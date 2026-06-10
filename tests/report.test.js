'use strict';

jest.mock('../db');
jest.mock('../orders');

var { findAll, findById, findLinesByOrderId, ORDER_STATUS } = require('../db');
var { calculateOrderTotal } = require('../orders');
var { formatCurrency, generateMonthlyReport } = require('../report');

// Set up ORDER_STATUS constant before each test
beforeEach(() => {
  ORDER_STATUS.CANCEL = 'cancelled';
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  describe('happy path', () => {
    it('formats an integer amount', () => {
      expect(formatCurrency(5)).toBe('$5.00');
    });

    it('formats a decimal amount with two decimal places', () => {
      expect(formatCurrency(9.99)).toBe('$9.99');
    });

    it('formats a decimal amount with one decimal place', () => {
      expect(formatCurrency(12.5)).toBe('$12.50');
    });

    it('formats a four-digit number without commas', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('formats a large number with commas separating thousands', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });

    it('formats exactly 1000 with a comma', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('formats 999999 with two comma groups', () => {
      expect(formatCurrency(999999)).toBe('$999,999.00');
    });

    it('formats 1000000 with two commas', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });
  });

  describe('edge cases', () => {
    it('formats zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('rounds half-up at two decimal places — IEEE 754: 1.005 is stored as 1.00499...', () => {
      // 1.005 cannot be represented exactly in IEEE 754; it is slightly below
      // 1.005, so Math.round keeps it at 1.00.  This test documents the actual
      // (correct-for-the-implementation) behaviour.
      expect(formatCurrency(1.005)).toBe('$1.00');
    });

    it('rounds up when the value is unambiguously above the half-cent', () => {
      expect(formatCurrency(1.006)).toBe('$1.01');
    });

    it('rounds down when third decimal is less than 5', () => {
      expect(formatCurrency(1.004)).toBe('$1.00');
    });

    it('formats a number that is exactly representable as two decimals', () => {
      expect(formatCurrency(100.10)).toBe('$100.10');
    });

    it('formats a single-digit number', () => {
      expect(formatCurrency(7)).toBe('$7.00');
    });

    it('formats a two-digit number', () => {
      expect(formatCurrency(42)).toBe('$42.00');
    });

    it('formats a three-digit number without a comma', () => {
      expect(formatCurrency(999)).toBe('$999.00');
    });
  });
});

// ---------------------------------------------------------------------------
// generateMonthlyReport — helper builders
// ---------------------------------------------------------------------------
function makeOrder(id, date, status, customerId) {
  return { id, date, status, customerId };
}

function makeCustomer(id, name, city, tier) {
  return { id, name, city, tier };
}

function makeOrderLine(productId, quantity) {
  return { productId, quantity };
}

function makeProduct(id, name, price) {
  return { id, name, price };
}

// ---------------------------------------------------------------------------
// generateMonthlyReport
// ---------------------------------------------------------------------------
describe('generateMonthlyReport', () => {
  describe('report header and footer format', () => {
    it('includes the report header with the given month', () => {
      findAll.mockReturnValue([]);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('==========================================');
      expect(report).toContain(' MONTHLY ORDER REPORT  2024-03');
    });

    it('includes the footer separator and summary lines', () => {
      findAll.mockReturnValue([]);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('------------------------------------------');
      expect(report).toContain(' Orders counted: 0');
      expect(report).toContain(' Grand total:    $0.00');
      expect(report).toContain('==========================================\n');
    });

    it('ends with the closing separator line', () => {
      findAll.mockReturnValue([]);

      var report = generateMonthlyReport('2024-03');

      expect(report.trimEnd()).toMatch(/={42}$/);
    });
  });

  describe('empty result — no orders in the given month', () => {
    it('reports zero orders counted when there are no orders at all', () => {
      findAll.mockReturnValue([]);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain(' Orders counted: 0');
      expect(report).toContain(' Grand total:    $0.00');
    });

    it('reports zero orders counted when all orders are in a different month', () => {
      findAll.mockReturnValue([
        makeOrder(1, '2024-01-15', 'pending', 10),
      ]);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain(' Orders counted: 0');
      expect(report).toContain(' Grand total:    $0.00');
    });
  });

  describe('filtering — orders from other months are excluded', () => {
    it('does not include an order whose month does not match', () => {
      findAll.mockReturnValue([
        makeOrder(99, '2024-01-10', 'pending', 10),
      ]);

      var report = generateMonthlyReport('2024-03');

      expect(report).not.toContain('Order #99');
    });

    it('includes only orders whose date starts with the requested month', () => {
      var customer = makeCustomer(10, 'Alice', 'London', 1);
      findAll.mockReturnValue([
        makeOrder(1, '2024-03-05', 'pending', 10),
        makeOrder(2, '2024-04-01', 'pending', 10),
      ]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return makeProduct(id, 'Widget', 10);
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 2)]);
      calculateOrderTotal.mockReturnValue(20);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('Order #1');
      expect(report).not.toContain('Order #2');
    });
  });

  describe('happy path — single order in the month', () => {
    it('includes the order number, status and date in the report', () => {
      var customer = makeCustomer(10, 'Bob Smith', 'Paris', 2);
      var product = makeProduct(101, 'Gadget', 25.00);

      findAll.mockReturnValue([makeOrder(42, '2024-03-15', 'pending', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 3)]);
      calculateOrderTotal.mockReturnValue(75.00);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('Order #42');
      expect(report).toContain('[pending]');
      expect(report).toContain('2024-03-15');
    });

    it('includes customer name, city and tier', () => {
      var customer = makeCustomer(10, 'Bob Smith', 'Paris', 2);
      var product = makeProduct(101, 'Gadget', 25.00);

      findAll.mockReturnValue([makeOrder(42, '2024-03-15', 'pending', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 3)]);
      calculateOrderTotal.mockReturnValue(75.00);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('Customer: Bob Smith (Paris, tier 2)');
    });

    it('includes line item with product name, quantity, unit price and line total', () => {
      var customer = makeCustomer(10, 'Bob Smith', 'Paris', 2);
      var product = makeProduct(101, 'Gadget', 25.00);

      findAll.mockReturnValue([makeOrder(42, '2024-03-15', 'pending', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 3)]);
      calculateOrderTotal.mockReturnValue(75.00);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('Gadget  x3  @ $25.00  = $75.00');
    });

    it('shows the subtotal and total line for a non-cancelled order', () => {
      var customer = makeCustomer(10, 'Bob Smith', 'Paris', 2);
      var product = makeProduct(101, 'Gadget', 25.00);

      findAll.mockReturnValue([makeOrder(42, '2024-03-15', 'pending', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 3)]);
      calculateOrderTotal.mockReturnValue(80.00);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('Subtotal: $75.00');
      expect(report).toContain('Total(incl. disc+tax): $80.00');
    });

    it('counts the order and adds to grand total', () => {
      var customer = makeCustomer(10, 'Bob Smith', 'Paris', 2);
      var product = makeProduct(101, 'Gadget', 25.00);

      findAll.mockReturnValue([makeOrder(42, '2024-03-15', 'pending', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 3)]);
      calculateOrderTotal.mockReturnValue(80.00);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain(' Orders counted: 1');
      expect(report).toContain(' Grand total:    $80.00');
    });
  });

  describe('cancelled orders', () => {
    it('shows the CANCELLED message for a cancelled order', () => {
      var customer = makeCustomer(10, 'Carol', 'Berlin', 3);
      var product = makeProduct(101, 'Thing', 10.00);

      findAll.mockReturnValue([makeOrder(7, '2024-03-20', 'cancelled', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 1)]);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('** CANCELLED');
      expect(report).toContain('excluded from totals');
    });

    it('excludes a cancelled order from the order count', () => {
      var customer = makeCustomer(10, 'Carol', 'Berlin', 3);
      var product = makeProduct(101, 'Thing', 10.00);

      findAll.mockReturnValue([makeOrder(7, '2024-03-20', 'cancelled', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 1)]);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain(' Orders counted: 0');
    });

    it('excludes a cancelled order from the grand total', () => {
      var customer = makeCustomer(10, 'Carol', 'Berlin', 3);
      var product = makeProduct(101, 'Thing', 10.00);

      findAll.mockReturnValue([makeOrder(7, '2024-03-20', 'cancelled', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 1)]);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain(' Grand total:    $0.00');
    });

    it('does not call calculateOrderTotal for a cancelled order', () => {
      var customer = makeCustomer(10, 'Carol', 'Berlin', 3);
      var product = makeProduct(101, 'Thing', 10.00);

      findAll.mockReturnValue([makeOrder(7, '2024-03-20', 'cancelled', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 1)]);

      generateMonthlyReport('2024-03');

      expect(calculateOrderTotal).not.toHaveBeenCalled();
    });

    it('still lists the cancelled order header and line items in the report body', () => {
      var customer = makeCustomer(10, 'Carol', 'Berlin', 3);
      var product = makeProduct(101, 'Thing', 10.00);

      findAll.mockReturnValue([makeOrder(7, '2024-03-20', 'cancelled', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products') return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(101, 1)]);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('Order #7');
      expect(report).toContain('Thing  x1');
    });
  });

  describe('multiple orders — grand total sums correctly', () => {
    it('sums totals from all non-cancelled orders in the month', () => {
      var customer = makeCustomer(10, 'Dave', 'Tokyo', 1);
      var productA = makeProduct(201, 'Alpha', 50.00);
      var productB = makeProduct(202, 'Beta', 30.00);

      findAll.mockReturnValue([
        makeOrder(1, '2024-03-01', 'pending', 10),
        makeOrder(2, '2024-03-15', 'pending', 10),
      ]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products' && id === 201) return productA;
        if (collection === 'products' && id === 202) return productB;
      });
      findLinesByOrderId.mockImplementation((orderId) => {
        if (orderId === 1) return [makeOrderLine(201, 1)];
        if (orderId === 2) return [makeOrderLine(202, 1)];
        return [];
      });
      calculateOrderTotal.mockImplementation((orderId) => {
        if (orderId === 1) return 50.00;
        if (orderId === 2) return 30.00;
        return 0;
      });

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain(' Orders counted: 2');
      expect(report).toContain(' Grand total:    $80.00');
    });

    it('counts only non-cancelled orders when mix of statuses present', () => {
      var customer = makeCustomer(10, 'Eve', 'Rome', 2);
      var product = makeProduct(301, 'Zeta', 100.00);

      findAll.mockReturnValue([
        makeOrder(10, '2024-03-05', 'pending', 10),
        makeOrder(11, '2024-03-10', 'cancelled', 10),
        makeOrder(12, '2024-03-20', 'pending', 10),
      ]);
      findById.mockImplementation((collection) => {
        if (collection === 'customers') return customer;
        return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(301, 1)]);
      calculateOrderTotal.mockReturnValue(100.00);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain(' Orders counted: 2');
      expect(report).toContain(' Grand total:    $200.00');
    });

    it('grand total uses large number formatting with commas when applicable', () => {
      var customer = makeCustomer(10, 'Frank', 'Oslo', 3);
      var product = makeProduct(401, 'Pricey', 1000.00);

      findAll.mockReturnValue([
        makeOrder(20, '2024-03-01', 'pending', 10),
        makeOrder(21, '2024-03-02', 'pending', 10),
      ]);
      findById.mockImplementation((collection) => {
        if (collection === 'customers') return customer;
        return product;
      });
      findLinesByOrderId.mockReturnValue([makeOrderLine(401, 1)]);
      calculateOrderTotal.mockReturnValue(600.00);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain(' Grand total:    $1,200.00');
    });
  });

  describe('order lines — multiple line items per order', () => {
    it('includes every line item for an order', () => {
      var customer = makeCustomer(10, 'Grace', 'Vienna', 1);
      var productX = makeProduct(501, 'X-part', 5.00);
      var productY = makeProduct(502, 'Y-part', 15.00);

      findAll.mockReturnValue([makeOrder(30, '2024-03-12', 'pending', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products' && id === 501) return productX;
        if (collection === 'products' && id === 502) return productY;
      });
      findLinesByOrderId.mockReturnValue([
        makeOrderLine(501, 2),
        makeOrderLine(502, 1),
      ]);
      calculateOrderTotal.mockReturnValue(25.00);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('X-part  x2  @ $5.00  = $10.00');
      expect(report).toContain('Y-part  x1  @ $15.00  = $15.00');
    });

    it('calculates subtotal as the sum of all line totals', () => {
      var customer = makeCustomer(10, 'Grace', 'Vienna', 1);
      var productX = makeProduct(501, 'X-part', 5.00);
      var productY = makeProduct(502, 'Y-part', 15.00);

      findAll.mockReturnValue([makeOrder(30, '2024-03-12', 'pending', 10)]);
      findById.mockImplementation((collection, id) => {
        if (collection === 'customers') return customer;
        if (collection === 'products' && id === 501) return productX;
        if (collection === 'products' && id === 502) return productY;
      });
      findLinesByOrderId.mockReturnValue([
        makeOrderLine(501, 2),
        makeOrderLine(502, 1),
      ]);
      calculateOrderTotal.mockReturnValue(25.00);

      var report = generateMonthlyReport('2024-03');

      expect(report).toContain('Subtotal: $25.00');
    });
  });
});
