import { useRef, useState } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import LocalMallIcon from '@mui/icons-material/LocalMallOutlined';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import StarIcon from '@mui/icons-material/StarOutlined';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import PublicIcon from '@mui/icons-material/PublicOutlined';
import HandshakeIcon from '@mui/icons-material/HandshakeOutlined';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import DiamondIcon from '@mui/icons-material/DiamondOutlined';
import SpaIcon from '@mui/icons-material/SpaOutlined';
import RestaurantIcon from '@mui/icons-material/RestaurantOutlined';
import ConstructionIcon from '@mui/icons-material/ConstructionOutlined';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCarOutlined';
import PetsIcon from '@mui/icons-material/PetsOutlined';
import CheckroomIcon from '@mui/icons-material/CheckroomOutlined';

const ICONS = [
  { key: 'storefront', Icon: StorefrontIcon },
  { key: 'cart', Icon: ShoppingCartIcon },
  { key: 'inventory', Icon: Inventory2Icon },
  { key: 'business', Icon: BusinessIcon },
  { key: 'receipt', Icon: ReceiptLongIcon },
  { key: 'bank', Icon: AccountBalanceIcon },
  { key: 'mall', Icon: LocalMallIcon },
  { key: 'category', Icon: CategoryIcon },
  { key: 'phone', Icon: PhoneIcon },
  { key: 'email', Icon: EmailIcon },
  { key: 'shipping', Icon: LocalShippingIcon },
  { key: 'star', Icon: StarIcon },
  { key: 'verified', Icon: VerifiedIcon },
  { key: 'public', Icon: PublicIcon },
  { key: 'handshake', Icon: HandshakeIcon },
  { key: 'premium', Icon: WorkspacePremiumIcon },
  { key: 'home', Icon: HomeIcon },
  { key: 'diamond', Icon: DiamondIcon },
  { key: 'spa', Icon: SpaIcon },
  { key: 'restaurant', Icon: RestaurantIcon },
  { key: 'construction', Icon: ConstructionIcon },
  { key: 'car', Icon: DirectionsCarIcon },
  { key: 'pets', Icon: PetsIcon },
  { key: 'clothing', Icon: CheckroomIcon },
];

const COLORS = [
  { key: 'blue', from: '#1e3a8a', to: '#0ea5a4' },
  { key: 'purple', from: '#4c1d95', to: '#7c3aed' },
  { key: 'green', from: '#065f46', to: '#10b981' },
  { key: 'orange', from: '#9a3412', to: '#f97316' },
  { key: 'slate', from: '#0f172a', to: '#475569' },
  { key: 'rose', from: '#831843', to: '#ec4899' },
  { key: 'teal', from: '#0f766e', to: '#2dd4bf' },
  { key: 'indigo', from: '#312e81', to: '#6366f1' },
  { key: 'amber', from: '#78350f', to: '#f59e0b' },
  { key: 'cyan', from: '#164e63', to: '#06b6d4' },
  { key: 'brown', from: '#451a03', to: '#92400e' },
  { key: 'gray', from: '#111827', to: '#6b7280' },
];

/** لو النص الفرعي شكله رقم هاتف (أرقام/+/-/فراغات بس، 7 خانات فأكثر)، نسبقه برمز هاتف صغير تلقائياً. */
function isPhoneLike(s) {
  return /^[+\d][\d\s-]{6,}$/.test(s.trim());
}

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function toDataUri(svg) {
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

/**
 * منشئ خلفية وشعار بسيط: يركّب صورتي SVG (خلفية شاشة الدخول الكاملة + شعار مربّع صغير لرأس الصفحة)
 * من نفس الأيقونة/اللون المختارين، بالكامل بالمتصفح بدون رفع أي ملف.
 */
export default function LogoDesigner({ companyName, onGenerate }) {
  const { t } = useTranslation();
  const [iconKey, setIconKey] = useState(ICONS[0].key);
  const [colorKey, setColorKey] = useState(COLORS[0].key);
  const [subtitle, setSubtitle] = useState('');
  const iconRef = useRef(null);

  const color = COLORS.find((c) => c.key === colorKey);
  const SelectedIcon = ICONS.find((i) => i.key === iconKey).Icon;

  function generate() {
    const iconSvgEl = iconRef.current?.querySelector('svg');
    if (!iconSvgEl) return;
    const iconInner = iconSvgEl.innerHTML;
    const name = (companyName || '').trim();
    const subRaw = subtitle.trim();
    const sub = subRaw && isPhoneLike(subRaw) ? `☎ ${subRaw}` : subRaw;

    const bgWidth = 1600;
    const bgHeight = 900;
    const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${bgWidth}" height="${bgHeight}" viewBox="0 0 ${bgWidth} ${bgHeight}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${color.from}" />
          <stop offset="100%" stop-color="${color.to}" />
        </linearGradient>
      </defs>
      <rect width="${bgWidth}" height="${bgHeight}" fill="url(#bg)" />
      <g transform="translate(${bgWidth / 2 - 90}, ${bgHeight / 2 - 250}) scale(7.5)" fill="#ffffff" color="#ffffff" fill-opacity="0.95">
        ${iconInner}
      </g>
      ${name ? `<text x="50%" y="${bgHeight / 2 + 150}" text-anchor="middle" font-family="'Segoe UI', Tahoma, Arial, sans-serif" font-size="72" font-weight="800" fill="#ffffff">${escapeXml(name)}</text>` : ''}
      ${sub ? `<text x="50%" y="${bgHeight / 2 + 210}" text-anchor="middle" font-family="'Segoe UI', Tahoma, Arial, sans-serif" font-size="34" font-weight="400" fill="#ffffff" fill-opacity="0.85">${escapeXml(sub)}</text>` : ''}
    </svg>`;

    const logoSize = 240;
    const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="${logoSize}" height="${logoSize}" viewBox="0 0 ${logoSize} ${logoSize}">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${color.from}" />
          <stop offset="100%" stop-color="${color.to}" />
        </linearGradient>
      </defs>
      <rect width="${logoSize}" height="${logoSize}" rx="36" fill="url(#lg)" />
      <g transform="translate(60, 60) scale(5)" fill="#ffffff" color="#ffffff">
        ${iconInner}
      </g>
    </svg>`;

    onGenerate({ background: toDataUri(background), logo: toDataUri(logo) });
  }

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {t('company.pickIcon')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {ICONS.map(({ key, Icon }) => (
          <Box
            key={key}
            onClick={() => setIconKey(key)}
            sx={{
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 1, cursor: 'pointer', border: '2px solid',
              borderColor: key === iconKey ? 'primary.main' : 'divider',
              color: key === iconKey ? 'primary.main' : 'text.secondary',
              bgcolor: key === iconKey ? 'primary.50' : 'transparent',
            }}
          >
            <Icon />
          </Box>
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {t('company.pickColor')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {COLORS.map((c) => (
          <Box
            key={c.key}
            onClick={() => setColorKey(c.key)}
            sx={{
              width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
              background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`,
              border: '2px solid', borderColor: c.key === colorKey ? 'text.primary' : 'transparent',
              boxShadow: c.key === colorKey ? 2 : 0,
            }}
          />
        ))}
      </Box>

      <TextField
        size="small" fullWidth label={t('company.subtitle')} value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        sx={{ mb: 2, maxWidth: 320 }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {t('company.preview')}
      </Typography>
      <Box
        ref={iconRef}
        sx={{
          width: '100%', maxWidth: 320, height: 180, borderRadius: 1, mb: 2,
          background: `linear-gradient(135deg, ${color.from} 0%, ${color.to} 100%)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5,
        }}
      >
        <SelectedIcon sx={{ fontSize: 44, color: '#fff', opacity: 0.95 }} />
        {companyName && (
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15, textAlign: 'center', px: 1 }}>
            {companyName}
          </Typography>
        )}
        {subtitle && (
          <Typography sx={{ color: '#fff', opacity: 0.85, fontWeight: 400, fontSize: 11, textAlign: 'center', px: 1 }}>
            {isPhoneLike(subtitle) ? `☎ ${subtitle.trim()}` : subtitle}
          </Typography>
        )}
      </Box>

      <Button variant="contained" size="small" onClick={generate}>
        {t('company.useThisDesign')}
      </Button>
    </Box>
  );
}
