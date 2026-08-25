export const LOCATIONS = ["Kota Cirebon", "Kabupaten Cirebon", "Majalengka", "Kuningan", "Indramayu", "Brebes"];

export const JOB_TYPES = ["Full Time", "Part Time", "Freelance", "Kontrak", "Magang"];

export const EDUCATION_LEVELS = ["Tidak ada minimal", "SMP", "SMA/SMK", "D3", "S1"];

export const CATEGORIES = ["Admin", "Finance", "Marketing", "Sales", "F&B", "Retail", "Gudang", "Driver", "Teknisi", "IT", "Lainnya"];

export const POPULAR_CATEGORIES = ["Admin", "Kasir", "Sales", "Staff Gudang", "Marketing", "Driver", "Barista", "Waiter/Waitress", "Operator", "Freelance"];

export const SALARY_RANGES = [
  { value: "lt2", label: "< Rp2 juta" },
  { value: "2-3", label: "Rp2–3 juta" },
  { value: "3-5", label: "Rp3–5 juta" },
  { value: "gt5", label: "> Rp5 juta" },
];

export const APPLICATION_STATUS = {
  terkirim: { label: "Terkirim", cls: "bg-slate-100 text-slate-700" },
  dilihat: { label: "Dilihat", cls: "bg-blue-100 text-blue-800" },
  diproses: { label: "Diproses", cls: "bg-amber-100 text-amber-800" },
  shortlist: { label: "Shortlist", cls: "bg-cyan-100 text-cyan-800" },
  interview: { label: "Interview", cls: "bg-violet-100 text-violet-800" },
  diterima: { label: "Diterima", cls: "bg-emerald-100 text-emerald-800" },
  ditolak: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
};

export const JOB_STATUS = {
  pending: { label: "Menunggu Persetujuan", cls: "bg-amber-100 text-amber-800" },
  active: { label: "Aktif", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  expired: { label: "Kedaluwarsa", cls: "bg-slate-200 text-slate-600" },
  nonaktif: { label: "Nonaktif", cls: "bg-slate-100 text-slate-600" },
};

export const COMPANY_STATUS = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  verified: { label: "Terverifikasi", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  blocked: { label: "Diblokir", cls: "bg-red-100 text-red-700" },
};

export const COMPANY_SIZES = ["1-10 karyawan", "10-50 karyawan", "50-100 karyawan", "100-500 karyawan", "> 500 karyawan"];

export const CV_SUB_STATUS = {
  pending: { label: "Menunggu Verifikasi", cls: "bg-amber-100 text-amber-800" },
  active: { label: "Aktif", cls: "bg-emerald-100 text-emerald-800" },
  expired: { label: "Expired", cls: "bg-slate-200 text-slate-600" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Dinonaktifkan", cls: "bg-slate-100 text-slate-600" },
};

export const INTERVIEW_STATUS = {
  scheduled: { label: "Terjadwal", cls: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Terkonfirmasi", cls: "bg-emerald-100 text-emerald-800" },
  completed: { label: "Selesai", cls: "bg-slate-200 text-slate-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-red-100 text-red-700" },
};

export const COMPANY_PLAN = {
  free: { label: "Free", cls: "bg-slate-100 text-slate-600" },
  launch_free: { label: "Launch Free", cls: "bg-sky-100 text-sky-800" },
  member: { label: "Member", cls: "bg-emerald-100 text-emerald-800" },
  expired: { label: "Expired", cls: "bg-red-100 text-red-700" },
};

export const SKILL_LEVELS = ["Pemula", "Menengah", "Mahir", "Ahli"];

export const LANGUAGE_LEVELS = ["Dasar", "Menengah", "Fasih", "Native"];

export const EDU_LEVEL_OPTIONS = ["SMP", "SMA", "SMK", "D1", "D3", "S1", "S2", "Kursus/Pelatihan"];

export const PIPELINE_STEPS = ["terkirim", "dilihat", "diproses", "shortlist", "interview", "diterima"];

export const EMPLOYER_TYPES = [
  { value: "", label: "Semua Loker" },
  { value: "company", label: "Perusahaan" },
  { value: "umkm", label: "🏪 Loker UMKM" },
];

export const UMKM_BUSINESS_CATEGORIES = [
  "Kuliner", "Retail", "Toko", "Cafe", "Restoran", "Laundry", "Bengkel", "Salon", "Barbershop",
  "Jasa", "Manufaktur Kecil", "Distributor", "Percetakan", "Pertanian", "Peternakan", "Perdagangan",
  "Teknologi", "Pendidikan", "Lainnya",
];
