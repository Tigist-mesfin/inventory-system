class ApiEndpoints {
  static const authLogin = '/api/auth/login';
  static const authRegisterCompany = '/api/auth/register-company';
  static const authRefresh = '/api/auth/refresh';
  static const authLogout = '/api/auth/logout';
  static const authMe = '/api/auth/me';

  static const products = '/api/products';
  static String productById(String id) => '/api/products/$id';
  static const warehouses = '/api/warehouses';
  static String warehouseById(String id) => '/api/warehouses/$id';
  static const stockTransfers = '/api/stock-transfers';
  static String stockTransferById(String id) => '/api/stock-transfers/$id';
  static String stockTransferComplete(String id) =>
      '/api/stock-transfers/$id/complete';
  static String stockTransferCancel(String id) =>
      '/api/stock-transfers/$id/cancel';
  static const suppliers = '/api/suppliers';
  static const customers = '/api/customers';
  static String customerPayments(String customerId) =>
      '/api/customers/$customerId/payments';
  static String customerWallet(String customerId) =>
      '/api/customers/$customerId/wallet';
  static const customerWallets = '/api/customers/wallets';
  static const customerWalletTransactions =
      '/api/customers/wallet-transactions';
  static const paymentMethods = '/api/payment-methods';
  static String paymentMethodById(String id) => '/api/payment-methods/$id';
  static const companyProfile = '/api/company-profile';
  static const inventoryByItem = '/api/inventory/by-item';
  static const inventoryOverview = '/api/inventory/overview';
  static const inventoryUndelivered = '/api/inventory/undelivered';
  static const inventoryAdjustOnHand = '/api/inventory/adjust-on-hand';
  static const purchaseOrders = '/api/purchase-orders';
  static const purchaseUndeliveredSummary =
      '/api/purchase-orders/undelivered-summary';
  static const purchaseDeliverAll = '/api/purchase-orders/deliver-all';
  static String purchaseItem(String itemId) =>
      '/api/purchase-orders/items/$itemId';
  static String purchasePayments(String purchaseOrderId) =>
      '/api/purchase-orders/$purchaseOrderId/payments';
  static const sales = '/api/sales';
  static const salesSync = '/api/sales/sync';
  static String salePayments(String saleId) => '/api/sales/$saleId/payments';
  static String saleCancel(String saleId) => '/api/sales/$saleId/cancel';
  static String saleById(String saleId) => '/api/sales/$saleId';
  static const purchasesReport = '/api/insights/purchases-report';
  static const dashboard = '/api/insights/dashboard';
  static const ledger = '/api/insights/ledger';
  static const vatReport = '/api/insights/vat-report';
  static const incomeStatement = '/api/expenses/income-statement';
  static const expenses = '/api/expenses';
  static const expensesReport = '/api/expenses/report';
  static String expenseById(String id) => '/api/expenses/$id';
  static const otherIncomes = '/api/other-incomes';
  static const otherIncomesReport = '/api/other-incomes/report';
  static String otherIncomeById(String id) => '/api/other-incomes/$id';
  static const team = '/api/team';
  static String teamById(String id) => '/api/team/$id';

  static const aiDashboard = '/api/ai/dashboard';
  static const aiSummaryDaily = '/api/ai/summary/daily';
  static const aiSummaryMonthly = '/api/ai/summary/monthly';
  static const aiSummaryInsights = '/api/ai/summary/insights';
  static const aiChat = '/api/ai/chat';
  static const aiClarify = '/api/ai/clarify';
}
