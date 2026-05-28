// SeamlessVet — Auth screens (Login + Pending approval)

function ScreenLogin({ onSubmit }) {
  return (
    <div className="sv-screen" dir="rtl">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 0", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: "0 0 auto" }}>
          <img src="vet-hero.png" alt="" style={{ width: 200, height: 200, objectFit: "contain", filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.18))" }} />
        </div>

        <div style={{ textAlign: "center", marginTop: 4, marginBottom: 18 }}>
          <h1 style={{ fontSize: 26, lineHeight: 1.2, fontWeight: 800, margin: 0, color: "var(--navy-900)" }}>
            تسجيل الدخول
          </h1>
          <p style={{ margin: "6px 0 0", color: "var(--ink-500)", fontSize: 13 }}>
            مرحبًا بعودتك إلى SeamlessVet
          </p>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <label className="field-label">رقم التلفون أو البريد الالكتروني</label>
          <div className="input-group" style={{ marginBottom: 12 }}>
            <I.user size={18} />
            <input className="input" defaultValue="ahmad.alsousi" />
          </div>

          <label className="field-label">كلمة المرور</label>
          <div className="input-group" style={{ marginBottom: 16 }}>
            <I.shield size={18} />
            <input className="input" type="password" defaultValue="••••••••" />
            <span className="muted small">إخفاء</span>
          </div>

          <div className="row sb" style={{ marginBottom: 16 }}>
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" defaultChecked style={{ borderRadius: "9999px" }} />
              <span className="small">تذكرني على هذا الجهاز</span>
            </label>
            <a className="small" style={{ color: "var(--teal-600)", fontWeight: 700 }}>نسيت كلمة المرور؟</a>
          </div>

          <button className="btn btn-primary btn-block" onClick={onSubmit}>
            تسجيل الدخول
          </button>

          <div className="row" style={{ justifyContent: "center", marginTop: 14, gap: 4 }}>
            <span className="small muted">ليس لديك حساب؟</span>
            <a className="small" style={{ color: "var(--teal-600)", fontWeight: 800 }}>طلب حساب جديد</a>
          </div>
        </div>
      </div>
    </div>);

}

function ScreenPending({ onContinue }) {
  return (
    <div className="sv-screen papered" dir="rtl">
      <SVTopBar title="" solid={false} right={<span style={{ width: 38 }} />} onBack={null} />
      <div className="sv-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 28px" }}>
        <div style={{
          width: 120, height: 120, borderRadius: 999,
          background: "var(--teal-50)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--teal-600)",
          marginTop: 24, marginBottom: 22,
          position: "relative"
        }}>
          <div style={{ position: "absolute", inset: -6, borderRadius: 999, border: "2px dashed var(--teal-200)" }} />
          <I.shield size={52} sw={1.6} />
        </div>

        <h2 style={{ fontSize: 22, margin: "0 0 8px", color: "var(--navy-900)", fontWeight: 800 }}>
          حسابك قيد المراجعة
        </h2>
        <p style={{ margin: 0, color: "var(--ink-500)", fontSize: 14, lineHeight: 1.7 }}>
          تم استلام طلب تفعيل حسابك. ستتلقى إشعارًا فور موافقة المسؤول لتبدأ الزيارات الميدانية وتسجيل المخزون.
        </p>

        <div className="card" style={{ width: "100%", padding: 16, marginTop: 24, textAlign: "right" }}>
          <div className="row sb" style={{ marginBottom: 12 }}>
            <span className="small muted">الاسم</span>
            <span className="small bold">{DOCTOR.name}</span>
          </div>
          <div className="divider dashed" />
          <div className="row sb" style={{ margin: "12px 0" }}>
            <span className="small muted">الدور</span>
            <span className="small bold">{DOCTOR.spec}</span>
          </div>
          <div className="divider dashed" />
          <div className="row sb" style={{ marginTop: 12 }}>
            <span className="small muted">المستشفى</span>
            <span className="small bold">مستشفى نابلس البيطري</span>
          </div>
        </div>

        <div style={{ flex: 1 }} />
      </div>
      <div className="sv-footer">
        <button className="btn btn-primary btn-block">تواصل مع الإدارة</button>
      </div>
    </div>);

}

Object.assign(window, { ScreenLogin, ScreenPending });