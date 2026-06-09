// order report module v2 final FINAL (do not touch, hieu knows how it works)
// last modified 2023-?? by someone

var ORDER_STATUS = { OPEN: 'OPEN', DONE: 'DONE', CANCEL: 'CANCEL' };

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
    { id: 1001, customerId: 1, date: '2026-01-05', status: ORDER_STATUS.DONE },
    { id: 1002, customerId: 2, date: '2026-01-12', status: ORDER_STATUS.DONE },
    { id: 1003, customerId: 1, date: '2026-01-20', status: ORDER_STATUS.CANCEL },
    { id: 1004, customerId: 3, date: '2026-02-02', status: ORDER_STATUS.DONE },
    { id: 1005, customerId: 4, date: '2026-02-09', status: ORDER_STATUS.OPEN },
    { id: 1006, customerId: 2, date: '2026-02-15', status: ORDER_STATUS.DONE },
    { id: 1007, customerId: 5, date: '2026-02-21', status: ORDER_STATUS.OPEN },
    { id: 1008, customerId: 3, date: '2026-03-01', status: ORDER_STATUS.DONE },
    { id: 1009, customerId: 1, date: '2026-03-08', status: ORDER_STATUS.OPEN },
    { id: 1010, customerId: 4, date: '2026-03-15', status: ORDER_STATUS.DONE }
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

function findAll(table) {
  queryCount = queryCount + 1;
  return db[table];
}

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

module.exports = { ORDER_STATUS, findById, findAll, findLinesByOrderId, getQueryCount };
