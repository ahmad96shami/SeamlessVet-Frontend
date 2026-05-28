// SeamlessVet — Demo data
// Names: امجد, احمد, عمرو, علي. Places: Palestine. Currency: شيقل.

const DOCTOR = {
  name: "د. أحمد السوسي",
  spec: "طبيب بيطري ميداني",
  city: "نابلس",
  exp: "٧ سنوات خبرة",
};

const CLIENTS = [
  { id: "c1", name: "مزرعة عمرو للدواجن",   type: "poultry", city: "جنين",     dist: 4.2, balance: -1240, animals: "٨٫٤٠٠ طير" },
  { id: "c2", name: "مزرعة علي لألبقار",      type: "cattle",  city: "طولكرم",  dist: 12.1, balance:   320, animals: "٤٢ بقرة" },
  { id: "c3", name: "أمجد محمود",              type: "home",    city: "رام الله", dist: 1.8, balance:     0, animals: "كلب · قطة" },
  { id: "c4", name: "مزرعة الزيتون",          type: "farm",    city: "الخليل",  dist: 9.5, balance: -560,  animals: "أغنام · ماعز" },
  { id: "c5", name: "مزرعة بيت لحم للدواجن", type: "poultry", city: "بيت لحم",  dist: 22.0, balance:    0, animals: "١٢٫٠٠٠ طير" },
  { id: "c6", name: "علي ابو ربيع",            type: "home",    city: "نابلس",    dist: 0.9, balance:   80, animals: "حصان" },
];

const TODAY_VISITS = [
  { id: "v1", clientId: "c1", time: "٠٩:٣٠", status: "next",     reason: "متابعة تطعيم — نيوكاسل" },
  { id: "v2", clientId: "c2", time: "١١:٤٥", status: "scheduled", reason: "كشف دوري + فيتامينات" },
  { id: "v3", clientId: "c4", time: "٠٢:١٥", status: "scheduled", reason: "كشف عام · علاج جرب" },
  { id: "v4", clientId: "c3", time: "٠٤:٠٠", status: "scheduled", reason: "تطعيم سنوي" },
];

const INVENTORY = [
  { id: "m1", name: "أوكسي تتراسيكلين 20%", unit: "زجاجة 100 مل", qty: 14, low: 5,  price: 38, batch: "OXY-A22" },
  { id: "m2", name: "إنروفلوكساسين",          unit: "زجاجة 50 مل",  qty: 6,  low: 8,  price: 52, batch: "ENR-B14" },
  { id: "m3", name: "لقاح نيوكاسل لاسوتا",    unit: "جرعة 1000",    qty: 4,  low: 6,  price: 95, batch: "ND-LAS" },
  { id: "m4", name: "ميلوكسيكام مضاد التهاب", unit: "زجاجة 20 مل",  qty: 22, low: 5,  price: 41, batch: "MLX-09" },
  { id: "m5", name: "فيتامين AD3E",             unit: "زجاجة 100 مل", qty: 9,  low: 6,  price: 28, batch: "ADE-31" },
  { id: "m6", name: "إيفرمكتين 1%",             unit: "زجاجة 50 مل",  qty: 0,  low: 5,  price: 33, batch: "IVR-77" },
  { id: "m7", name: "محلول الجفاف",             unit: "كيس 1 كغ",     qty: 18, low: 4,  price: 12, batch: "ORS-12" },
];

const SERVICES = [
  { id: "s1", name: "كشفية ميدانية",  price: 60, kind: "exam" },
  { id: "s2", name: "تطعيم دواجن",     price: 30, kind: "vaccine" },
  { id: "s3", name: "تطعيم أبقار",     price: 45, kind: "vaccine" },
  { id: "s4", name: "فحص دم سريع",     price: 80, kind: "lab" },
  { id: "s5", name: "علاج جروح",       price: 50, kind: "treatment" },
];

const LEDGER = [
  { id: "l1", date: "٠٢/٠٥/٢٠٢٦", desc: "زيارة ميدانية — أدوية",  sub: "د. أحمد", amt: -380, kind: "dr" },
  { id: "l2", date: "٠٢/٠٥/٢٠٢٦", desc: "كشفية + خدمات",            sub: "د. أحمد", amt: -130, kind: "dr" },
  { id: "l3", date: "٢٨/٠٤/٢٠٢٦", desc: "سند قبض #٢٠٤",              sub: "نقدًا",   amt:  500, kind: "cr" },
  { id: "l4", date: "٢٤/٠٤/٢٠٢٦", desc: "زيارة ميدانية — أدوية",  sub: "د. أحمد", amt: -680, kind: "dr" },
  { id: "l5", date: "٢٠/٠٤/٢٠٢٦", desc: "تطعيم سنوي للقطيع",        sub: "د. أحمد", amt: -350, kind: "dr" },
  { id: "l6", date: "١٥/٠٤/٢٠٢٦", desc: "سند قبض #١٩٧",              sub: "تحويل بنكي", amt: 800, kind: "cr" },
];

Object.assign(window, { DOCTOR, CLIENTS, TODAY_VISITS, INVENTORY, SERVICES, LEDGER });
