import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Switch, FormControlLabel,
  Chip, Alert, CircularProgress, Tooltip, Grid, TablePagination, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import KeyIcon from '@mui/icons-material/VpnKeyOutlined';
import { useTranslation } from 'react-i18next';
import { userApi, roleApi, branchApi } from '../api/endpoints';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';

const emptyForm = {
  username: '', password: '', fullName: '', email: '', phone: '',
  roleId: '', branchId: '', preferredLang: 'ar', active: true,
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [q, setQ] = useState('');
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  async function load(overrides = {}) {
    setLoading(true);
    setError('');
    try {
      const { data } = await userApi.listPage({ q: q || undefined, page: overrides.page ?? page, size });
      setRows(data.content);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function applySearch() { setPage(0); load({ page: 0 }); }

  useEffect(() => { load(); }, [page, size]);

  useEffect(() => {
    roleApi.list().then(({ data }) => setRoles(data));
    branchApi.list().then(({ data }) => setBranches(data));
  }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setFieldErrors({}); setDialogOpen(true); }
  function openEdit(row) {
    setEditing(row);
    setForm({ ...emptyForm, ...row, password: '' });
    setFieldErrors({});
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      if (editing) {
        await userApi.update(editing.id, {
          fullName: form.fullName, email: form.email, phone: form.phone,
          roleId: form.roleId, branchId: form.branchId || null,
          preferredLang: form.preferredLang, active: form.active,
        });
      } else {
        await userApi.create({
          username: form.username, password: form.password, fullName: form.fullName,
          email: form.email, phone: form.phone, roleId: form.roleId,
          branchId: form.branchId || null, preferredLang: form.preferredLang,
        });
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
    try { await userApi.remove(row.id); await load(); }
    catch (e) { setError(e.response?.data?.message || t('common.error')); }
  }

  async function resetPassword(row) {
    const pwd = window.prompt('كلمة المرور الجديدة (6 أحرف على الأقل):');
    if (!pwd) return;
    try { await userApi.resetPassword(row.id, pwd); alert(t('common.success')); }
    catch (e) { setError(e.response?.data?.message || t('common.error')); }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{t('nav.users')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('common.add')}</Button>
      </Box>

      <TextField
        placeholder={t('common.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && applySearch()}
        size="small"
        sx={{ mb: 2, width: 320 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('auth.username')}</TableCell>
                <TableCell>{t('users.fullName')}</TableCell>
                <TableCell>{t('users.role')}</TableCell>
                <TableCell>{t('common.branch')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>{u.roleName}</TableCell>
                  <TableCell>{u.branchName || '-'}</TableCell>
                  <TableCell><Chip size="small" label={u.active ? t('common.active') : t('common.inactive')} color={u.active ? 'success' : 'default'} /></TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={t('users.resetPassword')}><IconButton size="small" onClick={() => resetPassword(u)}><KeyIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={t('common.delete')}><IconButton size="small" color="error" onClick={() => remove(u)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <TablePagination
          component="div"
          count={totalElements}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size}
          onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('common.edit') : t('common.add')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {!editing && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth required label={t('auth.username')} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                    error={!!fieldErrors.username} helperText={fieldErrors.username} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth required type="password" label={t('auth.password')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    error={!!fieldErrors.password} helperText={fieldErrors.password} />
                </Grid>
              </>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label={t('users.fullName')} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                error={!!fieldErrors.fullName} helperText={fieldErrors.fullName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('common.email')} value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={!!fieldErrors.email} helperText={fieldErrors.email} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('common.phone')} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select required label={t('users.role')} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                error={!!fieldErrors.roleId} helperText={fieldErrors.roleId}>
                {roles.map((r) => <MenuItem key={r.id} value={r.id}>{r.nameAr || r.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select label={t('common.branch')} value={form.branchId || ''} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <MenuItem value="">-</MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select label={t('common.language')} value={form.preferredLang} onChange={(e) => setForm({ ...form, preferredLang: e.target.value })}>
                <MenuItem value="ar">العربية</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </TextField>
            </Grid>
            {editing && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel control={<Switch checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />} label={t('common.active')} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? <CircularProgress size={20} /> : t('common.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
