'use strict';

var { findAll, findById, findLinesByOrderId, ORDER_STATUS } = require('./db');
var { calculateOrderTotal } = require('./orders');

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
    if (order.status != ORDER_STATUS.CANCEL) {
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

module.exports = { formatCurrency, generateMonthlyReport };
