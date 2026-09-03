/**
 * Animated illustrated doctor portraits (SVG) — works offline in the sandbox preview.
 * Unique look per doctor name + specialty, with float / pulse / blink motion.
 */

const PALETTES = [
  { coat: "#E8F4FF", coatDark: "#BFDFF7", shirt: "#0EA5E9", skin: "#F2C4A0", hair: "#2C1810", accent: "#2563EB" },
  { coat: "#EEFBF5", coatDark: "#B7E4D0", shirt: "#10B981", skin: "#E8B896", hair: "#1A1A1A", accent: "#059669" },
  { coat: "#F5F0FF", coatDark: "#D9C8F5", shirt: "#8B5CF6", skin: "#D4A574", hair: "#3D2314", accent: "#7C3AED" },
  { coat: "#FFF5F7", coatDark: "#F9C5D1", shirt: "#F43F5E", skin: "#F0C9A8", hair: "#4A3728", accent: "#E11D48" },
  { coat: "#FFFBEB", coatDark: "#FDE68A", shirt: "#F59E0B", skin: "#C68642", hair: "#1C1917", accent: "#D97706" },
  { coat: "#F0FDFA", coatDark: "#99F6E4", shirt: "#14B8A6", skin: "#F5D0B5", hair: "#292524", accent: "#0D9488" },
  { coat: "#EFF6FF", coatDark: "#BFDBFE", shirt: "#3B82F6", skin: "#E0AC69", hair: "#44403C", accent: "#2563EB" },
  { coat: "#FAF5FF", coatDark: "#E9D5FF", shirt: "#A855F7", skin: "#F1C27D", hair: "#0C0A09", accent: "#9333EA" },
];

function hashName(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function isFemaleName(name = "") {
  const n = name.toLowerCase();
  return (
    n.includes("ananya") ||
    n.includes("priya") ||
    n.includes("sneha") ||
    n.includes("meera") ||
    n.includes("neha") ||
    n.includes("fatima") ||
    n.includes("sharma") && n.includes("ananya")
  );
}

function paletteFor(name, specialty) {
  const h = hashName(name + (specialty || ""));
  return PALETTES[h % PALETTES.length];
}

/** Small stethoscope overlay */
function StethoscopeSVG({ color = "#0EA5E9" }) {
  return (
    <g className="doc-steth">
      <path
        d="M38 78c0 10 8 18 18 18s18-8 18-18"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="56" cy="96" r="5" fill={color} />
      <path d="M42 70v8M70 70v8" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function DoctorSVG({ name, specialty, size = 96 }) {
  const p = paletteFor(name, specialty);
  const female = isFemaleName(name);
  const h = hashName(name);
  const hairStyle = h % 3;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 112 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="doc-avatar-svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`bg-${h}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.coat} />
          <stop offset="100%" stopColor={p.coatDark} />
        </linearGradient>
        <linearGradient id={`coat-${h}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor={p.coat} />
        </linearGradient>
        <clipPath id={`clip-${h}`}>
          <circle cx="56" cy="56" r="52" />
        </clipPath>
      </defs>

      {/* animated ring */}
      <circle
        cx="56"
        cy="56"
        r="54"
        fill="none"
        stroke={p.accent}
        strokeWidth="2.5"
        strokeDasharray="8 10"
        className="doc-ring"
        opacity="0.55"
      />

      <circle cx="56" cy="56" r="52" fill={`url(#bg-${h})`} />

      <g clipPath={`url(#clip-${h})`}>
        {/* shoulders / coat */}
        <ellipse cx="56" cy="108" rx="48" ry="36" fill={`url(#coat-${h})`} />
        <path d="M28 95c8-14 20-22 28-22s20 8 28 22" fill="#fff" opacity="0.9" />
        {/* shirt V */}
        <path d="M48 88l8 20 8-20v30H48V88z" fill={p.shirt} />
        {/* collar */}
        <path d="M42 88l14-8 14 8-6 4-8-5-8 5-6-4z" fill="#fff" />

        {/* neck */}
        <rect x="48" y="64" width="16" height="14" rx="4" fill={p.skin} />

        {/* head */}
        <ellipse cx="56" cy="48" rx="22" ry="24" fill={p.skin} className="doc-head" />

        {/* hair */}
        {female ? (
          <>
            <ellipse cx="56" cy="36" rx="24" ry="18" fill={p.hair} />
            <ellipse cx="32" cy="52" rx="8" ry="16" fill={p.hair} />
            <ellipse cx="80" cy="52" rx="8" ry="16" fill={p.hair} />
            {hairStyle === 0 && (
              <path d="M34 40c6-12 38-12 44 0" stroke={p.hair} strokeWidth="6" fill="none" />
            )}
          </>
        ) : hairStyle === 0 ? (
          <path d="M34 42c2-16 16-24 22-24s20 8 22 24c-6-8-14-10-22-10s-16 2-22 10z" fill={p.hair} />
        ) : hairStyle === 1 ? (
          <ellipse cx="56" cy="30" rx="20" ry="12" fill={p.hair} />
        ) : (
          <path d="M35 44c0-14 10-22 21-22s21 8 21 22H35z" fill={p.hair} />
        )}

        {/* ears */}
        <ellipse cx="34" cy="50" rx="4" ry="6" fill={p.skin} />
        <ellipse cx="78" cy="50" rx="4" ry="6" fill={p.skin} />

        {/* eyes + blink */}
        <g className="doc-eyes">
          <ellipse cx="47" cy="50" rx="3.2" ry="3.6" fill="#1E293B" />
          <ellipse cx="65" cy="50" rx="3.2" ry="3.6" fill="#1E293B" />
          <circle cx="48" cy="49" r="1" fill="#fff" />
          <circle cx="66" cy="49" r="1" fill="#fff" />
        </g>
        {/* eyelids for blink (CSS scales) */}
        <g className="doc-lids" opacity="0">
          <rect x="43" y="47" width="8" height="6" rx="3" fill={p.skin} />
          <rect x="61" y="47" width="8" height="6" rx="3" fill={p.skin} />
        </g>

        {/* brows */}
        <path d="M42 44h10" stroke="#5B3A29" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <path d="M60 44h10" stroke="#5B3A29" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />

        {/* smile */}
        <path d="M48 60c2.5 4 9.5 4 12 0" stroke="#C45C56" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* glasses for some doctors */}
        {h % 2 === 0 && (
          <g opacity="0.85">
            <circle cx="47" cy="50" r="7" fill="none" stroke="#334155" strokeWidth="1.5" />
            <circle cx="65" cy="50" r="7" fill="none" stroke="#334155" strokeWidth="1.5" />
            <path d="M54 50h4" stroke="#334155" strokeWidth="1.5" />
          </g>
        )}

        <StethoscopeSVG color={p.accent} />

        {/* badge */}
        <circle cx="78" cy="92" r="7" fill={p.accent} className="doc-badge" />
        <path d="M78 88v8M74 92h8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * @param {{ name: string, specialty?: string, size?: number, className?: string, showOnline?: boolean }} props
 */
export default function DoctorAvatar({
  name = "Doctor",
  specialty = "",
  size = 64,
  className = "",
  showOnline = true,
}) {
  const p = paletteFor(name, specialty);

  return (
    <div
      className={`doctor-avatar relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={name}
    >
      {/* soft glow blob */}
      <span
        className="absolute inset-0 rounded-full blur-md opacity-50 animate-pulse-soft pointer-events-none"
        style={{ background: `radial-gradient(circle, ${p.accent}55 0%, transparent 70%)` }}
      />
      <div className="relative doctor-avatar-float rounded-full overflow-hidden" style={{ width: size, height: size }}>
        <DoctorSVG name={name} specialty={specialty} size={size} />
      </div>
      {showOnline && (
        <span className="absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
        </span>
      )}
    </div>
  );
}

/** Hero strip of floating mini doctors */
export function DoctorHeroFloat({ className = "" }) {
  const sample = [
    "Dr. Ananya Sharma",
    "Dr. Rohan Mehta",
    "Dr. Priya Nair",
    "Dr. Vikram Singh",
  ];
  return (
    <div className={`flex items-end justify-center gap-[-8px] ${className}`}>
      {sample.map((n, i) => (
        <div
          key={n}
          className="doctor-hero-bob"
          style={{ animationDelay: `${i * 0.35}s`, zIndex: sample.length - i, marginLeft: i ? -10 : 0 }}
        >
          <DoctorAvatar name={n} size={44} showOnline={i === 0} />
        </div>
      ))}
    </div>
  );
}
