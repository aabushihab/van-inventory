import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, MenuItem, Alert, CircularProgress, Grid, Tabs, Tab, Chip, IconButton, Tooltip, ButtonGroup,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { vanApi, salesInvoiceApi, fetchAndOpenPdf } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import PageGuide from '../components/PageGuide';
import { getErrorMessage } from '../utils/apiError';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUS_COLORS = { CONFIRMED: 'success', RETURNED: 'warning', CANCELLED: 'default' };

function StatBox({ label, value, color }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={800} color={color}>{value}</Typography>
    </Paper>
  );
}

/** تقرير السائق/السيارة: فواتيره، ما باعه من كل صنف، والكمية الحالية على السيارة. */
export default function VanSettlementPage({ initialVanId, embedded }) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [vans, setVans] = useState([]);
  const [vanId, setVanId] = useState(initialVanId || location.state?.vanId || '');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewInvoice, setViewInvoice] = useState(null);
  const [handovers, setHandovers] = useState([]);
  const [receivables, setReceivables] = useState([]);

  async function openInvoice(id) {
    try {
      const { data: inv } = await salesInvoiceApi.get(id);
      setViewInvoice(inv);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }

  useEffect(() => {
    vanApi.list().then(({ data: list }) => {
      setVans(list);
      if (!vanId && list.length) setVanId(list[0].id);
    });
  }, []);

  async function show(range = { from, to }) {
    if (!vanId) return;
    setLoading(true);
    setError('');
    try {
      const { data: result } = await vanApi.settlement(vanId, range);
      setData(result);
      vanApi.cashHandovers(vanId, range).then(({ data: h }) => setHandovers(h)).catch(() => setHandovers([]));
      vanApi.receivables(vanId).then(({ data: r }) => setReceivables(r)).catch(() => setReceivables([]));
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (vanId) show(); }, [vanId]);

  function applyPreset(preset) {
    const now = new Date();
    let start = now;
    if (preset === 'week') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    if (preset === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    const range = { from: isoDate(start), to: isoDate(now) };
    setFrom(range.from);
    setTo(range.to);
    show(range);
  }

  const canPrint = hasPermission('SALES_INVOICE_PRINT');

  return (
    <Box>
      {!embedded && (
        <>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{t('vanSettlement.title')}</Typography>
          <PageGuide points={t('vanSettlement.guide', { returnObjects: true })} />
        </>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }} className="app-no-print">
        {!embedded && <TextField select size="small" label={t('vanSettlement.selectVan')} value={vanId} sx={{ minWidth: 260 }}
          onChange={(e) => setVanId(e.target.value)}>
          {vans.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.code} - {v.name}{v.salesmanName ? ` — ${v.salesmanName}` : ''}{v.driverName ? ` / ${v.driverName}` : ''}
            </MenuItem>
          ))}
        </TextField>}
        <ButtonGroup size="small" variant="outlined">
          <Button onClick={() => applyPreset('today')}>{t('vanSettlement.today')}</Button>
          <Button onClick={() => applyPreset('week')}>{t('vanSettlement.week')}</Button>
          <Button onClick={() => applyPreset('month')}>{t('vanSettlement.month')}</Button>
        </ButtonGroup>
        <TextField size="small" type="date" label={t('vanSettlement.from')} value={from}
          onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label={t('vanSettlement.to')} value={to}
          onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Button variant="contained" onClick={() => show()} disabled={!vanId || loading}>{t('vanSettlement.show')}</Button>
        <Button variant="outlined" onClick={() => window.print()} disabled={!data}>{t('common.print')}</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>}

      {data && !loading && (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Typography><b>{t('vanLoads.van')}:</b> {data.vanName} (<span dir="ltr">{data.plateNumber}</span>)</Typography>
            <Typography><b>{t('vans.driver')}:</b> {data.driverName || '-'}</Typography>
            <Typography><b>{t('vanSettlement.salesman')}:</b> {data.salesmanName || '-'}</Typography>
            <Typography color="text.secondary">{data.from} → {data.to}</Typography>
          </Paper>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 2 }}><StatBox label={t('vanSettlement.invoiceCount')} value={data.invoiceCount} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><StatBox label={t('vanSettlement.salesTotal')} value={fmt(data.salesTotal)} color="primary.main" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><StatBox label={t('vanSettlement.collected')} value={fmt(data.collectedAmount)} color="success.main" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><StatBox label={t('vanSettlement.credit')} value={fmt(data.creditAmount)} color="warning.main" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><StatBox label={t('vanSettlement.currentQty')} value={fmt(data.currentStockQuantity)} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><StatBox label={t('vanSettlement.currentValue')} value={fmt(data.currentStockValue)} /></Grid>
          </Grid>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }} className="app-no-print">
            <Tab label={`${t('vanSettlement.tabCurrent')} (${data.currentStock.length})`} />
            <Tab label={`${t('vanSettlement.tabInvoices')} (${data.invoices.length})`} />
            <Tab label={t('vanSettlement.tabSold')} />
            <Tab label={`${t('cash.tab')} (${handovers.length})`} />
            <Tab label={`${t('myVan.customerDebts')} (${receivables.length})`} />
          </Tabs>

          {/* الكاش: رصيد صندوق السيارة الحالي + عمليات التسليم في الفترة */}
          {tab === 3 && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography>{t('myVan.cashBox')} ({t('cash.now')})</Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">{fmt(vans.find((v) => v.id === vanId)?.cashBalance)}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                {handovers.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('cash.none')}</Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('common.createdAt')}</TableCell>
                        <TableCell>{t('vans.driver')}</TableCell>
                        <TableCell>{t('cash.expected')}</TableCell>
                        <TableCell>{t('cash.handed')}</TableCell>
                        <TableCell>{t('cash.difference')}</TableCell>
                        <TableCell>{t('cash.toAccount')}</TableCell>
                        <TableCell>{t('vanLoads.createdBy')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {handovers.map((h) => (
                        <TableRow key={h.id} hover>
                          <TableCell>{new Date(h.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{h.driverName || '-'}</TableCell>
                          <TableCell>{fmt(h.expectedAmount)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmt(h.handedAmount)}</TableCell>
                          <TableCell sx={{ color: Number(h.difference) < 0 ? 'error.main' : Number(h.difference) > 0 ? 'success.main' : undefined, fontWeight: 700 }}>
                            {fmt(h.difference)}
                          </TableCell>
                          <TableCell>{h.toAccountName || '-'}</TableCell>
                          <TableCell>{h.createdByName || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>
            </Box>
          )}

          {/* ديون عملاء السيارة غير المسددة */}
          {tab === 4 && (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              {receivables.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('myVan.noDebts')}</Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('vanSettlement.invoiceNumber')}</TableCell>
                      <TableCell>{t('common.createdAt')}</TableCell>
                      <TableCell>{t('vanSettlement.customer')}</TableCell>
                      <TableCell>{t('common.total')}</TableCell>
                      <TableCell>{t('vanSettlement.paid')}</TableCell>
                      <TableCell>{t('vanSettlement.due')}</TableCell>
                      <TableCell>{t('vanSettlement.createdBy')}</TableCell>
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
                        <TableCell>{inv.createdByName || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}

          {/* فواتير السائق */}
          {tab === 1 && (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              {data.invoices.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('vanSettlement.invoiceNumber')}</TableCell>
                      <TableCell>{t('common.createdAt')}</TableCell>
                      <TableCell>{t('vanSettlement.customer')}</TableCell>
                      <TableCell>{t('common.quantity')}</TableCell>
                      <TableCell>{t('common.total')}</TableCell>
                      <TableCell>{t('vanSettlement.paid')}</TableCell>
                      <TableCell>{t('vanSettlement.due')}</TableCell>
                      <TableCell>{t('common.status')}</TableCell>
                      <TableCell>{t('vanSettlement.createdBy')}</TableCell>
                      <TableCell align="center" className="app-no-print">{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.invoices.map((inv) => (
                      <TableRow key={inv.id} hover sx={inv.status === 'CANCELLED' ? { opacity: 0.55 } : undefined}>
                        <TableCell sx={{ fontWeight: 700 }}>{inv.invoiceNumber}</TableCell>
                        <TableCell>{new Date(inv.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{inv.customerName || t('vanSettlement.cashCustomer')}</TableCell>
                        <TableCell>{fmt(inv.quantity)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{fmt(inv.grandTotal)}</TableCell>
                        <TableCell sx={{ color: 'success.main' }}>{fmt(inv.paidAmount)}</TableCell>
                        <TableCell sx={{ color: Number(inv.dueAmount) > 0 ? 'warning.main' : undefined }}>{fmt(inv.dueAmount)}</TableCell>
                        <TableCell>
                          <Chip size="small" variant="outlined" color={STATUS_COLORS[inv.status] || 'default'}
                            label={t(`vanSettlement.status.${inv.status}`, inv.status)} />
                        </TableCell>
                        <TableCell>{inv.createdByName || '-'}</TableCell>
                        <TableCell align="center" className="app-no-print" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title={t('vanSettlement.openInvoice')}>
                            <IconButton size="small" color="primary" onClick={() => openInvoice(inv.id)}><VisibilityIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          {canPrint && (<>
                            <Tooltip title={t('invoice.printA4')}>
                              <IconButton size="small" onClick={() => fetchAndOpenPdf(salesInvoiceApi.printA4Url(inv.id))}><PrintIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title={t('invoice.printThermal')}>
                              <IconButton size="small" onClick={() => fetchAndOpenPdf(salesInvoiceApi.printThermalUrl(inv.id))}><ReceiptIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </>)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}

          {/* حركة كل صنف: محمّل / مباع / مرتجع / منزّل / متبقي */}
          {tab === 2 && (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              {data.lines.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('common.sku')}</TableCell>
                      <TableCell>{t('common.name')}</TableCell>
                      <TableCell>{t('common.unit')}</TableCell>
                      <TableCell>{t('vanSettlement.opening')}</TableCell>
                      <TableCell>{t('vanSettlement.loaded')}</TableCell>
                      <TableCell>{t('vanSettlement.sold')}</TableCell>
                      <TableCell>{t('vanSettlement.customerReturns')}</TableCell>
                      <TableCell>{t('vanSettlement.unloaded')}</TableCell>
                      <TableCell>{t('vanSettlement.other')}</TableCell>
                      <TableCell>{t('vanSettlement.closing')}</TableCell>
                      <TableCell>{t('vanSettlement.soldValue')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.lines.map((l) => (
                      <TableRow key={l.productId} hover>
                        <TableCell>{l.productSku}</TableCell>
                        <TableCell>{l.productName}</TableCell>
                        <TableCell>{l.unitName}</TableCell>
                        <TableCell>{fmt(l.opening)}</TableCell>
                        <TableCell sx={{ color: 'primary.main' }}>{fmt(l.loaded)}</TableCell>
                        <TableCell sx={{ color: 'success.main', fontWeight: 800 }}>{fmt(l.sold)}</TableCell>
                        <TableCell>{fmt(l.customerReturns)}</TableCell>
                        <TableCell>{fmt(l.unloaded)}</TableCell>
                        <TableCell sx={{ color: Number(l.other) < 0 ? 'error.main' : undefined }}>{fmt(l.other)}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{fmt(l.closing)}</TableCell>
                        <TableCell>{fmt(Number(l.sold) * Number(l.salePrice))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}

          {/* الحمولة الحالية على السيارة (الآن) */}
          {tab === 0 && (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              {data.currentStock.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('myVan.empty')}</Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('common.sku')}</TableCell>
                      <TableCell>{t('common.name')}</TableCell>
                      <TableCell>{t('common.unit')}</TableCell>
                      <TableCell>{t('common.quantity')}</TableCell>
                      <TableCell>{t('vanSettlement.salePrice')}</TableCell>
                      <TableCell>{t('vanSettlement.closingValue')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.currentStock.map((s) => (
                      <TableRow key={s.productId} hover>
                        <TableCell>{s.productSku}</TableCell>
                        <TableCell>{s.productName}</TableCell>
                        <TableCell>{s.unitName}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{fmt(s.quantity)}</TableCell>
                        <TableCell>{fmt(s.salePrice)}</TableCell>
                        <TableCell>{fmt(s.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}
        </Box>
      )}

      {/* عرض فاتورة */}
      <Dialog open={!!viewInvoice} onClose={() => setViewInvoice(null)} fullWidth maxWidth="md">
        <DialogTitle>{t('vanSettlement.invoiceNumber')}: {viewInvoice?.invoiceNumber}</DialogTitle>
        <DialogContent dividers>
          {viewInvoice && (
            <Box>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
                <Typography variant="body2"><b>{t('common.createdAt')}:</b> {new Date(viewInvoice.createdAt).toLocaleString()}</Typography>
                <Typography variant="body2"><b>{t('vanSettlement.customer')}:</b> {viewInvoice.customerName || t('vanSettlement.cashCustomer')}</Typography>
                <Typography variant="body2"><b>{t('vanSettlement.createdBy')}:</b> {viewInvoice.createdByName || '-'}</Typography>
                <Chip size="small" variant="outlined" color={STATUS_COLORS[viewInvoice.status] || 'default'}
                  label={t(`vanSettlement.status.${viewInvoice.status}`, viewInvoice.status)} />
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.name')}</TableCell>
                    <TableCell>{t('common.quantity')}</TableCell>
                    <TableCell>{t('common.price')}</TableCell>
                    <TableCell>{t('common.discount')}</TableCell>
                    <TableCell>{t('common.total')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewInvoice.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.productName}</TableCell>
                      <TableCell>
                        {it.packType === 'CARTON'
                          ? `${fmt(it.packQuantity)} ${t('invoice.packCarton')} (${t('invoice.pieces', { count: fmt(it.quantity) })})`
                          : fmt(it.quantity)}
                      </TableCell>
                      <TableCell>{fmt(it.packType === 'CARTON' ? Number(it.unitPrice) * Number(it.packSize) : it.unitPrice)}</TableCell>
                      <TableCell>{fmt(it.discount)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{fmt(it.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'flex-end', mt: 2, flexWrap: 'wrap' }}>
                <Typography><b>{t('common.total')}:</b> {fmt(viewInvoice.grandTotal)}</Typography>
                <Typography color="success.main"><b>{t('vanSettlement.paid')}:</b> {fmt(viewInvoice.paidAmount)}</Typography>
                <Typography color="warning.main"><b>{t('vanSettlement.due')}:</b> {fmt(viewInvoice.dueAmount)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {canPrint && viewInvoice && (
            <>
              <Button startIcon={<PrintIcon />} onClick={() => fetchAndOpenPdf(salesInvoiceApi.printA4Url(viewInvoice.id))}>{t('invoice.printA4')}</Button>
              <Button startIcon={<ReceiptIcon />} onClick={() => fetchAndOpenPdf(salesInvoiceApi.printThermalUrl(viewInvoice.id))}>{t('invoice.printThermal')}</Button>
            </>
          )}
          <Button onClick={() => setViewInvoice(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
