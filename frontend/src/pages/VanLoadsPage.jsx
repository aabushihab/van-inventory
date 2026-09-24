import { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Grid,
  Alert, CircularProgress, IconButton, TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'react-i18next';
import { vanApi, warehouseApi, stockApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import ProductAutocomplete from '../components/ProductAutocomplete';
import { getErrorMessage } from '../utils/apiError';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
const emptyLine = { productId: '', productName: '', quantity: '' };

export default function VanLoadsPage({ preset, onPresetHandled }) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canLoad = hasPermission('VAN_LOAD');

  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterVan, setFilterVan] = useState('');
  const [filterType, setFilterType] = useState('');

  const [vans, setVans] = useState([]);
  const [mainWarehouses, setMainWarehouses] = useState([]);

  const [dialogType, setDialogType] = useState(null); // LOAD | UNLOAD
  const [vanId, setVanId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [sourceStock, setSourceStock] = useState({});
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const [viewLoad, setViewLoad] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await vanApi.loads({ page, size, vanId: filterVan, loadType: filterType });
      setRows(data.content);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, size, filterVan, filterType]);

  useEffect(() => {
    vanApi.list().then(({ data }) => setVans(data)).catch(() => {});
    warehouseApi.list().then(({ data }) => setMainWarehouses(data.filter((w) => w.warehouseType !== 'VAN' && w.active)));
  }, []);

  // فتح سند تحميل/تنزيل مباشرة لسيارة معيّنة عند القدوم من تبويب السيارات
  useEffect(() => {
    if (!preset || !vans.length || !mainWarehouses.length) return;
    openDialog(preset.type, preset.vanId);
    if (onPresetHandled) onPresetHandled();
  }, [preset, vans, mainWarehouses]);

  const selectedVan = vans.find((v) => v.id === vanId);
  // مصدر البضاعة: المخزن الرئيسي عند التحميل، ومخزن السيارة عند التنزيل
  const sourceWarehouseId = dialogType === 'LOAD' ? warehouseId : selectedVan?.warehouseId;

  useEffect(() => {
    if (!sourceWarehouseId) { setSourceStock({}); return; }
    stockApi.byWarehouse(sourceWarehouseId).then(({ data }) => {
      setSourceStock(Object.fromEntries(data.map((s) => [s.productId, Number(s.quantity)])));
    });
  }, [sourceWarehouseId]);

  // الكمية المطلوبة لكل صنف (مجموع الأسطر) لمقارنتها بالمتوفر
  const requestedByProduct = useMemo(() => {
    const m = {};
    lines.forEach((l) => { if (l.productId) m[l.productId] = (m[l.productId] || 0) + Number(l.quantity || 0); });
    return m;
  }, [lines]);

  function openDialog(type, presetVanId) {
    setDialogType(type);
    setVanId(presetVanId || vans.find((v) => v.active)?.id || '');
    setWarehouseId((mainWarehouses.find((w) => w.isDefault) || mainWarehouses[0])?.id || '');
    setNotes('');
    setLines([{ ...emptyLine }]);
    setDialogError('');
  }

  function fillFromVan() {
    const items = Object.entries(sourceStock).filter(([, q]) => q > 0);
    if (!items.length) return;
    stockApi.byWarehouse(sourceWarehouseId).then(({ data }) => {
      setLines(data.filter((s) => Number(s.quantity) > 0)
        .map((s) => ({ productId: s.productId, productName: s.productName, quantity: String(Number(s.quantity)) })));
    });
  }

  const lineError = (l) => l.productId && Number(l.quantity) > 0
    && requestedByProduct[l.productId] > (sourceStock[l.productId] ?? 0);

  async function submit() {
    const valid = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (!valid.length) { setDialogError(t('vanLoads.noItems')); return; }
    if (valid.some(lineError)) { setDialogError(t('vanLoads.exceedsAvailable')); return; }
    setSaving(true);
    setDialogError('');
    try {
      await vanApi.createLoad({
        vanId, warehouseId, loadType: dialogType, notes,
        items: valid.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
      });
      setDialogType(null);
      setPage(0);
      await load();
      vanApi.list().then(({ data }) => setVans(data));
    } catch (e) {
      setDialogError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function cancelLoad(row) {
    if (!window.confirm(t('vanLoads.confirmCancel'))) return;
    try {
      await vanApi.cancelLoad(row.id);
      setViewLoad(null);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight={800}>{t('vanLoads.title')}</Typography>
        {canLoad && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={() => openDialog('LOAD')}>{t('vanLoads.newLoad')}</Button>
            <Button variant="outlined" onClick={() => openDialog('UNLOAD')}>{t('vanLoads.newUnload')}</Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField select size="small" label={t('vanLoads.van')} value={filterVan} sx={{ minWidth: 200 }}
          onChange={(e) => { setFilterVan(e.target.value); setPage(0); }}>
          <MenuItem value="">{t('vanLoads.allVans')}</MenuItem>
          {vans.map((v) => <MenuItem key={v.id} value={v.id}>{v.code} - {v.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t('vanLoads.type')} value={filterType} sx={{ minWidth: 160 }}
          onChange={(e) => { setFilterType(e.target.value); setPage(0); }}>
          <MenuItem value="">{t('vanLoads.allTypes')}</MenuItem>
          <MenuItem value="LOAD">{t('vanLoads.LOAD')}</MenuItem>
          <MenuItem value="UNLOAD">{t('vanLoads.UNLOAD')}</MenuItem>
        </TextField>
      </Box>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('vanLoads.number')}</TableCell>
                <TableCell>{t('common.createdAt')}</TableCell>
                <TableCell>{t('vanLoads.type')}</TableCell>
                <TableCell>{t('vanLoads.van')}</TableCell>
                <TableCell>{t('vanLoads.mainWarehouse')}</TableCell>
                <TableCell>{t('vanLoads.totalQuantity')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('vanLoads.createdBy')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover sx={r.status === 'CANCELLED' ? { opacity: 0.55 } : undefined}>
                  <TableCell sx={{ fontWeight: 700 }}>{r.loadNumber}</TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip size="small" color={r.loadType === 'LOAD' ? 'primary' : 'secondary'} label={t(`vanLoads.${r.loadType}`)} />
                  </TableCell>
                  <TableCell>{r.vanName}</TableCell>
                  <TableCell>{r.warehouseName}</TableCell>
                  <TableCell>{fmt(r.totalQuantity)}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" color={r.status === 'CANCELLED' ? 'default' : 'success'} label={t(`vanLoads.${r.status}`)} />
                  </TableCell>
                  <TableCell>{r.createdByName || '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => setViewLoad(r)}><VisibilityIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <TablePagination component="div" count={totalElements} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size} onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }} />
      </Paper>

      {/* سند تحميل / تنزيل جديد */}
      <Dialog open={!!dialogType} onClose={() => setDialogType(null)} fullWidth maxWidth="md">
        <DialogTitle>{dialogType === 'LOAD' ? t('vanLoads.newLoad') : t('vanLoads.newUnload')}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth required label={t('vanLoads.van')} value={vanId}
                onChange={(e) => { setVanId(e.target.value); setLines([{ ...emptyLine }]); }}>
                {vans.filter((v) => v.active).map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.code} - {v.name} ({v.plateNumber})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth required value={warehouseId}
                label={dialogType === 'LOAD' ? t('vanLoads.fromWarehouse') : t('vanLoads.toWarehouse')}
                onChange={(e) => { setWarehouseId(e.target.value); if (dialogType === 'LOAD') setLines([{ ...emptyLine }]); }}>
                {mainWarehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>{t('vanLoads.items')}</Typography>
            {dialogType === 'UNLOAD' && vanId && (
              <Button size="small" onClick={fillFromVan}>{t('vanLoads.fillAll')}</Button>
            )}
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('vanLoads.product')}</TableCell>
                <TableCell width={130}>{t('vanLoads.available')}</TableCell>
                <TableCell width={150}>{t('common.quantity')}</TableCell>
                <TableCell width={50} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((l, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ minWidth: 240 }}>
                    <ProductAutocomplete size="small" valueId={l.productId} valueLabel={l.productName}
                      onSelect={(p) => setLines((prev) => prev.map((x, i) => (i === idx
                        ? { ...x, productId: p?.id || '', productName: p?.name || '' } : x)))} />
                  </TableCell>
                  <TableCell>{l.productId ? fmt(sourceStock[l.productId] ?? 0) : '-'}</TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={l.quantity}
                      slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                      error={lineError(l)} helperText={lineError(l) ? t('vanLoads.exceedsAvailable') : ''}
                      onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button size="small" startIcon={<AddIcon />} sx={{ mt: 1 }}
            onClick={() => setLines((prev) => [...prev, { ...emptyLine }])}>{t('vanLoads.addItem')}</Button>
          <TextField fullWidth label={t('common.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogType(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submit} disabled={saving || !vanId || !warehouseId || lines.some(lineError)}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* تفاصيل سند */}
      <Dialog open={!!viewLoad} onClose={() => setViewLoad(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('vanLoads.details')} — {viewLoad?.loadNumber}</DialogTitle>
        <DialogContent>
          {viewLoad && (
            <Box>
              <Typography variant="body2">{t('vanLoads.type')}: {t(`vanLoads.${viewLoad.loadType}`)} · {t('common.status')}: {t(`vanLoads.${viewLoad.status}`)}</Typography>
              <Typography variant="body2">{t('vanLoads.van')}: {viewLoad.vanName}</Typography>
              <Typography variant="body2">{t('vanLoads.mainWarehouse')}: {viewLoad.warehouseName}</Typography>
              {viewLoad.notes && <Typography variant="body2">{t('common.notes')}: {viewLoad.notes}</Typography>}
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.sku')}</TableCell>
                    <TableCell>{t('common.name')}</TableCell>
                    <TableCell>{t('common.unit')}</TableCell>
                    <TableCell>{t('common.quantity')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewLoad.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.productSku}</TableCell>
                      <TableCell>{it.productName}</TableCell>
                      <TableCell>{it.unitName}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{fmt(it.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {canLoad && viewLoad?.status === 'CONFIRMED' && (
            <Button color="error" onClick={() => cancelLoad(viewLoad)}>{t('vanLoads.cancelLoad')}</Button>
          )}
          <Button onClick={() => setViewLoad(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
