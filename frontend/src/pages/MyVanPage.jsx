import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Alert, CircularProgress, Grid, TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { vanApi, salesInvoiceApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

/** شاشة المندوب: سيارته وما عليها من بضاعة حالياً، مع زر مباشر للبيع منها. */
export default function MyVanPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [todaySales, setTodaySales] = useState(null);

  function load() {
    setLoading(true);
    vanApi.my().then(({ data: d }) => setData(d)).finally(() => setLoading(false));
    // مبيعات اليوم (الخادم يحصرها بفواتير سيارة المندوب)
    if (hasPermission('SALES_INVOICE_VIEW')) {
      const today = todayIso();
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

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>;
  if (!data?.van) return <Alert severity="info">{t('myVan.noVan')}</Alert>;

  const van = data.van;
  const stock = data.stock.filter((s) => !q
    || s.productName.toLowerCase().includes(q.toLowerCase()) || (s.productSku || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight={800}>{t('myVan.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={load}>{t('myVan.refresh')}</Button>
          {hasPermission('SALES_INVOICE_CREATE') && (
            <Button variant="contained" onClick={() => navigate('/sales-invoices', { state: { openCreate: true } })}>
              {t('myVan.sell')}
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={800}>{van.code} - {van.name}</Typography>
            <Typography variant="body2" color="text.secondary">{t('vans.plateNumber')}: <span dir="ltr">{van.plateNumber}</span></Typography>
            <Typography variant="body2" color="text.secondary">{t('vans.driverName')}: {van.driverName || '-'}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">{t('vans.stockQuantity')}</Typography>
            <Typography variant="h5" fontWeight={800}>{fmt(van.stockQuantity)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">{t('vans.stockValue')}</Typography>
            <Typography variant="h5" fontWeight={800} color="primary.main">{fmt(van.stockValue)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {todaySales && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, cursor: 'pointer' }} onClick={() => navigate('/sales-invoices')}>
              <Typography variant="body2" color="text.secondary">{t('myVan.todayInvoices')}</Typography>
              <Typography variant="h5" fontWeight={800}>{todaySales.count}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">{t('myVan.todaySales')}</Typography>
              <Typography variant="h5" fontWeight={800} color="success.main">{fmt(todaySales.total)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">{t('myVan.todayCollected')}</Typography>
              <Typography variant="h5" fontWeight={800} color="primary.main">{fmt(todaySales.paid)}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('vans.vanStockTitle')}</Typography>
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
    </Box>
  );
}
