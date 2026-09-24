import { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Alert, CircularProgress, FormControlLabel, Switch } from '@mui/material';
import RequestPageIcon from '@mui/icons-material/RequestPageOutlined';
import { useTranslation } from 'react-i18next';
import { companySettingsApi } from '../api/endpoints';
import { getErrorMessage } from '../utils/apiError';

/** إعدادات البيع والدفع: تفعيل الدفع بالشيكات، والسماح للسائقين باستلامها. */
export default function SalesSettingsPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    companySettingsApi.sales().then(({ data }) => setForm(data)).catch((e) => setError(getErrorMessage(e, t('common.error'))));
  }, []);

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const { data } = await companySettingsApi.updateSales(form);
      setForm(data);
      setSuccess(t('alertSettings.saved'));
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  if (!form) return error ? <Alert severity="error">{error}</Alert> : <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t('salesSettings.title')}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <RequestPageIcon color="warning" />
          <Typography variant="subtitle1" fontWeight={800}>{t('salesSettings.checksSection')}</Typography>
        </Box>
        <FormControlLabel label={t('salesSettings.checksEnabled')}
          control={<Switch checked={form.checksEnabled} onChange={(e) => setForm({ ...form, checksEnabled: e.target.checked })} />} />
        <Typography variant="body2" color="text.secondary" sx={{ ms: 6, mb: 2 }}>{t('salesSettings.checksEnabledHint')}</Typography>
        <FormControlLabel label={t('salesSettings.driverChecks')} disabled={!form.checksEnabled}
          control={<Switch checked={form.driverChecksEnabled} onChange={(e) => setForm({ ...form, driverChecksEnabled: e.target.checked })} />} />
        <Typography variant="body2" color="text.secondary" sx={{ ms: 6 }}>{t('salesSettings.driverChecksHint')}</Typography>
      </Paper>

      <Alert severity="info" sx={{ mb: 2 }}>{t('salesSettings.flow')}</Alert>
      <Button variant="contained" onClick={save} disabled={saving}>{saving ? <CircularProgress size={20} /> : t('common.save')}</Button>
    </Box>
  );
}
