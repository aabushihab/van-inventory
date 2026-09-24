import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Grid,
  Alert, CircularProgress, IconButton, Tooltip, FormControlLabel, Switch,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { vanApi, branchApi, userApi, warehouseApi, stockApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import ErrorAlert from '../components/ErrorAlert';
import PageGuide from '../components/PageGuide';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';

/** رقم اللوحة: رمز من خانتين ثم شرطة ثم رقم السيارة، مثال 12-34567 */
export const PLATE_REGEX = /^\d{2}-\d{1,7}$/;

const emptyForm = {
  code: '', name: '', plateNumber: '', driverName: '', driverPhone: '',
  salesmanId: '', branchId: '', notes: '', active: true,
};

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

export default function VansPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canManage = hasPermission('VAN_MANAGE');
  const canLoad = hasPermission('VAN_LOAD');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [mainWarehouses, setMainWarehouses] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [stockVan, setStockVan] = useState(null);
  const [stockRows, setStockRows] = useState([]);

  const [closeVan, setCloseVan] = useState(null);
  const [closeRows, setCloseRows] = useState([]);
  const [closeWarehouseId, setCloseWarehouseId] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeResult, setCloseResult] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await vanApi.list();
      setRows(data);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    branchApi.list().then(({ data }) => setBranches(data)).catch(() => {});
    userApi.list().then(({ data }) => setUsers(data)).catch(() => {});
    warehouseApi.list().then(({ data }) => {
      const mains = data.filter((w) => w.warehouseType !== 'VAN' && w.active);
      setMainWarehouses(mains);
      setCloseWarehouseId((mains.find((w) => w.isDefault) || mains[0])?.id || '');
    }).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, branchId: branches[0]?.id || '' });
    setFieldErrors({});
    setError('');
    setDialogOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      ...emptyForm, ...row,
      salesmanId: row.salesmanId || '', branchId: row.branchId || '',
      plateNumber: row.plateNumber || '', driverName: row.driverName || '',
      driverPhone: row.driverPhone || '', notes: row.notes || '',
    });
    setFieldErrors({});
    setError('');
    setDialogOpen(true);
  }

  const plateInvalid = form.plateNumber !== '' && !PLATE_REGEX.test(form.plateNumber.trim());

  async function save() {
    if (!PLATE_REGEX.test(form.plateNumber.trim())) {
      setFieldErrors({ plateNumber: t('vans.plateFormat') });
      return;
    }
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = { ...form, salesmanId: form.salesmanId || null, plateNumber: form.plateNumber.trim() };
      if (editing) await vanApi.update(editing.id, payload);
      else await vanApi.create(payload);
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
      setFieldErrors(getFieldErrors(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row) {
    if (!window.confirm(`${t('common.confirmDelete')}\n${t('vans.deleteHint')}`)) return;
    try {
      await vanApi.remove(row.id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }

  async function openStock(row) {
    setStockVan(row);
    setStockRows([]);
    const { data } = await stockApi.byWarehouse(row.warehouseId);
    setStockRows(data.filter((s) => Number(s.quantity) !== 0));
  }

  async function openClose(row) {
    setError('');
    setCloseResult(null);
    setCloseNotes('');
    setCloseVan(row);
    const { data } = await stockApi.byWarehouse(row.warehouseId);
    setCloseRows(data.filter((s) => Number(s.quantity) !== 0)
      .map((s) => ({ ...s, counted: String(Number(s.quantity)) })));
  }

  async function submitClose() {
    setSaving(true);
    setError('');
    try {
      const { data } = await vanApi.close(closeVan.id, {
        warehouseId: closeWarehouseId,
        notes: closeNotes,
        counts: closeRows.map((r) => ({ productId: r.productId, countedQuantity: Number(r.counted || 0) })),
      });
      setCloseResult(data);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight={800}>{t('vans.title')}</Typography>
        {canManage && <Button variant="contained" onClick={openCreate}>{t('vans.add')}</Button>}
      </Box>
      <PageGuide points={t('vans.guide', { returnObjects: true })} />

      {error && !dialogOpen && !closeVan && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('vans.code')}</TableCell>
                <TableCell>{t('vans.name')}</TableCell>
                <TableCell>{t('vans.plateNumber')}</TableCell>
                <TableCell>{t('vans.driverName')}</TableCell>
                <TableCell>{t('vans.salesman')}</TableCell>
                <TableCell>{t('vans.stockQuantity')}</TableCell>
                <TableCell>{t('vans.stockValue')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover sx={!r.active ? { opacity: 0.6 } : undefined}>
                  <TableCell sx={{ fontWeight: 700 }}>{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell dir="ltr" sx={{ textAlign: 'start' }}>{r.plateNumber}</TableCell>
                  <TableCell>{r.driverName || '-'}{r.driverPhone ? ` (${r.driverPhone})` : ''}</TableCell>
                  <TableCell>{r.salesmanName || '-'}</TableCell>
                  <TableCell>{fmt(r.stockQuantity)}</TableCell>
                  <TableCell>{fmt(r.stockValue)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.active ? t('common.active') : t('common.inactive')} color={r.active ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={t('vans.viewStock')}>
                      <IconButton size="small" onClick={() => openStock(r)}><InventoryIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {canLoad && (
                      <Tooltip title={t('vans.closeVan')}>
                        <span>
                          <IconButton size="small" color="primary" disabled={Number(r.stockQuantity) === 0} onClick={() => openClose(r)}>
                            <FactCheckIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <Button size="small" onClick={() => navigate('/van-settlement', { state: { vanId: r.id } })}>{t('vans.settlement')}</Button>
                    {canManage && (
                      <>
                        <IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => remove(r)}><DeleteIcon fontSize="small" /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* إضافة / تعديل سيارة */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? t('vans.edit') : t('vans.add')}</DialogTitle>
        <DialogContent>
          <ErrorAlert message={error} fieldErrors={fieldErrors} onClose={() => setError('')} sx={{ mb: 2 }} />
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth required label={t('vans.code')} value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                error={!!fieldErrors.code} helperText={fieldErrors.code} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField fullWidth required label={t('vans.name')} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={!!fieldErrors.name} helperText={fieldErrors.name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label={t('vans.plateNumber')} value={form.plateNumber}
                placeholder="12-34567"
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value.replace(/[^\d-]/g, '') })}
                error={plateInvalid || !!fieldErrors.plateNumber}
                helperText={fieldErrors.plateNumber || t('vans.plateFormat')}
                slotProps={{ htmlInput: { dir: 'ltr', inputMode: 'numeric' } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select required label={t('common.branch')} value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('vans.driverName')} value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('vans.driverPhone')} value={form.driverPhone}
                onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth select label={t('vans.salesmanUser')} value={form.salesmanId}
                onChange={(e) => setForm({ ...form, salesmanId: e.target.value })}
                helperText={t('vans.salesmanHint')}>
                <MenuItem value="">{t('vans.noSalesman')}</MenuItem>
                {users.filter((u) => u.active !== false).map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.fullName} ({u.username})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField fullWidth multiline minRows={2} label={t('common.notes')} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Grid>
            {editing && (
              <Grid size={12}>
                <FormControlLabel control={<Switch checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />}
                  label={t('common.active')} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save} disabled={saving || plateInvalid}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* الحمولة الحالية */}
      <Dialog open={!!stockVan} onClose={() => setStockVan(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('vans.vanStockTitle')} — {stockVan?.name}</DialogTitle>
        <DialogContent>
          {stockRows.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.sku')}</TableCell>
                  <TableCell>{t('common.name')}</TableCell>
                  <TableCell>{t('common.quantity')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockRows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.productSku}</TableCell>
                    <TableCell>{s.productName}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{fmt(s.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setStockVan(null)}>{t('common.close')}</Button></DialogActions>
      </Dialog>

      {/* جرد السيارة وإرجاع المتبقي للمستودع */}
      <Dialog open={!!closeVan} onClose={() => setCloseVan(null)} fullWidth maxWidth="md">
        <DialogTitle>{t('vans.closeVan')} — {closeVan?.name}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {closeResult ? (
            <Box>
              <Alert severity={Number(closeResult.shortageValue) > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                {t('vans.closeDone')}
                {closeResult.unloadVoucher && ` — ${t('vanLoads.number')}: ${closeResult.unloadVoucher.loadNumber}`}
                <br />
                {t('vans.shortageValue')}: <b>{fmt(closeResult.shortageValue)}</b>
                {' · '}{t('vans.surplusValue')}: <b>{fmt(closeResult.surplusValue)}</b>
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.name')}</TableCell>
                    <TableCell>{t('vans.systemQty')}</TableCell>
                    <TableCell>{t('vans.countedQty')}</TableCell>
                    <TableCell>{t('vans.variance')}</TableCell>
                    <TableCell>{t('vans.varianceValue')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {closeResult.lines.map((l) => (
                    <TableRow key={l.productId}>
                      <TableCell>{l.productName}</TableCell>
                      <TableCell>{fmt(l.systemQuantity)}</TableCell>
                      <TableCell>{fmt(l.countedQuantity)}</TableCell>
                      <TableCell sx={{ color: Number(l.variance) < 0 ? 'error.main' : Number(l.variance) > 0 ? 'success.main' : undefined, fontWeight: 700 }}>
                        {fmt(l.variance)}
                      </TableCell>
                      <TableCell>{fmt(l.varianceValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>{t('vans.closeHint')}</Alert>
              <TextField select fullWidth required label={t('vanLoads.toWarehouse')} value={closeWarehouseId}
                onChange={(e) => setCloseWarehouseId(e.target.value)} sx={{ mb: 2 }}>
                {mainWarehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
              </TextField>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.sku')}</TableCell>
                    <TableCell>{t('common.name')}</TableCell>
                    <TableCell>{t('vans.systemQty')}</TableCell>
                    <TableCell width={160}>{t('vans.countedQty')}</TableCell>
                    <TableCell>{t('vans.variance')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {closeRows.map((r, idx) => {
                    const variance = Number(r.counted || 0) - Number(r.quantity);
                    return (
                      <TableRow key={r.productId}>
                        <TableCell>{r.productSku}</TableCell>
                        <TableCell>{r.productName}</TableCell>
                        <TableCell>{fmt(r.quantity)}</TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={r.counted}
                            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                            onChange={(e) => setCloseRows((prev) => prev.map((x, i) => (i === idx ? { ...x, counted: e.target.value } : x)))} />
                        </TableCell>
                        <TableCell sx={{ color: variance < 0 ? 'error.main' : variance > 0 ? 'success.main' : undefined, fontWeight: 700 }}>
                          {fmt(variance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TextField fullWidth label={t('common.notes')} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} sx={{ mt: 2 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseVan(null)}>{t('common.close')}</Button>
          {!closeResult && (
            <Button variant="contained" onClick={submitClose}
              disabled={saving || !closeWarehouseId || closeRows.some((r) => r.counted === '' || Number(r.counted) < 0)}>
              {saving ? <CircularProgress size={20} /> : t('vans.confirmClose')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
