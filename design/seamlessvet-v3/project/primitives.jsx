// SeamlessVet — shared primitives + icon set
// Lightweight inline SVGs (24x24, 1.8 stroke). Stroke uses currentColor.

const Ico = ({ d, fill = "none", size = 22, sw = 1.8, children }) =>
<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>;


const I = {
  back: (p) => <Ico {...p}><path d="M15 6l-6 6 6 6" /></Ico>, // RTL: chevron pointing right (back in RTL goes →)
  fwd: (p) => <Ico {...p}><path d="M9 6l6 6-6 6" /></Ico>,
  more: (p) => <Ico {...p}><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" /></Ico>,
  search: (p) => <Ico {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Ico>,
  bell: (p) => <Ico {...p}><path d="M6 16h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v4L6 16z" /><path d="M10 19a2 2 0 0 0 4 0" /></Ico>,
  home: (p) => <Ico {...p}><path d="M3.5 11.5L12 4l8.5 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M10 20v-5h4v5" /></Ico>,
  briefcase: (p) => <Ico {...p}><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M3 12h18" /></Ico>,
  inbox: (p) => <Ico {...p}><path d="M4 13l2-7h12l2 7" /><path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /><path d="M4 13h4l1 2h6l1-2h4" /></Ico>,
  user: (p) => <Ico {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></Ico>,
  add: (p) => <Ico {...p}><path d="M12 5v14M5 12h14" /></Ico>,
  check: (p) => <Ico {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Ico>,
  pin: (p) => <Ico {...p}><path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Ico>,
  star: (p) => <Ico {...p} fill="currentColor" sw={0}><path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.6l-5.4 2.8 1-6.1L3.2 10l6.1-.9z" /></Ico>,
  cal: (p) => <Ico {...p}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Ico>,
  clock: (p) => <Ico {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></Ico>,
  pill: (p) => <Ico {...p}><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)" /><path d="M9.5 7.5l7 7" /></Ico>,
  syringe: (p) => <Ico {...p}><path d="M19 5l-2-2" /><path d="M18 6l-9 9-3 3-1-1 3-3 9-9 1 1z" /><path d="M11 13l-1-1M14 10l-1-1M16 8l-1-1" /></Ico>,
  stethoscope: (p) => <Ico {...p}><path d="M5 4v5a4 4 0 0 0 8 0V4" /><path d="M9 13v3a4 4 0 0 0 8 0v-2" /><circle cx="17" cy="11" r="2" /></Ico>,
  truck: (p) => <Ico {...p}><path d="M2 7h11v9H2z" /><path d="M13 10h5l3 3v3h-8" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></Ico>,
  box: (p) => <Ico {...p}><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></Ico>,
  cow: (p) => <Ico {...p}><path d="M5 6c-1-1.5-1-3 .8-3.2 1.6-.2 2.4 1 2.7 2.5" /><path d="M19 6c1-1.5 1-3-.8-3.2-1.6-.2-2.4 1-2.7 2.5" /><path d="M7 7h10c2.2 0 4 1.8 4 4v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3c0-2.2 1.8-4 4-4z" /><circle cx="9" cy="13" r="0.9" fill="currentColor" stroke="none" /><circle cx="15" cy="13" r="0.9" fill="currentColor" stroke="none" /><path d="M10 17.5c.7.5 1.4.7 2 .7s1.3-.2 2-.7" /><ellipse cx="12" cy="17" rx="2" ry="1.4" /></Ico>,
  bird: (p) => <Ico {...p}>{/* chicken / hen — body + tail + comb + beak + legs */}<path d="M6 6.5c0-.7.6-1.3 1.3-1.3.4 0 .8.2 1 .5l.4-.4c.5-.5 1.4-.5 1.9 0 .3.3.4.6.4 1" /><path d="M5.5 7.5C4 9 3 11 3 13a6 6 0 0 0 6 6h3a6 6 0 0 0 6-6c0-1.5-.6-2.9-1.5-4" /><path d="M16.5 9c1.5-.5 3-2 3.5-4-2.5.3-4 1.5-4.5 3" /><path d="M9 7.3l-.7-.7" /><circle cx="7" cy="9" r="0.7" fill="currentColor" stroke="none" /><path d="M5 9.5l-1.6.3.9 1.2" /><path d="M9 19v2M13 19v2" /></Ico>,
  house: (p) => <Ico {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Ico>,
  paper: (p) => <Ico {...p}><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h7M9 17h5" /></Ico>,
  receipt: (p) => <Ico {...p}><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" /><path d="M9 8h6M9 12h6M9 16h4" /></Ico>,
  arrowDown: (p) => <Ico {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Ico>,
  arrowUp: (p) => <Ico {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Ico>,
  wifiOff: (p) => <Ico {...p}><path d="M3 3l18 18" /><path d="M5 12a10 10 0 0 1 4-2.5" /><path d="M2 8.5a14 14 0 0 1 6.5-3" /><path d="M15 9a10 10 0 0 1 4 3" /><path d="M22 8.5a14 14 0 0 0-6-3.3" /><circle cx="12" cy="18" r="1.4" fill="currentColor" /></Ico>,
  warn: (p) => <Ico {...p}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></Ico>,
  filter: (p) => <Ico {...p}><path d="M4 5h16l-6 8v6l-4-2v-4z" /></Ico>,
  send: (p) => <Ico {...p}><path d="M5 12l16-8-6 18-3-7z" /><path d="M5 12l7 3" /></Ico>,
  print: (p) => <Ico {...p}><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 17h10v4H7z" /></Ico>,
  edit: (p) => <Ico {...p}><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M14 6l4 4" /></Ico>,
  trash: (p) => <Ico {...p}><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" /></Ico>,
  link: (p) => <Ico {...p}><path d="M9 15l6-6" /><path d="M11 5l1.5-1.5a4 4 0 0 1 5.7 5.7L17 11" /><path d="M13 19l-1.5 1.5a4 4 0 0 1-5.7-5.7L7 13" /></Ico>,
  shield: (p) => <Ico {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></Ico>,
  spinner: (p) => <Ico {...p}><circle cx="12" cy="12" r="9" opacity="0.2" /><path d="M21 12a9 9 0 0 0-9-9" /></Ico>,
  visa: (p) =>
  <svg width="36" height="14" viewBox="0 0 36 14" fill="none">
      <text x="0" y="11" fontFamily="-apple-system, sans-serif" fontWeight="800" fontSize="11" fill="#1A1F71" letterSpacing="0.5">VISA</text>
    </svg>

};

// Photo helper — renders a 3D clay icon based on the label/type.
const PHOTO_ICON_MAP = [
{ match: /دواجن|طير|طيور|دجاج/, icon: "chicken" },
{ match: /أبقار|بقر|ماشية|ابقار/, icon: "cow" },
{ match: /منزل|منازل|بيت/, icon: "house" },
{ match: /مزرعة|حقل/, icon: "farm" }];


const Photo = ({ w = "100%", h = 64, label, tone, style = {}, radius = 14 }) => {
  const map = label && PHOTO_ICON_MAP.find((m) => m.match.test(label)) || PHOTO_ICON_MAP[3];
  const dim = typeof h === "number" ? h : 64;
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, flex: "0 0 auto",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      ...style
    }}>
      <Icon3D name={map.icon} size={dim} />
    </div>);

};


// Status bar pieces — keep iOS chrome black on white screens, white on tealbg
const SVTopBar = ({ title, onBack, right, solid = true }) =>
<div className={"sv-topbar" + (solid ? " solid" : "")}>
    {onBack ?
  <button className="icon-btn ghost" onClick={onBack} aria-label="رجوع"><I.fwd /></button> :
  <span style={{ width: 38 }} />}
    <h1>{title}</h1>
    {right ? right : <button className="icon-btn ghost"><I.more /></button>}
  </div>;


// Star rating bit
const Stars = ({ value }) =>
<span className="pill amber" style={{ padding: "3px 8px" }}>
    <span style={{ color: "#F4B400", display: "inline-flex" }}><I.star size={12} /></span>
    <span className="num">{value.toFixed(1)}</span>
  </span>;


// Returns the 3D-icon name for a client type so screens can render Icon3D
// directly when they want the avatar styling
const ClientType3D = (t) => ({
  poultry: "chicken",
  cattle: "cow",
  farm: "farm",
  home: "house"
})[t] || "farm";

const ClientTypeIcon = ({ type, size = 20 }) => {
  if (type === "poultry") return <I.bird size={size} />;
  if (type === "cattle") return <I.cow size={size} />;
  if (type === "home") return <I.house size={size} />;
  return <I.briefcase size={size} />;
};

const ClientTypeLabel = (t) => ({
  poultry: "مزرعة دواجن",
  cattle: "مزرعة أبقار",
  farm: "مزرعة عادية",
  home: "منزل"
})[t] || t;

// Currency
const Shekel = ({ value, dim = false }) =>
<span className={"num " + (dim ? "muted" : "")}>
    {value.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 2 })}{" "}
    <span style={{ fontSize: "0.85em", fontWeight: 700, opacity: 0.8 }}>شيقل</span>
  </span>;


Object.assign(window, { I, Ico, Photo, SVTopBar, Stars, ClientTypeIcon, ClientType3D, ClientTypeLabel, Shekel });