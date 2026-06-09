'use strict';

var { findById, findAll, findLinesByOrderId } = require('./db');

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

// orders by status, with names attached
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

module.exports = { calculateOrderTotal, validateOrder, getOrdersByStatus, getTopProducts, updateOrderStatus };
