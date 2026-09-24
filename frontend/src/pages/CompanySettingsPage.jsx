import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Alert, CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { companySettingsApi } from '../api/endpoints';
import { getFieldErrors, getErrorMessage } from '../utils/apiError';
import LogoDesigner from '../components/LogoDesigner';

const EMPTY = { name: '', nameEn: '', taxNumber: '', phone: '', address: '', currency: '', loginBackgroundImage: '', logo: '' };

export default function CompanySettingsPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    companySettingsApi.get()
      .then(({ data }) => setForm({ ...EMPTY, ...data }))
      .catch((e) => setError(getErrorMessage(e, t('common.error'))))
      .finally(() => setLoading(false));
  }, []);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function save() {
    setSaving(true);
    setError('');
    setSuccess('');
    setFieldErrors({});
    try {
      const { data } = await companySettingsApi.update(form);
      setForm({ ...EMPTY, ...data });
      setSuccess(t('company.saved'));
    } catch (e) {
      setFieldErrors(getFieldErrors(e));
      setError(getErrorMessage(e, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{t('company.title')}</Typography>

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 700 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label={t('company.name')} value={form.name} onChange={set('name')} required
              error={!!fieldErrors.name} helperText={fieldErrors.name} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label={t('company.nameEn')} value={form.nameEn || ''} onChange={set('nameEn')}
              error={!!fieldErrors.nameEn} helperText={fieldErrors.nameEn} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label={t('company.taxNumber')} value={form.taxNumber || ''} onChange={set('taxNumber')}
              error={!!fieldErrors.taxNumber} helperText={fieldErrors.taxNumber} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label={t('company.phone')} value={form.phone || ''} onChange={set('phone')}
              error={!!fieldErrors.phone} helperText={fieldErrors.phone} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label={t('company.address')} value={form.address || ''} onChange={set('address')}
              error={!!fieldErrors.address} helperText={fieldErrors.address} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label={t('company.currency')} value={form.currency || ''} onChange={set('currency')}
              error={!!fieldErrors.currency} helperText={fieldErrors.currency} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('company.loginBackground')}</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {form.logo ? (
                <Box component="img" src={form.logo} alt=""
                  sx={{ width: 60, height: 60, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }} />
              ) : (
                <Box sx={{ width: 60, height: 60, borderRadius: 1.5, bgcolor: 'grey.100', border: '1px solid', borderColor: 'divider' }} />
              )}
              {form.loginBackgroundImage ? (
                <Box component="img" src={form.loginBackgroundImage} alt=""
                  sx={{ width: 140, height: 80, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
              ) : (
                <Box sx={{ width: 140, height: 80, borderRadius: 1, bgcolor: 'grey.100', border: '1px solid', borderColor: 'divider' }} />
              )}
              {form.loginBackgroundImage && (
                <Button size="small" color="error" onClick={() => setForm({ ...form, loginBackgroundImage: '', logo: '' })}>
                  {t('common.delete')}
                </Button>
              )}
            </Box>

            <LogoDesigner
              companyName={form.name}
              onGenerate={({ background, logo }) => setForm((f) => ({ ...f, loginBackgroundImage: background, logo }))}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={save} disabled={saving || !form.name}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
