import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip,
  Alert, CircularProgress, InputAdornment, TablePagination, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/UploadOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useTranslation } from 'react-i18next';
import { expenseApi, employeeApi, accountApi } from '../api/endpoints';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';
import { compressImage } from '../utils/imageCompress';

const CATEGORY_OPTIONS = ['كهرباء', 'مياه', 'إيجار', 'صيانة', 'رواتب', 'سلفة', 'نقل ومواصلات', 'أخرى'];
const EMPLOYEE_REQUIRED_CATEGORIES = ['رواتب', 'سلفة'];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

const emptyForm = {
  category: 'كهرباء', amount: '', expenseDate: todayIso(), salaryPeriod: todayIso(),
  notes: '', employeeId: '', accountId: '', receiptImage: '',
};

export default function ExpensesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [viewImage, setViewImage] = useState('');

  async function load(overrides = {}) {
    setLoading(true);
    setError('');
    try {
      const { data } = await expenseApi.listPage({
        q: q || undefined,
        from: (overrides.from ?? from) || undefined,
        to: (overrides.to ?? to) || undefined,
        page: overrides.page ?? page, size,
      });
      setRows(data.content);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, size]);
  useEffect(() => { employeeApi.list().then(({ data }) => setEmployees(data)); }, []);
  useEffect(() => { accountApi.list().then(({ data }) => setAccounts(data)); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setDialogOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      category: row.category, amount: String(row.amount), expenseDate: row.expenseDate,
      salaryPeriod: row.salaryPeriod || todayIso(),
      notes: row.notes || '', employeeId: row.employeeId || '', accountId: row.accountId || '',
      receiptImage: row.receiptImage || '',
    });
    setFieldErrors({});
    setDialogOpen(true);
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t('expenses.imageTooLarge'));
      return;
    }
    try {
      const compressed = await compressImage(file);
      setForm((f) => ({ ...f, receiptImage: compressed }));
    } catch {
      setError(t('expenses.imageTooLarge'));
    }
  }

  const needsEmployee = EMPLOYEE_REQUIRED_CATEGORIES.includes(form.category);
  const [payYear, payMonth] = form.salaryPeriod.split('-');

  function handleCategoryChange(newCategory) {
    setForm({ ...form, category: newCategory });
  }

  async function save() {
    if (!form.accountId) {
      setError(t('invoice.accountRequired'));
      return;
    }
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = {
        category: form.category,
        amount: Number(form.amount || 0),
        expenseDate: form.expenseDate,
        salaryPeriod: needsEmployee ? form.salaryPeriod : null,
        notes: form.notes || null,
        employeeId: form.employeeId || null,
        accountId: form.accountId || null,
        receiptImage: form.receiptImage || null,
      };
      if (editing) {
        await expenseApi.update(editing.id, payload);
      } else {
        await expenseApi.create(payload);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setFieldErrors(getFieldErrors(e));
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await expenseApi.remove(row.id);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{t('expenses.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('common.add')}</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder={t('expenses.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); load({ page: 0 }); } }}
          size="small"
          sx={{ width: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <TextField size="small" type="date" label={t('reports.from')} value={from}
          onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label={t('reports.to')} value={to}
          onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button variant="outlined" size="small" onClick={() => { setPage(0); load({ page: 0 }); }}>{t('common.search')}</Button>
        <Button size="small" onClick={() => { setQ(''); setFrom(''); setTo(''); setPage(0); load({ page: 0, q: '', from: '', to: '' }); }}>{t('common.clear')}</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('expenses.date')}</TableCell>
                <TableCell>{t('expenses.category')}</TableCell>
                <TableCell>{t('expenses.amount')}</TableCell>
                <TableCell>{t('expenses.employee')}</TableCell>
                <TableCell>{t('common.notes')}</TableCell>
                <TableCell>{t('expenses.receipt')}</TableCell>
                <TableCell>{t('expenses.recordedBy')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.expenseDate}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{fmt(row.amount)}</TableCell>
                  <TableCell>{row.employeeName || '-'}</TableCell>
                  <TableCell>{row.notes || '-'}</TableCell>
                  <TableCell>
                    {row.receiptImage ? (
                      <Avatar
                        src={row.receiptImage} variant="rounded" sx={{ width: 32, height: 32, cursor: 'pointer' }}
                        onClick={() => setViewImage(row.receiptImage)}
                      >
                        <ReceiptLongOutlinedIcon fontSize="small" />
                      </Avatar>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{row.createdByName || '-'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common.edit')}>
                      <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                      <IconButton size="small" color="error" onClick={() => remove(row)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <TablePagination
          component="div" count={totalElements} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={size}
          onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('common.edit') : t('common.add')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select label={t('expenses.category')} required value={form.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField
            type="number" label={t('expenses.amount')} required value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={!!fieldErrors.amount} helperText={fieldErrors.amount}
          />
          {needsEmployee && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                select label={t('employees.month')} required value={Number(payMonth)}
                onChange={(e) => setForm({ ...form, salaryPeriod: `${payYear}-${String(e.target.value).padStart(2, '0')}-01` })}
                sx={{ flex: 1 }}
                helperText={t('employees.payAppliesToSelectedMonth', { month: `${payYear}-${payMonth}` })}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <MenuItem key={m} value={m}>{String(m).padStart(2, '0')}</MenuItem>
                ))}
              </TextField>
              <TextField
                select label={t('employees.year')} required value={Number(payYear)}
                onChange={(e) => setForm({ ...form, salaryPeriod: `${e.target.value}-${payMonth}-01` })}
                sx={{ flex: 1 }}
              >
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Box>
          )}
          <TextField
            type="date" label={needsEmployee ? t('employees.transactionDate') : t('expenses.date')} required
            value={form.expenseDate}
            onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          {needsEmployee && (
            <TextField
              select label={t('expenses.employee')} required value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              helperText={t('expenses.employeeRequiredHint')}
            >
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>{emp.name}{emp.position ? ` — ${emp.position}` : ''}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select required label={t('accounts.account')} value={form.accountId}
            error={!form.accountId} helperText={!form.accountId ? t('invoice.accountRequired') : ''}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <MenuItem value="">-</MenuItem>
            {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
          </TextField>
          <TextField
            label={t('common.notes')} multiline minRows={2} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={form.receiptImage || undefined} variant="rounded" sx={{ width: 56, height: 56, bgcolor: 'grey.100' }}>
              <ReceiptLongOutlinedIcon />
            </Avatar>
            <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />}>
              {t('expenses.uploadReceipt')}
              <input type="file" accept="image/*" hidden onChange={handleImageChange} />
            </Button>
            {form.receiptImage && (
              <Button size="small" color="error" onClick={() => setForm({ ...form, receiptImage: '' })}>
                {t('common.delete')}
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
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
    </Box>
  );
}
