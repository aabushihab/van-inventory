import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Grid, Alert,
  CircularProgress, IconButton, Tooltip, RadioGroup, Radio, FormControlLabel,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { useTranslation } from 'react-i18next';
import { vanShortageApi, vanApi, accountApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import PageGuide from '../components/PageGuide';
import { getErrorMessage } from '../utils/apiError';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
const STATUS_COLORS = { PENDING: 'error', SALARY_DEDUCTED: 'info', PAID: 'success', WAIVED: 'default' };

/** عجز السائقين: ملخص لكل سائق + سجل العجوزات وحسمها (خصم من الراتب / دفع نقدي / مسامحة). */
export default function VanShortagesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canSettle = hasPermission('VAN_MANAGE');
  const now = new Date();

  const [summary, setSummary] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [status, setStatus] = useState('PENDING');
  const [vanId, setVanId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vans, setVans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState(null);
  const [settleRow, setSettleRow] = useState(null);
  const [method, setMethod] = useState('SALARY_DEDUCTED');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [{ data: s }, { data: list }] = await Promise.all([
        vanShortageApi.summary(),
        vanShortageApi.list({ page, size, status, vanId, driverId }),
      ]);
      setSummary(s);
      setRows(list.content);
      setTotal(list.totalElements);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, size, status, vanId, driverId]);
  useEffect(() => {
    vanApi.list().then(({ data }) => setVans(data)).catch(() => {});
    accountApi.list().then(({ data }) => setAccounts(data)).catch(() => {});
  }, []);

  function openSettle(row) {
    setSettleRow(row);
    setMethod(row.driverId ? 'SALARY_DEDUCTED' : 'PAID');
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setAccountId(accounts[0]?.id || '');
    setNote('');
    setDialogError('');
  }

  async function submitSettle() {
    setSaving(true);
    setDialogError('');
    try {
      await vanShortageApi.settle(settleRow.id, {
        method, note,
        salaryYear: method === 'SALARY_DEDUCTED' ? Number(year) : null,
        salaryMonth: method === 'SALARY_DEDUCTED' ? Number(month) : null,
        accountId: method === 'PAID' ? accountId : null,
      });
      setSettleRow(null);
      await load();
    } catch (e) {
      setDialogError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function reopen(row) {
    if (!window.confirm(t('shortages.confirmReopen'))) return;
    try {
      await vanShortageApi.reopen(row.id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }

  function settlementText(r) {
    if (r.status === 'SALARY_DEDUCTED') return t('shortages.deductedFrom', { month: `${r.salaryYear}-${String(r.salaryMonth).padStart(2, '0')}` });
    if (r.status === 'PAID') return `${t('shortages.paidTo')}: ${r.accountName || '-'}`;
    if (r.status === 'WAIVED') return r.settlementNote || '';
    return '';
  }

  const pricingLabel = (p) => (p === 'COST' ? t('shortages.pricingCost') : t('shortages.pricingSale'));

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{t('shortages.title')}</Typography>
      <PageGuide points={t('shortages.guide', { returnObjects: true })} />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ملخص لكل سائق - الضغط عليه يفلتر السجل */}
      {summary.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {summary.map((s) => (
            <Grid key={`${s.driverId}-${s.driverName}`} size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper variant="outlined" onClick={() => { setDriverId(driverId === s.driverId ? '' : (s.driverId || '')); setPage(0); }}
                sx={{ p: 2, cursor: s.driverId ? 'pointer' : 'default', borderColor: driverId && driverId === s.driverId ? 'primary.main' : undefined,
                  borderWidth: driverId && driverId === s.driverId ? 2 : 1 }}>
                <Typography fontWeight={800}>{s.driverName || '-'}</Typography>
                <Typography variant="body2" color="text.secondary">{t('shortages.pendingOn')}</Typography>
                <Typography variant="h6" fontWeight={800} color={Number(s.pendingValue) > 0 ? 'error.main' : 'success.main'}>
                  {fmt(s.pendingValue)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('shortages.counts', { pending: s.pendingCount, total: s.totalCount, value: fmt(s.totalValue) })}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField select size="small" label={t('common.status')} value={status} sx={{ minWidth: 180 }}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <MenuItem value="">{t('shortages.allStatuses')}</MenuItem>
          {['PENDING', 'SALARY_DEDUCTED', 'PAID', 'WAIVED'].map((s) => <MenuItem key={s} value={s}>{t(`shortages.status.${s}`)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t('vanLoads.van')} value={vanId} sx={{ minWidth: 200 }}
          onChange={(e) => { setVanId(e.target.value); setPage(0); }}>
          <MenuItem value="">{t('vanLoads.allVans')}</MenuItem>
          {vans.map((v) => <MenuItem key={v.id} value={v.id}>{v.code} - {v.name}</MenuItem>)}
        </TextField>
        {driverId && <Chip label={t('shortages.filteredByDriver')} onDelete={() => setDriverId('')} />}
      </Box>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('shortages.none')}</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.createdAt')}</TableCell>
                <TableCell>{t('vanLoads.van')}</TableCell>
                <TableCell>{t('vans.driver')}</TableCell>
                <TableCell>{t('shortages.items')}</TableCell>
                <TableCell>{t('shortages.value')}</TableCell>
                <TableCell>{t('shortages.pricing')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('shortages.settlement')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{r.vanName} <Typography component="span" variant="caption" color="text.secondary" dir="ltr">({r.plateNumber})</Typography></TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{r.driverName || '-'}</TableCell>
                  <TableCell>{r.items.length}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: r.status === 'PENDING' ? 'error.main' : undefined }}>{fmt(r.totalValue)}</TableCell>
                  <TableCell>{pricingLabel(r.pricing)}</TableCell>
                  <TableCell><Chip size="small" color={STATUS_COLORS[r.status]} variant={r.status === 'PENDING' ? 'filled' : 'outlined'} label={t(`shortages.status.${r.status}`)} /></TableCell>
                  <TableCell sx={{ maxWidth: 240 }}><Typography variant="body2" noWrap title={settlementText(r)}>{settlementText(r)}</Typography></TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={t('shortages.details')}><IconButton size="small" onClick={() => setView(r)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                    {canSettle && r.status === 'PENDING' && (
                      <Button size="small" variant="contained" disableElevation onClick={() => openSettle(r)}>{t('shortages.settle')}</Button>
                    )}
                    {canSettle && r.status !== 'PENDING' && (
                      <Tooltip title={t('shortages.reopen')}><IconButton size="small" onClick={() => reopen(r)}><UndoIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size} onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }} />
      </Paper>

      {/* تفاصيل العجز */}
      <Dialog open={!!view} onClose={() => setView(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('shortages.details')} — {view?.driverName}</DialogTitle>
        <DialogContent dividers>
          {view && (
            <Box>
              <Typography variant="body2">{t('vanLoads.van')}: {view.vanName} · {new Date(view.createdAt).toLocaleString()}</Typography>
              <Typography variant="body2">{t('shortages.pricing')}: {pricingLabel(view.pricing)} · {t('vanLoads.createdBy')}: {view.createdByName || '-'}</Typography>
              {view.notes && <Typography variant="body2">{t('common.notes')}: {view.notes}</Typography>}
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.name')}</TableCell>
                    <TableCell>{t('shortages.missingQty')}</TableCell>
                    <TableCell>{t('common.price')}</TableCell>
                    <TableCell>{t('shortages.value')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.items.map((it) => (
                    <TableRow key={it.productId}>
                      <TableCell>{it.productName}</TableCell>
                      <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>{fmt(it.quantity)}</TableCell>
                      <TableCell>{fmt(it.unitPrice)}</TableCell>
                      <TableCell>{fmt(it.lineValue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} sx={{ fontWeight: 800 }}>{t('common.total')}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{fmt(view.totalValue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {view.status !== 'PENDING' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {t(`shortages.status.${view.status}`)} — {settlementText(view)}
                  {view.settledByName && ` · ${view.settledByName}`}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setView(null)}>{t('common.close')}</Button></DialogActions>
      </Dialog>

      {/* حسم العجز */}
      <Dialog open={!!settleRow} onClose={() => setSettleRow(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('shortages.settle')} — {settleRow?.driverName} ({fmt(settleRow?.totalValue)})</DialogTitle>
        <DialogContent dividers>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
            <FormControlLabel value="SALARY_DEDUCTED" disabled={!settleRow?.driverId} control={<Radio />} label={t('shortages.methodSalary')} />
            <FormControlLabel value="PAID" control={<Radio />} label={t('shortages.methodPaid')} />
            <FormControlLabel value="WAIVED" control={<Radio />} label={t('shortages.methodWaived')} />
          </RadioGroup>
          {method === 'SALARY_DEDUCTED' && (
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField select label={t('employees.month')} value={month} onChange={(e) => setMonth(e.target.value)} sx={{ minWidth: 120 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <MenuItem key={m} value={m}>{String(m).padStart(2, '0')}</MenuItem>)}
              </TextField>
              <TextField type="number" label={t('employees.year')} value={year} onChange={(e) => setYear(e.target.value)} sx={{ maxWidth: 140 }} />
            </Box>
          )}
          {method === 'PAID' && (
            <TextField select fullWidth sx={{ mt: 2 }} label={t('shortages.account')} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
            </TextField>
          )}
          <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} required={method === 'WAIVED'}
            label={method === 'WAIVED' ? t('shortages.waiveReason') : t('common.notes')} value={note} onChange={(e) => setNote(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettleRow(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submitSettle}
            disabled={saving || (method === 'PAID' && !accountId) || (method === 'WAIVED' && !note.trim())}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
