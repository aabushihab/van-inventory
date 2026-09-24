import { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Alert, CircularProgress, Grid, TextField, InputAdornment, Tabs, Tab, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, MenuItem, Autocomplete,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { vanApi, salesInvoiceApi, loadRequestApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const REQUEST_COLORS = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };

/**
 * شاشة المندوب: حمولة سيارته، مبيعاته اليوم، صندوق سيارته، ديون عملائه (تحصيل)، وطلبات التحميل.
 */
export default function MyVanPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  const [todaySales, setTodaySales] = useState(null);
  const [receivables, setReceivables] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // تحصيل دفعة
  const [collectInvoice, setCollectInvoice] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNote, setCollectNote] = useState('');
  const [saving, setSaving] = useState(false);

  // طلب تحميل
  const [requestOpen, setRequestOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [reqLines, setReqLines] = useState([]);
  const [reqDate, setReqDate] = useState('');
  const [reqNotes, setReqNotes] = useState('');

  function load() {
    setLoading(true);
    vanApi.my().then(({ data: d }) => setData(d)).finally(() => setLoading(false));
    vanApi.myReceivables().then(({ data: r }) => setReceivables(r)).catch(() => setReceivables([]));
    loadRequestApi.mine().then(({ data: r }) => setRequests(r)).catch(() => setRequests([]));
    if (hasPermission('SALES_INVOICE_VIEW')) {
      const today = isoDate(new Date());
      salesInvoiceApi.list({ from: today, to: today, size: 500 }).then(({ data: page }) => {
        const invoices = page.content.filter((inv) => inv.status !== 'CANCELLED');
        setTodaySales({
          count: invoices.length,
          total: invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0),
          paid: invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0),
        });
      }).catch(() => setTodaySales(null));
    }
  }

  useEffect(() => { load(); }, []);

  const totalDue = useMemo(() => receivables.reduce((s, r) => s + Number(r.dueAmount || 0), 0), [receivables]);

  async function submitCollect() {
    setSaving(true); setError('');
    try {
      await salesInvoiceApi.addPayment(collectInvoice.id, { amount: Number(collectAmount), paymentMethod: 'CASH', note: collectNote });
      setSuccess(t('myVan.collected', { amount: fmt(collectAmount), invoice: collectInvoice.invoiceNumber }));
      setCollectInvoice(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  function openRequest() {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setReqDate(isoDate(tomorrow));
    setReqNotes('');
    setReqLines([{ product: null, packType: 'UNIT', quantity: '' }]);
    setError('');
    loadRequestApi.products().then(({ data: p }) => setProducts(p));
    setRequestOpen(true);
  }

  const reqBaseQty = (l) => Number(l.quantity || 0) * (l.packType === 'CARTON' ? Number(l.product?.unitsPerCarton || 1) : 1);

  async function submitRequest() {
    const valid = reqLines.filter((l) => l.product && Number(l.quantity) > 0);
    if (!valid.length) { setError(t('vanLoads.noItems')); return; }
    setSaving(true); setError('');
    try {
      await loadRequestApi.create({
        forDate: reqDate, notes: reqNotes,
        items: valid.map((l) => ({ productId: l.product.id, quantity: reqBaseQty(l) })),
      });
      setRequestOpen(false);
      setSuccess(t('myVan.requestSent'));
      setTab(2);
      load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>;
  if (!data?.van) return <Alert severity="info">{t('myVan.noVan')}</Alert>;

  const van = data.van;
  const stock = data.stock.filter((s) => !q
    || s.productName.toLowerCase().includes(q.toLowerCase()) || (s.productSku || '').toLowerCase().includes(q.toLowerCase()));
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight={800}>{t('myVan.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={load}>{t('myVan.refresh')}</Button>
          <Button variant="outlined" onClick={openRequest}>{t('myVan.requestLoad')}</Button>
          {hasPermission('SALES_INVOICE_CREATE') && (
            <Button variant="contained" onClick={() => navigate('/sales-invoices', { state: { openCreate: true } })}>
              {t('myVan.sell')}
            </Button>
          )}
        </Box>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && !collectInvoice && !requestOpen && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={800}>{van.code} - {van.name}</Typography>
            <Typography variant="body2" color="text.secondary">{t('vans.plateNumber')}: <span dir="ltr">{van.plateNumber}</span></Typography>
            <Typography variant="body2" color="text.secondary">{t('vans.driverName')}: {van.driverName || '-'}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="body2" color="text.secondary">{t('vans.stockQuantity')}</Typography>
            <Typography variant="h5" fontWeight={800}>{fmt(van.stockQuantity)}</Typography>
            <Typography variant="caption" color="text.secondary">{fmt(van.stockValue)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="body2" color="text.secondary">{t('myVan.cashBox')}</Typography>
            <Typography variant="h5" fontWeight={800} color="primary.main">{fmt(van.cashBalance)}</Typography>
            <Typography variant="caption" color="text.secondary">{t('myVan.cashBoxHint')}</Typography>
          </Paper>
        </Grid>
        {todaySales && (
          <Grid size={{ xs: 6, md: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="body2" color="text.secondary">{t('myVan.todaySales')}</Typography>
              <Typography variant="h5" fontWeight={800} color="success.main">{fmt(todaySales.total)}</Typography>
              <Typography variant="caption" color="text.secondary">{t('vans.todayInvoices', { count: todaySales.count })}</Typography>
            </Paper>
          </Grid>
        )}
        <Grid size={{ xs: 6, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%', cursor: 'pointer' }} onClick={() => setTab(1)}>
            <Typography variant="body2" color="text.secondary">{t('myVan.customerDebts')}</Typography>
            <Typography variant="h5" fontWeight={800} color={totalDue > 0 ? 'warning.main' : 'text.primary'}>{fmt(totalDue)}</Typography>
            <Typography variant="caption" color="text.secondary">{t('myVan.debtInvoices', { count: receivables.length })}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label={t('vans.vanStockTitle')} />
        <Tab label={`${t('myVan.customerDebts')} (${receivables.length})`} />
        <Tab label={`${t('myVan.myRequests')}${pendingRequests ? ` (${pendingRequests})` : ''}`} />
      </Tabs>

      {tab === 0 && (
        <>
          <TextField size="small" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} sx={{ mb: 1, minWidth: 260 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
          <Paper variant="outlined">
            {stock.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('myVan.empty')}</Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.sku')}</TableCell>
                    <TableCell>{t('common.name')}</TableCell>
                    <TableCell>{t('common.quantity')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stock.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.productSku}</TableCell>
                      <TableCell>{s.productName}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{fmt(s.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}

      {tab === 1 && (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          {receivables.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('myVan.noDebts')}</Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('invoice.number')}</TableCell>
                  <TableCell>{t('invoice.date')}</TableCell>
                  <TableCell>{t('invoice.customer')}</TableCell>
                  <TableCell>{t('invoice.grandTotal')}</TableCell>
                  <TableCell>{t('invoice.paid')}</TableCell>
                  <TableCell>{t('invoice.due')}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {receivables.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell>{inv.invoiceNumber}</TableCell>
                    <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{inv.customerName || '-'}</TableCell>
                    <TableCell>{fmt(inv.grandTotal)}</TableCell>
                    <TableCell>{fmt(inv.paidAmount)}</TableCell>
                    <TableCell sx={{ color: 'warning.main', fontWeight: 800 }}>{fmt(inv.dueAmount)}</TableCell>
                    <TableCell>
                      <Button size="small" variant="contained" disableElevation
                        onClick={() => { setCollectInvoice(inv); setCollectAmount(String(Number(inv.dueAmount))); setCollectNote(''); setError(''); }}>
                        {t('myVan.collect')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      {tab === 2 && (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          {requests.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('myVan.noRequests')}</Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.createdAt')}</TableCell>
                  <TableCell>{t('loadRequests.forDate')}</TableCell>
                  <TableCell>{t('vanLoads.items')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('loadRequests.response')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{r.forDate}</TableCell>
                    <TableCell>{r.items.map((it) => `${it.productName} × ${fmt(it.quantity)}`).join('، ')}</TableCell>
                    <TableCell><Chip size="small" color={REQUEST_COLORS[r.status]} label={t(`loadRequests.status.${r.status}`)} /></TableCell>
                    <TableCell>{r.vanLoadNumber || r.responseNote || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      {/* تحصيل دفعة على فاتورة */}
      <Dialog open={!!collectInvoice} onClose={() => setCollectInvoice(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('myVan.collect')} — {collectInvoice?.customerName || collectInvoice?.invoiceNumber}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2">{t('invoice.number')}: {collectInvoice?.invoiceNumber} · {t('invoice.due')}: <b>{fmt(collectInvoice?.dueAmount)}</b></Typography>
          <TextField type="number" label={t('myVan.amount')} value={collectAmount} autoFocus
            onChange={(e) => setCollectAmount(e.target.value)}
            error={Number(collectAmount) > Number(collectInvoice?.dueAmount || 0)}
            slotProps={{ htmlInput: { min: 0, max: collectInvoice?.dueAmount, step: 'any' } }}
            helperText={t('myVan.collectHint')} />
          <TextField label={t('common.notes')} value={collectNote} onChange={(e) => setCollectNote(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollectInvoice(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submitCollect}
            disabled={saving || !(Number(collectAmount) > 0) || Number(collectAmount) > Number(collectInvoice?.dueAmount || 0)}>
            {saving ? <CircularProgress size={20} /> : t('myVan.collect')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* طلب تحميل */}
      <Dialog open={requestOpen} onClose={() => setRequestOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t('myVan.requestLoad')}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 1, flexWrap: 'wrap' }}>
            <TextField type="date" label={t('loadRequests.forDate')} value={reqDate} onChange={(e) => setReqDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label={t('common.notes')} value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('vanLoads.product')}</TableCell>
                <TableCell width={130}>{t('invoice.pack')}</TableCell>
                <TableCell width={140}>{t('common.quantity')}</TableCell>
                <TableCell width={50} />
              </TableRow>
            </TableHead>
            <TableBody>
              {reqLines.map((l, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ minWidth: 240 }}>
                    <Autocomplete size="small" options={products} value={l.product}
                      getOptionLabel={(p) => `${p.name} (${p.sku})`} isOptionEqualToValue={(a, b) => a.id === b.id}
                      onChange={(_, p) => setReqLines((prev) => prev.map((x, i) => (i === idx ? { ...x, product: p, packType: 'UNIT' } : x)))}
                      renderInput={(params) => <TextField {...params} placeholder={t('common.search')} />} />
                  </TableCell>
                  <TableCell>
                    <TextField select size="small" fullWidth value={l.packType} disabled={!(Number(l.product?.unitsPerCarton) > 0)}
                      onChange={(e) => setReqLines((prev) => prev.map((x, i) => (i === idx ? { ...x, packType: e.target.value } : x)))}>
                      <MenuItem value="UNIT">{t('invoice.packUnit')}</MenuItem>
                      <MenuItem value="CARTON">{t('invoice.packCarton')}</MenuItem>
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={l.quantity}
                      helperText={l.packType === 'CARTON' && l.quantity ? t('invoice.pieces', { count: reqBaseQty(l) }) : ''}
                      onChange={(e) => setReqLines((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" disabled={reqLines.length === 1}
                      onClick={() => setReqLines((prev) => prev.filter((_, i) => i !== idx))}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button size="small" startIcon={<AddIcon />} sx={{ mt: 1 }}
            onClick={() => setReqLines((prev) => [...prev, { product: null, packType: 'UNIT', quantity: '' }])}>{t('vanLoads.addItem')}</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submitRequest} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('myVan.sendRequest')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
