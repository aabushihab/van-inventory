import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, MenuItem, Alert, CircularProgress, Grid, Tabs, Tab, Chip, IconButton, Tooltip, ButtonGroup,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
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
export default function VanSettlementPage({ initialVanId }) {
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
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{t('vanSettlement.title')}</Typography>
      <PageGuide points={t('vanSettlement.guide', { returnObjects: true })} />

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }} className="app-no-print">
        <TextField select size="small" label={t('vanSettlement.selectVan')} value={vanId} sx={{ minWidth: 260 }}
          onChange={(e) => setVanId(e.target.value)}>
          {vans.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.code} - {v.name}{v.salesmanName ? ` — ${v.salesmanName}` : ''}{v.driverName ? ` / ${v.driverName}` : ''}
            </MenuItem>
          ))}
        </TextField>
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
            <Tab label={`${t('vanSettlement.tabInvoices')} (${data.invoices.length})`} />
            <Tab label={t('vanSettlement.tabSold')} />
            <Tab label={`${t('vanSettlement.tabCurrent')} (${data.currentStock.length})`} />
          </Tabs>

          {/* فواتير السائق */}
          {tab === 0 && (
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
                      {canPrint && <TableCell align="center" className="app-no-print">{t('common.print')}</TableCell>}
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
                        {canPrint && (
                          <TableCell align="center" className="app-no-print" sx={{ whiteSpace: 'nowrap' }}>
                            <Tooltip title={t('invoice.printA4')}>
                              <IconButton size="small" onClick={() => fetchAndOpenPdf(salesInvoiceApi.printA4Url(inv.id))}><PrintIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title={t('invoice.printThermal')}>
                              <IconButton size="small" onClick={() => fetchAndOpenPdf(salesInvoiceApi.printThermalUrl(inv.id))}><ReceiptIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}

          {/* حركة كل صنف: محمّل / مباع / مرتجع / منزّل / متبقي */}
          {tab === 1 && (
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
          {tab === 2 && (
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
    </Box>
  );
}
