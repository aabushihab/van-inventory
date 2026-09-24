import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Alert, CircularProgress, FormControlLabel, Switch, TextField, MenuItem, Grid,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination, Chip, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Stack,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import CodeIcon from '@mui/icons-material/CodeOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import { useTranslation } from 'react-i18next';
import { eInvoiceApi } from '../api/endpoints';
import { getErrorMessage } from '../utils/apiError';

export const EINV_STATUS_COLOR = { SENT: 'success', PENDING: 'warning', FAILED: 'error', CANCELLED: 'default' };

/** الربط الاختياري مع نظام الفوترة الوطني: الإعدادات + متابعة المستندات المرسلة/الفاشلة وإعادة إرسالها. */
export default function EInvoicePage() {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [busyId, setBusyId] = useState(null);
  const [xml, setXml] = useState(null);

  async function loadSettings() {
    try {
      const { data } = await eInvoiceApi.settings();
      setForm(data);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }
  async function loadRows(p = page, s = size, st = status) {
    try {
      const { data } = await eInvoiceApi.submissions({ status: st || undefined, page: p, size: s });
      setRows(data.content);
      setTotal(data.totalElements);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }
  useEffect(() => { loadSettings(); loadRows(); }, []);

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const { data } = await eInvoiceApi.updateSettings(form);
      setForm(data);
      setSuccess(t('einv.saved'));
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function resend(row) {
    setBusyId(row.id); setError('');
    try {
      await eInvoiceApi.resend(row.id);
      await Promise.all([loadRows(), loadSettings()]);
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setBusyId(null);
    }
  }

  async function showXml(row) {
    setError('');
    try {
      const { data } = await eInvoiceApi.xml(row.id);
      setXml({ number: row.docNumber, text: prettyXml(data) });
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    }
  }

  if (!form) return error ? <Alert severity="error">{error}</Alert> : <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const fmtDate = (d) => (d ? new Date(d).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : '-');

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>{t('einv.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('einv.subtitle')}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <ReceiptIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }}>{t('einv.connection')}</Typography>
          <FormControlLabel label={form.enabled ? t('einv.enabled') : t('einv.disabled')}
            control={<Switch checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('einv.optionalHint')}</Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label={t('einv.taxpayerType')} value={form.taxpayerType} onChange={set('taxpayerType')}
              helperText={form.taxpayerType === 'INCOME' ? t('einv.incomeHint') : t('einv.generalHint')}>
              <MenuItem value="GENERAL_SALES">{t('einv.generalSales')}</MenuItem>
              <MenuItem value="INCOME">{t('einv.income')}</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label={t('einv.sendMode')} value={form.sendMode} onChange={set('sendMode')}
              helperText={form.sendMode === 'AUTO' ? t('einv.autoHint') : t('einv.manualHint')}>
              <MenuItem value="AUTO">{t('einv.auto')}</MenuItem>
              <MenuItem value="MANUAL">{t('einv.manual')}</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t('einv.sellerTaxNumber')} value={form.sellerTaxNumber || ''} onChange={set('sellerTaxNumber')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t('einv.registrationName')} value={form.registrationName || ''} onChange={set('registrationName')}
              helperText={t('einv.registrationNameHint')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t('einv.incomeSourceSeq')} value={form.incomeSourceSeq || ''} onChange={set('incomeSourceSeq')}
              helperText={t('einv.incomeSourceSeqHint')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Client ID" value={form.clientId || ''} onChange={set('clientId')}
              slotProps={{ htmlInput: { dir: 'ltr', autoComplete: 'off' } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Secret Key" value={form.secretKey || ''} onChange={set('secretKey')}
              slotProps={{ htmlInput: { dir: 'ltr', autoComplete: 'off', spellCheck: false } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t('einv.apiUrl')} value={form.apiUrl || ''} onChange={set('apiUrl')}
              slotProps={{ htmlInput: { dir: 'ltr' } }} />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? <CircularProgress size={20} /> : t('common.save')}</Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }}>{t('einv.documents')}</Typography>
          <Stack direction="row" spacing={1}>
            <Chip color="success" label={`${t('einv.st.SENT')}: ${form.sentCount}`} />
            <Chip color="warning" label={`${t('einv.st.PENDING')}: ${form.pendingCount}`} />
            <Chip color="error" label={`${t('einv.st.FAILED')}: ${form.failedCount}`} />
          </Stack>
          <TextField select size="small" label={t('einv.status')} value={status} sx={{ minWidth: 150 }}
            onChange={(e) => { setStatus(e.target.value); setPage(0); loadRows(0, size, e.target.value); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {['PENDING', 'FAILED', 'SENT', 'CANCELLED'].map((s) => <MenuItem key={s} value={s}>{t(`einv.st.${s}`)}</MenuItem>)}
          </TextField>
          <IconButton onClick={() => { loadRows(); loadSettings(); }}><RefreshIcon /></IconButton>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('einv.docNumber')}</TableCell>
              <TableCell>{t('einv.docType')}</TableCell>
              <TableCell>{t('einv.customer')}</TableCell>
              <TableCell>ICV</TableCell>
              <TableCell>{t('einv.status')}</TableCell>
              <TableCell>{t('einv.message')}</TableCell>
              <TableCell>{t('einv.lastAttempt')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 3 }}>{t('einv.noDocs')}</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{r.docNumber}</TableCell>
                <TableCell>{t(`einv.type.${r.docType}`)}{' · '}{r.cash ? t('einv.cash') : t('einv.credit')}</TableCell>
                <TableCell>{r.customerName || t('einv.cashCustomer')}</TableCell>
                <TableCell>{r.icv}</TableCell>
                <TableCell><Chip size="small" color={EINV_STATUS_COLOR[r.status]} label={t(`einv.st.${r.status}`)} /></TableCell>
                <TableCell sx={{ maxWidth: 360, whiteSpace: 'normal !important', fontSize: 12.5, color: r.status === 'FAILED' ? 'error.main' : 'text.secondary' }}>
                  {r.lastError || (r.status === 'SENT' ? (r.hasQr ? t('einv.qrReceived') : t('einv.accepted')) : '-')}
                </TableCell>
                <TableCell>{fmtDate(r.sentAt || r.lastAttemptAt)}</TableCell>
                <TableCell>
                  <Tooltip title={t('einv.viewXml')}><IconButton size="small" onClick={() => showXml(r)}><CodeIcon fontSize="small" /></IconButton></Tooltip>
                  {(r.status === 'FAILED' || r.status === 'PENDING') && (
                    <Tooltip title={t('einv.send')}>
                      <span>
                        <IconButton size="small" color="primary" disabled={busyId === r.id || !form.enabled} onClick={() => resend(r)}>
                          {busyId === r.id ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} rowsPerPage={size} rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, p) => { setPage(p); loadRows(p, size); }}
          onRowsPerPageChange={(e) => { const s = Number(e.target.value); setSize(s); setPage(0); loadRows(0, s); }} />
      </Paper>

      <Dialog open={!!xml} onClose={() => setXml(null)} maxWidth="md" fullWidth>
        <DialogTitle>XML · {xml?.number}</DialogTitle>
        <DialogContent>
          <Box component="pre" dir="ltr" sx={{
            m: 0, p: 2, bgcolor: '#0f172a', color: '#e2e8f0', borderRadius: 2, fontSize: 12, overflow: 'auto', maxHeight: '60vh',
            whiteSpace: 'pre', textAlign: 'left',
          }}>{xml?.text}</Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard?.writeText(xml?.text || '').catch(() => {})}>{t('einv.copy')}</Button>
          <Button onClick={() => setXml(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** تنسيق XML بسطر لكل عنصر للقراءة. */
function prettyXml(xml) {
  if (!xml) return '';
  let depth = 0;
  return xml.replace(/>\s*</g, '>\n<').split('\n').map((line) => {
    if (/^<\/\w/.test(line)) depth = Math.max(depth - 1, 0);
    const out = '  '.repeat(depth) + line;
    if (/^<\w[^>]*[^/]>$/.test(line) && !/<\/.+>$/.test(line) && !line.startsWith('<?')) depth += 1;
    return out;
  }).join('\n');
}
