import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { LOCATIONS, JOB_TYPES, EDUCATION_LEVELS, CATEGORIES } from "../../lib/constants";

const EMPTY = {
  title: "", category: "", location: "", job_type: "", salary_min: "", salary_max: "",
  education: "Tidak ada minimal", experience: "", age_requirement: "", description: "",
  responsibilities: "", requirements: "", benefits: "", deadline: "", whatsapp: "",
};

export default function JobForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get("/company/jobs")
      .then((r) => {
        const job = r.data.find((j) => j.id === id);
        if (!job) {
          toast.error("Lowongan tidak ditemukan");
          navigate("/company/jobs");
          return;
        }
        setForm({
          title: job.title, category: job.category, location: job.location, job_type: job.job_type,
          salary_min: job.salary_min || "", salary_max: job.salary_max || "", education: job.education,
          experience: job.experience || "", age_requirement: job.age_requirement || "",
          description: job.description || "", responsibilities: job.responsibilities || "",
          requirements: job.requirements || "", benefits: job.benefits || "",
          deadline: job.deadline || "", whatsapp: job.whatsapp || "",
        });
      })
      .catch(() => navigate("/company/jobs"))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, salary_min: Number(form.salary_min) || 0, salary_max: Number(form.salary_max) || 0 };
    try {
      if (isEdit) {
        await api.put(`/company/jobs/${id}`, payload);
        toast.success("Lowongan diperbarui dan kembali menunggu persetujuan admin");
      } else {
        await api.post("/company/jobs", payload);
        toast.success("Lowongan terkirim. Status: Menunggu Persetujuan Admin");
      }
      navigate("/company/jobs");
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
      <DashboardLayout menu={COMPANY_MENU} title="Lowongan">
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout menu={COMPANY_MENU} title={isEdit ? "Edit Lowongan" : "Tambah Lowongan"}>
      <div className="max-w-3xl" data-testid="job-form-page">
        {!isEdit && (
          <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 flex gap-3 text-sm text-sky-900" data-testid="moderation-info">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>Lowongan yang dikirim akan berstatus <b>Menunggu Persetujuan Admin</b> dan tampil setelah disetujui.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5" data-testid="job-form">
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
      </div>
    </DashboardLayout>
  );
}
