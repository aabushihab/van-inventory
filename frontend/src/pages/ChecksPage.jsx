import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Tooltip,
  Alert, CircularProgress, TablePagination, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { useTranslation } from 'react-i18next';
import { checkApi, accountApi } from '../api/endpoints';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import PageGuide from '../components/PageGuide';

const STATUS_OPTIONS = ['', 'PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED'];
const STATUS_COLORS = { PENDING: 'warning', CLEARED: 'success', BOUNCED: 'error', CANCELLED: 'default' };

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

const emptyForm = { direction: 'RECEIVED', partyName: '', amount: '', checkNumber: '', bankName: '', dueDate: todayIso(), notes: '' };

export default function ChecksPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('CHECKS_MANAGE');

  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [accounts, setAccounts] = useState([]);
  const [clearingCheck, setClearingCheck] = useState(null);
  const [clearAccountId, setClearAccountId] = useState('');
  const [clearError, setClearError] = useState('');

  async function load(overrides = {}) {
    setLoading(true);
    setError('');
    try {
      const { data } = await checkApi.listPage({
        status: (overrides.status ?? status) || undefined,
        page: overrides.page ?? page, size,
      });
      setRows(data.content);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, size]);
  useEffect(() => { accountApi.list().then(({ data }) => setAccounts(data)); }, []);

  function openCreate() {
    setForm(emptyForm);
    setFieldErrors({});
    setError('');
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      await checkApi.create({
        direction: form.direction,
        partyName: form.partyName || null,
        amount: Number(form.amount || 0),
        checkNumber: form.checkNumber || null,
        bankName: form.bankName || null,
        dueDate: form.dueDate,
        notes: form.notes || null,
      });
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
      await checkApi.remove(row.id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }

  function openClear(row) {
    setClearingCheck(row);
    setClearAccountId(accounts[0]?.id || '');
    setClearError('');
  }

  async function confirmClear() {
    if (!clearAccountId) return;
    try {
      await checkApi.updateStatus(clearingCheck.id, { status: 'CLEARED', accountId: clearAccountId });
      setClearingCheck(null);
      await load();
    } catch (e) {
      setClearError(getErrorMessage(e, t('common.error')));
    }
  }

  async function setBounced(row) {
    if (!window.confirm(t('checks.confirmBounce'))) return;
    try {
      await checkApi.updateStatus(row.id, { status: 'BOUNCED' });
      await load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }

  async function setCancelled(row) {
    if (!window.confirm(t('checks.confirmCancel'))) return;
    try {
      await checkApi.updateStatus(row.id, { status: 'CANCELLED' });
      await load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }

  return (
    <Box>
      <PageGuide points={t('pageGuide.checks.points', { returnObjects: true })} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{t('checks.title')}</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('common.add')}</Button>
        )}
      </Box>

      <TextField
        select size="small" label={t('common.status')} value={status}
        onChange={(e) => { setStatus(e.target.value); setPage(0); load({ status: e.target.value, page: 0 }); }}
        sx={{ mb: 2, minWidth: 180 }}
      >
        {STATUS_OPTIONS.map((s) => (
          <MenuItem key={s} value={s}>{s ? t(`checks.status${s}`) : t('invoice.allStatuses')}</MenuItem>
        ))}
      </TextField>

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
                <TableCell>{t('checks.dueDate')}</TableCell>
                <TableCell>{t('checks.direction')}</TableCell>
                <TableCell>{t('checks.party')}</TableCell>
                <TableCell>{t('expenses.amount')}</TableCell>
                <TableCell>{t('checks.checkNumber')}</TableCell>
                <TableCell>{t('checks.bankName')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.dueDate}</TableCell>
                  <TableCell>{row.direction === 'RECEIVED' ? t('checks.received') : t('checks.issued')}</TableCell>
                  <TableCell>{row.customerName || row.supplierName || row.partyName || '-'}</TableCell>
                  <TableCell>{fmt(row.amount)}</TableCell>
                  <TableCell>{row.checkNumber || '-'}</TableCell>
                  <TableCell>{row.bankName || '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" color={STATUS_COLORS[row.status]} label={t(`checks.status${row.status}`)} />
                  </TableCell>
                  <TableCell align="center">
                    {row.status === 'PENDING' && canManage && (
                      <>
                        <Tooltip title={t('checks.markCleared')}>
                          <IconButton size="small" color="success" onClick={() => openClear(row)}>
                            <CheckCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('checks.markBounced')}>
                          <IconButton size="small" color="error" onClick={() => setBounced(row)}>
                            <BlockOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('checks.markCancelled')}>
                          <IconButton size="small" onClick={() => setCancelled(row)}>
                            <CancelOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <IconButton size="small" onClick={() => remove(row)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
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
        <DialogTitle>{t('common.add')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select label={t('checks.direction')} required value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
          >
            <MenuItem value="RECEIVED">{t('checks.received')}</MenuItem>
            <MenuItem value="ISSUED">{t('checks.issued')}</MenuItem>
          </TextField>
          <TextField
            label={t('checks.party')} value={form.partyName}
            onChange={(e) => setForm({ ...form, partyName: e.target.value })}
          />
          <TextField
            type="number" label={t('expenses.amount')} required value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={!!fieldErrors.amount} helperText={fieldErrors.amount}
          />
          <TextField
            label={t('checks.checkNumber')} value={form.checkNumber}
            onChange={(e) => setForm({ ...form, checkNumber: e.target.value })}
          />
          <TextField
            label={t('checks.bankName')} value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          />
          <TextField
            type="date" label={t('checks.dueDate')} required value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('common.notes')} multiline minRows={2} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!clearingCheck} onClose={() => setClearingCheck(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('checks.markCleared')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {clearError && <Alert severity="error">{clearError}</Alert>}
          <TextField
            select label={t('accounts.account')} required value={clearAccountId}
            onChange={(e) => setClearAccountId(e.target.value)}
          >
            {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearingCheck(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={confirmClear} disabled={!clearAccountId}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
