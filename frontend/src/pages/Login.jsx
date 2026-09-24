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
import DeliveryScene from '../components/DeliveryScene';
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import ArrowIcon from '@mui/icons-material/ArrowForwardRounded';

const PANEL_BG = 'linear-gradient(150deg, #0b1f4d 0%, #1d4ed8 40%, #0e9f9a 70%, #1e3a8a 100%)';

/** أيقونات طافية بخلفية لوحة الدخول (مواقع نسبية). */
const FLOATERS = [
  { Icon: Inventory2Icon, top: '12%', left: '78%', size: 46, delay: '0s', color: '#fde68a' },
  { Icon: LocalShippingIcon, top: '58%', left: '6%', size: 40, delay: '-2s', color: '#ffffff' },
  { Icon: ShoppingCartIcon, top: '80%', left: '70%', size: 38, delay: '-4s', color: '#99f6e4' },
  { Icon: ReceiptLongIcon, top: '30%', left: '4%', size: 34, delay: '-1s', color: '#bfdbfe' },
  { Icon: Inventory2Icon, top: '88%', left: '30%', size: 30, delay: '-3s', color: '#fde68a' },
];
const TWINKLES = [['8%', '40%', '0s'], ['22%', '92%', '-1s'], ['46%', '60%', '-2s'], ['70%', '18%', '-0.5s'], ['92%', '88%', '-1.6s']];

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
      <Box className="login-panel" sx={{
        flex: { md: '1 1 55%' }, background: PANEL_BG, color: '#fff', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        px: { xs: 3, md: 6 }, py: { xs: 3, md: 5 }, gap: 3,
      }}>
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        {/* أشكال طافية بالخلفية */}
        <Box className="login-blob" sx={{ width: 260, height: 260, top: -60, insetInlineEnd: -40, bgcolor: 'rgba(245,158,11,0.35)' }} />
        <Box className="login-blob" sx={{ width: 220, height: 220, bottom: -50, insetInlineStart: -30, bgcolor: 'rgba(14,159,154,0.45)', animationDelay: '-6s' }} />
        {FLOATERS.map(({ Icon, top, left, size, delay, color }, i) => (
          <Icon key={i} className="login-float" sx={{ top, left, fontSize: size, color, opacity: 0.22, animationDelay: delay }} />
        ))}
        {TWINKLES.map(([top, left, delay], i) => (
          <Box key={i} className="login-twinkle" sx={{ top, left, animationDelay: delay }} />
        ))}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
          <BrandMark size={44} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{t('app.title')}</Typography>
            {companyName && <Typography sx={{ fontSize: 13, opacity: 0.8 }}>{companyName}</Typography>}
          </Box>
        </Box>

        <Box sx={{ position: 'relative', display: { xs: 'none', sm: 'block' } }}>
          <DeliveryScene />
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
                transition: 'all .25s', cursor: 'default',
                '&:hover': { bgcolor: 'rgba(245,158,11,0.9)', borderColor: '#fde68a', transform: 'translateY(-3px)', '& svg': { color: '#fff' } },
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

        <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <Box className="login-blob" sx={{ width: 240, height: 240, top: -80, insetInlineStart: -60, bgcolor: 'rgba(29,78,216,0.12)' }} />
          <Box className="login-blob" sx={{ width: 200, height: 200, bottom: -60, insetInlineEnd: -40, bgcolor: 'rgba(245,158,11,0.15)', animationDelay: '-7s' }} />
        </Box>
        <Box className="login-card-in" sx={{
          width: '100%', maxWidth: 420, position: 'relative', bgcolor: '#fff', borderRadius: 4, p: { xs: 3, sm: 4 },
          boxShadow: '0 20px 50px rgba(15,23,42,0.10)', border: '1px solid #eef2f7',
        }}>
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
              endIcon={!loading && <ArrowIcon sx={{ transform: i18n.language === 'ar' ? 'scaleX(-1)' : 'none' }} />}
              sx={{
                py: 1.4, fontWeight: 800, fontSize: 16, borderRadius: 2,
                background: 'linear-gradient(135deg, #1d4ed8 0%, #0e9f9a 100%) !important',
                boxShadow: '0 10px 24px rgba(29,78,216,0.28)', transition: 'all .25s',
                '& .MuiButton-endIcon': { transition: 'transform .25s' },
                '&:hover': {
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%) !important',
                  boxShadow: '0 14px 28px rgba(249,115,22,0.35)', transform: 'translateY(-2px)',
                  '& .MuiButton-endIcon': { transform: i18n.language === 'ar' ? 'translateX(-4px)' : 'translateX(4px)' },
                },
                '&:active': { transform: 'translateY(0)' },
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
