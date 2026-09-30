const XLSX = require("xlsx");

const PURCHASE_IMPORT_COLUMNS = [
  { key: "date", header: "Date", aliases: ["date", "order date", "purchase date"] },
  { key: "itemName", header: "Item name", aliases: ["item name", "item", "product", "product name", "name"] },
  { key: "quantity", header: "Quantity", aliases: ["quantity", "qty", "amount qty"] },
  { key: "unit", header: "Unit", aliases: ["unit"] },
  { key: "unitPrice", header: "Unit price", aliases: ["unit price", "price", "cost", "purchase price"] },
  { key: "amount", header: "Amount", aliases: ["amount", "total", "line total", "subtotal"] },
  {
    key: "costWithVat",
    header: "Cost with VAT",
    aliases: ["cost with vat", "vat total", "grand total", "total with vat"],
  },
  {
    key: "boughtFrom",
    header: "Bought from",
    aliases: ["bought from", "supplier", "seller", "party", "vendor"],
  },
  { key: "staff", header: "Staff", aliases: ["staff", "salesman", "created by"] },
  { key: "paid", header: "Paid", aliases: ["paid", "amount paid", "paid amount"] },
  { key: "unpaid", header: "Unpaid", aliases: ["unpaid", "remaining", "balance", "remaining balance"] },
  { key: "method", header: "Method", aliases: ["method", "payment method", "payment", "account"] },
  { key: "status", header: "Status", aliases: ["status", "delivery", "delivery status"] },
];

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const SALE_IMPORT_COLUMNS = [
  { key: "date", header: "Date", aliases: ["date", "sale date", "sold date"] },
  {
    key: "itemName",
    header: "Item name",
    aliases: ["item name", "item", "product", "product name", "name"],
  },
  { key: "quantity", header: "Quantity", aliases: ["quantity", "qty"] },
  { key: "unitPrice", header: "Unit price", aliases: ["unit price", "price", "selling price"] },
  {
    key: "costWithVat",
    header: "Cost with VAT",
    aliases: ["cost with vat", "vat total", "grand total", "total with vat", "selling total"],
  },
  {
    key: "customer",
    header: "Customer",
    aliases: ["customer", "customer name", "buyer", "sold to"],
  },
  {
    key: "method",
    header: "Payment method",
    aliases: ["payment method", "method", "payment", "account"],
  },
  { key: "paid", header: "Paid amount", aliases: ["paid amount", "paid", "amount paid"] },
  {
    key: "remaining",
    header: "Remaining",
    aliases: ["remaining", "unpaid", "balance", "remaining balance"],
  },
];

const STOCK_IMPORT_COLUMNS = [
  {
    key: "itemName",
    header: "Item name",
    aliases: ["item name", "item", "product", "product name", "name"],
  },
  {
    key: "store",
    header: "Store",
    aliases: ["store", "warehouse", "warehouse name", "location"],
  },
  { key: "quantity", header: "Quantity", aliases: ["quantity", "qty", "on hand", "stock"] },
  {
    key: "sellingPrice",
    header: "Selling price",
    aliases: ["selling price", "sale price", "unit price", "price"],
  },
  {
    key: "purchasePrice",
    header: "Last purchase price",
    aliases: [
      "last purchase price",
      "purchase price",
      "buy price",
      "cost",
      "unit cost",
    ],
  },
];

const headerMapFor = (columns) => {
  const map = new Map();
  for (const column of columns) {
    map.set(normalizeHeader(column.header), column.key);
    for (const alias of column.aliases) map.set(normalizeHeader(alias), column.key);
  }
  return map;
};

const purchaseHeaderKeyMap = headerMapFor(PURCHASE_IMPORT_COLUMNS);
const saleHeaderKeyMap = headerMapFor(SALE_IMPORT_COLUMNS);
const stockHeaderKeyMap = headerMapFor(STOCK_IMPORT_COLUMNS);

const cellText = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
};

const isEmptyRow = (columns, row) =>
  columns.every((column) => !cellText(row[column.key]));

const buildTemplateBuffer = (sheetName, columns, samples = []) => {
  const headers = columns.map((column) => column.header);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...samples]);
  sheet["!cols"] = headers.map((header) => ({ wch: Math.max(14, header.length + 2) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

const parseRows = (columns, headerMap, buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",
    raw: true,
  });

  return rawRows
    .map((raw, index) => {
      const row = {};
      for (const [header, value] of Object.entries(raw)) {
        const key = headerMap.get(normalizeHeader(header));
        if (key) row[key] = cellText(value);
      }
      return { rowNumber: index + 2, ...row };
    })
    .filter((row) => !isEmptyRow(columns, row));
};

exports.PURCHASE_IMPORT_COLUMNS = PURCHASE_IMPORT_COLUMNS;
exports.SALE_IMPORT_COLUMNS = SALE_IMPORT_COLUMNS;
exports.STOCK_IMPORT_COLUMNS = STOCK_IMPORT_COLUMNS;

exports.buildPurchaseTemplateBuffer = () =>
  buildTemplateBuffer("Purchases", PURCHASE_IMPORT_COLUMNS, [
    [
      "2026-08-20",
      "Sugar",
      "10",
      "KG",
      "50",
      "",
      "",
      "ABC Wholesale",
      "",
      "300",
      "",
      "Cash",
      "Not delivered",
    ],
    ["", "Cooking oil", "2", "PCS", "", "230", "", "", "", "", "", "", ""],
  ]);

exports.buildSaleTemplateBuffer = () =>
  buildTemplateBuffer("Sales", SALE_IMPORT_COLUMNS, []);

exports.buildStockTemplateBuffer = () =>
  buildTemplateBuffer("Stock", STOCK_IMPORT_COLUMNS, []);

exports.parsePurchaseRows = (buffer) =>
  parseRows(PURCHASE_IMPORT_COLUMNS, purchaseHeaderKeyMap, buffer);

exports.parseSaleRows = (buffer) =>
  parseRows(SALE_IMPORT_COLUMNS, saleHeaderKeyMap, buffer);

exports.parseStockRows = (buffer) =>
  parseRows(STOCK_IMPORT_COLUMNS, stockHeaderKeyMap, buffer);
