import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Switch, FormControlLabel,
  Chip, Tooltip, Alert, CircularProgress, InputAdornment, TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';

/**
 * صفحة CRUD عامة قابلة لإعادة الاستخدام (تصنيفات، وحدات، فروع، مخازن، عملاء، موردون...).
 * Generic reusable CRUD page for simple entities.
 *
 * props:
 *  - title, columns: [{key, label}], fields: [{key,label,type,required,options}]
 *  - api: {list, create, update, remove} (list may also accept a query string when searchable)
 *  - paginated: boolean - عند التفعيل يُستخدم api.listPage({q, page, size}) بدل api.list، مع ترقيم صفحات من الخادم
 *    (مناسب للجداول التي قد تحتوي أعداداً كبيرة من السجلات، كالعملاء والموردين)
 *  - canManage: boolean
 *  - emptyModel: object
 *  - extraRowActions: (row) => ReactNode - أزرار إضافية تُعرض بعمود الإجراءات جنب التعديل والحذف (اختياري)
 */
export default function CrudPage({
  title, columns, fields, api, canManage = true, emptyModel = {}, onChanged,
  searchable = false, searchPlaceholder, paginated = false, extraRowActions,
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyModel);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  async function load(query, overrides = {}) {
    setLoading(true);
    setError('');
    try {
      if (paginated) {
        const { data } = await api.listPage({ q: query || undefined, page: overrides.page ?? page, size });
        setRows(data.content);
        setTotalElements(data.totalElements);
      } else {
        const { data } = await api.list(searchable ? query : undefined);
        setRows(data);
      }
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(q); }, [page, size]);

  function openCreate() {
    setEditing(null);
    setForm(emptyModel);
    setFieldErrors({});
    setDialogOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({ ...emptyModel, ...row });
    setFieldErrors({});
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      if (editing) {
        await api.update(editing.id, form);
      } else {
        await api.create(form);
      }
      setDialogOpen(false);
      await load(q);
      onChanged?.();
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
      await api.remove(row.id);
      await load(q);
      onChanged?.();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{title}</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            {t('common.add')}
          </Button>
        )}
      </Box>

      {(searchable || paginated) && (
        <TextField
          placeholder={searchPlaceholder || t('common.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); load(q, { page: 0 }); } }}
          size="small"
          sx={{ mb: 2, width: 320 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((c) => <TableCell key={c.key}>{c.label}</TableCell>)}
                {(canManage || extraRowActions) && <TableCell align="center">{t('common.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  {columns.map((c) => (
                    <TableCell key={c.key}>
                      {c.render ? c.render(row) : (
                        typeof row[c.key] === 'boolean'
                          ? <Chip size="small" label={row[c.key] ? t('common.active') : t('common.inactive')} color={row[c.key] ? 'success' : 'default'} />
                          : (row[c.key] ?? '-')
                      )}
                    </TableCell>
                  ))}
                  {(canManage || extraRowActions) && (
                    <TableCell align="center">
                      {extraRowActions?.(row)}
                      {canManage && (
                        <>
                          <Tooltip title={t('common.edit')}>
                            <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.delete')}>
                            <IconButton size="small" color="error" onClick={() => remove(row)}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {paginated && (
          <TablePagination
            component="div"
            count={totalElements}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={size}
            onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('common.edit') : t('common.add')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {fields.map((f) => {
            if (f.type === 'boolean') {
              return (
                <FormControlLabel
                  key={f.key}
                  control={
                    <Switch
                      checked={!!form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                    />
                  }
                  label={f.label}
                />
              );
            }
            if (f.type === 'select') {
              const opts = typeof f.options === 'function' ? f.options(form) : (f.options || []);
              return (
                <TextField
                  key={f.key}
                  select
                  label={f.label}
                  value={form[f.key] ?? ''}
                  required={f.required}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  error={!!fieldErrors[f.key]}
                  helperText={fieldErrors[f.key]}
                >
                  {opts.map((opt) => (
                    <MenuItem key={String(opt.value)} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              );
            }
            return (
              <TextField
                key={f.key}
                label={f.label}
                type={f.type || 'text'}
                required={f.required}
                value={form[f.key] ?? ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                multiline={f.multiline}
                minRows={f.multiline ? 2 : undefined}
                error={!!fieldErrors[f.key]}
                helperText={fieldErrors[f.key]}
              />
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
