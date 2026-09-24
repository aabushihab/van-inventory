import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, MenuItem, Alert, CircularProgress, Grid,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { vanApi } from '../api/endpoints';
import PageGuide from '../components/PageGuide';
import { getErrorMessage } from '../utils/apiError';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function StatBox({ label, value, color }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={800} color={color}>{value}</Typography>
    </Paper>
  );
}

export default function VanSettlementPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [vans, setVans] = useState([]);
  const [vanId, setVanId] = useState(location.state?.vanId || '');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    vanApi.list().then(({ data: list }) => {
      setVans(list);
      if (!vanId && list.length) setVanId(list[0].id);
    });
  }, []);

  async function show() {
    if (!vanId) return;
    setLoading(true);
    setError('');
    try {
      const { data: result } = await vanApi.settlement(vanId, { from, to });
      setData(result);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (vanId) show(); }, [vanId]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{t('vanSettlement.title')}</Typography>
      <PageGuide points={t('vanSettlement.guide', { returnObjects: true })} />

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }} className="app-no-print">
        <TextField select size="small" label={t('vanSettlement.selectVan')} value={vanId} sx={{ minWidth: 240 }}
          onChange={(e) => setVanId(e.target.value)}>
          {vans.map((v) => <MenuItem key={v.id} value={v.id}>{v.code} - {v.name} ({v.plateNumber})</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label={t('vanSettlement.from')} value={from}
          onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label={t('vanSettlement.to')} value={to}
          onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Button variant="contained" onClick={show} disabled={!vanId || loading}>{t('vanSettlement.show')}</Button>
        <Button variant="outlined" onClick={() => window.print()} disabled={!data}>{t('common.print')}</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>}

      {data && !loading && (
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            {data.vanName}{data.salesmanName ? ` — ${t('vanSettlement.salesman')}: ${data.salesmanName}` : ''} ({data.from} → {data.to})
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 2.4 }}><StatBox label={t('vanSettlement.invoiceCount')} value={data.invoiceCount} /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><StatBox label={t('vanSettlement.salesTotal')} value={fmt(data.salesTotal)} color="primary.main" /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><StatBox label={t('vanSettlement.collected')} value={fmt(data.collectedAmount)} color="success.main" /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><StatBox label={t('vanSettlement.credit')} value={fmt(data.creditAmount)} color="warning.main" /></Grid>
            <Grid size={{ xs: 12, md: 2.4 }}><StatBox label={t('vanSettlement.closingStockValue')} value={fmt(data.closingStockValue)} /></Grid>
          </Grid>

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
                    <TableCell>{t('vanSettlement.closingValue')}</TableCell>
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
                      <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>{fmt(l.sold)}</TableCell>
                      <TableCell>{fmt(l.customerReturns)}</TableCell>
                      <TableCell>{fmt(l.unloaded)}</TableCell>
                      <TableCell sx={{ color: Number(l.other) < 0 ? 'error.main' : undefined }}>{fmt(l.other)}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{fmt(l.closing)}</TableCell>
                      <TableCell>{fmt(l.closingValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
