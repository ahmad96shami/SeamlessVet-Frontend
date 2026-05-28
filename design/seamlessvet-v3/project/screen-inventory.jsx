// SeamlessVet — Inventory + Load-from-warehouse

function ScreenInventory({ onBack, onLoad }) {
  const [tab, setTab] = React.useState("mine");
  const totalUnits = INVENTORY.reduce((a, b) => a + b.qty, 0);
  return (
    <div className="sv-screen papered" dir="rtl">
      <SVTopBar title="المخزون الميداني" onBack={onBack} />
      <div className="sv-body" style={{ paddingTop: 0 }}>
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div className="row sb">
            <div>
              <div className="tiny muted">سيارة د. أحمد · مخزون متنقل</div>
              <div className="x-bold" style={{ fontSize: 22, color: "var(--navy-900)" }}>
                <span className="num">{totalUnits}</span> <span style={{ fontSize: 14 }}>وحدة</span>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <span className="pill teal" style={{ textAlign: "right" }}><I.truck size={12} /> آخر تحميل ٢٨/٠٤</span>
                <span className="pill"><I.warn size={12} style={{ color: "var(--amber)" }} /> ٢ أصناف تحت الحد</span>
              </div>
            </div>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I.box size={30} />
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onLoad}>
              <I.arrowDown size={16} /> تحميل من المستودع
            </button>
            <button className="btn btn-soft" style={{ flex: 1 }}>
              <I.arrowUp size={16} /> تفريغ إلى المستودع
            </button>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 12 }}>
          <button className={"tab " + (tab === "mine" ? "active" : "")} onClick={() => setTab("mine")}>مخزوني (٧)</button>
          <button className={"tab " + (tab === "low" ? "active" : "")} onClick={() => setTab("low")}>منخفض (٢)</button>
          <button className={"tab " + (tab === "moves" ? "active" : "")} onClick={() => setTab("moves")}>الحركات</button>
        </div>

        <div className="input-group" style={{ marginBottom: 12 }}>
          <I.search size={18} />
          <input className="input" placeholder="بحث في المخزون..." />
        </div>

        <div className="list">
          {INVENTORY.filter((m) => tab === "low" ? m.qty < m.low : true).map((m) => {
            const isLow = m.qty < m.low;const isEmpty = m.qty === 0;
            return (
              <div key={m.id} className="list-row">
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: isEmpty ? "var(--red-soft)" : "var(--teal-50)",
                  color: isEmpty ? "#B33235" : "var(--teal-600)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative"
                }}>
                  <I.pill size={20} />
                  {isLow && !isEmpty && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      width: 18, height: 18, borderRadius: 999,
                      background: "var(--paper)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                      color: "var(--amber)"
                    }}>
                      <I.warn size={11} />
                    </span>
                  )}
                </div>
                <div className="meta">
                  <h4>{m.name}</h4>
                  <p>{m.unit} · تشغيلة <span className="num">{m.batch}</span></p>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div className="x-bold num" style={{ fontSize: 18, color: isEmpty ? "var(--red)" : "var(--navy-900)" }}>{m.qty}</div>
                  <div className="tiny muted">حد {m.low}</div>
                </div>
              </div>);

          })}
        </div>
      </div>
    </div>);

}

function ScreenLoad({ onBack, onConfirm }) {
  const [picks, setPicks] = React.useState({ m2: 6, m3: 4, m6: 5 });
  const change = (id, delta) => setPicks((p) => {
    const next = (p[id] || 0) + delta;
    if (next <= 0) {const { [id]: _, ...rest } = p;return rest;}
    return { ...p, [id]: next };
  });
  const totalPicks = Object.values(picks).reduce((a, b) => a + b, 0);

  // Pretend "warehouse" stock
  const WAREHOUSE = INVENTORY.map((m, i) => ({ ...m, wh: 60 + i * 17 % 80 }));

  return (
    <div className="sv-screen papered" dir="rtl">
      <SVTopBar title="تحميل من المستودع الرئيسي" onBack={onBack} />
      <div className="sv-body" style={{ paddingTop: 4 }}>
        <div className="card flat" style={{ padding: 12, marginBottom: 12, background: "var(--teal-50)", borderColor: "var(--teal-100)" }}>
          <div className="row" style={{ gap: 10 }}>
            <I.truck size={18} style={{ color: "var(--teal-700)" }} />
            <div className="small" style={{ color: "var(--teal-700)" }}>
              يتم خصم الكميات من <span className="bold">المستودع الرئيسي</span> وإضافتها إلى مخزونك الميداني فور التأكيد.
            </div>
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 12 }}>
          <I.search size={18} />
          <input className="input" placeholder="ابحث عن صنف..." />
        </div>

        <div className="list">
          {WAREHOUSE.map((m) => {
            const q = picks[m.id] || 0;
            return (
              <div key={m.id} className="list-row" style={q > 0 ? { boxShadow: "0 0 0 2px var(--teal-200)" } : {}}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <I.pill size={20} />
                </div>
                <div className="meta">
                  <h4>{m.name}</h4>
                  <p>{m.unit}</p>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
                    <span className="pill">المستودع <span className="num">{m.wh}</span></span>
                    <span className="pill teal">سيارتي <span className="num">{m.qty}</span></span>
                  </div>
                </div>
                {q > 0 ?
                <div className="stepper">
                    <button onClick={() => change(m.id, -1)}>−</button>
                    <span className="v num">{q}</span>
                    <button onClick={() => change(m.id, +1)}>+</button>
                  </div> :

                <button className="icon-btn" onClick={() => change(m.id, +1)}><I.add size={18} /></button>
                }
              </div>);

          })}
        </div>
      </div>
      <div className="sv-footer">
        <div style={{ flex: 1 }}>
          <div className="tiny muted">إجمالي التحميل</div>
          <div className="bold" style={{ color: "var(--navy-900)", fontSize: 16 }}>
            <span className="num">{totalPicks}</span> وحدة · <span className="num">{Object.keys(picks).length}</span> أصناف
          </div>
        </div>
        <button className="btn btn-primary" onClick={onConfirm} disabled={totalPicks === 0}>
          تأكيد التحميل
        </button>
      </div>
    </div>);

}

Object.assign(window, { ScreenInventory, ScreenLoad });