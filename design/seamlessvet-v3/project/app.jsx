// SeamlessVet — App: flat phone screens (no iOS chrome) on a Design Canvas.

const FRAME_W = 390;
const FRAME_H = 780;

// Flat phone shell — replaces IOSDevice.
// Just a rounded white rectangle with subtle shadow; gives screens a
// device-like silhouette without the OS frame.
function FlatPhone({ children, label }) {
  return (
    <div style={{
      width: FRAME_W,
      height: FRAME_H,
      background: "#fff",
      borderRadius: 0,
      overflow: "hidden",
      boxShadow: "0 1px 0 rgba(15,42,68,0.08), 0 18px 48px rgba(15,42,68,0.18)",
      border: "1px solid rgba(15,42,68,0.08)",
      position: "relative",
      isolation: "isolate",
    }}>
      {children}
    </div>
  );
}

// Curated accent palettes
const ACCENTS = {
  teal:    { 50: "#E8F4F6", 100: "#CFE7EC", 200: "#A6D4DC", 400: "#4FA8B6", 500: "#1A8FA1", 600: "#0F7A8A", 700: "#0B6573", canvas: "#129AAA" },
  emerald: { 50: "#E6F5EC", 100: "#CDEBD8", 200: "#A2D7B6", 400: "#4FB377", 500: "#1F9A5A", 600: "#16834C", 700: "#0F6B3D", canvas: "#1AA060" },
  indigo:  { 50: "#ECEDFB", 100: "#D7DAF5", 200: "#B6BBED", 400: "#7E84D6", 500: "#4C53C0", 600: "#3B41A4", 700: "#2C3187", canvas: "#5A60D0" },
  coral:   { 50: "#FCEEEA", 100: "#F8DDD3", 200: "#F1B7A6", 400: "#E27D5E", 500: "#D45F3F", 600: "#B94A2C", 700: "#933820", canvas: "#E26A48" },
  ochre:   { 50: "#F8EFDD", 100: "#F0DDB8", 200: "#E0BD7A", 400: "#C2913A", 500: "#A87922", 600: "#8B621A", 700: "#6E4D14", canvas: "#BA8A2E" },
};

const FONTS = {
  Tajawal:               '"Tajawal", system-ui, sans-serif',
  Cairo:                 '"Cairo", system-ui, sans-serif',
  "IBM Plex Sans Arabic":'"IBM Plex Sans Arabic", system-ui, sans-serif',
  Almarai:               '"Almarai", system-ui, sans-serif',
  "Readex Pro":          '"Readex Pro", system-ui, sans-serif',
  "Noto Kufi Arabic":    '"Noto Kufi Arabic", system-ui, sans-serif',
  Amiri:                 '"Amiri", "Times New Roman", serif',
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "teal",
  "tinted_canvas": true,
  "font": "Tajawal"
}/*EDITMODE-END*/;

// Apply accent CSS vars to <html>
function applyAccent(name, tinted) {
  const a = ACCENTS[name] || ACCENTS.teal;
  const r = document.documentElement;
  r.style.setProperty("--teal-50",  a[50]);
  r.style.setProperty("--teal-100", a[100]);
  r.style.setProperty("--teal-200", a[200]);
  r.style.setProperty("--teal-400", a[400]);
  r.style.setProperty("--teal-500", a[500]);
  r.style.setProperty("--teal-600", a[600]);
  r.style.setProperty("--teal-700", a[700]);
  r.style.setProperty("--canvas",   tinted ? a.canvas : "#EEF1F4");
}

// One reusable mounted phone with internal navigation state.
function VetPhone({ initial = "home" }) {
  const [route, setRoute] = React.useState(initial);
  const go = (r) => setRoute(r);

  let view = null;
  switch (route) {
    case "login":     view = <ScreenLogin       onSubmit={() => go("pending")} />; break;
    case "pending":   view = <ScreenPending     onContinue={() => go("home")} />; break;
    case "home":      view = <ScreenHome
                              onOpenVisit={() => go("v1")}
                              onOpenInventory={() => go("inv")}
                              onOpenStatement={() => go("statement")}
                              onOpenReceipt={() => go("receipt")} />; break;
    case "v1":        view = <ScreenVisitClient   onBack={() => go("home")} onNext={() => go("v2")} />; break;
    case "v2":        view = <ScreenVisitMeds     onBack={() => go("v1")}   onNext={() => go("v3")} />; break;
    case "v3":        view = <ScreenVisitServices onBack={() => go("v2")}   onNext={() => go("v4")} />; break;
    case "v4":        view = <ScreenVisitSummary  onBack={() => go("v3")}   onConfirm={() => go("done")} />; break;
    case "done":      view = <ScreenVisitDone     onBack={() => go("home")} onReceipt={() => go("receipt")} />; break;
    case "inv":       view = <ScreenInventory     onBack={() => go("home")} onLoad={() => go("load")} />; break;
    case "load":      view = <ScreenLoad          onBack={() => go("inv")}  onConfirm={() => go("inv")} />; break;
    case "receipt":   view = <ScreenReceipt       onBack={() => go("home")} onIssue={() => go("home")} />; break;
    case "statement": view = <ScreenStatement     onBack={() => go("home")} />; break;
    default:          view = <ScreenHome />;
  }
  return <FlatPhone>{view}</FlatPhone>;
}

function applyFont(name) {
  const stack = FONTS[name] || FONTS.Tajawal;
  document.documentElement.style.setProperty("--font", stack);
  document.body.style.fontFamily = stack;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyAccent(t.accent, t.tinted_canvas); }, [t.accent, t.tinted_canvas]);
  React.useEffect(() => { applyFont(t.font); }, [t.font]);

  return (
    <>
      <DesignCanvas>
        <DCSection id="overview" title="SeamlessVet · زيارات بيطرية ميدانية"
                   subtitle="نظام إدارة الزيارات الميدانية البيطرية — العربية، يمين-يسار · prototype interactif">

          <DCArtboard id="prototype" label="المنتج الأساسي · جربه" width={FRAME_W} height={FRAME_H}>
            <VetPhone initial="home" />
          </DCArtboard>

          <DCArtboard id="login" label="١ · تسجيل الدخول" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenLogin /></FlatPhone>
          </DCArtboard>

          <DCArtboard id="pending" label="٢ · في انتظار الموافقة" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenPending /></FlatPhone>
          </DCArtboard>

          <DCArtboard id="home" label="٣ · الرئيسية · زيارات اليوم" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenHome /></FlatPhone>
          </DCArtboard>
        </DCSection>

        <DCSection id="visit" title="مسار الزيارة الميدانية"
                   subtitle="٤ خطوات: العميل ← الأدوية ← الخدمات والتطعيمات ← مراجعة وتأكيد">

          <DCArtboard id="v-client" label="٤ · اختيار العميل" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenVisitClient /></FlatPhone>
          </DCArtboard>
          <DCArtboard id="v-meds" label="٥ · صرف الأدوية من سيارتك" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenVisitMeds /></FlatPhone>
          </DCArtboard>
          <DCArtboard id="v-svc" label="٦ · خدمات وتطعيمات" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenVisitServices /></FlatPhone>
          </DCArtboard>
          <DCArtboard id="v-sum" label="٧ · مراجعة وتأكيد" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenVisitSummary /></FlatPhone>
          </DCArtboard>
          <DCArtboard id="v-done" label="٨ · تم تسجيل الزيارة" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenVisitDone /></FlatPhone>
          </DCArtboard>
        </DCSection>

        <DCSection id="ops" title="المخزون والمحاسبة الميدانية"
                   subtitle="مخزون متنقل لكل طبيب، تحميل من المستودع، سندات قبض، وكشوفات حساب.">

          <DCArtboard id="inv" label="٩ · المخزون الميداني" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenInventory /></FlatPhone>
          </DCArtboard>
          <DCArtboard id="load" label="١٠ · تحميل من المستودع" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenLoad /></FlatPhone>
          </DCArtboard>
          <DCArtboard id="receipt" label="١١ · سند قبض" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenReceipt /></FlatPhone>
          </DCArtboard>
          <DCArtboard id="statement" label="١٢ · كشف حساب" width={FRAME_W} height={FRAME_H}>
            <FlatPhone><ScreenStatement /></FlatPhone>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="اللون المميز">
          <TweakColor
            label="Accent"
            value={t.accent}
            options={["teal", "emerald", "indigo", "coral", "ochre"].map(k => ACCENTS[k][500])}
            onChange={(hex) => {
              const k = Object.keys(ACCENTS).find(k => ACCENTS[k][500] === hex) || "teal";
              setTweak("accent", k);
            }}
          />
        </TweakSection>
        <TweakSection label="خلفية اللوحة">
          <TweakToggle label="خلفية ملونة" value={t.tinted_canvas}
                       onChange={(v) => setTweak("tinted_canvas", v)} />
        </TweakSection>
        <TweakSection label="نوع الخط">
          <TweakSelect label="Font" value={t.font}
                       options={Object.keys(FONTS)}
                       onChange={(v) => setTweak("font", v)} />
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            {Object.entries(FONTS).map(([name, stack]) => (
              <button key={name} onClick={() => setTweak("font", name)}
                style={{
                  textAlign: "right", direction: "rtl", padding: "10px 12px",
                  borderRadius: 10, border: "1px solid",
                  borderColor: t.font === name ? "var(--teal-500)" : "rgba(0,0,0,0.08)",
                  background: t.font === name ? "var(--teal-50)" : "#fff",
                  fontFamily: stack, fontSize: 15, fontWeight: 700, cursor: "pointer",
                  color: "var(--navy-900)"
                }}>
                {name} — مزرعة عمرو للدواجن
              </button>
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
