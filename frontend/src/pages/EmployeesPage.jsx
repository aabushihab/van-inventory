import { useEffect, useState } from 'react';
import {
  Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Alert,
  CircularProgress, Avatar, Typography, Divider, Grid,
} from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import UploadIcon from '@mui/icons-material/UploadOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import { useTranslation } from 'react-i18next';
import CrudPage from '../components/CrudPage';
import { employeeApi, expenseApi, accountApi, fetchAndOpenPdf, vanShortageApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/apiError';
import { compressImage } from '../utils/imageCompress';

const PAY_CATEGORIES = ['رواتب', 'سلفة'];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function monthBounds(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyPayForm() {
  return { category: 'رواتب', amount: '', paymentDate: todayIso(), notes: '', receiptImage: '', accountId: '' };
}

/** وظائف الموظفين - نفس القائمة المعتمدة في الخلفية. */
export const EMPLOYEE_POSITIONS = ['DRIVER', 'SALESMAN', 'WAREHOUSE_KEEPER', 'ACCOUNTANT', 'CASHIER', 'MANAGER', 'WORKER', 'OTHER'];

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManageExpenses = hasPermission('EXPENSE_MANAGE');
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [detailsEmployee, setDetailsEmployee] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState('');
  const [viewImage, setViewImage] = useState('');
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
  const [periodYear, setPeriodYear] = useState(currentYear);
  const [paidSummary, setPaidSummary] = useState({});
  const [listYear, setListYear] = useState(currentYear);
  const [listMonth, setListMonth] = useState(currentMonth);
  const [yearlyPaidSummary, setYearlyPaidSummary] = useState({});
  // خصومات عجز السائقين على راتب الشهر المعروض
  const [shortageDeductions, setShortageDeductions] = useState({});
  const [statementEmployee, setStatementEmployee] = useState(null);
  const [statementYear, setStatementYear] = useState(currentYear);
  const [statementHistory, setStatementHistory] = useState([]);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [statementError, setStatementError] = useState('');
  const [accounts, setAccounts] = useState([]);

  useEffect(() => { accountApi.list().then(({ data }) => setAccounts(data)).catch(() => {}); }, []);

  function refreshSummaries() {
    const { from, to } = monthBounds(listYear, listMonth);
    expenseApi.salaryPaidSummary({ from, to }).then(({ data }) => setPaidSummary(data)).catch(() => {});
    expenseApi.salaryPaidSummary({ from: `${listYear}-01-01`, to: `${listYear}-12-31` })
      .then(({ data }) => setYearlyPaidSummary(data)).catch(() => {});
    vanShortageApi.salaryDeductions(listYear, listMonth).then(({ data }) => setShortageDeductions(data)).catch(() => setShortageDeductions({}));
  }

  useEffect(() => { refreshSummaries(); }, [listYear, listMonth]);

  async function loadHistory(employeeId) {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const { data } = await expenseApi.byEmployee(employeeId);
      setHistory(data);
    } catch (e) {
      setHistoryError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoadingHistory(false);
    }
  }

  function openDetails(row) {
    setDetailsEmployee(row);
    setPayForm(emptyPayForm());
    setPayError('');
    setPeriodMonth(new Date().getMonth() + 1);
    setPeriodYear(new Date().getFullYear());
    loadHistory(row.id);
  }

  function closeDetails() {
    setDetailsEmployee(null);
    setHistory([]);
  }

  async function openStatement(row) {
    setStatementEmployee(row);
    setStatementYear(new Date().getFullYear());
    setStatementError('');
    setLoadingStatement(true);
    try {
      const { data } = await expenseApi.byEmployee(row.id);
      setStatementHistory(data);
    } catch (e) {
      setStatementError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoadingStatement(false);
    }
  }

  function closeStatement() {
    setStatementEmployee(null);
    setStatementHistory([]);
  }

  const statementRows = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const paid = statementHistory
      .filter((h) => PAY_CATEGORIES.includes(h.category) && Number(h.salaryPeriod?.slice(0, 4)) === statementYear
        && Number(h.salaryPeriod?.slice(5, 7)) === month)
      .reduce((sum, h) => sum + Number(h.amount || 0), 0);
    const salary = Number(statementEmployee?.monthlySalary || 0);
    return { month, paid, remaining: salary - paid };
  });
  const statementYearTotal = statementRows.reduce((sum, r) => sum + r.paid, 0);

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setPayError(t('expenses.imageTooLarge'));
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPayForm((f) => ({ ...f, receiptImage: compressed }));
    } catch {
      setPayError(t('expenses.imageTooLarge'));
    }
  }

  const filteredHistory = history.filter((h) => Number(h.salaryPeriod?.slice(0, 4)) === periodYear
    && Number(h.salaryPeriod?.slice(5, 7)) === periodMonth);
  const paidThisMonth = filteredHistory
    .filter((h) => PAY_CATEGORIES.includes(h.category))
    .reduce((sum, h) => sum + Number(h.amount || 0), 0);
  const remaining = Number(detailsEmployee?.monthlySalary || 0) - paidThisMonth;

  async function handleRowVoucherUpload(row, e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setHistoryError(t('expenses.imageTooLarge'));
      return;
    }
    try {
      const compressed = await compressImage(file);
      await expenseApi.update(row.id, {
        category: row.category, amount: row.amount, expenseDate: row.expenseDate, salaryPeriod: row.salaryPeriod,
        notes: row.notes, employeeId: row.employeeId, accountId: row.accountId, receiptImage: compressed,
      });
      await loadHistory(detailsEmployee.id);
    } catch (err) {
      setHistoryError(getErrorMessage(err, t('common.error')));
    }
  }

  async function savePayment() {
    if (!payForm.accountId) {
      setPayError(t('invoice.accountRequired'));
      return;
    }
    setSaving(true);
    setPayError('');
    try {
      const salaryPeriod = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
      await expenseApi.create({
        category: payForm.category,
        amount: Number(payForm.amount || 0),
        expenseDate: payForm.paymentDate || todayIso(),
        salaryPeriod,
        notes: payForm.notes || null,
        employeeId: detailsEmployee.id,
        accountId: payForm.accountId,
        receiptImage: payForm.receiptImage || null,
      });
      setPayForm(emptyPayForm());
      await loadHistory(detailsEmployee.id);
      refreshSummaries();
    } catch (e) {
      setPayError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">
          {t('employees.currentMonthNote', { month: `${listYear}-${String(listMonth).padStart(2, '0')}` })}
        </Typography>
        <TextField
          select size="small" label={t('employees.month')} value={listMonth}
          onChange={(e) => setListMonth(Number(e.target.value))} sx={{ minWidth: 110 }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <MenuItem key={m} value={m}>{String(m).padStart(2, '0')}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" label={t('employees.year')} value={listYear}
          onChange={(e) => setListYear(Number(e.target.value))} sx={{ minWidth: 110 }}
        >
          {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
      </Box>
      <CrudPage
        title={t('employees.title')}
        canManage={hasPermission('EMPLOYEE_MANAGE')}
        emptyModel={{ name: '', position: 'DRIVER', monthlySalary: '', phone: '', active: true }}
        columns={[
          { key: 'name', label: t('common.name') },
          { key: 'position', label: t('employees.position'), render: (row) => (row.position ? t(`employees.positions.${row.position}`) : '-') },
          { key: 'monthlySalary', label: t('employees.monthlySalary'), render: (row) => fmt(row.monthlySalary) },
          {
            key: 'paidThisMonth',
            label: t('employees.paidThisMonthColumn', { month: `${listYear}-${String(listMonth).padStart(2, '0')}` }),
            render: (row) => fmt(paidSummary[row.id] || 0),
          },
          {
            key: 'shortageDeduction', label: t('shortages.salaryDeductionColumn'),
            render: (row) => (Number(shortageDeductions[row.id] || 0) > 0
              ? <Box component="span" sx={{ color: 'error.main', fontWeight: 600 }}>{fmt(shortageDeductions[row.id])}</Box> : '-'),
          },
          {
            key: 'remainingThisMonth', label: t('employees.remaining'),
            render: (row) => {
              const r = Number(row.monthlySalary || 0) - Number(paidSummary[row.id] || 0) - Number(shortageDeductions[row.id] || 0);
              return <Box component="span" sx={{ color: r > 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>{fmt(r)}</Box>;
            },
          },
          {
            key: 'paidThisYear', label: t('employees.paidThisYearColumn', { year: listYear }),
            render: (row) => fmt(yearlyPaidSummary[row.id] || 0),
          },
          { key: 'phone', label: t('common.phone'), render: (row) => row.phone || '-' },
          { key: 'active', label: t('common.status') },
        ]}
        fields={[
          { key: 'name', label: t('common.name'), required: true },
          {
            key: 'position', label: t('employees.position'), type: 'select', required: true,
            options: EMPLOYEE_POSITIONS.map((p) => ({ value: p, label: t(`employees.positions.${p}`) })),
          },
          { key: 'monthlySalary', label: t('employees.monthlySalary'), type: 'number', required: true },
          { key: 'phone', label: t('common.phone') },
          { key: 'active', label: t('common.active'), type: 'boolean' },
        ]}
        api={{
          ...employeeApi,
          create: (data) => employeeApi.create({ ...data, monthlySalary: Number(data.monthlySalary || 0) }),
          update: (id, data) => employeeApi.update(id, { ...data, monthlySalary: Number(data.monthlySalary || 0) }),
        }}
        extraRowActions={(row) => (
          <>
            <Tooltip title={t('employees.viewSalary')}>
              <IconButton size="small" color="primary" onClick={() => openDetails(row)}>
                <PaymentsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('employees.statement')}>
              <IconButton size="small" color="secondary" onClick={() => openStatement(row)}>
                <SummarizeOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      />

      <Dialog open={!!detailsEmployee} onClose={closeDetails} maxWidth="sm" fullWidth>
        <DialogTitle>{detailsEmployee?.name} — {t('employees.salaryDetails')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              select size="small" label={t('employees.month')} value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))} sx={{ minWidth: 110 }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <MenuItem key={m} value={m}>{String(m).padStart(2, '0')}</MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label={t('employees.year')} value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))} sx={{ minWidth: 110 }}
            >
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">{t('employees.monthlySalary')}</Typography>
              <Typography variant="h6">{fmt(detailsEmployee?.monthlySalary)}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">{t('employees.paidThisMonth')}</Typography>
              <Typography variant="h6">{fmt(paidThisMonth)}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">{t('employees.remaining')}</Typography>
              <Typography variant="h6" color={remaining > 0 ? 'error.main' : 'success.main'}>{fmt(remaining)}</Typography>
            </Grid>
          </Grid>

          {canManageExpenses && (
            <>
              <Divider />
              <Typography variant="subtitle2">{t('employees.paySalary')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t('employees.payAppliesToSelectedMonth', { month: `${periodYear}-${String(periodMonth).padStart(2, '0')}` })}
              </Typography>
              {payError && <Alert severity="error">{payError}</Alert>}
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <TextField
                  select size="small" label={t('expenses.category')} value={payForm.category}
                  onChange={(e) => setPayForm({ ...payForm, category: e.target.value })}
                  sx={{ minWidth: 120 }}
                >
                  {PAY_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
                <TextField
                  type="number" size="small" label={t('expenses.amount')} value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  sx={{ minWidth: 120 }}
                />
                <TextField
                  type="date" size="small" label={t('employees.transactionDate')} value={payForm.paymentDate}
                  onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150 }}
                />
                <TextField
                  size="small" label={t('common.notes')} value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  sx={{ minWidth: 160 }}
                />
                <TextField
                  select required size="small" label={t('accounts.account')} value={payForm.accountId}
                  error={!payForm.accountId} helperText={!payForm.accountId ? t('invoice.accountRequired') : ''}
                  onChange={(e) => setPayForm({ ...payForm, accountId: e.target.value })}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">-</MenuItem>
                  {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                </TextField>
                <Avatar src={payForm.receiptImage || undefined} variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'grey.100' }}>
                  <ReceiptLongOutlinedIcon fontSize="small" />
                </Avatar>
                <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />}>
                  {t('expenses.uploadReceipt')}
                  <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                </Button>
                <Button
                  variant="contained" size="small" disabled={saving || !payForm.amount || !payForm.accountId}
                  onClick={savePayment}
                >
                  {saving ? <CircularProgress size={18} /> : t('employees.recordPayment')}
                </Button>
              </Box>
            </>
          )}

          <Divider />
          <Typography variant="subtitle2">
            {t('employees.history')} — {periodYear}-{String(periodMonth).padStart(2, '0')}
          </Typography>
          {historyError && <Alert severity="error">{historyError}</Alert>}
          {loadingHistory ? (
            <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={22} /></Box>
          ) : filteredHistory.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>{t('employees.noHistory')}</Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('employees.transactionDate')}</TableCell>
                  <TableCell>{t('expenses.category')}</TableCell>
                  <TableCell>{t('expenses.amount')}</TableCell>
                  <TableCell>{t('common.notes')}</TableCell>
                  <TableCell>{t('expenses.receipt')}</TableCell>
                  <TableCell align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory.map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell>{h.expenseDate}</TableCell>
                    <TableCell>{h.category}</TableCell>
                    <TableCell>{fmt(h.amount)}</TableCell>
                    <TableCell>{h.notes || '-'}</TableCell>
                    <TableCell>
                      {h.receiptImage ? (
                        <Avatar
                          src={h.receiptImage} variant="rounded" sx={{ width: 28, height: 28, cursor: 'pointer' }}
                          onClick={() => setViewImage(h.receiptImage)}
                        >
                          <ReceiptLongOutlinedIcon fontSize="small" />
                        </Avatar>
                      ) : '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={t('employees.printVoucher')}>
                        <IconButton size="small" onClick={() => fetchAndOpenPdf(expenseApi.voucherUrl(h.id))}>
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canManageExpenses && (
                        <Tooltip title={t('employees.uploadSignedVoucher')}>
                          <IconButton size="small" component="label">
                            <UploadIcon fontSize="small" />
                            <input type="file" accept="image/*" hidden onChange={(e) => handleRowVoucherUpload(h, e)} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetails}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!statementEmployee} onClose={closeStatement} maxWidth="sm" fullWidth>
        <DialogTitle>{statementEmployee?.name} — {t('employees.statement')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            select size="small" label={t('employees.year')} value={statementYear}
            onChange={(e) => setStatementYear(Number(e.target.value))} sx={{ minWidth: 110, alignSelf: 'flex-start' }}
          >
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>

          {statementError && <Alert severity="error">{statementError}</Alert>}
          {loadingStatement ? (
            <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={22} /></Box>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('employees.month')}</TableCell>
                    <TableCell>{t('employees.paidThisMonth')}</TableCell>
                    <TableCell>{t('employees.remaining')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statementRows.map((r) => (
                    <TableRow key={r.month} hover>
                      <TableCell>{statementYear}-{String(r.month).padStart(2, '0')}</TableCell>
                      <TableCell>{fmt(r.paid)}</TableCell>
                      <TableCell>
                        <Box component="span" sx={{ color: r.remaining > 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                          {fmt(r.remaining)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="subtitle2">
                {t('employees.yearTotal', { year: statementYear })}: {fmt(statementYearTotal)}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStatement}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!viewImage} onClose={() => setViewImage('')} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', p: 1 }}>
          <img src={viewImage} alt="receipt" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewImage('')}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
