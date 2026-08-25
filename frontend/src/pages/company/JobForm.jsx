import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { ADMIN_MENU } from "../admin/menu";
import { LOCATIONS, JOB_TYPES, EDUCATION_LEVELS, CATEGORIES, UMKM_BUSINESS_CATEGORIES } from "../../lib/constants";

const EMPTY = {
  title: "", category: "", location: "", job_type: "", salary_min: "", salary_max: "",
  education: "Tidak ada minimal", experience: "", age_requirement: "", description: "",
  responsibilities: "", requirements: "", benefits: "", deadline: "", whatsapp: "",
  employer_type: "company", business_category: "", work_hours: "", slots: "",
};

export default function JobForm({ admin = false }) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [ent, setEnt] = useState(null);

  const menu = admin ? ADMIN_MENU : COMPANY_MENU;
  const backPath = admin ? "/admin/jobs" : "/company/jobs";

  useEffect(() => {
    if (admin) return;
    api.get("/company/entitlement").then((r) => setEnt(r.data)).catch(() => {});
    if (!isEdit) {
      api.get("/company/profile").then((r) => {
        if (r.data?.employer_type) setForm((f) => ({ ...f, employer_type: r.data.employer_type }));
      }).catch(() => {});
    }
  }, [admin, isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    api.get(admin ? "/admin/jobs" : "/company/jobs")
      .then((r) => {
        const job = r.data.find((j) => j.id === id);
        if (!job) {
          toast.error("Lowongan tidak ditemukan");
          navigate(backPath);
          return;
        }
        setForm({
          title: job.title, category: job.category, location: job.location, job_type: job.job_type,
          salary_min: job.salary_min || "", salary_max: job.salary_max || "", education: job.education,
          experience: job.experience || "", age_requirement: job.age_requirement || "",
          description: job.description || "", responsibilities: job.responsibilities || "",
          requirements: job.requirements || "", benefits: job.benefits || "",
          deadline: job.deadline || "", whatsapp: job.whatsapp || "",
          employer_type: job.employer_type || "company", business_category: job.business_category || "",
          work_hours: job.work_hours || "", slots: job.slots || "",
        });
      })
      .catch(() => navigate(backPath))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, admin, backPath]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, salary_min: Number(form.salary_min) || 0, salary_max: Number(form.salary_max) || 0, slots: Number(form.slots) || 0 };
    try {
      if (isEdit) {
        if (admin) {
          await api.put(`/admin/jobs/${id}`, payload);
          toast.success("Lowongan berhasil diperbarui");
        } else {
          await api.put(`/company/jobs/${id}`, payload);
          toast.success("Lowongan diperbarui dan kembali menunggu persetujuan admin");
        }
      } else {
        await api.post("/company/jobs", payload);
        toast.success("Lowongan terkirim. Status: Menunggu Persetujuan Admin");
      }
      navigate(backPath);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
  const areaCls = "w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

  if (loading)
    return (
      <DashboardLayout menu={menu} title="Lowongan">
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout menu={menu} title={isEdit ? "Edit Lowongan" : "Tambah Lowongan"}>
      <div className="max-w-3xl" data-testid="job-form-page">
        {!isEdit && !admin && ent && !ent.can_post ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center" data-testid="quota-exhausted">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900 text-lg">Kuota Gratis Bulan Ini Telah Digunakan</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Anda sudah menggunakan 1 posting gratis bulan ini. Upgrade ke Member Perusahaan (Rp 50.000 / 3 bulan) untuk masa tayang lowongan 30 hari dan posting tanpa batas kuota.</p>
            <Link to="/company/membership" className="mt-5 inline-flex items-center h-11 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors" data-testid="quota-upgrade-btn">Upgrade Member</Link>
          </div>
        ) : (
        <>
        {!isEdit && !admin && ent && (
          <div className={`mb-5 rounded-xl border px-4 py-3 flex gap-3 text-sm ${ent.mode === "member" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-sky-200 bg-sky-50 text-sky-900"}`} data-testid="posting-mode-banner">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {ent.mode === "member" ? (
              <p>Posting sebagai <b>Member</b> — masa tayang <b>30 hari</b>. Lowongan tampil setelah disetujui admin.</p>
            ) : (
              <p><b>Posting Gratis</b> — masa tayang <b>7 hari</b>. Sisa posting gratis bulan ini: <b>{ent.quota.remaining}</b>. Lowongan tampil setelah disetujui admin.</p>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5" data-testid="job-form">
          <div data-testid="jf-employer-type-group">
            <label className={labelCls}>Jenis Pemberi Kerja</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: "company", label: "🏢 Perusahaan", desc: "PT, CV, yayasan, instansi, atau organisasi" },
                { value: "umkm", label: "🏪 UMKM", desc: "Toko, warung, cafe, laundry, bengkel, usaha lokal" },
              ].map((o) => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => setForm({ ...form, employer_type: o.value })}
                  className={`rounded-xl border p-4 text-left transition-colors ${form.employer_type === o.value ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500" : "border-slate-300 bg-white hover:bg-slate-50"}`}
                  data-testid={`jf-etype-${o.value}`}
                >
                  <span className="text-sm font-semibold text-slate-900">{o.label}</span>
                  <span className="block text-xs text-slate-500 mt-1">{o.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Nama Posisi</label>
            <input required value={form.title} onChange={set("title")} placeholder="Contoh: Staff Admin" className={inputCls} data-testid="jf-title-input" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Kategori</label>
              <select required value={form.category} onChange={set("category")} className={`${inputCls} bg-white`} data-testid="jf-category-select">
                <option value="">Pilih Kategori</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Lokasi</label>
              <select required value={form.location} onChange={set("location")} className={`${inputCls} bg-white`} data-testid="jf-location-select">
                <option value="">Pilih Lokasi</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          {form.employer_type === "umkm" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 space-y-5" data-testid="jf-umkm-fields">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Informasi Usaha UMKM</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Kategori Usaha</label>
                  <select value={form.business_category} onChange={set("business_category")} className={`${inputCls} bg-white`} data-testid="jf-business-category-select">
                    <option value="">Pilih Kategori Usaha</option>
                    {UMKM_BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Jumlah Kebutuhan (orang)</label>
                  <input type="number" min="0" value={form.slots} onChange={set("slots")} placeholder="1" className={inputCls} data-testid="jf-slots-input" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Jam Kerja</label>
                <input value={form.work_hours} onChange={set("work_hours")} placeholder="Contoh: Senin-Sabtu 08.00-17.00" className={inputCls} data-testid="jf-work-hours-input" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Tipe Pekerjaan</label>
              <select required value={form.job_type} onChange={set("job_type")} className={`${inputCls} bg-white`} data-testid="jf-type-select">
                <option value="">Pilih Tipe</option>
                {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Pendidikan Minimal</label>
              <select value={form.education} onChange={set("education")} className={`${inputCls} bg-white`} data-testid="jf-education-select">
                {EDUCATION_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Gaji Minimum (Rp)</label>
              <input type="number" min="0" value={form.salary_min} onChange={set("salary_min")} placeholder="2500000" className={inputCls} data-testid="jf-salary-min-input" />
            </div>
            <div>
              <label className={labelCls}>Gaji Maksimum (Rp)</label>
              <input type="number" min="0" value={form.salary_max} onChange={set("salary_max")} placeholder="3500000" className={inputCls} data-testid="jf-salary-max-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Pengalaman</label>
              <input value={form.experience} onChange={set("experience")} placeholder="Contoh: Minimal 1 tahun" className={inputCls} data-testid="jf-experience-input" />
            </div>
            <div>
              <label className={labelCls}>Batas Usia</label>
              <input value={form.age_requirement} onChange={set("age_requirement")} placeholder="Contoh: Maks. 30 tahun" className={inputCls} data-testid="jf-age-input" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Deskripsi Pekerjaan</label>
            <textarea required value={form.description} onChange={set("description")} rows={4} className={areaCls} data-testid="jf-description-input" />
          </div>
          <div>
            <label className={labelCls}>Tanggung Jawab (satu per baris)</label>
            <textarea value={form.responsibilities} onChange={set("responsibilities")} rows={4} placeholder={"Menginput data penjualan\nMembuat laporan harian"} className={areaCls} data-testid="jf-responsibilities-input" />
          </div>
          <div>
            <label className={labelCls}>Persyaratan (satu per baris)</label>
            <textarea value={form.requirements} onChange={set("requirements")} rows={4} placeholder={"Pendidikan minimal SMA/SMK\nTeliti dan jujur"} className={areaCls} data-testid="jf-requirements-input" />
          </div>
          <div>
            <label className={labelCls}>Benefit (satu per baris, opsional)</label>
            <textarea value={form.benefits} onChange={set("benefits")} rows={3} placeholder={"THR\nMakan siang"} className={areaCls} data-testid="jf-benefits-input" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Deadline</label>
              <input required type="date" value={form.deadline} onChange={set("deadline")} className={`${inputCls} bg-white`} data-testid="jf-deadline-input" />
            </div>
            <div>
              <label className={labelCls}>Kontak WhatsApp</label>
              <input value={form.whatsapp} onChange={set("whatsapp")} placeholder="08xxxxxxxxxx" className={inputCls} data-testid="jf-whatsapp-input" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full h-12 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2" data-testid="jf-submit-btn">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Kirim Lowongan"}
          </button>
        </form>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}
