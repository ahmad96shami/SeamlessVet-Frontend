// SeamlessVet — Finance: Payment receipt (سند قبض) + Account statement (كشف حساب)

function ScreenReceipt({ onBack, onIssue }) {
  const [method, setMethod] = React.useState("cash");
  const [amount, setAmount] = React.useState("500");

  return (
    <div className="sv-screen papered" dir="rtl">
      <SVTopBar title="سند قبض" onBack={onBack} />
      <div className="sv-body" style={{ paddingTop: 4 }}>
        <label className="field-label">العميل</label>
        <div className="card" style={{ padding: 12, marginBottom: 16 }}>
          <div className="row" style={{ gap: 12 }}>
            <Photo w={48} h={48} radius={14} />
            <div className="meta">
              <div className="bold" style={{ color: "var(--navy-900)" }}>مزرعة عمرو للدواجن</div>
              <div className="tiny muted">جنين · مزرعة دواجن</div>
            </div>
            <button className="btn btn-soft btn-sm">تغيير</button>
          </div>
          <div className="divider dashed" style={{ margin: "12px 0" }} />
          <div className="row sb">
            <span className="small muted">الرصيد الحالي</span>
            <span className="bold" style={{ color: "var(--red)" }}>
              مدين <span className="num">١٫٢٤٠</span> شيقل
            </span>
          </div>
        </div>

        <label className="field-label">المبلغ المستلم</label>
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8 }}>
            <input className="input" style={{ border: "none", padding: 0, fontSize: 32, fontWeight: 800, color: "var(--navy-900)", textAlign: "center", minWidth: 80, maxWidth: 160, width: "40px" }}
            value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
            <span className="muted bold" style={{ fontSize: 18 }}>شيقل</span>
          </div>
          <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {["100", "250", "500", "1000", "المتبقي"].map((a) =>
            <button key={a} className="chip" onClick={() => setAmount(a === "المتبقي" ? "1240" : a)}>
                {a !== "المتبقي" ? <span className="num">{a}</span> : a}
              </button>
            )}
          </div>
        </div>

        <label className="field-label">طريقة الدفع</label>
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          {[
          { k: "cash", l: "نقدًا" },
          { k: "transfer", l: "تحويل بنكي" },
          { k: "cheque", l: "شيك" }].
          map((m) =>
          <button key={m.k} className={"chip " + (method === m.k ? "active" : "")}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => setMethod(m.k)}>
              {m.l}
            </button>
          )}
        </div>

        <label className="field-label">ملاحظة (اختياري)</label>
        <input className="input" placeholder="مثال: دفعة جزئية على فاتورة #٢٠٤" />

        <div className="card flat" style={{ padding: 12, marginTop: 16, background: "var(--teal-50)", borderColor: "var(--teal-100)" }}>
          <div className="row sb">
            <span className="small bold" style={{ color: "var(--teal-700)" }}>الرصيد بعد القبض</span>
            <span className="bold num" style={{ color: "var(--teal-700)" }}>−٧٤٠ شيقل</span>
          </div>
        </div>
      </div>
      <div className="sv-footer">
        <button className="btn btn-soft" style={{ flex: 1 }}><I.print size={16} /> معاينة</button>
        <button className="btn btn-primary" style={{ flex: 1.4 }} onClick={onIssue}>
          إصدار السند
        </button>
      </div>
    </div>);

}

// Account statement — read-only voucher style
function ScreenStatement({ onBack }) {
  const total = LEDGER.reduce((a, b) => a + b.amt, 0);
  return (
    <div className="sv-screen papered" dir="rtl">
      <SVTopBar title="كشف حساب" onBack={onBack}
      right={<button className="icon-btn ghost"><I.send size={18} /></button>} />
      <div className="sv-body" style={{ paddingTop: 4 }}>
        <div className="voucher" style={{ marginBottom: 14 }}>
          <div className="row sb" style={{ marginBottom: 10 }}>
            <div>
              <div className="tiny muted">الفترة</div>
              <div className="bold" style={{ color: "var(--navy-900)" }}>١ — ٧ مايو ٢٠٢٦</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div className="tiny muted">رقم الكشف</div>
              <div className="bold num">SV-٢٠٢٦/٠٤٤</div>
            </div>
          </div>
          <div className="divider dashed" style={{ margin: "8px 0 12px" }} />
          <div className="row" style={{ gap: 12 }}>
            <Photo w={56} h={56} radius={16} label="مزرعة دواجن" />
            <div className="meta">
              <div className="bold lg" style={{ color: "var(--navy-900)" }}>مزرعة عمرو للدواجن</div>
              <div className="small muted">جنين · إشراف د. أحمد</div>
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                <span className="pill teal"><I.briefcase size={12} /> عقد سنوي</span>
                <span className="pill amber">حساب مفتوح</span>
              </div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 14 }}>
          <div className="card" style={{ flex: 1, padding: 12, textAlign: "center" }}>
            <div className="tiny muted">إجمالي مدين</div>
            <div className="x-bold lg" style={{ color: "var(--red)" }}>
              <span className="num">١٫٤١٠</span>
            </div>
          </div>
          <div className="card" style={{ flex: 1, padding: 12, textAlign: "center" }}>
            <div className="tiny muted">إجمالي دائن</div>
            <div className="x-bold lg" style={{ color: "var(--green)" }}>
              <span className="num">١٫٣٠٠</span>
            </div>
          </div>
          <div className="card" style={{ flex: 1, padding: 12, textAlign: "center", background: "var(--navy-900)", color: "white" }}>
            <div className="tiny" style={{ opacity: 0.7 }}>الرصيد</div>
            <div className="x-bold lg num">−١١٠</div>
          </div>
        </div>

        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div className="row sb" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: "var(--navy-900)", fontWeight: 800 }}>الحركات</h3>
            <a className="small" style={{ color: "var(--teal-600)", fontWeight: 700 }}>تصفية</a>
          </div>
          {LEDGER.map((r) =>
          <div key={r.id} className="ledger-row">
              <div>
                <div className="desc">{r.desc}</div>
                <div className="sub">{r.date} · {r.sub}</div>
              </div>
              <div className={"amt " + (r.kind === "dr" ? "dr" : "cr")}>
                {r.kind === "dr" ? "−" : "+"}<span className="num">{Math.abs(r.amt)}</span> شيقل
              </div>
            </div>
          )}
        </div>

        <div className="card flat" style={{ padding: 12, background: "var(--ink-50)" }}>
          <div className="small" style={{ color: "var(--ink-700)", lineHeight: 1.7 }}>
            <span className="bold">ملاحظة:</span> لا تُصرف مستحقات الطبيب إلا بعد إغلاق حساب العميل وسداد جميع الفواتير.
          </div>
        </div>
      </div>
      <div className="sv-footer">
        <button className="btn btn-soft" style={{ flex: 1 }}><I.print size={16} /> طباعة</button>
        <button className="btn btn-primary" style={{ flex: 1 }}><I.send size={16} /> إرسال للعميل</button>
      </div>
    </div>);

}

// Visit-recorded confirmation screen (tiny but useful)
function ScreenVisitDone({ onBack, onReceipt }) {
  return (
    <div className="sv-screen papered" dir="rtl">
      <SVTopBar title="" onBack={onBack} />
      <div className="sv-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 24px" }}>
        <div style={{
          width: 110, height: 110, borderRadius: 999,
          background: "var(--green-soft)", color: "#1F8A56",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 24, marginBottom: 18,
          position: "relative"
        }}>
          <div style={{ position: "absolute", inset: -8, borderRadius: 999, border: "2px dashed #BFE6CF" }} />
          <I.check size={56} sw={2} />
        </div>
        <h2 style={{ fontSize: 22, margin: "0 0 6px", color: "var(--navy-900)", fontWeight: 800 }}>تم تسجيل الزيارة</h2>
        <p style={{ margin: 0, color: "var(--ink-500)", fontSize: 14, lineHeight: 1.7 }}>
          تم تحديث المخزون والرصيد المالي للعميل. الزيارة محفوظة محليًا وستُزامن تلقائيًا.
        </p>

        <div className="card" style={{ width: "100%", padding: 14, marginTop: 22, textAlign: "right" }}>
          <div className="row sb"><span className="small muted">العميل</span><span className="small bold">مزرعة عمرو للدواجن</span></div>
          <div className="divider dashed" />
          <div className="row sb"><span className="small muted">الإجمالي</span><span className="small bold"><Shekel value={192} /></span></div>
          <div className="divider dashed" />
          <div className="row sb"><span className="small muted">رقم الزيارة</span><span className="small bold num">SV-٢٠٢٦/١٢٧</span></div>
        </div>

        <div style={{ flex: 1 }} />
      </div>
      <div className="sv-footer">
        <button className="btn btn-soft" style={{ flex: 1 }} onClick={onBack}>الزيارات</button>
        <button className="btn btn-primary" style={{ flex: 1.2 }} onClick={onReceipt}>إصدار سند قبض</button>
      </div>
    </div>);

}

Object.assign(window, { ScreenReceipt, ScreenStatement, ScreenVisitDone });