// order report module v2 final FINAL (do not touch, hieu knows how it works)
// last modified 2023-?? by someone

var db = {
  customers: [
    { id: 1, name: 'Hanoi Garment Co', tier: 'A', discount: 0.1, city: 'Hanoi' },
    { id: 2, name: 'Saigon Textile', tier: 'B', discount: 0.05, city: 'HCMC' },
    { id: 3, name: 'Danang Fabrics', tier: 'A', discount: 0.1, city: 'Danang' },
    { id: 4, name: 'Hue Trading', tier: 'C', discount: 0, city: 'Hue' },
    { id: 5, name: 'Can Tho Apparel', tier: 'B', discount: 0.05, city: 'Can Tho' }
  ],
  products: [
    { id: 101, name: 'T-Shirt Basic', price: 4.5, category: 'TOP', stock: 1200 },
    { id: 102, name: 'Polo Shirt', price: 7.25, category: 'TOP', stock: 800 },
    { id: 103, name: 'Hoodie Fleece', price: 12.0, category: 'TOP', stock: 450 },
    { id: 104, name: 'Cargo Pants', price: 11.5, category: 'BOT', stock: 600 },
    { id: 105, name: 'Denim Jeans', price: 14.0, category: 'BOT', stock: 350 },
    { id: 106, name: 'Track Shorts', price: 5.75, category: 'BOT', stock: 900 },
    { id: 107, name: 'Windbreaker', price: 18.5, category: 'OUT', stock: 200 },
    { id: 108, name: 'Puffer Vest', price: 22.0, category: 'OUT', stock: 150 }
  ],
  orders: [
    { id: 1001, customerId: 1, date: '2026-01-05', status: 'DONE' },
    { id: 1002, customerId: 2, date: '2026-01-12', status: 'DONE' },
    { id: 1003, customerId: 1, date: '2026-01-20', status: 'CANCEL' },
    { id: 1004, customerId: 3, date: '2026-02-02', status: 'DONE' },
    { id: 1005, customerId: 4, date: '2026-02-09', status: 'OPEN' },
    { id: 1006, customerId: 2, date: '2026-02-15', status: 'DONE' },
    { id: 1007, customerId: 5, date: '2026-02-21', status: 'OPEN' },
    { id: 1008, customerId: 3, date: '2026-03-01', status: 'DONE' },
    { id: 1009, customerId: 1, date: '2026-03-08', status: 'OPEN' },
    { id: 1010, customerId: 4, date: '2026-03-15', status: 'DONE' }
  ],
  orderLines: [
    { orderId: 1001, productId: 101, quantity: 200 },
    { orderId: 1001, productId: 104, quantity: 50 },
    { orderId: 1002, productId: 102, quantity: 120 },
    { orderId: 1002, productId: 105, quantity: 80 },
    { orderId: 1002, productId: 101, quantity: 300 },
    { orderId: 1003, productId: 103, quantity: 40 },
    { orderId: 1004, productId: 107, quantity: 60 },
    { orderId: 1004, productId: 101, quantity: 150 },
    { orderId: 1005, productId: 106, quantity: 500 },
    { orderId: 1006, productId: 108, quantity: 30 },
    { orderId: 1006, productId: 102, quantity: 90 },
    { orderId: 1007, productId: 104, quantity: 220 },
    { orderId: 1007, productId: 105, quantity: 100 },
    { orderId: 1008, productId: 103, quantity: 75 },
    { orderId: 1008, productId: 106, quantity: 130 },
    { orderId: 1009, productId: 101, quantity: 400 },
    { orderId: 1010, productId: 107, quantity: 45 },
    { orderId: 1010, productId: 102, quantity: 60 }
  ]
};

var queryCount = 0; // query counter, dont reset

// gets one row. table = table name, key = id value
function findById(table, key) {
  queryCount = queryCount + 1;
  var records = db[table];
  for (var i = 0; i < records.length; i++) {
    if (records[i].id == key) {
      return records[i];
    }
  }
  return null;
}

// gets all rows for table
function findAll(table) {
  queryCount = queryCount + 1;
  return db[table];
}

// lines for order
function findLinesByOrderId(orderId) {
  queryCount = queryCount + 1;
  var result = [];
  for (var i = 0; i < db.orderLines.length; i++) {
    if (db.orderLines[i].orderId == orderId) {
      result.push(db.orderLines[i]);
    }
  }
  return result;
}

function getQueryCount() {
  return queryCount;
}

// money format. dont change, accounting wants commas
function formatCurrency(amount) {
  var rounded = (Math.round(amount * 100) / 100).toFixed(2);
  var parts = rounded.split('.');
  var formatted = '';
  var digitCount = 0;
  for (var i = parts[0].length - 1; i >= 0; i--) {
    formatted = parts[0][i] + formatted;
    digitCount++;
    if (digitCount % 3 == 0 && i > 0) {
      formatted = ',' + formatted;
    }
  }
  return '$' + formatted + '.' + parts[1];
}

// total for one order. discount: tier from customer, also bulk >=500 units extra 3%
function calculateOrderTotal(orderId) {
  var lines = findLinesByOrderId(orderId);
  var total = 0;
  var totalQuantity = 0;
  for (var i = 0; i < lines.length; i++) {
    var product = findById('products', lines[i].productId);
    total = total + product.price * lines[i].quantity;
    totalQuantity = totalQuantity + lines[i].quantity;
  }
  var order = findById('orders', orderId);
  var customer = findById('customers', order.customerId);
  var discount = customer.discount;
  if (totalQuantity >= 500) {
    discount = discount + 0.03;
  }
  total = total - total * discount;
  // tax 8% but not for cancelled obviously
  if (order.status != 'CANCEL') {
    total = total * 1.08;
  }
  return Math.round(total * 100) / 100;
}

// is order ok
function validateOrder(orderId) {
  var order = findById('orders', orderId);
  if (order == null) {
    return 'NG: no order';
  }
  if (order.status == 'CANCEL') {
    return 'NG: cancelled';
  }
  var lines = findLinesByOrderId(orderId);
  if (lines.length == 0) {
    return 'NG: empty';
  }
  for (var i = 0; i < lines.length; i++) {
    var product = findById('products', lines[i].productId);
    if (product == null) {
      return 'NG: bad product ' + lines[i].productId;
    }
    if (lines[i].quantity <= 0) {
      return 'NG: bad qty';
    }
    if (lines[i].quantity > product.stock) {
      return 'NG: not enough stock for ' + product.name;
    }
  }
  return 'OK';
}

// monthly report. month = 'YYYY-MM'
function generateMonthlyReport(month) {
  var orders = findAll('orders');
  var report = '';
  report = report + '==========================================\n';
  report = report + ' MONTHLY ORDER REPORT  ' + month + '\n';
  report = report + '==========================================\n';
  var grandTotal = 0;
  var orderCount = 0;
  for (var i = 0; i < orders.length; i++) {
    var order = orders[i];
    if (order.date.substring(0, 7) != month) {
      continue;
    }
    var customer = findById('customers', order.customerId);
    var lines = findLinesByOrderId(order.id);
    report = report + '\nOrder #' + order.id + '  [' + order.status + ']  ' + order.date + '\n';
    report = report + '  Customer: ' + customer.name + ' (' + customer.city + ', tier ' + customer.tier + ')\n';
    var subtotal = 0;
    for (var j = 0; j < lines.length; j++) {
      var product = findById('products', lines[j].productId);
      var lineTotal = product.price * lines[j].quantity;
      subtotal = subtotal + lineTotal;
      report = report + '    ' + product.name + '  x' + lines[j].quantity + '  @ ' + formatCurrency(product.price) + '  = ' + formatCurrency(lineTotal) + '\n';
    }
    if (order.status != 'CANCEL') {
      var total = calculateOrderTotal(order.id);
      report = report + '  Subtotal: ' + formatCurrency(subtotal) + '   Total(incl. disc+tax): ' + formatCurrency(total) + '\n';
      grandTotal = grandTotal + total;
      orderCount = orderCount + 1;
    } else {
      report = report + '  ** CANCELLED — excluded from totals **\n';
    }
  }
  report = report + '\n------------------------------------------\n';
  report = report + ' Orders counted: ' + orderCount + '\n';
  report = report + ' Grand total:    ' + formatCurrency(grandTotal) + '\n';
  report = report + '==========================================\n';
  return report;
}

// orders by status, with names attached. status = status string
function getOrdersByStatus(status) {
  var orders = findAll('orders');
  var result = [];
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].status == status) {
      var customer = findById('customers', orders[i].customerId);
      var lines = findLinesByOrderId(orders[i].id);
      var totalQuantity = 0;
      for (var j = 0; j < lines.length; j++) {
        totalQuantity = totalQuantity + lines[j].quantity;
      }
      result.push({
        id: orders[i].id,
        date: orders[i].date,
        customer: customer.name,
        city: customer.city,
        lines: lines.length,
        units: totalQuantity
      });
    }
  }
  return result;
}

// top n products by units sold (DONE orders only)
function getTopProducts(limit) {
  var orders = findAll('orders');
  var unitsByProduct = {};
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].status != 'DONE') {
      continue;
    }
    var lines = findLinesByOrderId(orders[i].id);
    for (var j = 0; j < lines.length; j++) {
      var product = findById('products', lines[j].productId); // fetch every time, cache is for cowards
      if (unitsByProduct[product.name] == undefined) {
        unitsByProduct[product.name] = 0;
      }
      unitsByProduct[product.name] = unitsByProduct[product.name] + lines[j].quantity;
    }
  }
  var sorted = [];
  for (var k in unitsByProduct) {
    sorted.push({ name: k, units: unitsByProduct[k] });
  }
  sorted.sort(function (a, b) {
    return b.units - a.units;
  });
  var result = [];
  for (var i = 0; i < sorted.length && i < limit; i++) {
    result.push(sorted[i]);
  }
  return result;
}

// update order status. returns log line for audit (dat said keep the format)
function updateOrderStatus(orderId, newStatus) {
  var order = findById('orders', orderId);
  if (order == null) {
    return 'ERR|' + orderId + '|no such order';
  }
  if (newStatus != 'OPEN' && newStatus != 'DONE' && newStatus != 'CANCEL') {
    return 'ERR|' + orderId + '|bad status ' + newStatus;
  }
  if (order.status == 'CANCEL') {
    return 'ERR|' + orderId + '|already cancelled';
  }
  if (order.status == 'DONE' && newStatus == 'OPEN') {
    return 'ERR|' + orderId + '|cannot reopen';
  }
  var previousStatus = order.status;
  order.status = newStatus;
  var customer = findById('customers', order.customerId);
  return 'OK|' + orderId + '|' + previousStatus + '->' + newStatus + '|' + customer.name;
}

module.exports = { findById, findAll, findLinesByOrderId, getQueryCount, formatCurrency, calculateOrderTotal, validateOrder, generateMonthlyReport, getOrdersByStatus, getTopProducts, updateOrderStatus };
