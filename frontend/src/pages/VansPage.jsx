import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Grid,
  Alert, CircularProgress, IconButton, Tooltip, FormControlLabel, Switch,
  Card, CardActionArea, CardActions, Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import CloseIcon from '@mui/icons-material/Close';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import { useTranslation } from 'react-i18next';
import { vanApi, branchApi, userApi, warehouseApi, stockApi, employeeApi, companySettingsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import ErrorAlert from '../components/ErrorAlert';
import PageGuide from '../components/PageGuide';
import VanIllustration from '../components/VanIllustration';
import VanSettlementPage from './VanSettlementPage';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';

/** رقم اللوحة: رمز من خانتين ثم شرطة ثم رقم السيارة، مثال 12-34567 */
export const PLATE_REGEX = /^\d{2}-\d{1,7}$/;

const emptyForm = {
  code: '', name: '', plateNumber: '', driverId: '',
  salesmanId: '', branchId: '', notes: '', active: true,
};

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

export default function VansPage({ onLoad }) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('VAN_MANAGE');
  const canLoad = hasPermission('VAN_LOAD');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [mainWarehouses, setMainWarehouses] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [detailVan, setDetailVan] = useState(null);

  const [closeVan, setCloseVan] = useState(null);
  const [closeRows, setCloseRows] = useState([]);
  const [closeWarehouseId, setCloseWarehouseId] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closePricing, setClosePricing] = useState('SALE');
  const [defaultPricing, setDefaultPricing] = useState('SALE');
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

  useEffect(() => {
    companySettingsApi.alerts().then(({ data }) => setDefaultPricing(data.shortagePricing || 'SALE')).catch(() => {});
  }, []);

  function loadDrivers() {
    employeeApi.drivers().then(({ data }) => setDrivers(data)).catch(() => setDrivers([]));
  }

  function openCreate() {
    loadDrivers();
    setEditing(null);
    setForm({ ...emptyForm, branchId: branches[0]?.id || '' });
    setFieldErrors({});
    setError('');
    setDialogOpen(true);
  }

  function openEdit(row) {
    loadDrivers();
    setEditing(row);
    setForm({
      ...emptyForm, ...row,
      salesmanId: row.salesmanId || '', branchId: row.branchId || '',
      plateNumber: row.plateNumber || '', driverId: row.driverId || '', notes: row.notes || '',
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

  async function openClose(row) {
    setError('');
    setCloseResult(null);
    setCloseNotes('');
    setClosePricing(defaultPricing);
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
        pricing: closePricing,
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

      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Paper>
      ) : (
        <Grid container spacing={2}>
          {rows.map((r) => {
            const loaded = Number(r.stockQuantity) > 0;
            return (
              <Grid key={r.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Card variant="outlined" sx={{
                  height: '100%', display: 'flex', flexDirection: 'column', opacity: r.active ? 1 : 0.6,
                  transition: 'box-shadow .15s, transform .15s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}>
                  <CardActionArea onClick={() => setDetailVan(r)} sx={{ flexGrow: 1, alignItems: 'stretch' }}>
                    <Box sx={{ px: 2, pt: 2, pb: 1, background: loaded
                      ? 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)'
                      : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="h6" fontWeight={800} lineHeight={1.2}>{r.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.code}</Typography>
                        </Box>
                        <Chip size="small"
                          color={!r.active ? 'default' : loaded ? 'success' : 'warning'}
                          label={!r.active ? t('common.inactive') : loaded ? t('vans.statusLoaded') : t('vans.statusEmpty')} />
                      </Box>
                      <VanIllustration loaded={loaded} inactive={!r.active} />
                      {/* لوحة الأرقام */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                        <Box dir="ltr" sx={{
                          px: 2, py: 0.25, border: '2px solid #0f172a', borderRadius: 1, bgcolor: '#fff',
                          fontFamily: 'monospace', fontWeight: 800, fontSize: 18, letterSpacing: 2,
                        }}>{r.plateNumber}</Box>
                      </Box>
                    </Box>
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={700}>{r.driverName || '-'}</Typography>
                        {r.driverPhone && (
                          <Typography component="a" href={`tel:${r.driverPhone}`} onClick={(e) => e.stopPropagation()}
                            variant="body2" dir="ltr" sx={{ ms: 'auto', color: 'primary.main', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 16 }} />{r.driverPhone}
                          </Typography>
                        )}
                      </Box>
                      {r.salesmanName && (
                        <Typography variant="caption" color="text.secondary">{t('vans.salesman')}: {r.salesmanName}</Typography>
                      )}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 0.5 }}>
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
                          <Typography variant="caption" color="text.secondary">{t('vans.stockQuantity')}</Typography>
                          <Typography fontWeight={800}>{fmt(r.stockQuantity)}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmt(r.stockValue)}</Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
                          <Typography variant="caption" color="text.secondary">{t('vans.todaySales')}</Typography>
                          <Typography fontWeight={800} color="success.main">{fmt(r.todaySalesTotal)}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('vans.todayInvoices', { count: r.todayInvoiceCount })}</Typography>
                        </Box>
                      </Box>
                      {Number(r.pendingShortageValue) > 0 && (
                        <Chip size="small" color="error" variant="outlined" sx={{ alignSelf: 'flex-start' }}
                          label={`${t('shortages.pendingOn')}: ${fmt(r.pendingShortageValue)}`} />
                      )}
                    </Box>
                  </CardActionArea>
                  <Divider />
                  <CardActions sx={{ flexWrap: 'wrap', gap: 0.5, justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {canLoad && r.active && onLoad && (
                        <>
                          <Button size="small" variant="contained" disableElevation onClick={() => onLoad(r.id, 'LOAD')}>{t('vanLoads.LOAD')}</Button>
                          <Button size="small" disabled={!loaded} onClick={() => onLoad(r.id, 'UNLOAD')}>{t('vanLoads.UNLOAD')}</Button>
                        </>
                      )}
                      {canLoad && (
                        <Tooltip title={loaded ? t('vans.closeVan') : t('vans.countEmptyHint')}>
                          <span>
                            <Button size="small" variant="outlined" color="warning" startIcon={<FactCheckIcon />}
                              disabled={!loaded} onClick={() => openClose(r)}>
                              {t('vans.countButton')}
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                    {canManage && (
                      <Box>
                        <IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => remove(r)}><DeleteIcon fontSize="small" /></IconButton>
                      </Box>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* تفاصيل السيارة: الحمولة الحالية، فواتير اليوم أو أي فترة، وفتح أي فاتورة */}
      <Dialog open={!!detailVan} onClose={() => { setDetailVan(null); load(); }} fullWidth maxWidth="lg"
        slotProps={{ paper: { sx: { minHeight: '80vh' } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 64 }}><VanIllustration loaded={Number(detailVan?.stockQuantity) > 0} height={34} /></Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>{detailVan?.name}</Typography>
            <Typography variant="caption" color="text.secondary" dir="ltr">{detailVan?.plateNumber}</Typography>
          </Box>
          {canLoad && Number(detailVan?.stockQuantity) > 0 && (
            <Button variant="outlined" color="warning" startIcon={<FactCheckIcon />}
              onClick={() => { const v = detailVan; setDetailVan(null); openClose(v); }}>
              {t('vans.countButton')}
            </Button>
          )}
          <IconButton onClick={() => { setDetailVan(null); load(); }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailVan && <VanSettlementPage initialVanId={detailVan.id} embedded />}
        </DialogContent>
      </Dialog>

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
            <Grid size={12}>
              <TextField fullWidth select required label={t('vans.driver')} value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                error={!!fieldErrors.driverId || drivers.length === 0}
                helperText={fieldErrors.driverId || (drivers.length === 0 ? t('vans.noDrivers') : t('vans.driverHint'))}>
                {drivers.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}{d.phone ? ` — ${d.phone}` : ''}</MenuItem>
                ))}
              </TextField>
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
          <Button variant="contained" onClick={save} disabled={saving || plateInvalid || !form.driverId}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
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
                {t('vans.shortageValue')} ({closeResult.pricing === 'COST' ? t('shortages.pricingCost') : t('shortages.pricingSale')}): <b>{fmt(closeResult.shortageValue)}</b>
                {' · '}{t('vans.surplusValue')}: <b>{fmt(closeResult.surplusValue)}</b>
                {closeResult.shortageId && <><br />{t('shortages.recordedHint')}</>}
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
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField select required label={t('vanLoads.toWarehouse')} value={closeWarehouseId} sx={{ flex: 2, minWidth: 220 }}
                  onChange={(e) => setCloseWarehouseId(e.target.value)}>
                  {mainWarehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </TextField>
                <TextField select label={t('shortages.pricing')} value={closePricing} sx={{ flex: 1, minWidth: 180 }}
                  onChange={(e) => setClosePricing(e.target.value)} helperText={t('shortages.pricingHint')}>
                  <MenuItem value="SALE">{t('shortages.pricingSale')}</MenuItem>
                  <MenuItem value="COST">{t('shortages.pricingCost')}</MenuItem>
                </TextField>
              </Box>
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
