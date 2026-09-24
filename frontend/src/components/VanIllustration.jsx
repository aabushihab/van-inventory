import { Box } from '@mui/material';

/**
 * رسمة سيارة توزيع لبطاقات السيارات: الصندوق يظهر فيه كراتين إن كانت السيارة محمّلة، وفارغاً إن لم تكن.
 * inactive = السيارة معطّلة (رمادية).
 */
export default function VanIllustration({ loaded, inactive, height = 96 }) {
  const cab = inactive ? '#94a3b8' : '#f59e0b';
  const body = inactive ? '#e2e8f0' : '#ffffff';
  const stroke = inactive ? '#cbd5e1' : '#dbeafe';
  return (
    <Box component="svg" viewBox="0 0 240 120" aria-hidden="true" sx={{ width: '100%', height, display: 'block' }}>
      {/* ظل الأرض */}
      <ellipse cx="120" cy="108" rx="104" ry="6" fill="#0f172a" opacity="0.08" />
      {/* صندوق البضاعة */}
      <rect x="18" y="22" width="140" height="70" rx="8" fill={body} stroke={stroke} strokeWidth="2" />
      {loaded ? (
        <g>
          <rect x="30" y="52" width="30" height="30" rx="2" fill="#fbbf24" />
          <rect x="62" y="58" width="26" height="24" rx="2" fill="#f59e0b" />
          <rect x="36" y="30" width="24" height="22" rx="2" fill="#fcd34d" />
          <rect x="90" y="50" width="30" height="32" rx="2" fill="#fbbf24" />
          <rect x="122" y="60" width="24" height="22" rx="2" fill="#f59e0b" />
          <rect x="94" y="30" width="22" height="20" rx="2" fill="#fcd34d" />
          {[45, 75, 105, 134].map((x) => <line key={x} x1={x} y1="52" x2={x} y2="82" stroke="#b45309" strokeWidth="2" opacity="0.45" />)}
        </g>
      ) : (
        <g opacity="0.55">
          <line x1="30" y1="82" x2="146" y2="82" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 6" />
        </g>
      )}
      {/* الكابينة */}
      <path d="M158 40 H196 L222 70 V92 H158 Z" fill={cab} />
      <path d="M166 48 H192 L210 70 H166 Z" fill="#1e3a8a" opacity={inactive ? 0.35 : 0.85} />
      <rect x="212" y="78" width="10" height="6" rx="2" fill="#fef3c7" />
      {/* العجلات */}
      {[54, 190].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="94" r="14" fill="#0f172a" />
          <circle cx={cx} cy="94" r="6" fill="#94a3b8" />
        </g>
      ))}
    </Box>
  );
}
