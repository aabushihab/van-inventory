import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Alert, CircularProgress, FormControlLabel, Switch, Divider,
} from '@mui/material';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottomOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import { useTranslation } from 'react-i18next';
import { companySettingsApi } from '../api/endpoints';
import ErrorAlert from '../components/ErrorAlert';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';

/** إعدادات التنبيهات: انتهاء صلاحية الأصناف، وتنبيهات تحميل/تنزيل سيارات التوزيع. */
export default function AlertSettingsPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    companySettingsApi.alerts().then(({ data }) => setForm(data)).catch((e) => setError(getErrorMessage(e, t('common.error'))));
  }, []);

  async function save() {
    setSaving(true); setError(''); setSuccess(''); setFieldErrors({});
    try {
      const { data } = await companySettingsApi.updateAlerts({
        ...form,
        defaultExpiryAlertDays: Number(form.defaultExpiryAlertDays || 0),
        vanNoLoadAlertDays: Number(form.vanNoLoadAlertDays || 0),
        vanNoUnloadAlertDays: Number(form.vanNoUnloadAlertDays || 0),
      });
      setForm(data);
      setSuccess(t('alertSettings.saved'));
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
      setFieldErrors(getFieldErrors(e));
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true); setError(''); setSuccess('');
    try {
      const { data } = await companySettingsApi.runAlerts();
      setSuccess(t('alertSettings.runResult', { expiry: data.expiry, vans: data.vans }));
    } catch (e) {
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setRunning(false);
    }
  }

  if (!form) return error ? <Alert severity="error">{error}</Alert> : <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>;

  const num = (key) => ({
    type: 'number', value: form[key], error: !!fieldErrors[key], helperText: fieldErrors[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
    slotProps: { htmlInput: { min: 0, max: 365 } },
  });

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t('alertSettings.title')}</Typography>
      <ErrorAlert message={error} fieldErrors={fieldErrors} onClose={() => setError('')} sx={{ mb: 2 }} />
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <HourglassBottomIcon color="warning" />
          <Typography variant="subtitle1" fontWeight={800}>{t('alertSettings.expirySection')}</Typography>
        </Box>
        <FormControlLabel label={t('alertSettings.expiryEnabled')}
          control={<Switch checked={form.expiryAlertsEnabled} onChange={(e) => setForm({ ...form, expiryAlertsEnabled: e.target.checked })} />} />
        <TextField fullWidth sx={{ mt: 2 }} label={t('alertSettings.defaultExpiryDays')} disabled={!form.expiryAlertsEnabled}
          {...num('defaultExpiryAlertDays')} helperText={fieldErrors.defaultExpiryAlertDays || t('alertSettings.defaultExpiryHint')} />

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <LocalShippingIcon color="info" />
          <Typography variant="subtitle1" fontWeight={800}>{t('alertSettings.vanSection')}</Typography>
        </Box>
        <FormControlLabel label={t('alertSettings.vanEnabled')}
          control={<Switch checked={form.vanAlertsEnabled} onChange={(e) => setForm({ ...form, vanAlertsEnabled: e.target.checked })} />} />
        <TextField fullWidth sx={{ mt: 2 }} label={t('alertSettings.noLoadDays')} disabled={!form.vanAlertsEnabled} {...num('vanNoLoadAlertDays')} />
        <TextField fullWidth sx={{ mt: 2 }} label={t('alertSettings.noUnloadDays')} disabled={!form.vanAlertsEnabled} {...num('vanNoUnloadAlertDays')} />
      </Paper>

      <Alert severity="info" sx={{ mb: 2 }}>{t('alertSettings.schedule')}</Alert>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : t('common.save')}
        </Button>
        <Button variant="outlined" onClick={runNow} disabled={running}>
          {running ? <CircularProgress size={20} /> : t('alertSettings.runNow')}
        </Button>
      </Box>
    </Box>
  );
}
