import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, CircularProgress, Stack, Button, Chip, LinearProgress, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import MoneyOffOutlinedIcon from '@mui/icons-material/MoneyOffOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import RequestPageOutlinedIcon from '@mui/icons-material/RequestPageOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCartOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ChevronIcon from '@mui/icons-material/ChevronLeftRounded';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import { dashboardApi, reportApi, salesInvoiceApi, purchaseInvoiceApi, vanApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

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
function money(v) {
  return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}
function sumRows(rows, key) {
  return (rows || []).reduce((s, r) => s + Number(r[key] || 0), 0);
}

/** بطاقة مؤشر رئيسية ملوّنة (مبيعات/ربح/نقد) - ترتفع وتلمع عند المرور. */
function KpiCard({ icon: Icon, label, value, sub, from, to, onClick, negative }) {
  return (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        p: 2.5, height: '100%', color: '#fff', borderRadius: 4, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        boxShadow: `0 12px 26px ${alpha(from, 0.28)}`,
        cursor: onClick ? 'pointer' : 'default', transition: 'transform .25s ease, box-shadow .25s ease',
        '&:hover': onClick ? { transform: 'translateY(-4px)', boxShadow: `0 18px 34px ${alpha(from, 0.4)}` } : undefined,
        '&::after': {
          content: '""', position: 'absolute', width: 140, height: 140, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.12)', top: -50, insetInlineEnd: -40,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, position: 'relative', zIndex: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, opacity: 0.92 }}>{label}</Typography>
        <Box sx={{
          width: 42, height: 42, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(255,255,255,0.2)',
        }}>
          <Icon />
        </Box>
      </Box>
      <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, position: 'relative', zIndex: 1, direction: 'ltr', textAlign: 'end' }}>
        {negative && Number(value) < 0 ? '−' : ''}{money(Math.abs(Number(value || 0)))}
      </Typography>
      {sub && <Typography sx={{ fontSize: 12.5, opacity: 0.85, mt: 0.75, position: 'relative', zIndex: 1 }}>{sub}</Typography>}
    </Paper>
  );
}

/** بطاقة صغيرة بيضاء بأيقونة ملونة (اللمحة المالية). */
function MiniStat({ icon: Icon, label, value, color, onClick }) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2, display: 'flex', alignItems: 'center', gap: 1.75, height: '100%', borderRadius: 3,
        cursor: onClick ? 'pointer' : 'default', transition: 'all .2s ease',
        '&:hover': onClick ? { borderColor: color, boxShadow: `0 8px 20px ${alpha(color, 0.18)}`, transform: 'translateY(-2px)' } : undefined,
      }}
    >
      <Box sx={{
        width: 46, height: 46, borderRadius: 2.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: alpha(color, 0.12), color,
      }}>
        <Icon />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{value}</Typography>
      </Box>
    </Paper>
  );
}

function Section({ title, icon: Icon, action, children, sx }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, height: '100%', ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {Icon && <Icon sx={{ color: 'primary.main', flexShrink: 0 }} />}
          <Typography variant="subtitle1" fontWeight={800} noWrap>{title}</Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

function SeeAll({ onClick, label }) {
  return (
    <Button size="small" onClick={onClick} endIcon={<ChevronIcon />} sx={{ fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {label}
    </Button>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isAr = i18n.language === 'ar';
  const [summary, setSummary] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [inventoryValue, setInventoryValue] = useState(null);
  const [todayFin, setTodayFin] = useState(null);
  const [monthFin, setMonthFin] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [vans, setVans] = useState([]);
  const [recentActivity, setRecentActivity] = useState(null);

  const canReports = hasPermission('REPORTS_VIEW');

  useEffect(() => {
    dashboardApi.summary().then(({ data }) => setSummary(data)).catch(() => setSummary({}));

    if (canReports) {
      reportApi.balanceSheet().then(({ data }) => setBalanceSheet(data)).catch(() => {});
      reportApi.inventoryValue({}).then(({ data }) => setInventoryValue(sumRows(data, 'value'))).catch(() => {});
      reportApi.financial({ from: todayIso(), to: todayIso(), groupBy: 'day' }).then(({ data }) => setTodayFin(data)).catch(() => {});
      reportApi.financial({ from: firstDayOfMonthIso(), to: todayIso(), groupBy: 'month' }).then(({ data }) => setMonthFin(data)).catch(() => {});
      reportApi.topProducts({ from: firstDayOfMonthIso(), to: todayIso(), limit: 5 }).then(({ data }) => setTopProducts(data)).catch(() => {});
    }
    if (hasPermission('VAN_VIEW')) {
      vanApi.list().then(({ data }) => setVans((data || []).filter((v) => v.active))).catch(() => {});
    }

    const calls = [];
    if (hasPermission('SALES_INVOICE_VIEW')) {
      calls.push(salesInvoiceApi.list({ page: 0, size: 6 }).then(({ data }) => data.content.map((inv) => ({
        id: `S${inv.id}`, type: 'sale', number: inv.invoiceNumber, party: inv.customerName, total: inv.grandTotal,
        createdAt: inv.createdAt, status: inv.status, by: inv.createdByName,
      }))));
    }
    if (hasPermission('PURCHASE_INVOICE_VIEW')) {
      calls.push(purchaseInvoiceApi.list({ page: 0, size: 6 }).then(({ data }) => data.content.map((inv) => ({
        id: `P${inv.id}`, type: 'purchase', number: inv.invoiceNumber, party: inv.supplierName, total: inv.grandTotal,
        createdAt: inv.createdAt, status: inv.status,
      }))));
    }
    if (calls.length > 0) {
      Promise.all(calls)
        .then((lists) => setRecentActivity(
          lists.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)
        ))
        .catch(() => setRecentActivity([]));
    } else {
      setRecentActivity([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = useMemo(() => {
    if (!summary?.last7DaysSales) return [];
    return summary.last7DaysSales.map((p) => ({
      label: new Date(`${p.date}T00:00:00`).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' }),
      total: Number(p.total || 0),
    }));
  }, [summary, isAr]);

  if (!summary) {
    return <Box sx={{ textAlign: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.goodMorning') : t('dashboard.goodEvening');
  const todayLabel = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const todayProfit = todayFin ? sumRows(todayFin, 'grossProfit') : null;
  const monthProfit = monthFin ? sumRows(monthFin, 'grossProfit') : null;
  const todayExpenses = todayFin ? sumRows(todayFin, 'expensesTotal') : 0;

  function goToTodaySales() {
    navigate('/sales-invoices', { state: { prefillFrom: todayIso(), prefillTo: todayIso() } });
  }
  function goToMonthSales() {
    navigate('/sales-invoices', { state: { prefillFrom: firstDayOfMonthIso(), prefillTo: todayIso() } });
  }

  const quickActions = [
    { label: t('dashboard.newSale'), icon: ReceiptLongOutlinedIcon, to: '/sales-invoices', permission: 'SALES_INVOICE_CREATE' },
    { label: t('dashboard.loadVan'), icon: LocalShippingOutlinedIcon, to: '/vans?tab=loads', permission: 'VAN_LOAD' },
    { label: t('dashboard.newPurchase'), icon: AddShoppingCartIcon, to: '/purchase-invoices', permission: 'PURCHASE_INVOICE_CREATE' },
  ].filter((a) => hasPermission(a.permission));

  // ما يحتاج انتباه: نقص مخزون، تنبيهات، ديون العملاء والموردين، عجز السائقين، سيارات فيها بضاعة
  const pendingShortages = vans.reduce((s, v) => s + Number(v.pendingShortageValue || 0), 0);
  const attention = [
    hasPermission('STOCK_VIEW') && { key: 'low', icon: WarningAmberOutlinedIcon, color: '#f59e0b', label: t('dashboard.lowStock'),
      value: summary.lowStockCount ?? 0, onClick: () => navigate('/stock', { state: { prefillLowOnly: true } }) },
    hasPermission('NOTIFICATION_VIEW') && { key: 'notif', icon: NotificationsOutlinedIcon, color: '#6366f1', label: t('dashboard.notifications'),
      value: summary.unreadNotificationsCount ?? 0, onClick: () => navigate('/notifications') },
    balanceSheet && { key: 'ar', icon: TrendingUpOutlinedIcon, color: '#0ea5e9', label: t('dashboard.customersOwe'),
      value: money(balanceSheet.accountsReceivable), onClick: () => navigate('/finance?tab=balances') },
    balanceSheet && { key: 'ap', icon: TrendingDownOutlinedIcon, color: '#ef4444', label: t('dashboard.weOweSuppliers'),
      value: money(balanceSheet.accountsPayable), onClick: () => navigate('/finance?tab=balances') },
    hasPermission('VAN_VIEW') && pendingShortages > 0 && { key: 'short', icon: MoneyOffOutlinedIcon, color: '#dc2626', label: t('dashboard.driverShortages'),
      value: money(pendingShortages), onClick: () => navigate('/vans?tab=shortages') },
  ].filter(Boolean);

  const quickLinks = [
    { key: 'salesInvoices', to: '/sales-invoices', label: t('nav.sales'), icon: ReceiptLongOutlinedIcon, color: '#10b981', permission: 'SALES_INVOICE_VIEW' },
    { key: 'purchaseInvoices', to: '/purchase-invoices', label: t('nav.purchases'), icon: ShoppingCartOutlinedIcon, color: '#ef4444', permission: 'PURCHASE_INVOICE_VIEW' },
    { key: 'vans', to: '/vans', label: t('nav.vans'), icon: LocalShippingOutlinedIcon, color: '#f59e0b', permission: 'VAN_VIEW' },
    { key: 'products', to: '/products', label: t('nav.products'), icon: Inventory2OutlinedIcon, color: '#8b5cf6', permission: 'PRODUCT_VIEW' },
    { key: 'stock', to: '/stock', label: t('nav.stockHub'), icon: WarehouseOutlinedIcon, color: '#0ea5e9', permission: 'STOCK_VIEW' },
    { key: 'stocktake', to: '/stock?tab=stocktake', label: t('nav.stocktake'), icon: FactCheckOutlinedIcon, color: '#0891b2', permission: 'STOCKTAKE_VIEW' },
    { key: 'parties', to: '/parties', label: t('nav.parties'), icon: PeopleAltOutlinedIcon, color: '#ec4899', permission: 'CUSTOMER_MANAGE' },
    { key: 'expenses', to: '/finance?tab=expenses', label: t('nav.expenses'), icon: MoneyOffOutlinedIcon, color: '#f97316', permission: 'EXPENSE_VIEW' },
    { key: 'accounts', to: '/finance?tab=accounts', label: t('nav.accounts'), icon: AccountBalanceOutlinedIcon, color: '#14b8a6', permission: 'ACCOUNTS_VIEW' },
    { key: 'checks', to: '/finance?tab=checks', label: t('nav.checks'), icon: RequestPageOutlinedIcon, color: '#6366f1', permission: 'CHECKS_VIEW' },
    { key: 'reports', to: '/reports', label: t('nav.reports'), icon: AssessmentOutlinedIcon, color: '#1d4ed8', permission: 'REPORTS_VIEW' },
  ].filter((l) => hasPermission(l.permission));

  const maxTop = Math.max(1, ...topProducts.map((p) => Number(p.totalRevenue || 0)));

  return (
    <Box>
      {/* ===== الترحيب + إجراءات سريعة ===== */}
      <Paper elevation={0} sx={{
        p: { xs: 2.5, md: 3.5 }, mb: 3, borderRadius: 5, color: '#fff', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0b1f4d 0%, #1d4ed8 55%, #0e9f9a 100%)',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <LocalShippingOutlinedIcon sx={{
          position: 'absolute', fontSize: 190, opacity: 0.08, bottom: -40, insetInlineEnd: 20, pointerEvents: 'none',
          transform: isAr ? 'scaleX(-1)' : 'none',
        }} />
        <Box sx={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: 14, opacity: 0.8, mb: 0.5 }}>{todayLabel}</Typography>
            <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 800, lineHeight: 1.25 }}>
              {greeting}، {user?.fullName} 👋
            </Typography>
            <Typography sx={{ fontSize: 14, opacity: 0.85, mt: 0.75 }}>
              {t('dashboard.heroLine', { count: summary.todayInvoicesCount ?? 0, total: money(summary.todaySales) })}
            </Typography>
          </Box>
          {quickActions.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {quickActions.map((a) => (
                <Button key={a.to} onClick={() => navigate(a.to)} startIcon={<a.icon />}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(6px)', px: 2, py: 1, fontWeight: 700, ms: '0 !important',
                    '&:hover': { bgcolor: '#f59e0b', borderColor: '#f59e0b', color: '#fff', transform: 'translateY(-2px)' },
                  }}>
                  {a.label}
                </Button>
              ))}
            </Stack>
          )}
        </Box>
      </Paper>

      {/* ===== المؤشرات الرئيسية ===== */}
      <Grid container spacing={2}>
        {hasPermission('SALES_INVOICE_VIEW') && (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard icon={PaidOutlinedIcon} label={t('dashboard.todaySales')} value={summary.todaySales}
              sub={t('dashboard.invoicesCount', { count: summary.todayInvoicesCount ?? 0 })}
              from="#059669" to="#10b981" onClick={goToTodaySales} />
          </Grid>
        )}
        {canReports && (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard icon={InsightsOutlinedIcon} label={t('dashboard.todayProfit')} value={todayProfit ?? 0} negative
              sub={t('dashboard.afterCostAndExpenses', { expenses: money(todayExpenses) })}
              from={todayProfit < 0 ? '#b91c1c' : '#1e3a8a'} to={todayProfit < 0 ? '#f43f5e' : '#2563eb'}
              onClick={() => navigate('/reports')} />
          </Grid>
        )}
        {hasPermission('SALES_INVOICE_VIEW') && (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard icon={CalendarMonthOutlinedIcon} label={t('dashboard.monthSales')} value={summary.monthSales}
              sub={monthProfit != null ? t('dashboard.monthProfit', { profit: money(monthProfit) }) : null}
              from="#6d28d9" to="#a855f7" onClick={goToMonthSales} />
          </Grid>
        )}
        {balanceSheet && (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard icon={AccountBalanceWalletOutlinedIcon} label={t('reports.cashAndBank')} value={balanceSheet.cashAndBank}
              sub={t('dashboard.cashHint')} from="#c2410c" to="#f59e0b" onClick={() => navigate('/finance?tab=accounts')} />
          </Grid>
        )}
      </Grid>

      {/* ===== الرسم البياني + بحاجة لانتباهك ===== */}
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        {hasPermission('SALES_INVOICE_VIEW') && chartData.length > 0 && (
          <Grid size={{ xs: 12, md: attention.length ? 8 : 12 }}>
            <Section title={t('dashboard.salesTrend')} icon={InsightsOutlinedIcon}>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0e9f9a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false}
                      reversed={isAr} />
                    <YAxis width={50} orientation={isAr ? 'right' : 'left'} axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickFormatter={(v) => money(v)} />
                    <Tooltip formatter={(v) => [money(v), t('dashboard.sales')]} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                    <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fill="url(#salesTrendGradient)"
                      dot={{ r: 4, fill: '#fff', stroke: '#2563eb', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#f97316', stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Section>
          </Grid>
        )}
        {attention.length > 0 && (
          <Grid size={{ xs: 12, md: chartData.length ? 4 : 12 }}>
            <Section title={t('dashboard.needsAttention')} icon={WarningAmberOutlinedIcon}>
              <Stack spacing={1}>
                {attention.map((a) => (
                  <Box key={a.key} onClick={a.onClick} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2.5, cursor: 'pointer',
                    bgcolor: alpha(a.color, 0.06), border: `1px solid ${alpha(a.color, 0.14)}`, transition: 'all .2s ease',
                    '&:hover': { bgcolor: alpha(a.color, 0.14), transform: isAr ? 'translateX(-4px)' : 'translateX(4px)' },
                  }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: a.color, color: '#fff', flexShrink: 0,
                    }}>
                      <a.icon fontSize="small" />
                    </Box>
                    <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{a.label}</Typography>
                    <Typography fontWeight={800} sx={{ color: a.color }}>{a.value}</Typography>
                  </Box>
                ))}
              </Stack>
            </Section>
          </Grid>
        )}
      </Grid>

      {/* ===== سيارات التوزيع اليوم ===== */}
      {hasPermission('VAN_VIEW') && vans.length > 0 && (
        <Section title={t('dashboard.vansToday')} icon={LocalShippingOutlinedIcon} sx={{ mt: 2, height: 'auto' }}
          action={<SeeAll onClick={() => navigate('/vans')} label={t('dashboard.seeAll')} />}>
          <Grid container spacing={1.5}>
            {vans.map((v) => {
              const loaded = Number(v.stockQuantity || 0) > 0;
              return (
                <Grid key={v.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Box onClick={() => navigate('/vans')} sx={{
                    p: 1.75, borderRadius: 3, cursor: 'pointer', border: '1px solid', borderColor: 'divider', height: '100%',
                    transition: 'all .2s ease', position: 'relative', overflow: 'hidden',
                    '&:hover': { borderColor: '#f59e0b', boxShadow: '0 10px 22px rgba(245,158,11,0.18)', transform: 'translateY(-2px)' },
                    '&::before': { content: '""', position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 4,
                      bgcolor: loaded ? '#10b981' : '#94a3b8' },
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: alpha('#f59e0b', 0.14), color: '#d97706', flexShrink: 0,
                      }}>
                        <LocalShippingOutlinedIcon />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography fontWeight={800} noWrap>{v.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          {v.plateNumber} · {v.driverName || t('dashboard.noDriver')}
                        </Typography>
                      </Box>
                      <Chip size="small" label={loaded ? t('dashboard.loaded') : t('dashboard.empty')}
                        sx={{ fontWeight: 700, bgcolor: loaded ? alpha('#10b981', 0.14) : alpha('#94a3b8', 0.18), color: loaded ? '#047857' : '#475569' }} />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, textAlign: 'center' }}>
                      {[
                        [t('dashboard.sales'), money(v.todaySalesTotal)],
                        [t('dashboard.invoices'), v.todayInvoiceCount ?? 0],
                        [t('dashboard.inBox'), money(v.cashBalance)],
                      ].map(([k, val]) => (
                        <Box key={k} sx={{ bgcolor: 'background.default', borderRadius: 2, py: 0.75 }}>
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{k}</Typography>
                          <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{val}</Typography>
                        </Box>
                      ))}
                    </Box>
                    {Number(v.pendingShortageValue || 0) > 0 && (
                      <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, display: 'block', mt: 1 }}>
                        {t('dashboard.pendingShortage', { value: money(v.pendingShortageValue) })}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Section>
      )}

      {/* ===== الأكثر مبيعاً + آخر الحركات ===== */}
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        {canReports && (
          <Grid size={{ xs: 12, md: 5 }}>
            <Section title={t('dashboard.topProductsMonth')} icon={EmojiEventsOutlinedIcon}
              action={<SeeAll onClick={() => navigate('/reports')} label={t('dashboard.seeAll')} />}>
              {topProducts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t('dashboard.noSalesYet')}</Typography>
              ) : (
                <Stack spacing={1.75}>
                  {topProducts.map((p, i) => {
                    const colors = ['#f59e0b', '#1d4ed8', '#10b981', '#8b5cf6', '#ec4899'];
                    return (
                      <Box key={p.productId}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Box sx={{
                            width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: 800, color: '#fff',
                            bgcolor: colors[i % colors.length], display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{i + 1}</Box>
                          <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }} noWrap>{p.productName}</Typography>
                          <Typography variant="caption" color="text.secondary">{money(p.totalQuantity)} {t('dashboard.pcs')}</Typography>
                          <Typography variant="body2" fontWeight={800} sx={{ minWidth: 60, textAlign: 'end' }}>{money(p.totalRevenue)}</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={(Number(p.totalRevenue || 0) / maxTop) * 100}
                          sx={{ height: 7, borderRadius: 4, bgcolor: alpha(colors[i % colors.length], 0.12),
                            '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: colors[i % colors.length] } }} />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Section>
          </Grid>
        )}
        {recentActivity && recentActivity.length > 0 && (
          <Grid size={{ xs: 12, md: canReports ? 7 : 12 }}>
            <Section title={t('dashboard.recentActivity')} icon={ReceiptLongOutlinedIcon}>
              <Stack spacing={0.75}>
                {recentActivity.map((item) => {
                  const isSale = item.type === 'sale';
                  const Icon = isSale ? ReceiptLongOutlinedIcon : ShoppingCartOutlinedIcon;
                  const color = isSale ? '#10b981' : '#ef4444';
                  const cancelled = item.status === 'CANCELLED';
                  return (
                    <Box
                      key={item.id}
                      onClick={() => navigate(isSale ? '/sales-invoices' : '/purchase-invoices')}
                      sx={{
                        p: 1.25, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', borderRadius: 2.5,
                        transition: 'background .2s ease', '&:hover': { bgcolor: alpha(color, 0.07) },
                      }}
                    >
                      <Box sx={{
                        width: 38, height: 38, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: alpha(color, 0.12), color, flexShrink: 0,
                      }}>
                        <Icon fontSize="small" />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {item.party || (isSale ? t('dashboard.cashCustomer') : t('dashboard.purchase'))}
                          {item.by && <Typography component="span" variant="caption" color="text.secondary"> · {item.by}</Typography>}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {isSale ? t('dashboard.sale') : t('dashboard.purchase')} · {new Date(item.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </Typography>
                      </Box>
                      {cancelled && <Chip size="small" label={t('dashboard.cancelled')} color="default" sx={{ fontWeight: 700 }} />}
                      <Typography variant="body2" fontWeight={800} sx={{
                        flexShrink: 0, color: cancelled ? 'text.disabled' : color, textDecoration: cancelled ? 'line-through' : 'none',
                      }}>
                        {isSale ? '+' : '−'}{money(item.total)}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Section>
          </Grid>
        )}
      </Grid>

      {/* ===== اللمحة المالية ===== */}
      {balanceSheet && (
        <>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 3, mb: 1.5 }}>{t('dashboard.financialSnapshot')}</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MiniStat icon={WarehouseOutlinedIcon} color="#8b5cf6" label={t('dashboard.inventoryValue')}
                value={money(inventoryValue)} onClick={() => navigate('/reports')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MiniStat icon={TrendingUpOutlinedIcon} color="#0ea5e9" label={t('reports.accountsReceivable')}
                value={money(balanceSheet.accountsReceivable)} onClick={() => navigate('/finance?tab=balances')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MiniStat icon={TrendingDownOutlinedIcon} color="#ef4444" label={t('reports.accountsPayable')}
                value={money(balanceSheet.accountsPayable)} onClick={() => navigate('/finance?tab=balances')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MiniStat icon={AccountBalanceOutlinedIcon} color="#10b981" label={t('dashboard.netWorth')}
                value={money(balanceSheet.equity)} onClick={() => navigate('/reports')} />
            </Grid>
          </Grid>
        </>
      )}

      {/* ===== روابط سريعة ===== */}
      {quickLinks.length > 0 && (
        <>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 3, mb: 1.5 }}>{t('dashboard.quickLinks')}</Typography>
          <Grid container spacing={1.5}>
            {quickLinks.map((l) => (
              <Grid key={l.key} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                <Paper variant="outlined" onClick={() => navigate(l.to)} sx={{
                  p: 1.75, display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer', borderRadius: 3, height: '100%',
                  transition: 'all .2s ease',
                  '& .ql-icon': { transition: 'all .2s ease' },
                  '&:hover': {
                    borderColor: l.color, bgcolor: alpha(l.color, 0.06), transform: 'translateY(-2px)',
                    '& .ql-icon': { bgcolor: l.color, color: '#fff' },
                  },
                }}>
                  <Box className="ql-icon" sx={{
                    width: 38, height: 38, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: alpha(l.color, 0.12), color: l.color, flexShrink: 0,
                  }}>
                    <l.icon fontSize="small" />
                  </Box>
                  <Typography variant="body2" fontWeight={700} noWrap>{l.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
