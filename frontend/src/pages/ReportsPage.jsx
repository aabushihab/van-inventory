import { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, MenuItem, Tabs, Tab, Alert, CircularProgress, TablePagination,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { useTranslation } from 'react-i18next';
import { reportApi, warehouseApi, fetchAndDownload } from '../api/endpoints';
import PageGuide from '../components/PageGuide';

/** يبني تاريخ ISO محلي (سنة-شهر-يوم) بدون تحويل للتوقيت العالمي، لتفادي انزياح يوم كامل قرب منتصف الليل بمنطقة زمنية شرقية. */
function localIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function todayIso() {
  return localIso(new Date());
}
function firstDayOfMonthIso() {
  const d = new Date();
  return localIso(new Date(d.getFullYear(), d.getMonth(), 1));
}
function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  const [from, setFrom] = useState(firstDayOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [groupBy, setGroupBy] = useState('day');
  const [financialRows, setFinancialRows] = useState([]);

  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [inventoryRows, setInventoryRows] = useState([]);

  const [perfFrom, setPerfFrom] = useState(firstDayOfMonthIso());
  const [perfTo, setPerfTo] = useState(todayIso());
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);

  const [movementFrom, setMovementFrom] = useState(todayIso());
  const [movementTo, setMovementTo] = useState(todayIso());
  const [movementGroupBy, setMovementGroupBy] = useState('day');
  const [movementWarehouseId, setMovementWarehouseId] = useState('');
  const [movementRows, setMovementRows] = useState([]);
  const [movementPage, setMovementPage] = useState(0);
  const [movementSize, setMovementSize] = useState(25);

  const [taxFrom, setTaxFrom] = useState(firstDayOfMonthIso());
  const [taxTo, setTaxTo] = useState(todayIso());
  const [taxSummary, setTaxSummary] = useState(null);

  const [balanceSheet, setBalanceSheet] = useState(null);

  const [cfFrom, setCfFrom] = useState(firstDayOfMonthIso());
  const [cfTo, setCfTo] = useState(todayIso());
  const [cashFlow, setCashFlow] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    warehouseApi.list().then(({ data }) => setWarehouses(data));
  }, []);

  async function loadFinancial() {
    setLoading(true);
    setError('');
    try {
      const { data } = await reportApi.financial({ from, to, groupBy });
      setFinancialRows(data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadInventory() {
    setLoading(true);
    setError('');
    try {
      const { data } = await reportApi.inventoryValue(warehouseId ? { warehouseId } : {});
      setInventoryRows(data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadPerformance() {
    setLoading(true);
    setError('');
    try {
      const [products, customers, suppliers] = await Promise.all([
        reportApi.topProducts({ from: perfFrom, to: perfTo, limit: 10 }),
        reportApi.topCustomers({ from: perfFrom, to: perfTo, limit: 10 }),
        reportApi.topSuppliers({ from: perfFrom, to: perfTo, limit: 10 }),
      ]);
      setTopProducts(products.data);
      setTopCustomers(customers.data);
      setTopSuppliers(suppliers.data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMovement() {
    setLoading(true);
    setError('');
    try {
      const { data } = await reportApi.stockMovementSummary({
        from: movementFrom, to: movementTo, groupBy: movementGroupBy,
        warehouseId: movementWarehouseId || undefined,
      });
      setMovementRows(data);
      setMovementPage(0);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadTaxPayable() {
    setLoading(true);
    setError('');
    try {
      const { data } = await reportApi.taxPayable({ from: taxFrom, to: taxTo });
      setTaxSummary(data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadBalanceSheet() {
    setLoading(true);
    setError('');
    try {
      const { data } = await reportApi.balanceSheet();
      setBalanceSheet(data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function loadCashFlow() {
    setLoading(true);
    setError('');
    try {
      const { data } = await reportApi.cashFlow({ from: cfFrom, to: cfTo });
      setCashFlow(data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 0) loadFinancial();
    else if (tab === 1) loadInventory();
    else if (tab === 2) loadPerformance();
    else if (tab === 3) loadMovement();
    else if (tab === 4) loadTaxPayable();
    else if (tab === 5) loadBalanceSheet();
    else loadCashFlow();
  }, [tab]);

  const financialTotals = useMemo(() => financialRows.reduce((acc, r) => ({
    salesCount: acc.salesCount + Number(r.salesCount || 0),
    salesTotal: acc.salesTotal + Number(r.salesTotal || 0),
    discountTotal: acc.discountTotal + Number(r.discountTotal || 0),
    costOfGoodsSold: acc.costOfGoodsSold + Number(r.costOfGoodsSold || 0),
    damagedLoss: acc.damagedLoss + Number(r.damagedLoss || 0),
    expensesTotal: acc.expensesTotal + Number(r.expensesTotal || 0),
    grossProfit: acc.grossProfit + Number(r.grossProfit || 0),
    purchasesTotal: acc.purchasesTotal + Number(r.purchasesTotal || 0),
  }), { salesCount: 0, salesTotal: 0, discountTotal: 0, costOfGoodsSold: 0, damagedLoss: 0, expensesTotal: 0, grossProfit: 0, purchasesTotal: 0 }), [financialRows]);

  const inventoryTotalValue = useMemo(
    () => inventoryRows.reduce((s, r) => s + Number(r.value || 0), 0),
    [inventoryRows]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }} className="app-no-print">
        <Typography variant="h5" fontWeight={800}>{t('reports.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {tab === 0 && (
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />}
              onClick={() => fetchAndDownload(reportApi.financialExportUrl({ from, to, groupBy }), 'التقرير-المالي.xlsx')}>
              {t('common.exportExcel')}
            </Button>
          )}
          {tab === 1 && (
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />}
              onClick={() => fetchAndDownload(reportApi.inventoryValueExportUrl({ warehouseId }), 'قيمة-المخزون.xlsx')}>
              {t('common.exportExcel')}
            </Button>
          )}
          {tab === 2 && (
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />}
              onClick={() => fetchAndDownload(reportApi.topProductsExportUrl({ from: perfFrom, to: perfTo, limit: 50 }), 'الأكثر-مبيعاً.xlsx')}>
              {t('common.exportExcel')}
            </Button>
          )}
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>{t('common.print')}</Button>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} className="app-no-print">
        <Tab label={t('reports.financial')} />
        <Tab label={t('reports.inventoryValue')} />
        <Tab label={t('reports.performance')} />
        <Tab label={t('reports.stockMovement')} />
        <Tab label={t('reports.taxPayable')} />
        <Tab label={t('reports.balanceSheet')} />
        <Tab label={t('reports.cashFlow')} />
      </Tabs>

      {tab === 5 && (
        <PageGuide points={t('pageGuide.reportsBalanceSheet.points', { returnObjects: true })} />
      )}
      {tab === 6 && (
        <PageGuide points={t('pageGuide.reportsCashFlow.points', { returnObjects: true })} />
      )}

      {tab === 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }} className="app-no-print">
          <TextField size="small" type="date" label={t('reports.from')} value={from}
            onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label={t('reports.to')} value={to}
            onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField select size="small" label={t('reports.groupBy')} value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="day">{t('reports.byDay')}</MenuItem>
            <MenuItem value="month">{t('reports.byMonth')}</MenuItem>
          </TextField>
          <Button variant="contained" onClick={loadFinancial}>{t('common.search')}</Button>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }} className="app-no-print">
          <TextField select size="small" label={t('common.warehouse')} value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">{t('reports.allWarehouses')}</MenuItem>
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={loadInventory}>{t('common.search')}</Button>
        </Box>
      )}

      {tab === 2 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }} className="app-no-print">
          <TextField size="small" type="date" label={t('reports.from')} value={perfFrom}
            onChange={(e) => setPerfFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label={t('reports.to')} value={perfTo}
            onChange={(e) => setPerfTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={loadPerformance}>{t('common.search')}</Button>
        </Box>
      )}

      {tab === 3 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }} className="app-no-print">
          <TextField size="small" type="date" label={t('reports.from')} value={movementFrom}
            onChange={(e) => setMovementFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label={t('reports.to')} value={movementTo}
            onChange={(e) => setMovementTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField select size="small" label={t('reports.groupBy')} value={movementGroupBy}
            onChange={(e) => setMovementGroupBy(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="day">{t('reports.byDay')}</MenuItem>
            <MenuItem value="week">{t('reports.byWeek')}</MenuItem>
            <MenuItem value="month">{t('reports.byMonth')}</MenuItem>
          </TextField>
          <TextField select size="small" label={t('common.warehouse')} value={movementWarehouseId}
            onChange={(e) => setMovementWarehouseId(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">{t('reports.allWarehouses')}</MenuItem>
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={loadMovement}>{t('common.search')}</Button>
        </Box>
      )}

      {tab === 4 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }} className="app-no-print">
          <TextField size="small" type="date" label={t('reports.from')} value={taxFrom}
            onChange={(e) => setTaxFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label={t('reports.to')} value={taxTo}
            onChange={(e) => setTaxTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={loadTaxPayable}>{t('common.search')}</Button>
        </Box>
      )}

      {tab === 6 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }} className="app-no-print">
          <TextField size="small" type="date" label={t('reports.from')} value={cfFrom}
            onChange={(e) => setCfFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label={t('reports.to')} value={cfTo}
            onChange={(e) => setCfTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={loadCashFlow}>{t('common.search')}</Button>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')} className="app-no-print">{error}</Alert>}

      <Typography variant="subtitle1" sx={{ mb: 1, display: 'none' }} className="app-print-title">
        {tab === 0 && `${t('reports.financial')} (${from} - ${to})`}
        {tab === 1 && t('reports.inventoryValue')}
        {tab === 2 && `${t('reports.performance')} (${perfFrom} - ${perfTo})`}
        {tab === 3 && `${t('reports.stockMovement')} (${movementFrom} - ${movementTo})`}
        {tab === 4 && `${t('reports.taxPayable')} (${taxFrom} - ${taxTo})`}
        {tab === 5 && t('reports.balanceSheet')}
        {tab === 6 && `${t('reports.cashFlow')} (${cfFrom} - ${cfTo})`}
      </Typography>

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }} className="app-no-print"><CircularProgress size={28} /></Box>
        ) : tab === 0 ? (
          financialRows.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('reports.period')}</TableCell>
                  <TableCell>{t('reports.invoiceCount')}</TableCell>
                  <TableCell>{t('reports.salesTotal')}</TableCell>
                  <TableCell>{t('common.discount')}</TableCell>
                  <TableCell>{t('reports.costOfGoodsSold')}</TableCell>
                  <TableCell>{t('reports.damagedLoss')}</TableCell>
                  <TableCell>{t('reports.expensesTotal')}</TableCell>
                  <TableCell>{t('reports.grossProfit')}</TableCell>
                  <TableCell>{t('reports.purchasesTotal')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {financialRows.map((r) => (
                  <TableRow key={r.period} hover>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{r.salesCount}</TableCell>
                    <TableCell>{fmt(r.salesTotal)}</TableCell>
                    <TableCell>{fmt(r.discountTotal)}</TableCell>
                    <TableCell>{fmt(r.costOfGoodsSold)}</TableCell>
                    <TableCell sx={{ color: Number(r.damagedLoss) > 0 ? 'error.main' : 'inherit' }}>
                      {fmt(r.damagedLoss)}
                    </TableCell>
                    <TableCell sx={{ color: Number(r.expensesTotal) > 0 ? 'error.main' : 'inherit' }}>
                      {fmt(r.expensesTotal)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: Number(r.grossProfit) >= 0 ? 'success.main' : 'error.main' }}>
                      {fmt(r.grossProfit)}
                    </TableCell>
                    <TableCell>{fmt(r.purchasesTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableBody>
                <TableRow sx={{ '& td': { fontWeight: 800, borderTop: '2px solid #cbd5e1' } }}>
                  <TableCell>{t('common.total')}</TableCell>
                  <TableCell>{financialTotals.salesCount}</TableCell>
                  <TableCell>{fmt(financialTotals.salesTotal)}</TableCell>
                  <TableCell>{fmt(financialTotals.discountTotal)}</TableCell>
                  <TableCell>{fmt(financialTotals.costOfGoodsSold)}</TableCell>
                  <TableCell sx={{ color: financialTotals.damagedLoss > 0 ? 'error.main' : 'inherit' }}>
                    {fmt(financialTotals.damagedLoss)}
                  </TableCell>
                  <TableCell sx={{ color: financialTotals.expensesTotal > 0 ? 'error.main' : 'inherit' }}>
                    {fmt(financialTotals.expensesTotal)}
                  </TableCell>
                  <TableCell sx={{ color: financialTotals.grossProfit >= 0 ? 'success.main' : 'error.main' }}>
                    {fmt(financialTotals.grossProfit)}
                  </TableCell>
                  <TableCell>{fmt(financialTotals.purchasesTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )
        ) : tab === 1 ? (
          inventoryRows.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.warehouse')}</TableCell>
                  <TableCell>{t('common.sku')}</TableCell>
                  <TableCell>{t('common.name')}</TableCell>
                  <TableCell>{t('common.quantity')}</TableCell>
                  <TableCell>{t('damaged.unitCost')}</TableCell>
                  <TableCell>{t('reports.value')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryRows.map((r, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{r.warehouseName}</TableCell>
                    <TableCell>{r.sku}</TableCell>
                    <TableCell>{r.productName}</TableCell>
                    <TableCell>{fmt(r.quantity)}</TableCell>
                    <TableCell>{fmt(r.unitCost)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{fmt(r.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableBody>
                <TableRow sx={{ '& td': { fontWeight: 800, borderTop: '2px solid #cbd5e1' } }}>
                  <TableCell colSpan={5}>{t('reports.totalValue')}</TableCell>
                  <TableCell>{fmt(inventoryTotalValue)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )
        ) : tab === 2 ? (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('reports.topProducts')}</Typography>
              {topProducts.length === 0 ? <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box> : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>{t('common.sku')}</TableCell>
                      <TableCell>{t('common.name')}</TableCell>
                      <TableCell>{t('reports.quantitySold')}</TableCell>
                      <TableCell>{t('reports.revenue')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topProducts.map((r, idx) => (
                      <TableRow key={r.productId} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{r.sku}</TableCell>
                        <TableCell>{r.productName}</TableCell>
                        <TableCell>{fmt(r.totalQuantity)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{fmt(r.totalRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('reports.topCustomers')}</Typography>
              {topCustomers.length === 0 ? <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box> : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>{t('invoice.customer')}</TableCell>
                      <TableCell>{t('balances.invoiceCount')}</TableCell>
                      <TableCell>{t('common.total')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topCustomers.map((r, idx) => (
                      <TableRow key={r.partyId} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{r.partyName}</TableCell>
                        <TableCell>{r.invoiceCount}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{fmt(r.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('reports.topSuppliers')}</Typography>
              {topSuppliers.length === 0 ? <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box> : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>{t('invoice.supplier')}</TableCell>
                      <TableCell>{t('balances.invoiceCount')}</TableCell>
                      <TableCell>{t('common.total')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topSuppliers.map((r, idx) => (
                      <TableRow key={r.partyId} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{r.partyName}</TableCell>
                        <TableCell>{r.invoiceCount}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{fmt(r.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Box>
        ) : tab === 3 ? (
          movementRows.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box> : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('reports.period')}</TableCell>
                    <TableCell>{t('common.sku')}</TableCell>
                    <TableCell>{t('common.name')}</TableCell>
                    <TableCell>{t('reports.quantityIn')}</TableCell>
                    <TableCell>{t('reports.quantityOut')}</TableCell>
                    <TableCell>{t('reports.net')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movementRows.slice(movementPage * movementSize, movementPage * movementSize + movementSize).map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{r.period}</TableCell>
                      <TableCell>{r.sku}</TableCell>
                      <TableCell>{r.productName}</TableCell>
                      <TableCell sx={{ color: 'success.main' }}>{fmt(r.quantityIn)}</TableCell>
                      <TableCell sx={{ color: 'error.main' }}>{fmt(r.quantityOut)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{fmt(r.net)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination component="div" count={movementRows.length} page={movementPage}
                onPageChange={(_, p) => setMovementPage(p)} rowsPerPage={movementSize}
                onRowsPerPageChange={(e) => { setMovementSize(parseInt(e.target.value, 10)); setMovementPage(0); }}
                className="app-no-print" />
            </>
          )
        ) : tab === 4 ? (
          !taxSummary ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 3, p: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('reports.taxCollected')}</Typography>
                <Typography variant="h5">{fmt(taxSummary.taxCollected)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('reports.taxPaid')}</Typography>
                <Typography variant="h5">{fmt(taxSummary.taxPaid)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('reports.netPayable')}</Typography>
                <Typography variant="h5" color={Number(taxSummary.netPayable) >= 0 ? 'error.main' : 'success.main'}>
                  {fmt(taxSummary.netPayable)}
                </Typography>
              </Box>
            </Box>
          )
        ) : tab === 6 ? (
          !cashFlow ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
          ) : (
            <Box sx={{ p: 3, maxWidth: 480 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>{t('reports.openingCash')}</TableCell>
                    <TableCell align="left">{fmt(cashFlow.openingCash)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('reports.operatingActivities')}</TableCell>
                    <TableCell align="left" sx={{ color: Number(cashFlow.operatingNet) >= 0 ? 'success.main' : 'error.main' }}>
                      {fmt(cashFlow.operatingNet)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('reports.investingActivities')}</TableCell>
                    <TableCell align="left" sx={{ color: Number(cashFlow.investingNet) >= 0 ? 'success.main' : 'error.main' }}>
                      {fmt(cashFlow.investingNet)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('reports.financingActivities')}</TableCell>
                    <TableCell align="left" sx={{ color: Number(cashFlow.financingNet) >= 0 ? 'success.main' : 'error.main' }}>
                      {fmt(cashFlow.financingNet)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { fontWeight: 800, borderTop: '1px solid #cbd5e1' } }}>
                    <TableCell>{t('reports.netChange')}</TableCell>
                    <TableCell align="left">{fmt(cashFlow.netChange)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { fontWeight: 800, borderTop: '2px solid #cbd5e1' } }}>
                    <TableCell>{t('reports.closingCash')}</TableCell>
                    <TableCell align="left">{fmt(cashFlow.closingCash)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )
        ) : !balanceSheet ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 4, p: 3, flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 260 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('reports.assets')}</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>{t('reports.cashAndBank')}</TableCell>
                    <TableCell align="left">{fmt(balanceSheet.cashAndBank)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('reports.inventoryValue')}</TableCell>
                    <TableCell align="left">{fmt(balanceSheet.inventoryValue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('reports.accountsReceivable')}</TableCell>
                    <TableCell align="left">{fmt(balanceSheet.accountsReceivable)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('reports.fixedAssetsValue')}</TableCell>
                    <TableCell align="left">{fmt(balanceSheet.fixedAssetsValue)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { fontWeight: 800, borderTop: '2px solid #cbd5e1' } }}>
                    <TableCell>{t('reports.totalAssets')}</TableCell>
                    <TableCell align="left">{fmt(balanceSheet.totalAssets)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
            <Box sx={{ minWidth: 260 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('reports.liabilitiesAndEquity')}</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>{t('reports.accountsPayable')}</TableCell>
                    <TableCell align="left">{fmt(balanceSheet.accountsPayable)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { fontWeight: 800, borderTop: '1px solid #cbd5e1' } }}>
                    <TableCell>{t('reports.totalLiabilities')}</TableCell>
                    <TableCell align="left">{fmt(balanceSheet.totalLiabilities)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pt: 2 }}>{t('reports.equity')}</TableCell>
                    <TableCell align="left" sx={{ pt: 2 }}>{fmt(balanceSheet.equity)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { fontWeight: 800, borderTop: '2px solid #cbd5e1' } }}>
                    <TableCell>{t('reports.totalLiabilities')} + {t('reports.equity')}</TableCell>
                    <TableCell align="left">{fmt(Number(balanceSheet.totalLiabilities) + Number(balanceSheet.equity))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </Paper>

      <style>{`
        @media print {
          .app-print-title { display: block !important; }
          body { background: #fff; }
        }
      `}</style>
    </Box>
  );
}
