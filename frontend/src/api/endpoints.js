import client from './client';

/** يحذف القيم الفارغة/غير المعرَّفة قبل بناء query string، حتى لا تظهر كنص "undefined" حرفياً بالرابط. */
function cleanParams(params) {
  return Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

export const publicApi = {
  companyInfo: () => client.get('/public/company-info'),
};

export const authApi = {
  login: (username, password) => client.post('/auth/login', { username, password }),
  me: () => client.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    client.post('/auth/change-password', { currentPassword, newPassword }),
};

export const dashboardApi = {
  summary: () => client.get('/dashboard/summary'),
};

export const branchApi = {
  list: () => client.get('/branches'),
  create: (data) => client.post('/branches', data),
  update: (id, data) => client.put(`/branches/${id}`, data),
  remove: (id) => client.delete(`/branches/${id}`),
};

export const warehouseApi = {
  list: (branchId) => client.get('/warehouses', { params: branchId ? { branchId } : {} }),
  create: (data) => client.post('/warehouses', data),
  update: (id, data) => client.put(`/warehouses/${id}`, data),
  remove: (id) => client.delete(`/warehouses/${id}`),
};

export const categoryApi = {
  list: () => client.get('/categories'),
  create: (data) => client.post('/categories', data),
  update: (id, data) => client.put(`/categories/${id}`, data),
  remove: (id) => client.delete(`/categories/${id}`),
};

export const unitApi = {
  list: () => client.get('/units'),
  create: (data) => client.post('/units', data),
  update: (id, data) => client.put(`/units/${id}`, data),
  remove: (id) => client.delete(`/units/${id}`),
};

export const productApi = {
  search: (params) => client.get('/products', { params }),
  get: (id) => client.get(`/products/${id}`),
  create: (data) => client.post('/products', data),
  update: (id, data) => client.put(`/products/${id}`, data),
  remove: (id) => client.delete(`/products/${id}`),
};

export const stockApi = {
  byWarehouse: (warehouseId) => client.get(`/stock/warehouse/${warehouseId}`),
  byWarehousePage: (warehouseId, params) => client.get(`/stock/warehouse/${warehouseId}/page`, { params }),
  byProduct: (productId) => client.get(`/stock/product/${productId}`),
  lowStock: () => client.get('/stock/low-stock'),
  movements: (params) => client.get('/stock/movements', { params }),
  adjust: (data) => client.post('/stock/adjust', data),
  transfer: (data) => client.post('/stock/transfer', data),
};

export const damagedApi = {
  list: (params) => client.get('/stock/damaged', { params }),
  create: (data) => client.post('/stock/damaged', data),
  compensate: (id, data) => client.post(`/stock/damaged/${id}/compensate`, data),
};

export const supplierApi = {
  list: (q) => client.get('/suppliers', { params: q ? { q } : {} }),
  listPage: (params) => client.get('/suppliers/page', { params }),
  create: (data) => client.post('/suppliers', data),
  update: (id, data) => client.put(`/suppliers/${id}`, data),
  remove: (id) => client.delete(`/suppliers/${id}`),
};

export const customerApi = {
  list: (q) => client.get('/customers', { params: q ? { q } : {} }),
  listPage: (params) => client.get('/customers/page', { params }),
  create: (data) => client.post('/customers', data),
  update: (id, data) => client.put(`/customers/${id}`, data),
  remove: (id) => client.delete(`/customers/${id}`),
};

export const purchaseInvoiceApi = {
  list: (params) => client.get('/purchase-invoices', { params }),
  get: (id) => client.get(`/purchase-invoices/${id}`),
  create: (data) => client.post('/purchase-invoices', data),
  cancel: (id) => client.post(`/purchase-invoices/${id}/cancel`),
  return: (id, data) => client.post(`/purchase-invoices/${id}/return`, data),
  returns: (id) => client.get(`/purchase-invoices/${id}/returns`),
  addPayment: (id, data) => client.post(`/purchase-invoices/${id}/payments`, data),
  refund: (id, data) => client.post(`/purchase-invoices/${id}/refund`, data),
  payments: (id) => client.get(`/purchase-invoices/${id}/payments`),
  outstanding: (params) => client.get('/purchase-invoices/outstanding', { params }),
  balancesBySupplier: () => client.get('/purchase-invoices/balances-by-supplier'),
  printA4Url: (id) => `/purchase-invoices/${id}/print/a4`,
  printThermalUrl: (id, width = 80) => `/purchase-invoices/${id}/print/thermal?width=${width}`,
  exportUrl: (params) => `/purchase-invoices/export?${new URLSearchParams(cleanParams(params)).toString()}`,
};

export const salesQuoteApi = {
  list: (params) => client.get('/sales-quotes', { params }),
  get: (id) => client.get(`/sales-quotes/${id}`),
  create: (data) => client.post('/sales-quotes', data),
  confirm: (id, data) => client.post(`/sales-quotes/${id}/confirm`, data),
  cancel: (id) => client.post(`/sales-quotes/${id}/cancel`),
  printA4Url: (id) => `/sales-quotes/${id}/print/a4`,
};

export const purchaseQuoteApi = {
  list: (params) => client.get('/purchase-quotes', { params }),
  get: (id) => client.get(`/purchase-quotes/${id}`),
  create: (data) => client.post('/purchase-quotes', data),
  confirm: (id, data) => client.post(`/purchase-quotes/${id}/confirm`, data),
  cancel: (id) => client.post(`/purchase-quotes/${id}/cancel`),
  printA4Url: (id) => `/purchase-quotes/${id}/print/a4`,
};

export const companySettingsApi = {
  get: () => client.get('/settings/company'),
  update: (data) => client.put('/settings/company', data),
  alerts: () => client.get('/settings/company/alerts'),
  updateAlerts: (data) => client.put('/settings/company/alerts', data),
  runAlerts: () => client.post('/settings/company/alerts/run'),
};

export const salesInvoiceApi = {
  list: (params) => client.get('/sales-invoices', { params }),
  get: (id) => client.get(`/sales-invoices/${id}`),
  create: (data) => client.post('/sales-invoices', data),
  update: (id, data) => client.put(`/sales-invoices/${id}`, data),
  cancel: (id) => client.post(`/sales-invoices/${id}/cancel`),
  return: (id, data) => client.post(`/sales-invoices/${id}/return`, data),
  returns: (id) => client.get(`/sales-invoices/${id}/returns`),
  refund: (id, data) => client.post(`/sales-invoices/${id}/refund`, data),
  addPayment: (id, data) => client.post(`/sales-invoices/${id}/payments`, data),
  payments: (id) => client.get(`/sales-invoices/${id}/payments`),
  outstanding: (params) => client.get('/sales-invoices/outstanding', { params }),
  balancesByCustomer: () => client.get('/sales-invoices/balances-by-customer'),
  printA4Url: (id) => `/sales-invoices/${id}/print/a4`,
  printThermalUrl: (id, width = 80) => `/sales-invoices/${id}/print/thermal?width=${width}`,
  exportUrl: (params) => `/sales-invoices/export?${new URLSearchParams(cleanParams(params)).toString()}`,
};

export const reportApi = {
  financial: (params) => client.get('/reports/financial', { params }),
  inventoryValue: (params) => client.get('/reports/inventory-value', { params }),
  topProducts: (params) => client.get('/reports/top-products', { params }),
  topCustomers: (params) => client.get('/reports/top-customers', { params }),
  topSuppliers: (params) => client.get('/reports/top-suppliers', { params }),
  stockMovementSummary: (params) => client.get('/reports/stock-movement-summary', { params }),
  taxPayable: (params) => client.get('/reports/tax-payable', { params }),
  balanceSheet: () => client.get('/reports/balance-sheet'),
  receivablesAging: () => client.get('/reports/receivables-aging'),
  payablesAging: () => client.get('/reports/payables-aging'),
  cashFlow: (params) => client.get('/reports/cash-flow', { params }),
  financialExportUrl: (params) => `/reports/financial/export?${new URLSearchParams(cleanParams(params)).toString()}`,
  inventoryValueExportUrl: (params) => `/reports/inventory-value/export?${new URLSearchParams(cleanParams(params)).toString()}`,
  topProductsExportUrl: (params) => `/reports/top-products/export?${new URLSearchParams(cleanParams(params)).toString()}`,
};

export const auditLogApi = {
  search: (params) => client.get('/audit-logs', { params }),
  entityTypes: () => client.get('/audit-logs/entity-types'),
  purge: (days) => client.delete('/audit-logs/purge', { params: { days } }),
};

export const employeeApi = {
  drivers: () => client.get('/employees/drivers'),
  list: () => client.get('/employees'),
  create: (data) => client.post('/employees', data),
  update: (id, data) => client.put(`/employees/${id}`, data),
  remove: (id) => client.delete(`/employees/${id}`),
};

export const expenseApi = {
  listPage: (params) => client.get('/expenses/page', { params }),
  byEmployee: (employeeId) => client.get(`/expenses/by-employee/${employeeId}`),
  salaryPaidSummary: (params) => client.get('/expenses/salary-paid-summary', { params }),
  voucherUrl: (id) => `/expenses/${id}/voucher`,
  create: (data) => client.post('/expenses', data),
  update: (id, data) => client.put(`/expenses/${id}`, data),
  remove: (id) => client.delete(`/expenses/${id}`),
};

export const accountApi = {
  list: () => client.get('/accounts'),
  balances: () => client.get('/accounts/balances'),
  ledger: (id, params) => client.get(`/accounts/${id}/ledger`, { params }),
  ledgerExportUrl: (id, params) => `/accounts/${id}/ledger/export?${new URLSearchParams(cleanParams(params)).toString()}`,
  create: (data) => client.post('/accounts', data),
  update: (id, data) => client.put(`/accounts/${id}`, data),
  remove: (id) => client.delete(`/accounts/${id}`),
  recordManual: (data) => client.post('/accounts/transactions/manual', data),
  recordCapital: (data) => client.post('/accounts/transactions/capital', data),
  transfer: (data) => client.post('/accounts/transfer', data),
  setReconciled: (id, reconciled) => client.put(`/accounts/transactions/${id}/reconcile`, null, { params: { reconciled } }),
};

export const fixedAssetApi = {
  list: () => client.get('/fixed-assets'),
  get: (id) => client.get(`/fixed-assets/${id}`),
  create: (data) => client.post('/fixed-assets', data),
  update: (id, data) => client.put(`/fixed-assets/${id}`, data),
  dispose: (id, data) => client.post(`/fixed-assets/${id}/dispose`, data),
  remove: (id) => client.delete(`/fixed-assets/${id}`),
};

export const fiscalClosingApi = {
  list: () => client.get('/fiscal-closings'),
  latest: () => client.get('/fiscal-closings/latest'),
  close: (data) => client.post('/fiscal-closings', data),
};

export const stocktakeApi = {
  list: () => client.get('/stocktake'),
  get: (id) => client.get(`/stocktake/${id}`),
  create: (data) => client.post('/stocktake', data),
  updateCounts: (id, data) => client.put(`/stocktake/${id}/counts`, data),
  complete: (id) => client.post(`/stocktake/${id}/complete`),
};

export const checkApi = {
  listPage: (params) => client.get('/checks/page', { params }),
  create: (data) => client.post('/checks', data),
  updateStatus: (id, data) => client.put(`/checks/${id}/status`, data),
  remove: (id) => client.delete(`/checks/${id}`),
};

export const notificationApi = {
  list: (params) => client.get('/notifications', { params }),
  unreadCount: () => client.get('/notifications/unread-count'),
  markRead: (id) => client.post(`/notifications/${id}/read`),
  markAllRead: () => client.post('/notifications/read-all'),
};

export const vanApi = {
  list: () => client.get('/vans'),
  my: () => client.get('/vans/my'),
  get: (id) => client.get(`/vans/${id}`),
  create: (data) => client.post('/vans', data),
  update: (id, data) => client.put(`/vans/${id}`, data),
  remove: (id) => client.delete(`/vans/${id}`),
  settlement: (id, params) => client.get(`/vans/${id}/settlement`, { params: cleanParams(params) }),
  unloadAll: (id, data) => client.post(`/vans/${id}/unload-all`, data),
  close: (id, data) => client.post(`/vans/${id}/close`, data),
  loads: (params) => client.get('/vans/loads', { params: cleanParams(params) }),
  getLoad: (id) => client.get(`/vans/loads/${id}`),
  createLoad: (data) => client.post('/vans/loads', data),
  cancelLoad: (id) => client.post(`/vans/loads/${id}/cancel`),
};

export const userApi = {
  list: () => client.get('/users'),
  listPage: (params) => client.get('/users/page', { params }),
  get: (id) => client.get(`/users/${id}`),
  create: (data) => client.post('/users', data),
  update: (id, data) => client.put(`/users/${id}`, data),
  resetPassword: (id, newPassword) => client.post(`/users/${id}/reset-password`, { newPassword }),
  remove: (id) => client.delete(`/users/${id}`),
};

export const roleApi = {
  list: () => client.get('/roles'),
  get: (id) => client.get(`/roles/${id}`),
  create: (data) => client.post('/roles', data),
  update: (id, data) => client.put(`/roles/${id}`, data),
  remove: (id) => client.delete(`/roles/${id}`),
};

export const permissionApi = {
  list: () => client.get('/permissions'),
};

/**
 * يجلب ملف PDF (فاتورة/إيصال) عبر axios (مع رأس التوثيق) ثم يفتحه في تبويب جديد للطباعة أو المعاينة.
 * Fetches an invoice/receipt PDF via axios (with auth header) then opens it in a new tab for preview/print.
 */
export async function fetchAndOpenPdf(path) {
  const response = await client.get(path, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  window.open(blobUrl, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/**
 * يجلب ملفاً عبر axios (مع رأس التوثيق) ثم يحفظه محلياً بنفس اسمه بدلاً من فتحه في المتصفح.
 * Fetches a file via axios (with auth header) then saves it locally under its own name instead of opening it.
 */
export async function fetchAndDownload(path, fileName) {
  const response = await client.get(path, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
