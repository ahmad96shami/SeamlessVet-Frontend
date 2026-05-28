// SeamlessVet — Glossy clay (3D) icon set.
// Each icon is a 64×64 SVG scene: tinted squircle bg with top gloss + bottom
// inner shadow, then a 2-tone illustration. Used for prominent spots
// (client avatars, quick actions, stat cards, vaccination reminders).

const I3 = (() => {
  // Helper: <defs> shared across one icon — keeps fills consistent.
  const Defs = ({ id, from, to }) => (
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={from} />
        <stop offset="1" stopColor={to} />
      </linearGradient>
      <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <radialGradient id={`shine-${id}`} cx="0.3" cy="0.25" r="0.6">
        <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`inshadow-${id}`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0.18" />
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
      </linearGradient>
    </defs>
  );

  // No plate — just a soft contact shadow under the illustration.
  const Plate = ({ id, from, to, children, dark = false }) => (
    <g>
      <Defs id={id} from={from} to={to} />
      <ellipse cx="32" cy="60" rx="20" ry="2.5" fill="#000" opacity="0.10" />
      {children}
    </g>
  );

  // ── Per-icon scenes ────────────────────────────────────────────────────
  const ICONS = {
    chicken: () => (
      <Plate id="chk" from="#FFD7A8" to="#F49255">
        <defs>
          <linearGradient id="chk-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFDF7" />
            <stop offset="1" stopColor="#E9DFC9" />
          </linearGradient>
          <linearGradient id="chk-comb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FF7A6B" />
            <stop offset="1" stopColor="#C8331E" />
          </linearGradient>
        </defs>
        {/* tail */}
        <path d="M14 30 Q9 24 13 18 Q17 22 18 30 Z" fill="#FFF" opacity="0.95" />
        <path d="M14 30 Q9 24 13 18 Q17 22 18 30 Z" fill="#000" opacity="0.06" />
        {/* body */}
        <ellipse cx="36" cy="38" rx="18" ry="15" fill="url(#chk-body)" />
        {/* wing */}
        <path d="M28 36 Q34 32 42 36 Q38 44 30 44 Z" fill="#000" opacity="0.06" />
        <path d="M28 36 Q34 32 42 36 Q38 44 30 44 Z" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="1" />
        {/* legs */}
        <path d="M30 52 v6 m1.5 0 h-3 m9 -6 v6 m1.5 0 h-3" stroke="#E0982E" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* head */}
        <circle cx="46" cy="26" r="9" fill="url(#chk-body)" />
        {/* comb (3 bumps) */}
        <path d="M40 18 q1 -3 3 -2 q1 -3 3 -2 q1 -3 3 -1 q-1 4 -4 4 q-3 0 -5 1z" fill="url(#chk-comb)" />
        {/* wattle */}
        <path d="M51 30 q3 1 2 4 q-2 1 -3 -1 z" fill="url(#chk-comb)" />
        {/* beak */}
        <path d="M52 26 l5 1 -5 3 z" fill="#F2A027" />
        <path d="M52 26 l5 1 -5 3 z" fill="#000" opacity="0.08" />
        {/* eye */}
        <circle cx="46" cy="24" r="1.6" fill="#1B1B1B" />
        <circle cx="46.5" cy="23.5" r="0.6" fill="#fff" />
      </Plate>
    ),

    cow: () => (
      <Plate id="cow" from="#F7C7C7" to="#D77A86">
        <defs>
          <linearGradient id="cow-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#E9D6CC" />
          </linearGradient>
        </defs>
        {/* ears */}
        <ellipse cx="17" cy="22" rx="5" ry="4" fill="#F4ADAD" transform="rotate(-20 17 22)" />
        <ellipse cx="47" cy="22" rx="5" ry="4" fill="#F4ADAD" transform="rotate(20 47 22)" />
        {/* head */}
        <path d="M16 32 Q16 16 32 16 Q48 16 48 32 Q48 50 32 50 Q16 50 16 32 Z" fill="url(#cow-body)" />
        {/* spots */}
        <ellipse cx="22" cy="24" rx="4" ry="3" fill="#1B1B1B" opacity="0.85" transform="rotate(-15 22 24)" />
        <ellipse cx="44" cy="38" rx="3" ry="2.5" fill="#1B1B1B" opacity="0.85" transform="rotate(20 44 38)" />
        {/* snout */}
        <ellipse cx="32" cy="40" rx="11" ry="7" fill="#F2B3BB" />
        <circle cx="28" cy="40" r="1.4" fill="#1B1B1B" />
        <circle cx="36" cy="40" r="1.4" fill="#1B1B1B" />
        {/* eyes */}
        <circle cx="26" cy="30" r="1.8" fill="#1B1B1B" />
        <circle cx="38" cy="30" r="1.8" fill="#1B1B1B" />
        <circle cx="26.5" cy="29.5" r="0.6" fill="#fff" />
        <circle cx="38.5" cy="29.5" r="0.6" fill="#fff" />
      </Plate>
    ),

    house: () => (
      <Plate id="hse" from="#BCD9F1" to="#5A8FCB">
        {/* base */}
        <path d="M14 32 L32 16 L50 32 V52 H14 Z" fill="#FFFFFF" />
        <path d="M14 32 L32 16 L50 32 V52 H14 Z" fill="#000" opacity="0.05" />
        {/* roof */}
        <path d="M12 33 L32 14 L52 33 L48 33 L32 19 L16 33 Z" fill="#C84A3A" />
        <path d="M12 33 L32 14 L52 33" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" />
        {/* door */}
        <rect x="28" y="38" width="8" height="14" rx="1.5" fill="#7A4A2D" />
        <circle cx="34" cy="46" r="0.7" fill="#F2C84B" />
        {/* window */}
        <rect x="18" y="36" width="7" height="7" rx="1" fill="#7BC0E5" />
        <path d="M21.5 36 v7 M18 39.5 h7" stroke="#FFF" strokeWidth="0.8" />
        <rect x="39" y="36" width="7" height="7" rx="1" fill="#7BC0E5" />
        <path d="M42.5 36 v7 M39 39.5 h7" stroke="#FFF" strokeWidth="0.8" />
        {/* chimney */}
        <rect x="40" y="18" width="4" height="6" fill="#C84A3A" />
      </Plate>
    ),

    farm: () => (
      <Plate id="frm" from="#CFE9D2" to="#5BAB75">
        {/* silo */}
        <rect x="14" y="22" width="9" height="28" rx="1" fill="#F4EAD2" />
        <ellipse cx="18.5" cy="22" rx="4.5" ry="2" fill="#E2D3B0" />
        <path d="M14 22 a4.5 2 0 0 1 9 0" fill="#fff" opacity="0.6" />
        {/* barn body */}
        <path d="M26 30 H52 V50 H26 Z" fill="#C84A3A" />
        {/* roof */}
        <path d="M24 30 L39 18 L54 30 Z" fill="#8A2E22" />
        {/* doors (X) */}
        <rect x="35" y="36" width="10" height="14" fill="#FFF7E8" />
        <path d="M35 36 L45 50 M45 36 L35 50" stroke="#8A4A2E" strokeWidth="1.4" />
        <path d="M35 36 H45 V50 H35 Z" fill="none" stroke="#8A4A2E" strokeWidth="1" />
        <rect x="28" y="38" width="5" height="5" fill="#FFF7E8" />
        <rect x="47" y="38" width="3" height="5" fill="#FFF7E8" />
      </Plate>
    ),

    syringe: () => (
      <Plate id="syr" from="#CFE3F4" to="#3A78C2">
        {/* barrel */}
        <g transform="rotate(-30 32 32)">
          <rect x="14" y="28" width="32" height="9" rx="2" fill="#FFFFFF" />
          <rect x="14" y="28" width="32" height="9" rx="2" fill="#000" opacity="0.05" />
          <rect x="14" y="28" width="32" height="9" rx="2" fill="none" stroke="#1B1B1B" strokeOpacity="0.18" />
          {/* fluid */}
          <rect x="16" y="30" width="20" height="5" rx="1" fill="#67B0E8" />
          {/* graduations */}
          <path d="M22 28 v3 M28 28 v3 M34 28 v3" stroke="#1B1B1B" strokeOpacity="0.25" />
          {/* plunger flange */}
          <rect x="46" y="26" width="3" height="13" rx="0.5" fill="#C9D2DC" />
          <rect x="49" y="22" width="2" height="21" rx="0.5" fill="#C9D2DC" />
          {/* needle */}
          <path d="M14 32.5 L4 32.5" stroke="#9AA6B2" strokeWidth="1.5" />
          <path d="M4 32 l-2 0.5 l2 0.5 z" fill="#9AA6B2" />
          {/* drop */}
          <path d="M2 28 q-1 3 0 4 q1 -1 0 -4 z" fill="#67B0E8" />
        </g>
      </Plate>
    ),

    pill: () => (
      <Plate id="pll" from="#FCE3D7" to="#E07A5F">
        <g transform="rotate(-25 32 32)">
          <rect x="12" y="26" width="40" height="14" rx="7" fill="#FFFFFF" />
          <rect x="12" y="26" width="20" height="14" rx="7" fill="#3EABBC" />
          <rect x="12" y="26" width="40" height="14" rx="7" fill="none" stroke="#1B1B1B" strokeOpacity="0.12" />
          <rect x="14" y="28" width="36" height="3" rx="1.5" fill="#FFF" opacity="0.5" />
        </g>
      </Plate>
    ),

    truck: () => (
      <Plate id="trk" from="#D9E2F2" to="#445F8E">
        {/* trailer */}
        <rect x="12" y="22" width="28" height="22" rx="2" fill="#FFFFFF" />
        <rect x="12" y="22" width="28" height="6" fill="#3EABBC" />
        {/* cab */}
        <path d="M40 28 H50 L54 34 V44 H40 Z" fill="#C8412C" />
        <rect x="42" y="30" width="9" height="6" rx="1" fill="#7BC0E5" />
        {/* bumper */}
        <rect x="12" y="44" width="42" height="3" fill="#1B1B1B" opacity="0.4" />
        {/* wheels */}
        <circle cx="22" cy="48" r="4" fill="#1B1B1B" />
        <circle cx="22" cy="48" r="1.5" fill="#9AA6B2" />
        <circle cx="46" cy="48" r="4" fill="#1B1B1B" />
        <circle cx="46" cy="48" r="1.5" fill="#9AA6B2" />
      </Plate>
    ),

    box: () => (
      <Plate id="bx" from="#F4DFC0" to="#B47B36">
        {/* box body */}
        <path d="M14 26 L32 18 L50 26 V46 L32 54 L14 46 Z" fill="#E0A969" />
        {/* top face */}
        <path d="M14 26 L32 18 L50 26 L32 34 Z" fill="#F2C28A" />
        {/* right face */}
        <path d="M32 34 L50 26 V46 L32 54 Z" fill="#B47B36" />
        {/* tape */}
        <path d="M22 22 L40 30 M40 22 L22 30" stroke="#fff" strokeWidth="0" />
        <rect x="29" y="20" width="6" height="34" fill="#D85B3F" opacity="0.85"
              transform="skewY(-22) translate(8 0)" />
      </Plate>
    ),

    receipt: () => (
      <Plate id="rcp" from="#D8F0E5" to="#1F8A56">
        <path d="M18 14 H46 V52 L41 49 L36 52 L31 49 L26 52 L21 49 L18 52 Z" fill="#FFFFFF" />
        <path d="M22 22 H42 M22 28 H42 M22 34 H38" stroke="#3EABBC" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="40" cy="42" r="4" fill="#1F8A56" />
        <path d="M37.5 42 l1.7 1.7 l3.3 -3.3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Plate>
    ),

    paper: () => (
      <Plate id="ppr" from="#E2DEF6" to="#5A60D0">
        {/* clipboard back */}
        <rect x="14" y="14" width="36" height="40" rx="4" fill="#FFFFFF" />
        {/* clip */}
        <rect x="24" y="10" width="16" height="8" rx="2" fill="#9AA6B2" />
        <rect x="26" y="12" width="12" height="5" rx="1" fill="#C9D2DC" />
        {/* lines */}
        <path d="M20 26 H44 M20 32 H44 M20 38 H38" stroke="#3EABBC" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M20 44 H30" stroke="#9AA6B2" strokeWidth="1.6" strokeLinecap="round" />
      </Plate>
    ),

    shield: () => (
      <Plate id="shd" from="#D6F0F4" to="#0F7A8A">
        <path d="M32 12 L50 18 V30 C50 42 42 50 32 53 C22 50 14 42 14 30 V18 Z" fill="#FFFFFF" />
        <path d="M32 12 L50 18 V30 C50 42 42 50 32 53 C22 50 14 42 14 30 V18 Z" fill="#000" opacity="0.05" />
        <path d="M24 32 l5 5 l11 -12" stroke="#1F8A56" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Plate>
    ),

    bell: () => (
      <Plate id="bll" from="#FCE9C2" to="#D1962A">
        <path d="M20 40 Q20 22 32 22 Q44 22 44 40 L48 44 H16 Z" fill="#F2C84B" />
        <path d="M20 40 Q20 22 32 22 Q44 22 44 40" fill="#fff" opacity="0.25" />
        <rect x="29" y="18" width="6" height="5" rx="1" fill="#C99325" />
        <ellipse cx="32" cy="48" rx="3" ry="2" fill="#A07118" />
      </Plate>
    ),

    user: () => (
      <Plate id="usr" from="#D8DFEC" to="#223D69">
        <circle cx="32" cy="26" r="8" fill="#FFFFFF" />
        <path d="M14 52 C16 42 24 38 32 38 C40 38 48 42 50 52 Z" fill="#FFFFFF" />
        <path d="M14 52 C16 42 24 38 32 38 C40 38 48 42 50 52 Z" fill="#000" opacity="0.05" />
      </Plate>
    ),

    add: () => (
      <Plate id="add" from="#3EABBC" to="#0F7A8A" dark>
        <path d="M32 18 V46 M18 32 H46" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
      </Plate>
    ),

    check: () => (
      <Plate id="chk2" from="#D8F0E5" to="#1F8A56">
        <path d="M18 32 l9 9 l19 -20" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Plate>
    ),

    warn: () => (
      <Plate id="wrn" from="#FCE0A4" to="#D08A18">
        <path d="M32 14 L52 48 H12 Z" fill="#F2C84B" />
        <path d="M32 14 L52 48 H12 Z" fill="#000" opacity="0.06" />
        <rect x="30" y="24" width="4" height="14" rx="2" fill="#1B1B1B" />
        <circle cx="32" cy="42" r="2.2" fill="#1B1B1B" />
      </Plate>
    ),

    calendar: () => (
      <Plate id="cal" from="#F7D6E3" to="#C8417A">
        <rect x="14" y="18" width="36" height="34" rx="4" fill="#FFFFFF" />
        <rect x="14" y="18" width="36" height="9" rx="4" fill="#C8417A" />
        <rect x="14" y="22" width="36" height="5" fill="#C8417A" />
        <rect x="20" y="14" width="3" height="8" rx="1" fill="#9AA6B2" />
        <rect x="41" y="14" width="3" height="8" rx="1" fill="#9AA6B2" />
        <circle cx="22" cy="34" r="1.6" fill="#3EABBC" />
        <circle cx="32" cy="34" r="1.6" fill="#3EABBC" />
        <circle cx="42" cy="34" r="1.6" fill="#3EABBC" />
        <circle cx="22" cy="42" r="1.6" fill="#9AA6B2" />
        <circle cx="32" cy="42" r="2.2" fill="#C8417A" />
        <circle cx="42" cy="42" r="1.6" fill="#9AA6B2" />
      </Plate>
    ),
  };

  // Public component: renders a square 3D icon.
  const Icon3D = ({ name, size = 48, style = {} }) => {
    const Scene = ICONS[name];
    if (!Scene) return null;
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "inline-block", ...style }}>
        <Scene />
      </svg>
    );
  };

  return { Icon3D, NAMES: Object.keys(ICONS) };
})();

const Icon3D = I3.Icon3D;

Object.assign(window, { Icon3D, I3 });
