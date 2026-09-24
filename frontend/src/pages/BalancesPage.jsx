import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Tabs, Tab, Alert, CircularProgress, Grid, TablePagination, TableContainer, TextField, InputAdornment,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { salesInvoiceApi, purchaseInvoiceApi, reportApi } from '../api/endpoints';
import PageGuide from '../components/PageGuide';

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export default function BalancesPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [salesOutstanding, setSalesOutstanding] = useState([]);
  const [salesPage, setSalesPage] = useState(0);
  const [salesSize, setSalesSize] = useState(20);
  const [salesTotalElements, setSalesTotalElements] = useState(0);
  const [customerBalances, setCustomerBalances] = useState([]);
  const [receivablesAging, setReceivablesAging] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerBalPage, setCustomerBalPage] = useState(0);
  const [customerBalSize, setCustomerBalSize] = useState(10);

  const [purchaseOutstanding, setPurchaseOutstanding] = useState([]);
  const [purchasePage, setPurchasePage] = useState(0);
  const [purchaseSize, setPurchaseSize] = useState(20);
  const [purchaseTotalElements, setPurchaseTotalElements] = useState(0);
  const [supplierBalances, setSupplierBalances] = useState([]);
  const [payablesAging, setPayablesAging] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierBalPage, setSupplierBalPage] = useState(0);
  const [supplierBalSize, setSupplierBalSize] = useState(10);

  async function loadSales(page = salesPage, size = salesSize) {
    setLoading(true);
    setError('');
    try {
      const [inv, bal, aging] = await Promise.all([
        salesInvoiceApi.outstanding({ page, size }),
        salesInvoiceApi.balancesByCustomer(),
        reportApi.receivablesAging(),
      ]);
      setSalesOutstanding(inv.data.content);
      setSalesTotalElements(inv.data.totalElements);
      setCustomerBalances(bal.data);
      setReceivablesAging(aging.data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadPurchases(page = purchasePage, size = purchaseSize) {
    setLoading(true);
    setError('');
    try {
      const [inv, bal, aging] = await Promise.all([
        purchaseInvoiceApi.outstanding({ page, size }),
        purchaseInvoiceApi.balancesBySupplier(),
        reportApi.payablesAging(),
      ]);
      setPurchaseOutstanding(inv.data.content);
      setPurchaseTotalElements(inv.data.totalElements);
      setSupplierBalances(bal.data);
      setPayablesAging(aging.data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function agingFor(list, partyId) {
    return list.find((a) => a.partyId === partyId) || null;
  }

  useEffect(() => { loadSales(0, salesSize); loadPurchases(0, purchaseSize); }, []);

  // المصدر الصحيح للإجمالي هو تجميع كل الأرصدة حسب الجهة (غير مقسّم لصفحات)، وليس فواتير
  // الصفحة الحالية فقط من جدول "الفواتير المستحقة" — وإلا يظهر رقم أصغر بكثير من الحقيقي عند
  // وجود فواتير مستحقة أكثر من حجم الصفحة.
  const salesTotalDue = customerBalances.reduce((s, b) => s + Number(b.totalDue), 0);
  const purchaseTotalDue = supplierBalances.reduce((s, b) => s + Number(b.totalDue), 0);

  const filteredCustomerBalances = customerBalances.filter((b) =>
    !customerSearch.trim() || b.partyName?.toLowerCase().includes(customerSearch.trim().toLowerCase()));
  const pagedCustomerBalances = filteredCustomerBalances.slice(
    customerBalPage * customerBalSize, customerBalPage * customerBalSize + customerBalSize);

  const filteredSupplierBalances = supplierBalances.filter((b) =>
    !supplierSearch.trim() || b.partyName?.toLowerCase().includes(supplierSearch.trim().toLowerCase()));
  const pagedSupplierBalances = filteredSupplierBalances.slice(
    supplierBalPage * supplierBalSize, supplierBalPage * supplierBalSize + supplierBalSize);

  return (
    <Box>
      <PageGuide points={t('pageGuide.balances.points', { returnObjects: true })} />
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t('nav.balances')}</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderColor: 'error.light', bgcolor: 'error.50' }}>
            <TrendingUpIcon sx={{ fontSize: 40, color: 'error.main' }} />
            <Box>
              <Typography variant="body2" color="text.secondary">{t('balances.totalReceivables')}</Typography>
              <Typography variant="h5" fontWeight={800} color="error.main">{fmt(salesTotalDue)}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderColor: 'warning.light', bgcolor: 'warning.50' }}>
            <TrendingDownIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            <Box>
              <Typography variant="body2" color="text.secondary">{t('balances.totalPayables')}</Typography>
              <Typography variant="h5" fontWeight={800} color="warning.main">{fmt(purchaseTotalDue)}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('invoice.customer')} />
        <Tab label={t('invoice.supplier')} />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : tab === 0 ? (
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('balances.byParty')}</Typography>
          <TextField
            size="small"
            placeholder={t('balances.searchCustomer')}
            value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); setCustomerBalPage(0); }}
            sx={{ mb: 1, width: { xs: '100%', sm: 320 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <Paper variant="outlined" sx={{ mb: 3 }}>
            {filteredCustomerBalances.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('invoice.customer')}</TableCell>
                      <TableCell>{t('balances.invoiceCount')}</TableCell>
                      <TableCell>{t('invoice.grandTotal')}</TableCell>
                      <TableCell>{t('invoice.paid')}</TableCell>
                      <TableCell>{t('invoice.due')}</TableCell>
                      <TableCell>{t('balances.current')}</TableCell>
                      <TableCell>{t('balances.days31to60')}</TableCell>
                      <TableCell>{t('balances.days61to90')}</TableCell>
                      <TableCell>{t('balances.over90')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedCustomerBalances.map((b) => {
                      const a = agingFor(receivablesAging, b.partyId);
                      return (
                        <TableRow key={b.partyId} hover>
                          <TableCell>{b.partyName}</TableCell>
                          <TableCell>{b.invoiceCount}</TableCell>
                          <TableCell>{fmt(b.totalGrandTotal)}</TableCell>
                          <TableCell>{fmt(b.totalPaid)}</TableCell>
                          <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>{fmt(b.totalDue)}</TableCell>
                          <TableCell>{a ? fmt(a.current) : '-'}</TableCell>
                          <TableCell>{a ? fmt(a.days31to60) : '-'}</TableCell>
                          <TableCell>{a ? fmt(a.days61to90) : '-'}</TableCell>
                          <TableCell sx={{ color: a && Number(a.over90) > 0 ? 'error.main' : 'inherit', fontWeight: a && Number(a.over90) > 0 ? 700 : 400 }}>{a ? fmt(a.over90) : '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination component="div" count={filteredCustomerBalances.length} page={customerBalPage}
              onPageChange={(_, p) => setCustomerBalPage(p)}
              rowsPerPage={customerBalSize}
              onRowsPerPageChange={(e) => { setCustomerBalSize(parseInt(e.target.value, 10)); setCustomerBalPage(0); }} />
          </Paper>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('balances.outstandingInvoices')}</Typography>
          <Paper variant="outlined">
            {salesOutstanding.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesOutstanding.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell>{inv.invoiceNumber}</TableCell>
                      <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{inv.customerName || '-'}</TableCell>
                      <TableCell>{fmt(inv.grandTotal)}</TableCell>
                      <TableCell>{fmt(inv.paidAmount)}</TableCell>
                      <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>{fmt(inv.dueAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableBody>
                  <TableRow sx={{ '& td': { fontWeight: 800, borderTop: '2px solid #cbd5e1' } }}>
                    <TableCell colSpan={5}>{t('common.total')}</TableCell>
                    <TableCell sx={{ color: 'error.main' }}>{fmt(salesTotalDue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
            <TablePagination component="div" count={salesTotalElements} page={salesPage}
              onPageChange={(_, p) => { setSalesPage(p); loadSales(p, salesSize); }}
              rowsPerPage={salesSize}
              onRowsPerPageChange={(e) => { const s = parseInt(e.target.value, 10); setSalesSize(s); setSalesPage(0); loadSales(0, s); }} />
          </Paper>
        </>
      ) : (
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('balances.byParty')}</Typography>
          <TextField
            size="small"
            placeholder={t('balances.searchSupplier')}
            value={supplierSearch}
            onChange={(e) => { setSupplierSearch(e.target.value); setSupplierBalPage(0); }}
            sx={{ mb: 1, width: { xs: '100%', sm: 320 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <Paper variant="outlined" sx={{ mb: 3 }}>
            {filteredSupplierBalances.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('invoice.supplier')}</TableCell>
                      <TableCell>{t('balances.invoiceCount')}</TableCell>
                      <TableCell>{t('invoice.grandTotal')}</TableCell>
                      <TableCell>{t('invoice.paid')}</TableCell>
                      <TableCell>{t('invoice.due')}</TableCell>
                      <TableCell>{t('balances.current')}</TableCell>
                      <TableCell>{t('balances.days31to60')}</TableCell>
                      <TableCell>{t('balances.days61to90')}</TableCell>
                      <TableCell>{t('balances.over90')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedSupplierBalances.map((b) => {
                      const a = agingFor(payablesAging, b.partyId);
                      return (
                        <TableRow key={b.partyId} hover>
                          <TableCell>{b.partyName}</TableCell>
                          <TableCell>{b.invoiceCount}</TableCell>
                          <TableCell>{fmt(b.totalGrandTotal)}</TableCell>
                          <TableCell>{fmt(b.totalPaid)}</TableCell>
                          <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>{fmt(b.totalDue)}</TableCell>
                          <TableCell>{a ? fmt(a.current) : '-'}</TableCell>
                          <TableCell>{a ? fmt(a.days31to60) : '-'}</TableCell>
                          <TableCell>{a ? fmt(a.days61to90) : '-'}</TableCell>
                          <TableCell sx={{ color: a && Number(a.over90) > 0 ? 'error.main' : 'inherit', fontWeight: a && Number(a.over90) > 0 ? 700 : 400 }}>{a ? fmt(a.over90) : '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination component="div" count={filteredSupplierBalances.length} page={supplierBalPage}
              onPageChange={(_, p) => setSupplierBalPage(p)}
              rowsPerPage={supplierBalSize}
              onRowsPerPageChange={(e) => { setSupplierBalSize(parseInt(e.target.value, 10)); setSupplierBalPage(0); }} />
          </Paper>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('balances.outstandingInvoices')}</Typography>
          <Paper variant="outlined">
            {purchaseOutstanding.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('invoice.number')}</TableCell>
                    <TableCell>{t('invoice.date')}</TableCell>
                    <TableCell>{t('invoice.supplier')}</TableCell>
                    <TableCell>{t('invoice.grandTotal')}</TableCell>
                    <TableCell>{t('invoice.paid')}</TableCell>
                    <TableCell>{t('invoice.due')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchaseOutstanding.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell>{inv.invoiceNumber}</TableCell>
                      <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{inv.supplierName || '-'}</TableCell>
                      <TableCell>{fmt(inv.grandTotal)}</TableCell>
                      <TableCell>{fmt(inv.paidAmount)}</TableCell>
                      <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>{fmt(inv.dueAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableBody>
                  <TableRow sx={{ '& td': { fontWeight: 800, borderTop: '2px solid #cbd5e1' } }}>
                    <TableCell colSpan={5}>{t('common.total')}</TableCell>
                    <TableCell sx={{ color: 'error.main' }}>{fmt(purchaseTotalDue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
            <TablePagination component="div" count={purchaseTotalElements} page={purchasePage}
              onPageChange={(_, p) => { setPurchasePage(p); loadPurchases(p, purchaseSize); }}
              rowsPerPage={purchaseSize}
              onRowsPerPageChange={(e) => { const s = parseInt(e.target.value, 10); setPurchaseSize(s); setPurchasePage(0); loadPurchases(0, s); }} />
          </Paper>
        </>
      )}
    </Box>
  );
}
