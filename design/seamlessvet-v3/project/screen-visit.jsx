// SeamlessVet — New Visit flow (3 steps + summary)

const STEPS = ["العميل", "الأدوية", "الخدمات والملاحظات"];

function StepHeader({ step, title, onBack }) {
  return (
    <>
      <SVTopBar title={title} onBack={onBack} />
      <div className="steps">
        {STEPS.map((s, i) =>
        <div key={s} className={"step " + (i < step ? "done" : i === step ? "active" : "")} />
        )}
      </div>
    </>);

}

// ── Step 1: pick client ────────────────────────────────────
function ScreenVisitClient({ onBack, onNext }) {
  const [type, setType] = React.useState("all");
  const filtered = type === "all" ? CLIENTS : CLIENTS.filter((c) => c.type === type);
  return (
    <div className="sv-screen papered" dir="rtl">
      <StepHeader step={0} title="زيارة جديدة" onBack={onBack} />
      <div className="sv-body" style={{ paddingTop: 8 }}>
        <div className="input-group" style={{ marginBottom: 12 }}>
          <I.search size={18} />
          <input className="input" placeholder="ابحث باسم العميل أو المزرعة..." />
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
          {[
          { k: "all", l: "الكل" },
          { k: "poultry", l: "دواجن", icon: <I.bird size={14} /> },
          { k: "cattle", l: "أبقار", icon: <I.cow size={14} /> },
          { k: "farm", l: "مزارع", icon: <I.briefcase size={14} /> },
          { k: "home", l: "منازل", icon: <I.house size={14} /> }].
          map((t) =>
          <button key={t.k} onClick={() => setType(t.k)}
          className={"chip " + (type === t.k ? "active" : "")}>
              {t.icon} {t.l}
            </button>
          )}
        </div>

        <div className="section-title" style={{ marginTop: 4 }}>
          <h3>قريبًا منك</h3>
          <a>الخريطة</a>
        </div>

        <div className="list">
          {filtered.map((c, i) =>
          <button key={c.id} onClick={onNext} className="list-row"
          style={{ border: "none", textAlign: "right", fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
              <Photo w={56} h={56} radius={14} label={ClientTypeLabel(c.type)} />
              <div className="meta">
                <h4>{c.name}</h4>
                <p>{c.animals}</p>
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <span className="pill" style={{ padding: "2px 8px", gap: 4 }}>
                    <ClientTypeIcon type={c.type} size={12} /> {ClientTypeLabel(c.type)}
                  </span>
                  <span className="pill" style={{ padding: "2px 8px", gap: 4 }}>
                    <I.pin size={12} /> <span className="num">{c.dist}</span> كم · {c.city}
                  </span>
                  {c.balance < 0 &&
                <span className="pill red" style={{ padding: "2px 8px" }}>
                      مدين <span className="num"> {Math.abs(c.balance)}</span>
                    </span>
                }
                </div>
              </div>
              <I.back size={20} />
            </button>
          )}
        </div>
      </div>
    </div>);

}

// ── Step 2: pick meds ──────────────────────────────────────
function ScreenVisitMeds({ onBack, onNext }) {
  const [cart, setCart] = React.useState({ m1: 2, m4: 1 });
  const total = Object.entries(cart).reduce((s, [id, q]) => {
    const m = INVENTORY.find((x) => x.id === id);
    return s + (m?.price || 0) * q;
  }, 0);

  const change = (id, delta) => setCart((c) => {
    const next = (c[id] || 0) + delta;
    if (next <= 0) {const { [id]: _, ...rest } = c;return rest;}
    return { ...c, [id]: next };
  });

  return (
    <div className="sv-screen papered" dir="rtl">
      <StepHeader step={1} title="مزرعة عمرو للدواجن" onBack={onBack} />
      <div className="sv-body" style={{ paddingTop: 8 }}>
        <div className="card" style={{ padding: 12, marginBottom: 14, background: "var(--teal-50)", border: "1px solid var(--teal-100)" }}>
          <div className="row sb">
            <div className="row" style={{ gap: 10 }}>
              <I.briefcase size={18} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--navy-900)" }}>عقد سنوي · إشراف دواجن</div>
                <div style={{ fontSize: 12, color: "var(--ink-500)" }}>مبلغ ثابت لكل طير · ٨٫٤٠٠ طير</div>
              </div>
            </div>
            <span className="pill teal">نشط</span>
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 10 }}>
          <I.search size={18} />
          <input className="input" placeholder="ابحث في مخزونك الميداني..." />
          <button className="icon-btn ghost"><I.filter size={18} /></button>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
          {["الأكثر استخدامًا", "مضادات حيوية", "تطعيمات", "فيتامينات", "خافضات حرارة"].map((c, i) =>
          <button key={c} className={"chip " + (i === 0 ? "active" : "")}>{c}</button>
          )}
        </div>

        <div className="list" style={{ paddingBottom: 12 }}>
          {INVENTORY.map((m) => {
            const q = cart[m.id] || 0;
            const lowOrEmpty = m.qty === 0 ? "empty" : m.qty < m.low ? "low" : null;
            return (
              <div key={m.id} className="list-row" style={q > 0 ? { boxShadow: "0 0 0 2px var(--teal-200)" } : {}}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: "var(--teal-50)", color: "var(--teal-600)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <I.pill size={20} />
                </div>
                <div className="meta">
                  <h4>{m.name}</h4>
                  <p>{m.unit} · <Shekel value={m.price} dim /></p>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
                    <span className={"pill " + (lowOrEmpty === "empty" ? "red" : "")}>
                      المتاح <span className="num">{m.qty}</span>
                    </span>
                    {lowOrEmpty === "low" && <span className="pill"><I.warn size={10} style={{ color: "var(--amber)" }} /> مخزون منخفض</span>}
                    {lowOrEmpty === "empty" && <span className="pill red"><I.warn size={10} /> منتهي</span>}
                  </div>
                </div>
                {q > 0 ?
                <div className="stepper">
                    <button onClick={() => change(m.id, -1)}>−</button>
                    <span className="v num">{q}</span>
                    <button onClick={() => change(m.id, +1)} disabled={m.qty === 0}>+</button>
                  </div> :

                <button className="icon-btn" onClick={() => change(m.id, +1)} disabled={m.qty === 0}
                style={m.qty === 0 ? { opacity: 0.4 } : {}}>
                    <I.add size={18} />
                  </button>
                }
              </div>);

          })}
        </div>
      </div>
      <div className="sv-footer">
        <div style={{ flex: 1 }}>
          <div className="tiny muted">إجمالي الأدوية</div>
          <div className="bold lg" style={{ color: "var(--navy-900)" }}><Shekel value={total} /></div>
        </div>
        <button className="btn btn-primary" onClick={onNext} style={{ textAlign: "center" }}>
          متابعة <I.back size={16} />
        </button>
      </div>
    </div>);

}

// ── Step 3: services + vaccinations + notes ───────────────
function ScreenVisitServices({ onBack, onNext }) {
  const [picked, setPicked] = React.useState({ s1: true, s2: true });
  const toggle = (id) => setPicked((p) => ({ ...p, [id]: !p[id] }));
  const total = SERVICES.filter((s) => picked[s.id]).reduce((a, b) => a + b.price, 0);

  return (
    <div className="sv-screen papered" dir="rtl">
      <StepHeader step={2} title="خدمات وتطعيمات" onBack={onBack} />
      <div className="sv-body" style={{ paddingTop: 8 }}>
        <label className="field-label">الحيوانات المعنية</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["العنبر A", "العنبر B", "العنبر C"].map((a, i) =>
          <button key={a} className={"chip " + (i < 2 ? "teal-active" : "")}>{a}</button>
          )}
          <button className="chip"><I.add size={14} /> إضافة</button>
        </div>

        <label className="field-label">الخدمات والكشفية</label>
        <div className="list" style={{ marginBottom: 16 }}>
          {SERVICES.map((s) =>
          <div key={s.id} className="list-row flat" onClick={() => toggle(s.id)}
          style={picked[s.id] ? { borderColor: "var(--teal-500)", background: "var(--teal-50)" } : { cursor: "pointer" }}>
              <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: picked[s.id] ? "var(--teal-500)" : "var(--ink-50)",
              color: picked[s.id] ? "white" : "var(--ink-700)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
                {s.kind === "vaccine" ? <I.syringe size={18} /> :
              s.kind === "lab" ? <I.paper size={18} /> :
              s.kind === "treatment" ? <I.pill size={18} /> :
              <I.stethoscope size={18} />}
              </div>
              <div className="meta">
                <h4>{s.name}</h4>
                <p><Shekel value={s.price} dim /></p>
              </div>
              <div style={{
              width: 22, height: 22, borderRadius: 999,
              border: "1.5px solid " + (picked[s.id] ? "var(--teal-500)" : "var(--ink-200)"),
              background: picked[s.id] ? "var(--teal-500)" : "transparent",
              color: "white",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
                {picked[s.id] && <I.check size={14} />}
              </div>
            </div>
          )}
        </div>

        <label className="field-label">الجرعة القادمة لتطعيم نيوكاسل</label>
        <div className="card flat" style={{ padding: 12, marginBottom: 16 }}>
          <div className="row sb">
            <div className="row" style={{ gap: 10 }}>
              <I.cal size={18} />
              <div>
                <div className="bold" style={{ fontSize: 14 }}>الإثنين · ٢٠ مايو ٢٠٢٦</div>
                <div className="tiny muted">سيتم إرسال تذكير قبل ٣ أيام</div>
              </div>
            </div>
            <button className="btn-sm btn btn-ghost" style={{ color: "var(--teal-600)" }}>تعديل</button>
          </div>
        </div>

        <label className="field-label">ملاحظات الطبيب</label>
        <textarea className="input" rows={3}
        defaultValue="حالة عامة جيدة. لوحظ ضعف في النشاط بالعنبر A — متابعة بعد ٣ أيام." />
      </div>
      <div className="sv-footer">
        <div style={{ flex: 1 }}>
          <div className="tiny muted">إجمالي الخدمات</div>
          <div className="bold lg" style={{ color: "var(--navy-900)" }}><Shekel value={total} /></div>
        </div>
        <button className="btn btn-primary" onClick={onNext}>
          مراجعة <I.back size={16} />
        </button>
      </div>
    </div>);

}

// ── Step 4: summary + confirm ──────────────────────────────
function ScreenVisitSummary({ onBack, onConfirm }) {
  return (
    <div className="sv-screen papered" dir="rtl">
      <SVTopBar title="مراجعة الزيارة" onBack={onBack} />
      <div className="sv-body" style={{ paddingTop: 4 }}>

        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div className="row" style={{ gap: 12 }}>
            <Photo w={64} h={64} radius={16} label="مزرعة دواجن" />
            <div className="meta">
              <h4 style={{ fontSize: 16, color: "var(--navy-900)", fontWeight: 800, margin: 0 }}>مزرعة عمرو للدواجن</h4>
              <p style={{ margin: "2px 0 0", color: "var(--ink-500)" }}>جنين · ٤٫٢ كم</p>
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <span className="pill teal"><I.briefcase size={12} /> عقد سنوي</span>
                <Stars value={4.8} />
              </div>
            </div>
          </div>
        </div>

        <SectionRow icon={<I.cal />} title="الموعد" value="الخميس ٧ مايو · ٠٩:٣٠ صباحًا" />
        <SectionRow icon={<I.stethoscope />} title="السبب" value="متابعة تطعيم نيوكاسل · فحص دوري" />

        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div className="row sb" style={{ marginBottom: 10 }}>
            <div className="bold" style={{ color: "var(--navy-900)" }}>الأدوية المصروفة</div>
            <a className="small" style={{ color: "var(--teal-600)", fontWeight: 700 }}>تعديل</a>
          </div>
          <LineItem name="أوكسي تتراسيكلين 20%" qty="٢ × زجاجة" price={76} />
          <LineItem name="ميلوكسيكام مضاد التهاب" qty="١ × زجاجة" price={41} />
        </div>

        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div className="row sb" style={{ marginBottom: 10 }}>
            <div className="bold" style={{ color: "var(--navy-900)" }}>الخدمات والكشفية</div>
            <a className="small" style={{ color: "var(--teal-600)", fontWeight: 700 }}>تعديل</a>
          </div>
          <LineItem name="كشفية ميدانية" qty="رسوم ثابتة" price={60} />
          <LineItem name="تطعيم دواجن — نيوكاسل" qty="جرعة" price={30} />
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="totals">
            <div className="line"><span>إجمالي الأدوية</span><Shekel value={117} /></div>
            <div className="line"><span>إجمالي الخدمات والكشفية</span><Shekel value={90} /></div>
            <div className="line"><span>خصم العقد</span><span style={{ color: "var(--green)" }}>−<span className="num">15</span> شيقل</span></div>
            <div className="divider dashed" style={{ margin: "4px 0" }} />
            <div className="line total"><span>الإجمالي</span><Shekel value={192} /></div>
          </div>
        </div>

        <div className="card flat" style={{ padding: 12, marginTop: 14, background: "var(--amber-soft)", border: "1px solid #f1d989", color: "#8a6a00" }}>
          <div className="row" style={{ gap: 10 }}>
            <I.wifiOff size={18} />
            <div className="small bold">سيتم حفظ الزيارة محليًا ومزامنتها فور توفر الاتصال.</div>
          </div>
        </div>
      </div>
      <div className="sv-footer">
        <button className="btn btn-soft" style={{ flex: 1 }}>حفظ كمسودة</button>
        <button className="btn btn-primary" style={{ flex: 1.4 }} onClick={onConfirm}>
          تأكيد وتسجيل الزيارة
        </button>
      </div>
    </div>);

}

function SectionRow({ icon, title, value }) {
  return (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <div className="row" style={{ gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <div className="meta">
          <div className="tiny muted">{title}</div>
          <div className="bold" style={{ fontSize: 14, color: "var(--navy-900)" }}>{value}</div>
        </div>
      </div>
    </div>);

}

function LineItem({ name, qty, price }) {
  return (
    <div className="row sb" style={{ padding: "8px 0", borderBottom: "1px dashed var(--ink-100)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--navy-900)" }}>{name}</div>
        <div className="tiny muted">{qty}</div>
      </div>
      <Shekel value={price} />
    </div>);

}

Object.assign(window, { ScreenVisitClient, ScreenVisitMeds, ScreenVisitServices, ScreenVisitSummary });