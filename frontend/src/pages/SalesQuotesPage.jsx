import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton,
  Chip, Alert, CircularProgress, Grid, Divider, TablePagination, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import { useTranslation } from 'react-i18next';
import { salesQuoteApi, warehouseApi, customerApi, productApi, categoryApi, accountApi, fetchAndOpenPdf } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import PartyAutocomplete from '../components/PartyAutocomplete';
import CategoryProductPicker from '../components/CategoryProductPicker';
import ErrorAlert from '../components/ErrorAlert';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';

const emptyItem = { productId: '', categoryId: '', warehouseId: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 16 };

/** يبني تاريخ ISO محلي (سنة-شهر-يوم) بدون تحويل للتوقيت العالمي، لتفادي انزياح يوم كامل قرب منتصف الليل بمنطقة زمنية شرقية. */
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SalesQuotesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewQuote, setViewQuote] = useState(null);
  const [saving, setSaving] = useState(false);

  const [warehouseId, setWarehouseId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [fieldErrors, setFieldErrors] = useState({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmQuote, setConfirmQuote] = useState(null);
  const [confirmPaidAmount, setConfirmPaidAmount] = useState('');
  const [confirmPaymentMethod, setConfirmPaymentMethod] = useState('CASH');
  const [confirmAccountId, setConfirmAccountId] = useState('');

  const [filterQ, setFilterQ] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterFrom, setFilterFrom] = useState(todayIso());
  const [filterTo, setFilterTo] = useState(todayIso());

  async function load(overrides = {}) {
    setLoading(true);
    setError('');
    try {
      const { data } = await salesQuoteApi.list({
        page: overrides.page ?? page, size,
        q: (overrides.q ?? filterQ) || undefined,
        customerId: (overrides.customerId ?? filterCustomerId) || undefined,
        from: (overrides.from ?? filterFrom) || undefined,
        to: (overrides.to ?? filterTo) || undefined,
      });
      setRows(data.content);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() { setPage(0); load({ page: 0 }); }
  function clearFilters() {
    const today = todayIso();
    setFilterQ(''); setFilterCustomerId(''); setFilterFrom(today); setFilterTo(today);
    setPage(0);
    load({ page: 0, q: '', customerId: '', from: today, to: today });
  }

  useEffect(() => { load(); }, [page, size]);

  useEffect(() => {
    warehouseApi.list().then(({ data }) => { setWarehouses(data); if (data.length) setWarehouseId(data[0].id); });
    customerApi.list().then(({ data }) => setCustomers(data));
    productApi.search({ size: 500 }).then(({ data }) => setProducts(data.content));
    categoryApi.list().then(({ data }) => setCategories(data));
    accountApi.list().then(({ data }) => setAccounts(data));
  }, []);

  function openCreate() {
    setItems([{ ...emptyItem, warehouseId }]);
    setCustomerId('');
    setCustomerName('');
    setNotes('');
    setError('');
    setFieldErrors({});
    setCreateOpen(true);
  }

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, ...patch };
      if (patch.productId) {
        const p = products.find((pp) => pp.id === patch.productId);
        if (p) { updated.unitPrice = p.salePrice; updated.taxRate = p.taxRate; }
      }
      return updated;
    }));
  }

  function addItemRow() { setItems((prev) => [...prev, { ...emptyItem, warehouseId }]); }
  function removeItemRow(idx) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  const computedItems = items.map((it) => {
    const qty = Number(it.quantity || 0);
    const price = Number(it.unitPrice || 0);
    const discount = Number(it.discount || 0);
    const tax = Number(it.taxRate || 0);
    const base = qty * price - discount;
    const taxAmount = base * (tax / 100);
    const product = products.find((p) => p.id === it.productId);
    const belowCost = product && it.unitPrice !== '' && Number(it.unitPrice) < Number(product.purchasePrice);
    return { ...it, lineTotal: base + taxAmount, purchasePrice: product?.purchasePrice, belowCost };
  });
  const grandTotal = computedItems.reduce((s, it) => s + it.lineTotal, 0);
  const hasBelowCostItem = computedItems.some((it) => it.belowCost);

  async function submit() {
    const branchId = warehouses.find((w) => w.id === warehouseId)?.branchId;
    if (!warehouseId || !branchId) { setError('اختر المخزن'); return; }
    const validItems = items.filter((it) => it.productId && Number(it.quantity) > 0);
    if (validItems.length === 0) { setError('أضف صنفاً واحداً على الأقل'); return; }

    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      let finalCustomerId = customerId || null;
      if (!finalCustomerId && customerName.trim()) {
        const { data: newCustomer } = await customerApi.create({ name: customerName.trim() });
        finalCustomerId = newCustomer.id;
        setCustomerId(newCustomer.id);
        setCustomers((prev) => [newCustomer, ...prev]);
      }
      const { data } = await salesQuoteApi.create({
        customerId: finalCustomerId,
        warehouseId,
        branchId,
        items: validItems.map((it) => ({
          productId: it.productId, warehouseId: it.warehouseId || warehouseId,
          quantity: Number(it.quantity), unitPrice: Number(it.unitPrice),
          discount: Number(it.discount || 0), taxRate: Number(it.taxRate || 0),
        })),
        notes,
      });
      setCreateOpen(false);
      await load();
      setViewQuote(data);
    } catch (e) {
      setFieldErrors(getFieldErrors(e));
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  function openConfirm(row) {
    setConfirmQuote(row);
    setConfirmPaidAmount('');
    setConfirmPaymentMethod('CASH');
    setConfirmAccountId('');
    setError('');
    setConfirmOpen(true);
  }

  async function submitConfirm() {
    if (Number(confirmPaidAmount || 0) > Number(confirmQuote.grandTotal)) {
      setError(t('invoice.paidExceedsTotal'));
      return;
    }
    if (Number(confirmPaidAmount || 0) > 0 && !confirmAccountId) {
      setError(t('invoice.accountRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await salesQuoteApi.confirm(confirmQuote.id, {
        paidAmount: confirmPaidAmount === '' ? 0 : Number(confirmPaidAmount),
        paymentMethod: confirmPaymentMethod,
        accountId: confirmAccountId || null,
      });
      setConfirmOpen(false);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function cancelQuote(row) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await salesQuoteApi.cancel(row.id);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    }
  }

  function statusChip(status) {
    if (status === 'CONFIRMED') return <Chip size="small" label={t('quote.confirmed')} color="success" />;
    if (status === 'CANCELLED') return <Chip size="small" label={t('quote.cancelled')} color="default" />;
    return <Chip size="small" label={t('quote.pending')} color="warning" />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{t('nav.salesQuotes')}</Typography>
        {hasPermission('SALES_INVOICE_CREATE') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('quote.create')}</Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" label={t('common.search')} value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          sx={{ minWidth: 200 }} />
        <Box sx={{ minWidth: 220 }}>
          <PartyAutocomplete
            api={customerApi}
            label={t('invoice.customer')}
            size="small"
            allowQuickAdd={false}
            valueId={filterCustomerId}
            valueLabel={customers.find((c) => String(c.id) === String(filterCustomerId))?.name}
            onSelect={(p) => setFilterCustomerId(p?.id || '')}
          />
        </Box>
        <TextField size="small" type="date" label={t('reports.from')} value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label={t('reports.to')} value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button variant="outlined" size="small" onClick={applyFilters}>{t('common.search')}</Button>
        <Button size="small" onClick={clearFilters}>{t('common.clear')}</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('quote.number')}</TableCell>
                <TableCell>{t('invoice.date')}</TableCell>
                <TableCell>{t('invoice.customer')}</TableCell>
                <TableCell>{t('invoice.grandTotal')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('quote.convertedInvoice')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((qt) => (
                <TableRow key={qt.id} hover>
                  <TableCell>{qt.quoteNumber}</TableCell>
                  <TableCell>{new Date(qt.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{qt.customerName || '-'}</TableCell>
                  <TableCell>{Number(qt.grandTotal).toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell>{statusChip(qt.status)}</TableCell>
                  <TableCell>{qt.convertedInvoiceNumber || '-'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common.actions')}>
                      <IconButton size="small" onClick={() => setViewQuote(qt)}><VisibilityIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {hasPermission('SALES_INVOICE_PRINT') && (
                      <Tooltip title={t('invoice.printA4')}>
                        <IconButton size="small" onClick={() => fetchAndOpenPdf(salesQuoteApi.printA4Url(qt.id))}><PrintIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {hasPermission('SALES_INVOICE_CREATE') && qt.status === 'PENDING' && (
                      <>
                        <Tooltip title={t('quote.confirm')}>
                          <IconButton size="small" color="success" onClick={() => openConfirm(qt)}><CheckCircleIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.cancel')}>
                          <IconButton size="small" color="error" onClick={() => cancelQuote(qt)}><CancelIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <TablePagination component="div" count={totalElements} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size} onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }} />
      </Paper>

      {/* نافذة إنشاء عرض سعر بيع */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{t('quote.create')}</DialogTitle>
        <DialogContent>
          <ErrorAlert message={error} fieldErrors={fieldErrors} sx={{ mb: 2 }} />
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth required label={t('common.warehouse')} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <PartyAutocomplete
                api={customerApi}
                label={t('invoice.customer')}
                freeSolo
                valueId={customerId}
                valueLabel={customerId ? customers.find((c) => String(c.id) === String(customerId))?.name : customerName}
                onSelect={(p) => { setCustomerId(p?.id || ''); setCustomerName(p?.id ? '' : (p?.name || '')); }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('invoice.items')}</Typography>
          {hasBelowCostItem && <Alert severity="warning" sx={{ mb: 1 }}>{t('products.priceBelowCostWarning')}</Alert>}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('products.title')}</TableCell>
                <TableCell width={140}>{t('common.warehouse')}</TableCell>
                <TableCell width={90}>{t('common.quantity')}</TableCell>
                <TableCell width={110}>{t('common.price')}</TableCell>
                <TableCell width={100}>{t('common.discount')}</TableCell>
                <TableCell width={90}>{t('common.tax')}%</TableCell>
                <TableCell width={110}>{t('common.total')}</TableCell>
                <TableCell width={40}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {computedItems.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <CategoryProductPicker
                      categories={categories} products={products}
                      categoryId={it.categoryId} productId={it.productId}
                      onCategoryChange={(catId) => updateItem(idx, { categoryId: catId })}
                      onProductChange={(prodId) => updateItem(idx, { productId: prodId })}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField select size="small" fullWidth value={it.warehouseId || warehouseId}
                      onChange={(e) => updateItem(idx, { warehouseId: e.target.value })}>
                      {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                      error={it.belowCost} sx={{ minWidth: 90 }} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={it.discount} onChange={(e) => updateItem(idx, { discount: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={it.taxRate} onChange={(e) => updateItem(idx, { taxRate: e.target.value })} />
                  </TableCell>
                  <TableCell>{it.lineTotal.toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => removeItemRow(idx)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button size="small" startIcon={<AddIcon />} onClick={addItemRow} sx={{ mt: 1 }}>{t('invoice.addItem')}</Button>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('common.notes')} multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="h6" align="end">{t('invoice.grandTotal')}: {grandTotal.toLocaleString(undefined, { maximumFractionDigits: 3 })}</Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة عرض تفاصيل عرض السعر */}
      <Dialog open={!!viewQuote} onClose={() => setViewQuote(null)} maxWidth="sm" fullWidth>
        {viewQuote && (
          <>
            <DialogTitle>{viewQuote.quoteNumber}</DialogTitle>
            <DialogContent>
              <Typography variant="body2">{t('invoice.customer')}: {viewQuote.customerName || '-'}</Typography>
              <Typography variant="body2">{t('common.warehouse')}: {viewQuote.warehouseName}</Typography>
              <Typography variant="body2">{t('invoice.grandTotal')}: {Number(viewQuote.grandTotal).toLocaleString(undefined, { maximumFractionDigits: 3 })}</Typography>
              <Typography variant="body2">{t('common.status')}: {viewQuote.status}</Typography>
              {viewQuote.convertedInvoiceNumber && (
                <Typography variant="body2">{t('quote.convertedInvoice')}: {viewQuote.convertedInvoiceNumber}</Typography>
              )}
            </DialogContent>
            <DialogActions>
              {hasPermission('SALES_INVOICE_PRINT') && (
                <Button startIcon={<PrintIcon />} onClick={() => fetchAndOpenPdf(salesQuoteApi.printA4Url(viewQuote.id))}>{t('invoice.printA4')}</Button>
              )}
              <Button onClick={() => setViewQuote(null)}>{t('common.close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* نافذة تأكيد عرض السعر وتحويله لفاتورة */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('quote.confirm')} — {confirmQuote?.quoteNumber}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info">{t('quote.confirmHint')}</Alert>
          <TextField select label={t('invoice.paymentMethod')} value={confirmPaymentMethod}
            onChange={(e) => setConfirmPaymentMethod(e.target.value)}>
            <MenuItem value="CASH">{t('invoice.cash')}</MenuItem>
            <MenuItem value="CARD">{t('invoice.card')}</MenuItem>
            <MenuItem value="TRANSFER">{t('invoice.transfer')}</MenuItem>
            <MenuItem value="CREDIT">{t('invoice.credit')}</MenuItem>
          </TextField>
          <TextField type="number" label={t('invoice.paid')} value={confirmPaidAmount}
            onChange={(e) => setConfirmPaidAmount(e.target.value)}
            error={confirmQuote && Number(confirmPaidAmount || 0) > Number(confirmQuote.grandTotal)}
            helperText={confirmQuote && Number(confirmPaidAmount || 0) > Number(confirmQuote.grandTotal) ? t('invoice.paidExceedsTotal') : ''}
            inputProps={{ max: confirmQuote?.grandTotal, min: 0, step: 'any' }} />
          {Number(confirmPaidAmount || 0) > 0 && (
            <TextField select required label={t('accounts.account')} value={confirmAccountId}
              error={!confirmAccountId} helperText={!confirmAccountId ? t('invoice.accountRequired') : ''}
              onChange={(e) => setConfirmAccountId(e.target.value)}>
              <MenuItem value="">-</MenuItem>
              {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
            </TextField>
          )}
          {confirmQuote && (
            <Typography variant="body2" fontWeight={700}>{t('invoice.grandTotal')}: {Number(confirmQuote.grandTotal).toLocaleString(undefined, { maximumFractionDigits: 3 })}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="success" onClick={submitConfirm} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('quote.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
