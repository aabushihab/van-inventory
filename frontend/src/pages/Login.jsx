import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, IconButton, InputAdornment,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined';
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { setAppLanguage } from '../i18n';
import { publicApi } from '../api/endpoints';

const PANEL_BG = 'linear-gradient(150deg, #0b1f4d 0%, #1d4ed8 55%, #0e9f9a 100%)';

/** شعار النظام: سيارة توزيع داخل مربع متدرّج. */
function BrandMark({ size = 56 }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: 2.5, flexShrink: 0,
      background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 10px 24px rgba(249,115,22,0.35)',
    }}>
      <LocalShippingIcon sx={{ color: '#fff', fontSize: size * 0.58 }} />
    </Box>
  );
}

/** رسمة شاشة الدخول: مستودع وبضاعة وسيارة توزيع على الطريق باتجاه نقاط التوزيع. */
function DistributionIllustration() {
  return (
    <Box component="svg" viewBox="0 0 480 330" role="img" aria-hidden="true"
      sx={{
        width: '100%', maxWidth: 480, height: 'auto', display: 'block', overflow: 'visible',
        '& .van': { animation: 'vanBounce 1.6s ease-in-out infinite', transformOrigin: 'center' },
        '& .road-dash': { animation: 'roadMove 1.2s linear infinite' },
        '& .pin': { animation: 'pinFloat 2.4s ease-in-out infinite' },
        '@keyframes vanBounce': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-2.5px)' } },
        '@keyframes roadMove': { from: { strokeDashoffset: 0 }, to: { strokeDashoffset: -40 } },
        '@keyframes pinFloat': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        '@media (prefers-reduced-motion: reduce)': { '& .van, & .road-dash, & .pin': { animation: 'none' } },
      }}
    >
      {/* هالات خلفية */}
      <circle cx="380" cy="70" r="70" fill="#ffffff" opacity="0.06" />
      <circle cx="90" cy="60" r="40" fill="#ffffff" opacity="0.05" />

      {/* مسار التوزيع ونقاط العملاء */}
      <path d="M200 120 C 260 40, 330 40, 400 70" fill="none" stroke="#fde68a" strokeWidth="2.5"
        strokeDasharray="2 9" strokeLinecap="round" opacity="0.8" />
      <g className="pin">
        <path d="M400 38 a13 13 0 0 1 13 13 c0 10 -13 23 -13 23 s-13 -13 -13 -23 a13 13 0 0 1 13 -13z" fill="#f59e0b" />
        <circle cx="400" cy="51" r="5" fill="#0b1f4d" />
      </g>
      <circle cx="300" cy="52" r="5" fill="#fde68a" opacity="0.9" />

      {/* المستودع */}
      <polygon points="28,150 128,98 228,150" fill="#93c5fd" />
      <polygon points="28,150 128,98 228,150" fill="none" stroke="#dbeafe" strokeWidth="2" strokeLinejoin="round" />
      <rect x="42" y="150" width="172" height="118" fill="#1e40af" />
      <rect x="42" y="150" width="172" height="10" fill="#1e3a8a" />
      <rect x="92" y="186" width="72" height="82" rx="3" fill="#0f2a6b" />
      {[198, 210, 222, 234, 246, 258].map((y) => (
        <line key={y} x1="96" y1={y} x2="160" y2={y} stroke="#3b82f6" strokeWidth="2" opacity="0.7" />
      ))}
      <rect x="55" y="172" width="24" height="16" rx="2" fill="#bfdbfe" opacity="0.85" />
      <rect x="177" y="172" width="24" height="16" rx="2" fill="#bfdbfe" opacity="0.85" />
      <rect x="104" y="118" width="48" height="16" rx="3" fill="#0b1f4d" opacity="0.55" />

      {/* كراتين أمام المستودع */}
      <g>
        <rect x="170" y="238" width="30" height="30" rx="2" fill="#fbbf24" />
        <rect x="200" y="244" width="24" height="24" rx="2" fill="#f59e0b" />
        <rect x="178" y="214" width="24" height="24" rx="2" fill="#fcd34d" />
        <line x1="185" y1="238" x2="185" y2="268" stroke="#b45309" strokeWidth="2" opacity="0.5" />
        <line x1="212" y1="244" x2="212" y2="268" stroke="#b45309" strokeWidth="2" opacity="0.5" />
        <line x1="190" y1="214" x2="190" y2="238" stroke="#b45309" strokeWidth="2" opacity="0.5" />
      </g>

      {/* الطريق */}
      <rect x="0" y="268" width="480" height="44" rx="6" fill="#0b1f4d" opacity="0.55" />
      <line className="road-dash" x1="0" y1="290" x2="480" y2="290" stroke="#e2e8f0" strokeWidth="3"
        strokeDasharray="22 18" opacity="0.6" />

      {/* سيارة التوزيع */}
      <g className="van">
        <line x1="222" y1="226" x2="244" y2="226" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <line x1="212" y1="240" x2="240" y2="240" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
        <rect x="252" y="196" width="128" height="76" rx="7" fill="#ffffff" />
        <rect x="252" y="258" width="128" height="14" rx="3" fill="#e2e8f0" />
        {/* شعار على صندوق السيارة */}
        <rect x="292" y="214" width="30" height="26" rx="3" fill="#f59e0b" />
        <line x1="307" y1="214" x2="307" y2="240" stroke="#b45309" strokeWidth="2" opacity="0.6" />
        <rect x="328" y="218" width="36" height="6" rx="3" fill="#1d4ed8" />
        <rect x="328" y="230" width="24" height="6" rx="3" fill="#93c5fd" />
        {/* الكابينة */}
        <path d="M380 214 H414 L438 243 V272 H380 Z" fill="#f59e0b" />
        <path d="M388 222 H410 L427 243 H388 Z" fill="#1e3a8a" opacity="0.85" />
        <rect x="426" y="254" width="12" height="7" rx="2" fill="#fef3c7" />
        {/* العجلات */}
        {[292, 408].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="274" r="16" fill="#0f172a" />
            <circle cx={cx} cy="274" r="7" fill="#94a3b8" />
          </g>
        ))}
      </g>
    </Box>
  );
}

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [logo, setLogo] = useState('');

  useEffect(() => {
    publicApi.companyInfo()
      .then(({ data }) => {
        setCompanyName(i18n.language === 'ar' ? data.name : data.nameEn);
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

  function toggleLanguage() {
    // إعادة تحميل كاملة بعد تبديل اللغة حتى يُعاد بناء اتجاه RTL/LTR من الصفر بشكل متّسق.
    setAppLanguage(i18n.language === 'ar' ? 'en' : 'ar');
    window.location.reload();
  }

  const features = [
    { icon: WarehouseIcon, text: t('login.featureWarehouses') },
    { icon: ReceiptLongIcon, text: t('login.featureSales') },
    { icon: LocalShippingIcon, text: t('login.featureVans') },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, bgcolor: '#f8fafc' }}>
      {/* لوحة الهوية والرسمة */}
      <Box sx={{
        flex: { md: '1 1 55%' }, background: PANEL_BG, color: '#fff', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        px: { xs: 3, md: 6 }, py: { xs: 3, md: 5 }, gap: 3,
      }}>
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
          <BrandMark size={44} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{t('app.title')}</Typography>
            {companyName && <Typography sx={{ fontSize: 13, opacity: 0.8 }}>{companyName}</Typography>}
          </Box>
        </Box>

        <Box sx={{ position: 'relative', display: { xs: 'none', sm: 'block' } }}>
          <DistributionIllustration />
        </Box>

        <Box sx={{ position: 'relative' }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 22, md: 30 }, lineHeight: 1.3, mb: 1 }}>
            {t('login.headline')}
          </Typography>
          <Typography sx={{ opacity: 0.85, fontSize: { xs: 14, md: 16 }, mb: 2.5, maxWidth: 520 }}>
            {t('login.tagline')}
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1.5, flexWrap: 'wrap' }}>
            {features.map(({ icon: Icon, text }) => (
              <Box key={text} sx={{
                display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)',
              }}>
                <Icon sx={{ fontSize: 20, color: '#fde68a' }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* نموذج تسجيل الدخول */}
      <Box sx={{
        flex: { md: '1 1 45%' }, display: 'flex', alignItems: 'center', justifyContent: 'center',
        px: { xs: 2, sm: 4 }, py: { xs: 4, md: 6 }, position: 'relative',
      }}>
        <Button onClick={toggleLanguage} startIcon={<LanguageIcon />} color="inherit" size="small"
          sx={{ position: 'absolute', top: 16, insetInlineEnd: 16, color: 'text.secondary' }}>
          {i18n.language === 'ar' ? 'English' : 'العربية'}
        </Button>

        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            {logo
              ? <Box component="img" src={logo} alt="" sx={{ width: 64, height: 64, borderRadius: 2.5, objectFit: 'cover' }} />
              : <BrandMark size={64} />}
          </Box>
          <Typography variant="h5" fontWeight={800} align="center" sx={{ color: '#0f172a' }}>
            {t('auth.welcome')}
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 0.5, mb: 3.5 }}>
            {t('auth.loginSubtitle')}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
            <TextField
              label={t('auth.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              autoComplete="username"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonOutlineIcon color="action" /></InputAdornment> } }}
            />
            <TextField
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><LockOutlinedIcon color="action" /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}>
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button type="submit" variant="contained" size="large" disabled={loading}
              sx={{
                py: 1.4, fontWeight: 800, fontSize: 16, borderRadius: 2,
                background: 'linear-gradient(135deg, #1d4ed8 0%, #0e9f9a 100%)',
                boxShadow: '0 10px 24px rgba(29,78,216,0.28)',
              }}>
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : t('auth.login')}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" align="center" component="p" sx={{ mt: 4 }}>
            © {new Date().getFullYear()} {companyName || t('app.title')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
