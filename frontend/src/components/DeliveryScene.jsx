/**
 * مشهد شاشة الدخول المتحرك: شاحنة توزيع تطلع من المستودع، توقف عند البقالة وتنزّل كرتونة، وتكمل طريقها.
 * الحركات كلها CSS (ملف index.css - أسماء ds-*) (تعمل دائماً حتى لو كان "تقليل الحركة" مفعّلاً بالويندوز - طلب صريح).
 */
export default function DeliveryScene() {
  return (
    <svg className="ds-scene" viewBox="0 0 480 330" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="dsSun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="dsHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e40af" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0b1f4d" stopOpacity="0.2" />
        </linearGradient>
        <clipPath id="dsClip"><rect x="0" y="0" width="480" height="330" rx="18" /></clipPath>
      </defs>

      <g clipPath="url(#dsClip)">
        {/* الشمس */}
        <g className="ds-sun">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1="60" y1="18" x2="60" y2="30" stroke="#fde68a" strokeWidth="3" strokeLinecap="round"
              opacity="0.7" transform={`rotate(${i * 30} 60 60)`} />
          ))}
          <circle cx="60" cy="60" r="20" fill="url(#dsSun)" />
        </g>

        {/* غيوم */}
        {[{ y: 40, s: 1, d: '0s', c: 'ds-cloud-slow' }, { y: 90, s: 0.7, d: '-9s', c: 'ds-cloud-fast' }, { y: 22, s: 0.55, d: '-17s', c: 'ds-cloud-slow' }].map((c, i) => (
          <g key={i} className={c.c} style={{ animationDelay: c.d }}>
            <g transform={`translate(0 ${c.y}) scale(${c.s})`} opacity="0.85">
              <ellipse cx="40" cy="20" rx="30" ry="14" fill="#ffffff" />
              <ellipse cx="66" cy="14" rx="22" ry="16" fill="#ffffff" />
              <ellipse cx="88" cy="22" rx="20" ry="11" fill="#ffffff" />
            </g>
          </g>
        ))}

        {/* طيور */}
        <g className="ds-birds">
          <path d="M0 0 q6 -6 12 0 q6 -6 12 0" fill="none" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 14 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* تلال بعيدة */}
        <path d="M0 210 C 60 170, 120 190, 180 175 S 300 150, 360 172 S 450 160, 480 170 V 270 H 0 Z" fill="url(#dsHill)" />

        {/* مسار التوزيع من المستودع للبقالة */}
        <path className="ds-route" d="M110 96 C 190 20, 330 20, 425 120" fill="none" stroke="#fde68a" strokeWidth="2.5"
          strokeDasharray="3 9" strokeLinecap="round" opacity="0.85" />
        <g className="ds-pin">
          <path d="M425 92 a12 12 0 0 1 12 12 c0 9 -12 21 -12 21 s-12 -12 -12 -21 a12 12 0 0 1 12 -12z" fill="#f59e0b" />
          <circle cx="425" cy="104" r="4.5" fill="#0b1f4d" />
        </g>

        {/* المستودع */}
        <polygon points="14,160 92,118 170,160" fill="#93c5fd" />
        <rect x="24" y="160" width="136" height="108" fill="#1e40af" />
        <rect x="24" y="160" width="136" height="8" fill="#1e3a8a" />
        <rect x="62" y="192" width="60" height="76" rx="3" fill="#0f2a6b" />
        {[204, 216, 228, 240, 252].map((y) => (
          <line key={y} x1="66" y1={y} x2="118" y2={y} stroke="#3b82f6" strokeWidth="2" opacity="0.7" />
        ))}
        <rect x="34" y="178" width="18" height="12" rx="2" fill="#fef3c7" className="ds-window" />
        <rect x="132" y="178" width="18" height="12" rx="2" fill="#fef3c7" className="ds-window" style={{ animationDelay: '-1.3s' }} />
        <rect x="70" y="132" width="44" height="14" rx="3" fill="#0b1f4d" opacity="0.55" />
        {/* كراتين عند المستودع */}
        <rect x="128" y="244" width="24" height="24" rx="2" fill="#fbbf24" />
        <rect x="134" y="224" width="18" height="20" rx="2" fill="#fcd34d" />
        <line x1="140" y1="244" x2="140" y2="268" stroke="#b45309" strokeWidth="2" opacity="0.5" />

        {/* شجرة */}
        <g className="ds-tree">
          <rect x="226" y="222" width="6" height="46" rx="2" fill="#78350f" />
          <circle cx="229" cy="214" r="18" fill="#10b981" />
          <circle cx="218" cy="224" r="12" fill="#059669" />
          <circle cx="241" cy="224" r="12" fill="#34d399" />
        </g>

        {/* البقالة */}
        <rect x="380" y="186" width="92" height="82" fill="#f8fafc" />
        <rect x="380" y="174" width="92" height="14" rx="3" fill="#0e9f9a" />
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${380 + i * 15.33} 188 h15.33 v10 a7.66 7.66 0 0 1 -15.33 0 z`}
              fill={i % 2 ? '#ffffff' : '#ef4444'} />
          ))}
        </g>
        <rect x="392" y="214" width="26" height="54" rx="2" fill="#1e3a8a" opacity="0.85" />
        <rect x="428" y="214" width="34" height="26" rx="2" fill="#bfdbfe" />
        <circle cx="414" cy="242" r="2" fill="#fde68a" />

        {/* الطريق */}
        <rect x="0" y="268" width="480" height="44" fill="#0b1f4d" opacity="0.6" />
        <line className="ds-road" x1="0" y1="290" x2="480" y2="290" stroke="#e2e8f0" strokeWidth="3"
          strokeDasharray="22 18" opacity="0.55" />

        {/* الكرتونة اللي بتنزل عند البقالة */}
        <g className="ds-parcel">
          <rect x="-9" y="-9" width="18" height="18" rx="2" fill="#f59e0b" />
          <line x1="0" y1="-9" x2="0" y2="9" stroke="#b45309" strokeWidth="2" />
        </g>

        {/* الشاحنة: تتحرك بالكامل + اهتزاز خفيف + عجلات تدور */}
        <g className="ds-truck">
          <g className="ds-bounce">
            {/* دخان العادم */}
            {[0, 1, 2].map((i) => (
              <circle key={i} className="ds-smoke" cx="-6" cy="262" r="5" fill="#e2e8f0"
                style={{ animationDelay: `${i * 0.35}s` }} />
            ))}
            <rect x="0" y="196" width="128" height="76" rx="7" fill="#ffffff" />
            <rect x="0" y="258" width="128" height="14" rx="3" fill="#e2e8f0" />
            <rect x="18" y="212" width="30" height="26" rx="3" fill="#f59e0b" />
            <line x1="33" y1="212" x2="33" y2="238" stroke="#b45309" strokeWidth="2" opacity="0.6" />
            <rect x="56" y="216" width="54" height="7" rx="3.5" fill="#1d4ed8" />
            <rect x="56" y="229" width="36" height="7" rx="3.5" fill="#93c5fd" />
            <path d="M128 214 H162 L186 243 V272 H128 Z" fill="#f59e0b" />
            <path d="M136 222 H158 L175 243 H136 Z" fill="#1e3a8a" opacity="0.85" />
            <rect x="174" y="254" width="12" height="7" rx="2" fill="#fef3c7" className="ds-light" />
          </g>
          {[40, 156].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="274" r="16" fill="#0f172a" />
              <g className="ds-wheel">
                <circle cx={cx} cy="274" r="8" fill="#94a3b8" />
                <line x1={cx - 8} y1="274" x2={cx + 8} y2="274" stroke="#334155" strokeWidth="2.5" />
                <line x1={cx} y1="266" x2={cx} y2="282" stroke="#334155" strokeWidth="2.5" />
              </g>
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
