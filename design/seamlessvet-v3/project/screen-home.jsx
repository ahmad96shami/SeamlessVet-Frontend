// SeamlessVet — Home dashboard

function ScreenHome({ onOpenVisit, onOpenInventory, onOpenStatement, onOpenReceipt }) {
  return (
    <div className="sv-screen" dir="rtl">
      <div style={{ background: "var(--paper)", padding: "16px 20px", borderBottom: "1px solid var(--ink-100)" }}>
        <div className="row sb">
          <div className="row" style={{ gap: 12 }}>
            <div className="avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--teal-700)", background: "var(--teal-50)" }}>
              <I.user size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-500)" }}>صباح الخير،</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy-900)" }}>{DOCTOR.name}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="pill" style={{ border: "none", padding: "6px 10px", color: "var(--teal-700)", background: "var(--teal-50)" }}>
              <I.wifiOff size={12} /> دون اتصال
            </div>
            <button className="icon-btn" style={{ position: "relative" }}>
              <I.bell size={18} />
              <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 999, background: "var(--amber)" }} />
            </button>
          </div>
        </div>
      </div>

      <div className="sv-body" style={{ paddingTop: 16 }}>
        {/* Stat row */}
        <div className="row" style={{ gap: 10, marginBottom: 16, alignItems: "stretch" }}>
          <div className="stat">
            <div className="ico"><I.box size={18} /></div>
            <div className="v num">٣٤</div>
            <div className="k">صنف في مخزونك</div>
          </div>
          <div className="stat">
            <div className="ico"><I.warn size={18} style={{ color: "var(--amber)" }} /></div>
            <div className="v num">٢</div>
            <div className="k">تحت حد الإنذار</div>
          </div>
          <div className="stat">
            <div className="ico" style={{ background: "var(--green-soft)", color: "#1F8A56" }}><I.receipt size={18} /></div>
            <div className="v num">٣</div>
            <div className="k">سندات اليوم</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="section-title">
          <h3>إجراءات سريعة</h3>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <QuickAction label="زيارة جديدة" icon={<I.add />} primary onClick={onOpenVisit} />
          <QuickAction label="تحميل المخزون" icon={<I.truck />} onClick={onOpenInventory} />
          <QuickAction label="سند قبض" icon={<I.receipt />} onClick={onOpenReceipt} />
          <QuickAction label="كشف حساب" icon={<I.paper />} onClick={onOpenStatement} />
        </div>

        {/* Today's schedule */}
        <div className="section-title">
          <h3>جدول اليوم</h3>
          <a>عرض الكل</a>
        </div>
        <div className="list">
          {TODAY_VISITS.map((v, i) => {
            const c = CLIENTS.find((x) => x.id === v.clientId);
            const next = v.status === "next";
            return (
              <div key={v.id} className="list-row" onClick={i === 0 ? onOpenVisit : undefined}>
                <div style={{
                  width: 56, textAlign: "center",
                  background: next ? "var(--teal-50)" : "var(--ink-50)",
                  color: next ? "var(--teal-700)" : "var(--ink-700)",
                  borderRadius: 12, padding: "8px 6px"
                }}>
                  <div className="num bold" style={{ fontSize: 16 }}>{v.time.split(":")[0]}</div>
                  <div className="num tiny" style={{ marginTop: 2 }}>{v.time.split(":")[1]}</div>
                </div>
                <div className="meta">
                  <div className="row" style={{ gap: 6 }}>
                    <h4>{c.name}</h4>
                    {next && <span className="pill teal" style={{ padding: "2px 8px" }}>القادمة</span>}
                  </div>
                  <p>{v.reason}</p>
                  <div className="row" style={{ gap: 8, marginTop: 6 }}>
                    <span className="pill" style={{ padding: "2px 8px", gap: 4 }}>
                      <ClientTypeIcon type={c.type} size={12} />
                      {ClientTypeLabel(c.type)}
                    </span>
                    <span className="pill" style={{ padding: "2px 8px", gap: 4 }}>
                      <I.pin size={12} /> <span className="num">{c.dist}</span> كم · {c.city}
                    </span>
                  </div>
                </div>
              </div>);

          })}
        </div>

        {/* Vaccination reminders */}
        <div className="section-title">
          <h3>تذكيرات تطعيمات</h3>
          <a>عرض الكل</a>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--amber-soft)", color: "#8A6A00", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I.syringe size={22} />
            </div>
            <div className="meta">
              <h4 style={{ margin: 0, fontWeight: 800, color: "var(--navy-900)" }}>نيوكاسل — مزرعة عمرو</h4>
              <p style={{ margin: "2px 0 0", color: "var(--ink-500)", fontSize: 13 }}>الجرعة الثانية · بعد <span className="num bold">٣</span> أيام</p>
            </div>
            <button className="btn btn-soft btn-sm">جدولة</button>
          </div>
          <div className="divider dashed" style={{ margin: "12px 0" }} />
          <div className="row" style={{ gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I.syringe size={22} />
            </div>
            <div className="meta">
              <h4 style={{ margin: 0, fontWeight: 800, color: "var(--navy-900)" }}>برسيلوزس — مزرعة علي</h4>
              <p style={{ margin: "2px 0 0", color: "var(--ink-500)", fontSize: 13 }}>قطيع كامل · بعد <span className="num bold">١١</span> يوم</p>
            </div>
            <button className="btn btn-soft btn-sm">جدولة</button>
          </div>
        </div>
        <div style={{ height: 8 }} />
      </div>

      <BottomBar active="home" />
    </div>);

}

function QuickAction({ label, icon, onClick, primary }) {
  return (
    <button onClick={onClick} className="card" style={{
        flex: 1, padding: 14, border: "none", minHeight: 116, boxSizing: "border-box",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        cursor: "pointer", fontFamily: "inherit",
        background: primary ? "var(--navy-900)" : "var(--paper)",
        color: primary ? "white" : "var(--navy-900)"
      }}>
      <span style={{
          width: 36, height: 36, borderRadius: 12,
          background: primary ? "rgba(255,255,255,0.14)" : "var(--teal-50)",
          color: primary ? "white" : "var(--teal-600)",
          display: "inline-flex", alignItems: "center", justifyContent: "center"
        }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
    </button>);

}

function BottomBar({ active = "home", onNew }) {
  return (
    <div className="tabbar" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
      <button className={"tabbtn " + (active === "home" ? "active" : "")}>
        <I.home /> <span>الرئيسية</span>
      </button>
      <button className={"tabbtn " + (active === "visits" ? "active" : "")}>
        <I.cal /> <span>الزيارات</span>
      </button>
      <button className={"tabbtn " + (active === "inv" ? "active" : "")}>
        <I.box /> <span>المخزون</span>
      </button>
      <button className={"tabbtn " + (active === "me" ? "active" : "")}>
        <I.user /> <span>حسابي</span>
      </button>
    </div>);

}

Object.assign(window, { ScreenHome, BottomBar });