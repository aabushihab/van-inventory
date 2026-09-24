import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton,
  Chip, Alert, CircularProgress, Grid, Divider, TablePagination, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturnOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { useTranslation } from 'react-i18next';
import {
  purchaseInvoiceApi, warehouseApi, supplierApi, productApi, categoryApi, accountApi, fetchAndOpenPdf, fetchAndDownload,
} from '../api/endpoints';
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

export default function PurchaseInvoicesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [saving, setSaving] = useState(false);

  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [createAccountId, setCreateAccountId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [fieldErrors, setFieldErrors] = useState({});

  const [filterQ, setFilterQ] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState(todayIso());
  const [filterTo, setFilterTo] = useState(todayIso());

  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paymentsInvoice, setPaymentsInvoice] = useState(null);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentNote, setNewPaymentNote] = useState('');
  const [newPaymentAccountId, setNewPaymentAccountId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refundAccountId, setRefundAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnNotes, setReturnNotes] = useState('');

  async function load(overrides = {}) {
    setLoading(true);
    setError('');
    try {
      const { data } = await purchaseInvoiceApi.list({
        page: overrides.page ?? page, size,
        q: (overrides.q ?? filterQ) || undefined,
        supplierId: (overrides.supplierId ?? filterSupplierId) || undefined,
        status: (overrides.status ?? filterStatus) || undefined,
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

  function applyFilters() {
    setPage(0);
    load({ page: 0 });
  }

  function clearFilters() {
    const today = todayIso();
    setFilterQ(''); setFilterSupplierId(''); setFilterStatus(''); setFilterFrom(today); setFilterTo(today);
    setPage(0);
    load({ page: 0, q: '', supplierId: '', status: '', from: today, to: today });
  }

  useEffect(() => { load(); }, [page, size]);

  useEffect(() => {
    warehouseApi.list().then(({ data }) => { setWarehouses(data); if (data.length) setWarehouseId(data[0].id); });
    supplierApi.list().then(({ data }) => setSuppliers(data));
    productApi.search({ size: 500 }).then(({ data }) => setProducts(data.content));
    categoryApi.list().then(({ data }) => setCategories(data));
    accountApi.list().then(({ data }) => setAccounts(data));
  }, []);

  function openCreate(prefillSupplierId) {
    setItems([{ ...emptyItem, warehouseId }]);
    setSupplierId(prefillSupplierId || '');
    setSupplierName('');
    setPaidAmount('');
    setCreateAccountId('');
    setDueDate('');
    setNotes('');
    setError('');
    setFieldErrors({});
    setCreateOpen(true);
  }

  useEffect(() => {
    if (location.state?.prefillSupplierId) {
      openCreate(location.state.prefillSupplierId);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, ...patch };
      if (patch.productId) {
        const p = products.find((pp) => pp.id === patch.productId);
        if (p) { updated.unitPrice = p.purchasePrice; updated.taxRate = p.taxRate; }
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
    return { ...it, lineTotal: base + taxAmount };
  });
  const grandTotal = computedItems.reduce((s, it) => s + it.lineTotal, 0);

  async function submit() {
    const branchId = warehouses.find((w) => w.id === warehouseId)?.branchId;
    if (!warehouseId || !branchId) { setError('اختر المخزن'); return; }
    const validItems = items.filter((it) => it.productId && Number(it.quantity) > 0);
    if (validItems.length === 0) { setError('أضف صنفاً واحداً على الأقل'); return; }
    if (Number(paidAmount || 0) > grandTotal) { setError(t('invoice.paidExceedsTotal')); return; }
    if (Number(paidAmount || 0) > 0 && !createAccountId) { setError(t('invoice.accountRequired')); return; }

    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      let finalSupplierId = supplierId || null;
      // اسم مورد كُتب حراً بالحقل ولا يطابق مورداً موجوداً - يُنشأ الآن فقط، عند حفظ الفاتورة فعلياً.
      if (!finalSupplierId && supplierName.trim()) {
        const { data: newSupplier } = await supplierApi.create({ name: supplierName.trim() });
        finalSupplierId = newSupplier.id;
        setSupplierId(newSupplier.id);
        setSuppliers((prev) => [newSupplier, ...prev]);
      }
      const { data } = await purchaseInvoiceApi.create({
        supplierId: finalSupplierId,
        warehouseId,
        branchId,
        items: validItems.map((it) => ({
          productId: it.productId, warehouseId: it.warehouseId || warehouseId,
          quantity: Number(it.quantity), unitPrice: Number(it.unitPrice),
          discount: Number(it.discount || 0), taxRate: Number(it.taxRate || 0),
        })),
        paidAmount: paidAmount === '' ? 0 : Number(paidAmount),
        accountId: createAccountId || null,
        notes,
        dueDate: dueDate || null,
      });
      setCreateOpen(false);
      await load();
      setViewInvoice(data);
    } catch (e) {
      setFieldErrors(getFieldErrors(e));
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function cancelInvoice(row) {
    if (!window.confirm(t('invoice.confirmCancel'))) return;
    try {
      await purchaseInvoiceApi.cancel(row.id);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    }
  }

  function openReturn(row) {
    setReturnInvoice(row);
    setReturnItems(row.items
      .map((it) => ({
        invoiceItemId: it.id, productName: it.productName, sku: it.productSku,
        remaining: Number(it.quantity) - Number(it.returnedQuantity || 0),
        quantity: '',
      }))
      .filter((it) => it.remaining > 0));
    setReturnNotes('');
    setError('');
    setReturnOpen(true);
  }

  function updateReturnItem(idx, quantity) {
    setReturnItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity } : it)));
  }

  async function submitReturn() {
    const chosen = returnItems.filter((it) => Number(it.quantity) > 0);
    if (chosen.length === 0) { setError(t('invoice.selectReturnItem')); return; }
    setSaving(true);
    setError('');
    try {
      await purchaseInvoiceApi.return(returnInvoice.id, {
        items: chosen.map((it) => ({ invoiceItemId: it.invoiceItemId, quantity: Number(it.quantity) })),
        notes: returnNotes,
      });
      setReturnOpen(false);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function openPayments(row) {
    setPaymentsInvoice(row);
    setNewPaymentAmount('');
    setNewPaymentNote('');
    setNewPaymentAccountId('');
    setRefundAmount('');
    setRefundNote('');
    setRefundAccountId('');
    setError('');
    setPaymentsOpen(true);
    setPaymentsLoading(true);
    try {
      const { data } = await purchaseInvoiceApi.payments(row.id);
      setPaymentsHistory(data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function submitNewPayment() {
    const due = Number(paymentsInvoice.dueAmount);
    if (Number(newPaymentAmount || 0) <= 0 || Number(newPaymentAmount) > due) {
      setError(t('invoice.invalidPaymentAmount'));
      return;
    }
    if (!newPaymentAccountId) { setError(t('invoice.accountRequired')); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await purchaseInvoiceApi.addPayment(paymentsInvoice.id, {
        amount: Number(newPaymentAmount), note: newPaymentNote, accountId: newPaymentAccountId || null,
      });
      setPaymentsInvoice(data);
      const { data: history } = await purchaseInvoiceApi.payments(paymentsInvoice.id);
      setPaymentsHistory(history);
      setNewPaymentAmount(''); setNewPaymentNote(''); setNewPaymentAccountId('');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function submitRefund() {
    const owed = Number(paymentsInvoice.creditOwed || 0);
    if (Number(refundAmount || 0) <= 0 || Number(refundAmount) > owed) {
      setError(t('invoice.invalidPaymentAmount'));
      return;
    }
    if (!refundAccountId) { setError(t('invoice.accountRequired')); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await purchaseInvoiceApi.refund(paymentsInvoice.id, {
        amount: Number(refundAmount), note: refundNote, accountId: refundAccountId || null,
      });
      setPaymentsInvoice(data);
      const { data: history } = await purchaseInvoiceApi.payments(paymentsInvoice.id);
      setPaymentsHistory(history);
      setRefundAmount(''); setRefundNote(''); setRefundAccountId('');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{t('nav.purchaseInvoices')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => fetchAndDownload(purchaseInvoiceApi.exportUrl({
              supplierId: filterSupplierId, status: filterStatus, from: filterFrom, to: filterTo, q: filterQ,
            }), 'فواتير-الشراء.xlsx')}>
            {t('common.exportExcel')}
          </Button>
          {hasPermission('PURCHASE_INVOICE_CREATE') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate()}>{t('invoice.create')}</Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" label={t('common.search')} value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          sx={{ minWidth: 200 }} />
        <Box sx={{ minWidth: 220 }}>
          <PartyAutocomplete
            api={supplierApi}
            label={t('invoice.supplier')}
            size="small"
            allowQuickAdd={false}
            valueId={filterSupplierId}
            valueLabel={suppliers.find((s) => String(s.id) === String(filterSupplierId))?.name}
            onSelect={(p) => setFilterSupplierId(p?.id || '')}
          />
        </Box>
        <TextField select size="small" label={t('common.status')} value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">{t('invoice.allStatuses')}</MenuItem>
          <MenuItem value="CONFIRMED">{t('invoice.confirmed')}</MenuItem>
          <MenuItem value="RETURNED">{t('invoice.returned')}</MenuItem>
          <MenuItem value="CANCELLED">{t('invoice.cancelled')}</MenuItem>
        </TextField>
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
                <TableCell>{t('invoice.number')}</TableCell>
                <TableCell>{t('invoice.date')}</TableCell>
                <TableCell>{t('invoice.supplier')}</TableCell>
                <TableCell>{t('invoice.grandTotal')}</TableCell>
                <TableCell>{t('invoice.due')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((inv) => {
                const due = Number(inv.dueAmount);
                const creditOwed = Number(inv.creditOwed || 0);
                return (
                <TableRow key={inv.id} hover>
                  <TableCell>{inv.invoiceNumber}</TableCell>
                  <TableCell>{new Date(inv.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{inv.supplierName || '-'}</TableCell>
                  <TableCell>{Number(inv.grandTotal).toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell sx={{ color: due > 0.001 ? 'error.main' : 'success.main', fontWeight: due > 0.001 ? 700 : 400 }}>
                    {due.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    {creditOwed > 0.001 && (
                      <Chip size="small" color="warning" sx={{ marginInlineStart: '8px' }}
                        label={`${t('invoice.supplierCreditOwed')}: ${creditOwed.toLocaleString(undefined, { maximumFractionDigits: 3 })}`} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={
                      inv.status === 'CONFIRMED' ? (due > 0.001 ? t('invoice.confirmed') : t('invoice.fullyPaid'))
                        : inv.status === 'RETURNED' ? t('invoice.returned') : t('invoice.cancelled')
                    } color={inv.status === 'CONFIRMED' ? (due > 0.001 ? 'success' : 'default') : inv.status === 'RETURNED' ? 'info' : 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common.actions')}>
                      <IconButton size="small" onClick={() => setViewInvoice(inv)}><VisibilityIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={t('invoice.printA4')}>
                      <IconButton size="small" onClick={() => fetchAndOpenPdf(purchaseInvoiceApi.printA4Url(inv.id))}><PrintIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={t('invoice.printThermal')}>
                      <IconButton size="small" onClick={() => fetchAndOpenPdf(purchaseInvoiceApi.printThermalUrl(inv.id))}><ReceiptIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {hasPermission('PURCHASE_INVOICE_CREATE') && inv.status === 'CONFIRMED' && (
                      <Tooltip title={t('invoice.return')}>
                        <IconButton size="small" color="warning" onClick={() => openReturn(inv)}><AssignmentReturnIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {hasPermission('PURCHASE_INVOICE_CREATE') && inv.status === 'CONFIRMED' && (
                      <Tooltip title={t('invoice.cancelInvoice')}>
                        <IconButton size="small" color="error" onClick={() => cancelInvoice(inv)}><CancelIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {hasPermission('PURCHASE_INVOICE_CREATE') && (inv.status === 'CONFIRMED' || Number(inv.creditOwed || 0) > 0.001) && (
                      <Tooltip title={t('invoice.payments')}>
                        <IconButton size="small" color="primary" onClick={() => openPayments(inv)}><PaymentsIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <TablePagination component="div" count={totalElements} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size} onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }} />
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{t('invoice.create')}</DialogTitle>
        <DialogContent>
          <ErrorAlert message={error} fieldErrors={fieldErrors} sx={{ mb: 2 }} />
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth required label={t('common.warehouse')} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <PartyAutocomplete
                api={supplierApi}
                label={t('invoice.supplier')}
                freeSolo
                valueId={supplierId}
                valueLabel={supplierId ? suppliers.find((s) => String(s.id) === String(supplierId))?.name : supplierName}
                onSelect={(p) => { setSupplierId(p?.id || ''); setSupplierName(p?.id ? '' : (p?.name || '')); }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('invoice.items')}</Typography>

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
                    <TextField size="small" type="number" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} />
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
              <TextField fullWidth label={t('common.notes')} multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mb: 2 }} />
              <TextField fullWidth type="date" label={t('invoice.dueDate')} value={dueDate}
                onChange={(e) => setDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="number" label={t('invoice.paid')} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                error={Number(paidAmount || 0) > grandTotal} helperText={Number(paidAmount || 0) > grandTotal ? t('invoice.paidExceedsTotal') : ''}
                inputProps={{ max: grandTotal, min: 0, step: 'any' }} sx={{ mb: 2 }} />
              {Number(paidAmount || 0) > 0 && (
                <TextField select fullWidth required label={t('accounts.account')} value={createAccountId}
                  error={!createAccountId} helperText={!createAccountId ? t('invoice.accountRequired') : ''}
                  onChange={(e) => setCreateAccountId(e.target.value)} sx={{ mb: 2 }}>
                  <MenuItem value="">-</MenuItem>
                  {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                </TextField>
              )}
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

      <Dialog open={!!viewInvoice} onClose={() => setViewInvoice(null)} maxWidth="sm" fullWidth>
        {viewInvoice && (
          <>
            <DialogTitle>{viewInvoice.invoiceNumber}</DialogTitle>
            <DialogContent>
              <Typography variant="body2">{t('invoice.supplier')}: {viewInvoice.supplierName || '-'}</Typography>
              <Typography variant="body2">{t('common.warehouse')}: {viewInvoice.warehouseName}</Typography>
              <Typography variant="body2">{t('invoice.grandTotal')}: {Number(viewInvoice.grandTotal).toLocaleString(undefined, { maximumFractionDigits: 3 })}</Typography>
              <Typography variant="body2">{t('invoice.paid')}: {Number(viewInvoice.paidAmount).toLocaleString(undefined, { maximumFractionDigits: 3 })}</Typography>
            </DialogContent>
            <DialogActions>
              <Button startIcon={<PrintIcon />} onClick={() => fetchAndOpenPdf(purchaseInvoiceApi.printA4Url(viewInvoice.id))}>{t('invoice.printA4')}</Button>
              <Button startIcon={<ReceiptIcon />} onClick={() => fetchAndOpenPdf(purchaseInvoiceApi.printThermalUrl(viewInvoice.id))}>{t('invoice.printThermal')}</Button>
              <Button onClick={() => setViewInvoice(null)}>{t('common.close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* نافذة الدفعات (تقسيط) */}
      <Dialog open={paymentsOpen} onClose={() => setPaymentsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('invoice.payments')} — {paymentsInvoice?.invoiceNumber}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {paymentsInvoice && (
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="body2">{t('invoice.grandTotal')}: <b>{Number(paymentsInvoice.grandTotal).toLocaleString(undefined, { maximumFractionDigits: 3 })}</b></Typography>
              <Typography variant="body2">{t('invoice.paid')}: <b>{Number(paymentsInvoice.paidAmount).toLocaleString(undefined, { maximumFractionDigits: 3 })}</b></Typography>
              <Typography variant="body2" color={Number(paymentsInvoice.dueAmount) > 0.001 ? 'error.main' : 'success.main'}>
                {t('invoice.due')}: <b>{Number(paymentsInvoice.dueAmount).toLocaleString(undefined, { maximumFractionDigits: 3 })}</b>
              </Typography>
            </Box>
          )}

          <Typography variant="subtitle2" fontWeight={700}>{t('invoice.paymentHistory')}</Typography>
          {paymentsLoading ? (
            <Box sx={{ textAlign: 'center', p: 2 }}><CircularProgress size={22} /></Box>
          ) : paymentsHistory.length === 0 ? (
            <Typography color="text.secondary" variant="body2">{t('common.noData')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.createdAt')}</TableCell>
                  <TableCell>{t('invoice.amount')}</TableCell>
                  <TableCell>{t('common.notes')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentsHistory.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{Number(p.amount).toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                    <TableCell>{p.note || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {paymentsInvoice && Number(paymentsInvoice.dueAmount) > 0.001 && (
            <>
              <Divider />
              <Typography variant="subtitle2" fontWeight={700}>{t('invoice.addPayment')}</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField size="small" type="number" label={t('invoice.amount')} value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  inputProps={{ min: 0, max: Number(paymentsInvoice.dueAmount), step: 'any' }}
                  sx={{ minWidth: 140 }} />
                <TextField size="small" label={t('common.notes')} value={newPaymentNote}
                  onChange={(e) => setNewPaymentNote(e.target.value)} sx={{ minWidth: 160 }} />
                <TextField select size="small" required label={t('accounts.account')} value={newPaymentAccountId}
                  error={!newPaymentAccountId} onChange={(e) => setNewPaymentAccountId(e.target.value)} sx={{ minWidth: 140 }}>
                  <MenuItem value="">-</MenuItem>
                  {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                </TextField>
              </Box>
            </>
          )}

          {paymentsInvoice && Number(paymentsInvoice.creditOwed || 0) > 0.001 && (
            <>
              <Divider />
              <Typography variant="subtitle2" fontWeight={700} color="warning.main">{t('invoice.markRefunded')}</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField size="small" type="number" label={t('invoice.refundAmount')} value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  inputProps={{ min: 0, max: Number(paymentsInvoice.creditOwed), step: 'any' }}
                  sx={{ minWidth: 140 }} />
                <TextField size="small" label={t('common.notes')} value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)} sx={{ minWidth: 160 }} />
                <TextField select size="small" required label={t('accounts.account')} value={refundAccountId}
                  error={!refundAccountId} onChange={(e) => setRefundAccountId(e.target.value)} sx={{ minWidth: 140 }}>
                  <MenuItem value="">-</MenuItem>
                  {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                </TextField>
                <Button variant="contained" color="warning" onClick={submitRefund} disabled={saving}>
                  {saving ? <CircularProgress size={20} /> : t('invoice.markRefunded')}
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentsOpen(false)}>{t('common.close')}</Button>
          {paymentsInvoice && Number(paymentsInvoice.dueAmount) > 0.001 && (
            <Button variant="contained" onClick={submitNewPayment} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : t('invoice.addPayment')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* نافذة إرجاع من فاتورة شراء للمورد */}
      <Dialog open={returnOpen} onClose={() => setReturnOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('invoice.return')} — {returnInvoice?.invoiceNumber}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {returnItems.length === 0 ? (
            <Typography color="text.secondary">{t('common.noData')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('products.title')}</TableCell>
                  <TableCell width={110}>{t('invoice.remainingQty')}</TableCell>
                  <TableCell width={110}>{t('invoice.returnQty')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returnItems.map((it, idx) => (
                  <TableRow key={it.invoiceItemId}>
                    <TableCell>{it.productName} ({it.sku})</TableCell>
                    <TableCell>{it.remaining.toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={it.quantity}
                        inputProps={{ min: 0, max: it.remaining, step: 'any' }}
                        onChange={(e) => updateReturnItem(idx, e.target.value)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <TextField label={t('common.notes')} value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="warning" onClick={submitReturn} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('invoice.return')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
