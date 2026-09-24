import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip,
  Tabs, Tab, Alert, CircularProgress, FormControlLabel, Switch, TablePagination, InputAdornment,
  IconButton, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { stockApi, warehouseApi, productApi, categoryApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import ProductAutocomplete from '../components/ProductAutocomplete';

/** يبني تاريخ ISO محلي (سنة-شهر-يوم) بدون تحويل للتوقيت العالمي، لتفادي انزياح يوم كامل قرب منتصف الليل بمنطقة زمنية شرقية. */
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StockPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [q, setQ] = useState('');
  const [movements, setMovements] = useState([]);
  const [movementFrom, setMovementFrom] = useState(todayIso());
  const [movementTo, setMovementTo] = useState(todayIso());
  const [movementPage, setMovementPage] = useState(0);
  const [movementSize, setMovementSize] = useState(25);
  const [movementTotalElements, setMovementTotalElements] = useState(0);
  const [lowOnly, setLowOnly] = useState(!!location.state?.prefillLowOnly);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [products, setProducts] = useState([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustCategoryId, setAdjustCategoryId] = useState('');
  const [adjustForm, setAdjustForm] = useState({ productId: '', productName: '', warehouseId: '', quantity: '', note: '', purchasePrice: '', salePrice: '' });
  const [transferForm, setTransferForm] = useState({ productId: '', productName: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', note: '' });
  const [saving, setSaving] = useState(false);

  const [priceEditProduct, setPriceEditProduct] = useState(null);
  const [priceForm, setPriceForm] = useState({ purchasePrice: '', salePrice: '' });
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]));

  useEffect(() => {
    if (location.state?.prefillLowOnly) {
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    warehouseApi.list().then(({ data }) => {
      setWarehouses(data);
      if (data.length) setWarehouseId(data[0].id);
    });
    categoryApi.list().then(({ data }) => setCategories(data));
    productApi.search({ size: 500 }).then(({ data }) => setProducts(data.content));
  }, []);

  async function loadStock(overrides = {}) {
    if (!warehouseId) return;
    setLoading(true);
    setError('');
    try {
      if (lowOnly) {
        const { data } = await stockApi.lowStock();
        setRows(data);
        setTotalElements(data.length);
      } else {
        const { data } = await stockApi.byWarehousePage(warehouseId, {
          q: q || undefined, page: overrides.page ?? page, size,
        });
        setRows(data.content);
        setTotalElements(data.totalElements);
      }
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function applySearch() { setPage(0); loadStock({ page: 0 }); }

  async function loadMovements(overrides = {}) {
    setLoading(true);
    setError('');
    try {
      const { data } = await stockApi.movements({
        warehouseId, from: movementFrom, to: movementTo,
        page: overrides.page ?? movementPage, size: movementSize,
      });
      setMovements(data.content);
      setMovementTotalElements(data.totalElements);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function applyMovementSearch() { setMovementPage(0); loadMovements({ page: 0 }); }

  useEffect(() => {
    setPage(0);
    if (tab === 0) loadStock({ page: 0 }); else { setMovementPage(0); loadMovements({ page: 0 }); }
  }, [warehouseId, lowOnly, tab]);
  useEffect(() => { if (tab === 0 && !lowOnly) loadStock(); }, [page, size]);
  useEffect(() => { if (tab === 1) loadMovements(); }, [movementPage, movementSize]);

  async function submitAdjust() {
    setSaving(true);
    setError('');
    try {
      await stockApi.adjust({
        productId: adjustForm.productId,
        warehouseId: adjustForm.warehouseId,
        quantity: Number(adjustForm.quantity),
        note: adjustForm.note,
        purchasePrice: adjustForm.purchasePrice === '' ? undefined : Number(adjustForm.purchasePrice),
        salePrice: adjustForm.salePrice === '' ? undefined : Number(adjustForm.salePrice),
      });
      setAdjustOpen(false);
      setAdjustForm({ productId: '', productName: '', warehouseId: '', quantity: '', note: '', purchasePrice: '', salePrice: '' });
      loadStock();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function submitTransfer() {
    setSaving(true);
    setError('');
    try {
      await stockApi.transfer({
        productId: transferForm.productId,
        fromWarehouseId: transferForm.fromWarehouseId,
        toWarehouseId: transferForm.toWarehouseId,
        quantity: Number(transferForm.quantity),
        note: transferForm.note,
      });
      setTransferOpen(false);
      setTransferForm({ productId: '', productName: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', note: '' });
      loadStock();
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  function openAdjustNew() {
    setAdjustCategoryId('');
    setAdjustForm({ productId: '', productName: '', warehouseId: '', quantity: '', note: '', purchasePrice: '', salePrice: '' });
    setAdjustOpen(true);
  }

  function openAdjustFor(row) {
    const product = productsById[row.productId];
    setAdjustCategoryId(product?.categoryId || '');
    setAdjustForm({
      productId: row.productId, productName: row.productName, warehouseId: row.warehouseId,
      quantity: '', note: '', purchasePrice: '', salePrice: '',
    });
    setAdjustOpen(true);
  }

  function openPriceEdit(row) {
    const product = productsById[row.productId];
    if (!product) return;
    setPriceEditProduct(product);
    setPriceForm({ purchasePrice: product.purchasePrice ?? '', salePrice: product.salePrice ?? '' });
  }

  async function submitPriceEdit() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...priceEditProduct,
        categoryId: priceEditProduct.categoryId || null,
        purchasePrice: Number(priceForm.purchasePrice || 0),
        salePrice: Number(priceForm.salePrice || 0),
      };
      await productApi.update(priceEditProduct.id, payload);
      setPriceEditProduct(null);
      const { data } = await productApi.search({ size: 500 });
      setProducts(data.content);
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight={800}>{t('nav.stock')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasPermission('STOCK_ADJUST') && (
            <Button variant="outlined" onClick={openAdjustNew}>{t('stock.adjust')}</Button>
          )}
          {hasPermission('STOCK_TRANSFER') && (
            <Button variant="contained" onClick={() => setTransferOpen(true)}>{t('stock.transfer')}</Button>
          )}
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('nav.stock')} />
        <Tab label={t('stock.movements')} />
      </Tabs>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField select size="small" label={t('common.warehouse')} value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)} sx={{ minWidth: 220 }}>
          {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
        {tab === 0 && (
          <FormControlLabel control={<Switch checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />} label={t('stock.lowStockOnly')} />
        )}
        {tab === 0 && !lowOnly && (
          <TextField
            placeholder={t('common.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            size="small"
            sx={{ minWidth: 220 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
          />
        )}
        {tab === 1 && (
          <>
            <TextField size="small" type="date" label={t('reports.from')} value={movementFrom}
              onChange={(e) => setMovementFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label={t('reports.to')} value={movementTo}
              onChange={(e) => setMovementTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="contained" onClick={applyMovementSearch}>{t('common.search')}</Button>
          </>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : tab === 0 ? (
          rows.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.sku')}</TableCell>
                  <TableCell>{t('common.name')}</TableCell>
                  <TableCell>{t('common.warehouse')}</TableCell>
                  <TableCell>{t('products.purchasePrice')}</TableCell>
                  <TableCell>{t('products.salePrice')}</TableCell>
                  <TableCell>{t('stock.current')}</TableCell>
                  <TableCell>{t('products.minStock')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const product = productsById[r.productId];
                  return (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.productSku}</TableCell>
                    <TableCell>{r.productName}</TableCell>
                    <TableCell>{r.warehouseName}</TableCell>
                    <TableCell>{product ? Number(product.purchasePrice).toLocaleString(undefined, { maximumFractionDigits: 3 }) : '-'}</TableCell>
                    <TableCell>{product ? Number(product.salePrice).toLocaleString(undefined, { maximumFractionDigits: 3 }) : '-'}</TableCell>
                    <TableCell>{Number(r.quantity).toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                    <TableCell>{Number(r.minStockThreshold).toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                    <TableCell>
                      {r.lowStock
                        ? <Chip size="small" color="warning" label={t('dashboard.lowStock')} />
                        : <Chip size="small" color="success" label="OK" />}
                    </TableCell>
                    <TableCell align="center">
                      {hasPermission('PRODUCT_MANAGE') && (
                        <Tooltip title={t('stock.editPrices')}>
                          <IconButton size="small" onClick={() => openPriceEdit(r)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                      {hasPermission('STOCK_ADJUST') && (
                        <Tooltip title={t('stock.adjust')}>
                          <IconButton size="small" onClick={() => openAdjustFor(r)}><InventoryIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )
        ) : (
          movements.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('common.noData')}</Box> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.createdAt')}</TableCell>
                  <TableCell>{t('common.name')}</TableCell>
                  <TableCell>{t('common.warehouse')}</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>{t('common.quantity')}</TableCell>
                  <TableCell>{t('stock.current')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{m.productName}</TableCell>
                    <TableCell>{m.warehouseName}</TableCell>
                    <TableCell>{m.movementType}</TableCell>
                    <TableCell sx={{ color: Number(m.quantity) < 0 ? 'error.main' : 'success.main' }}>
                      {Number(m.quantity) > 0 ? '+' : ''}{Number(m.quantity).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </TableCell>
                    <TableCell>{Number(m.balanceAfter).toLocaleString(undefined, { maximumFractionDigits: 3 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
        {tab === 0 && !lowOnly && (
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
        {tab === 1 && (
          <TablePagination
            component="div"
            count={movementTotalElements}
            page={movementPage}
            onPageChange={(_, p) => setMovementPage(p)}
            rowsPerPage={movementSize}
            onRowsPerPageChange={(e) => { setMovementSize(parseInt(e.target.value, 10)); setMovementPage(0); }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        )}
      </Paper>

      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('stock.adjust')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField select label={t('common.warehouse')} required value={adjustForm.warehouseId}
            onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}>
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <TextField select label={t('common.category')} required value={adjustCategoryId}
            onChange={(e) => {
              setAdjustCategoryId(e.target.value);
              setAdjustForm({ ...adjustForm, productId: '', productName: '' });
            }}>
            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</MenuItem>)}
          </TextField>
          <ProductAutocomplete
            label={t('products.title')} required disabled={!adjustCategoryId}
            categoryId={adjustCategoryId}
            valueId={adjustForm.productId} valueLabel={adjustForm.productName}
            onSelect={(p) => setAdjustForm({ ...adjustForm, productId: p?.id || '', productName: p?.name || '' })}
          />
          <TextField type="number" label={`${t('common.quantity')} (+/-)`} required value={adjustForm.quantity}
            onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
            helperText="أدخل رقم موجب للزيادة أو سالب للنقصان" />
          <TextField type="number" label={t('stock.purchasePriceOptional')} value={adjustForm.purchasePrice}
            onChange={(e) => setAdjustForm({ ...adjustForm, purchasePrice: e.target.value })}
            helperText={t('stock.purchasePriceHelp')} />
          <TextField type="number" label={t('stock.salePriceOptional')} value={adjustForm.salePrice}
            onChange={(e) => setAdjustForm({ ...adjustForm, salePrice: e.target.value })}
            helperText={t('stock.salePriceHelp')} />
          <TextField label={t('common.notes')} value={adjustForm.note} onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submitAdjust} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!priceEditProduct} onClose={() => setPriceEditProduct(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('stock.editPrices')} — {priceEditProduct?.name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField type="number" label={t('products.purchasePrice')} value={priceForm.purchasePrice}
            onChange={(e) => setPriceForm({ ...priceForm, purchasePrice: e.target.value })} />
          <TextField type="number" label={t('products.salePrice')} value={priceForm.salePrice}
            onChange={(e) => setPriceForm({ ...priceForm, salePrice: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriceEditProduct(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submitPriceEdit} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('stock.transfer')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <ProductAutocomplete
            label={t('products.title')} required
            valueId={transferForm.productId} valueLabel={transferForm.productName}
            onSelect={(p) => setTransferForm({ ...transferForm, productId: p?.id || '', productName: p?.name || '' })}
          />
          <TextField select label={t('stock.from')} required value={transferForm.fromWarehouseId}
            onChange={(e) => setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })}>
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <TextField select label={t('stock.to')} required value={transferForm.toWarehouseId}
            onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}>
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <TextField type="number" label={t('common.quantity')} required value={transferForm.quantity}
            onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} />
          <TextField label={t('common.notes')} value={transferForm.note} onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submitTransfer} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
