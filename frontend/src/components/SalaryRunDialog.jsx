import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Checkbox, TextField, MenuItem, Alert, CircularProgress, Box, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { expenseApi, accountApi } from '../api/endpoints';
import { getErrorMessage } from '../utils/apiError';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * صرف رواتب شهر لجميع الموظفين المفعّلين دفعة واحدة: قائمة بالمتبقي لكل موظف (الراتب - المستلم - خصم العجز)،
 * مع إمكانية استثناء أحدهم، والإجمالي، وتأكيد قبل الصرف. غير المفعّلين لا يظهرون ولا يُصرف لهم.
 */
export default function SalaryRunDialog({ open, year, month, onClose, onDone }) {
  const { t } = useTranslation();
  const [lines, setLines] = useState([]);
  const [selected, setSelected] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const monthLabel = `${year}-${String(month).padStart(2, '0')}`;

  useEffect(() => {
    if (!open) return;
    setError(''); setResult(null); setPaymentDate(todayIso());
    setLoading(true);
    Promise.all([expenseApi.salaryRunPreview(year, month), accountApi.list()])
      .then(([{ data: preview }, { data: accs }]) => {
        setLines(preview);
        setSelected(Object.fromEntries(preview.filter((l) => Number(l.remaining) > 0).map((l) => [l.employeeId, true])));
        // صناديق السيارات لا تُستخدم لصرف الرواتب
        const main = accs.filter((a) => !String(a.name).startsWith('صندوق سيارة'));
        setAccounts(main);
        setAccountId(main[0]?.id || '');
      })
      .catch((e) => setError(getErrorMessage(e, t('common.error'))))
      .finally(() => setLoading(false));
  }, [open, year, month]);

  const chosen = useMemo(() => lines.filter((l) => selected[l.employeeId] && Number(l.remaining) > 0), [lines, selected]);
  const total = chosen.reduce((s, l) => s + Number(l.remaining), 0);

  async function pay() {
    if (!window.confirm(t('salaryRun.confirmQuestion', { total: fmt(total), count: chosen.length, month: monthLabel }))) return;
    setSaving(true); setError('');
    try {
      const { data } = await expenseApi.salaryRun({
        year, month, accountId, paymentDate, employeeIds: chosen.map((l) => l.employeeId),
      });
      setResult(data);
      if (onDone) onDone();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('salaryRun.title', { month: monthLabel })}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {result ? (
          <Alert severity="success">{t('salaryRun.done', { total: fmt(result.totalPaid), count: result.paidCount })}</Alert>
        ) : loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">{t('salaryRun.select')}</TableCell>
                  <TableCell>{t('salaryRun.employee')}</TableCell>
                  <TableCell>{t('salaryRun.salary')}</TableCell>
                  <TableCell>{t('salaryRun.paid')}</TableCell>
                  <TableCell>{t('salaryRun.deduction')}</TableCell>
                  <TableCell>{t('salaryRun.remaining')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l) => {
                  const none = Number(l.remaining) <= 0;
                  return (
                    <TableRow key={l.employeeId} hover sx={none ? { opacity: 0.5 } : undefined}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" disabled={none} checked={!!selected[l.employeeId] && !none}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [l.employeeId]: e.target.checked }))} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{l.name}</Typography>
                        {l.position && <Typography variant="caption" color="text.secondary">{t(`employees.positions.${l.position}`, l.position)}</Typography>}
                      </TableCell>
                      <TableCell>{fmt(l.monthlySalary)}</TableCell>
                      <TableCell>{fmt(l.paid)}</TableCell>
                      <TableCell sx={{ color: Number(l.shortageDeduction) > 0 ? 'error.main' : 'text.secondary' }}>
                        {Number(l.shortageDeduction) > 0 ? fmt(l.shortageDeduction) : '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{fmt(l.remaining)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={5} sx={{ fontWeight: 800 }}>{t('salaryRun.total')} ({chosen.length})</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 16, color: 'primary.main' }}>{fmt(total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {chosen.length === 0 && <Alert severity="info" sx={{ mt: 2 }}>{t('salaryRun.nothing')}</Alert>}
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              <TextField select size="small" label={t('salaryRun.account')} value={accountId} onChange={(e) => setAccountId(e.target.value)} sx={{ minWidth: 220 }}>
                {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label={t('salaryRun.paymentDate')} value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{t('salaryRun.inactiveNote')}</Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
        {!result && (
          <Button variant="contained" onClick={pay} disabled={saving || loading || chosen.length === 0 || !accountId}>
            {saving ? <CircularProgress size={20} /> : t('salaryRun.confirm', { count: chosen.length, total: fmt(total) })}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
