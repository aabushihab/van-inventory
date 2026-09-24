import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Switch, FormControlLabel,
  Grid, InputAdornment, TablePagination, Chip, Alert, CircularProgress, Tooltip, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import UploadIcon from '@mui/icons-material/UploadOutlined';
import { useTranslation } from 'react-i18next';
import { productApi, categoryApi, unitApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';
import { compressImage } from '../utils/imageCompress';

const emptyProduct = {
  sku: '', barcode: '', name: '', nameEn: '', categoryId: '', unitId: '',
  size: '', color: '', originCountry: '', piecesPerBox: '', areaPerBox: '',
  purchasePrice: '0', salePrice: '0', taxRate: '16', minStockThreshold: '0',
  imageUrl: '', active: true,
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export default function ProductsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('PRODUCT_MANAGE');

  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [q, setQ] = useState('');
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [viewImage, setViewImage] = useState('');

  useEffect(() => {
    categoryApi.list().then(({ data }) => setCategories(data));
    unitApi.list().then(({ data }) => setUnits(data));
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await productApi.search({ q: q || undefined, page, size });
      setRows(data.content);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, size]);

  function generateSku() {
    return 'PRD-' + Math.floor(100000 + Math.random() * 900000);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyProduct, sku: generateSku() });
    setFieldErrors({});
    setDialogOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      ...emptyProduct, ...row,
      categoryId: row.categoryId || '', unitId: row.unitId || '',
      piecesPerBox: row.piecesPerBox ?? '', areaPerBox: row.areaPerBox ?? '',
    });
    setFieldErrors({});
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || null,
        unitId: form.unitId,
        piecesPerBox: form.piecesPerBox === '' ? null : Number(form.piecesPerBox),
        areaPerBox: form.areaPerBox === '' ? null : Number(form.areaPerBox),
        purchasePrice: Number(form.purchasePrice || 0),
        salePrice: Number(form.salePrice || 0),
        taxRate: Number(form.taxRate || 0),
        minStockThreshold: Number(form.minStockThreshold || 0),
      };
      if (editing) {
        await productApi.update(editing.id, payload);
      } else {
        await productApi.create(payload);
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

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t('products.imageTooLarge'));
      return;
    }
    try {
      const compressed = await compressImage(file);
      setForm((f) => ({ ...f, imageUrl: compressed }));
    } catch {
      setError(t('products.imageTooLarge'));
    }
  }

  async function remove(row) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await productApi.remove(row.id);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight={800}>{t('products.title')}</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('common.add')}</Button>
        )}
      </Box>

      <TextField
        placeholder={t('common.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (setPage(0), load())}
        size="small"
        sx={{ mb: 2, width: 320 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

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
                <TableCell></TableCell>
                <TableCell>{t('common.sku')}</TableCell>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('common.category')}</TableCell>
                <TableCell>{t('common.unit')}</TableCell>
                <TableCell>{t('products.purchasePrice')}</TableCell>
                <TableCell>{t('products.salePrice')}</TableCell>
                <TableCell>{t('products.totalStock')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                {canManage && <TableCell align="center">{t('common.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Avatar
                      src={p.imageUrl || undefined} variant="rounded"
                      sx={{ width: 32, height: 32, bgcolor: 'grey.100', cursor: p.imageUrl ? 'pointer' : 'default' }}
                      onClick={() => p.imageUrl && setViewImage(p.imageUrl)}
                    >
                      <ImageOutlinedIcon fontSize="small" sx={{ color: 'grey.400' }} />
                    </Avatar>
                  </TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.categoryName || '-'}</TableCell>
                  <TableCell>{p.unitName}</TableCell>
                  <TableCell>{Number(p.purchasePrice).toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                  <TableCell sx={{ color: Number(p.purchasePrice) > Number(p.salePrice) ? 'error.main' : undefined, fontWeight: Number(p.purchasePrice) > Number(p.salePrice) ? 700 : undefined }}>
                    {Number(p.salePrice).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={p.totalStock} color={Number(p.totalStock) <= Number(p.minStockThreshold) && Number(p.minStockThreshold) > 0 ? 'warning' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={p.active ? t('common.active') : t('common.inactive')} color={p.active ? 'success' : 'default'} />
                  </TableCell>
                  {canManage && (
                    <TableCell align="center">
                      <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.delete')}>
                        <IconButton size="small" color="error" onClick={() => remove(p)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
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
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? t('common.edit') : t('common.add')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('common.sku')} required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                error={!!fieldErrors.sku} helperText={fieldErrors.sku} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('common.barcode')} value={form.barcode || ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('common.name')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={!!fieldErrors.name} helperText={fieldErrors.name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('common.nameEn')} value={form.nameEn || ''} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select label={t('common.category')} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <MenuItem value="">-</MenuItem>
                {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth select required label={t('common.unit')} value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                error={!!fieldErrors.unitId} helperText={fieldErrors.unitId}>
                {units.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth label={t('products.size')} value={form.size || ''} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth label={t('products.color')} value={form.color || ''} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth label={t('products.origin')} value={form.originCountry || ''} onChange={(e) => setForm({ ...form, originCountry: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth type="number" label={t('products.piecesPerBox')} value={form.piecesPerBox} onChange={(e) => setForm({ ...form, piecesPerBox: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth type="number" label={t('products.areaPerBox')} value={form.areaPerBox} onChange={(e) => setForm({ ...form, areaPerBox: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth type="number" label={t('products.purchasePrice')} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                error={!!fieldErrors.purchasePrice} helperText={fieldErrors.purchasePrice} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth type="number" label={t('products.salePrice')} value={form.salePrice}
                error={!!fieldErrors.salePrice || Number(form.purchasePrice) > Number(form.salePrice)}
                helperText={fieldErrors.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
            </Grid>
            {Number(form.purchasePrice) > Number(form.salePrice) && (
              <Grid size={12}>
                <Alert severity="warning">{t('products.priceBelowCostWarning')}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth type="number" label={`${t('common.tax')} %`} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth type="number" label={t('products.minStock')} value={form.minStockThreshold} onChange={(e) => setForm({ ...form, minStockThreshold: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={form.imageUrl || undefined} variant="rounded"
                  sx={{ width: 56, height: 56, bgcolor: 'grey.100', cursor: form.imageUrl ? 'pointer' : 'default' }}
                  onClick={() => form.imageUrl && setViewImage(form.imageUrl)}
                >
                  <ImageOutlinedIcon sx={{ color: 'grey.400' }} />
                </Avatar>
                <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />}>
                  {t('products.uploadImage')}
                  <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                </Button>
                {form.imageUrl && (
                  <Button size="small" color="error" onClick={() => setForm({ ...form, imageUrl: '' })}>
                    {t('common.delete')}
                  </Button>
                )}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                control={<Switch checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />}
                label={t('common.active')}
              />
            </Grid>
          </Grid>
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
          <img src={viewImage} alt="product" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewImage('')}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
