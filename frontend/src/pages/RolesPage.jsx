import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, FormGroup, FormControlLabel,
  Checkbox, Alert, CircularProgress, Tooltip, Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from 'react-i18next';
import { roleApi, permissionApi } from '../api/endpoints';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';

const emptyForm = { name: '', nameAr: '', description: '', permissionIds: [] };

export default function RolesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await roleApi.list();
      setRows(data);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    permissionApi.list().then(({ data }) => setPermissions(data));
  }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setFieldErrors({}); setDialogOpen(true); }
  function openEdit(row) {
    setEditing(row);
    setForm({ name: row.name, nameAr: row.nameAr || '', description: row.description || '', permissionIds: row.permissions.map((p) => p.id) });
    setFieldErrors({});
    setDialogOpen(true);
  }

  function togglePermission(id) {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(id) ? f.permissionIds.filter((x) => x !== id) : [...f.permissionIds, id],
    }));
  }

  async function save() {
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      if (editing) await roleApi.update(editing.id, form);
      else await roleApi.create(form);
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
    try { await roleApi.remove(row.id); await load(); }
    catch (e) { setError(e.response?.data?.message || t('common.error')); }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{t('nav.roles')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('common.add')}</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('roles.permissions')}</TableCell>
                <TableCell>{t('roles.systemRole')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.nameAr || r.name}</TableCell>
                  <TableCell>{r.permissions.length}</TableCell>
                  <TableCell>{r.system ? <Chip size="small" label={t('common.yes')} /> : <Chip size="small" variant="outlined" label={t('common.no')} />}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    {!r.system && (
                      <Tooltip title={t('common.delete')}><IconButton size="small" color="error" onClick={() => remove(r)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? t('common.edit') : t('common.add')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1, mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth required disabled={!!editing?.system} label="Name (code)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={!!fieldErrors.name} helperText={fieldErrors.name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label={t('common.name')} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label={t('common.notes')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('roles.permissions')}</Typography>
          <FormGroup>
            <Grid container>
              {permissions.map((p) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
                  <FormControlLabel
                    control={<Checkbox checked={form.permissionIds.includes(p.id)} onChange={() => togglePermission(p.id)} />}
                    label={p.description || p.code}
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? <CircularProgress size={20} /> : t('common.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
