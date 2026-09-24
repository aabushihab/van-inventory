import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, TextField, Button, Typography, Alert, CircularProgress, IconButton } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { setAppLanguage } from '../i18n';
import { publicApi } from '../api/endpoints';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [logo, setLogo] = useState('');

  useEffect(() => {
    publicApi.companyInfo()
      .then(({ data }) => {
        setCompanyName(i18n.language === 'ar' ? data.name : data.nameEn);
        setBackgroundImage(data.loginBackgroundImage || '');
        setLogo(data.logo || '');
      })
      .catch(() => {});
  }, [i18n.language]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5a4 100%)', p: 2,
    }}>
      <Paper elevation={6} sx={{ width: 380, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
        <IconButton
          sx={{ position: 'absolute', top: 8, insetInlineStart: 8, zIndex: 1, bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.100' } }}
          onClick={() => {
            // إعادة تحميل كاملة بعد تبديل اللغة، لأن تبديل اتجاه RTL/LTR بالخلفية (Emotion cache + MUI theme)
            // بيترك أنماط الاتجاه القديم عالقة بالصفحة أحياناً وبيسبب تخطيطاً مختلطاً/مكسوراً - إعادة التحميل
            // الكاملة تضمن بدء الواجهة من الصفر باتجاه واحد متّسق فقط.
            setAppLanguage(i18n.language === 'ar' ? 'en' : 'ar');
            window.location.reload();
          }}
        >
          <LanguageIcon />
        </IconButton>

        {/* التصميم المُعدّ (أيقونة + اسم + نص فرعي) يظهر كشريط علوي فوق نموذج الدخول - بدل خلفية كاملة الشاشة. */}
        {backgroundImage ? (
          <Box component="img" src={backgroundImage} alt=""
            sx={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
        ) : (
          <Box sx={{ pt: 4, px: 4 }}>
            {logo && (
              <Box component="img" src={logo} alt="" sx={{ width: 64, height: 64, borderRadius: 2, display: 'block', mx: 'auto', mb: 1 }} />
            )}
            <Typography variant="h5" fontWeight={800} align="center" color="primary.main">
              {companyName || t('app.title')}
            </Typography>
          </Box>
        )}

        <Box sx={{ p: 4, pt: 3 }}>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            {t('auth.loginSubtitle')}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('auth.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
          <TextField
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? <CircularProgress size={22} /> : t('auth.login')}
          </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
