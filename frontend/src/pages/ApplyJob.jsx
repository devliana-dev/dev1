import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, UploadCloud, CheckCircle2, MapPin, Wallet } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { EDUCATION_LEVELS } from "../lib/constants";
import { formatSalary, logoUrl } from "../lib/format";

export default function ApplyJob() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "", email: user?.email || "", phone: user?.phone || "",
    education: user?.education || "SMA/SMK", experience: user?.experience || "", message: "",
  });
  const [cvFile, setCvFile] = useState(null);

  useEffect(() => {
    api.get(`/jobs/${slug}`)
      .then((r) => setJob(r.data))
      .catch(() => {
        toast.error("Lowongan tidak ditemukan");
        navigate("/jobs");
      })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cvFile && !user?.cv_path) {
      toast.error("Silakan unggah CV Anda (PDF/DOC, maks 2MB)");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (cvFile) fd.append("cv", cvFile);
      await api.post(`/jobs/${job.id}/apply`, fd);
      await refresh();
      setDone(true);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );

  if (done)
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center page-fade" data-testid="apply-success">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-slate-900 mt-4">Lamaran berhasil dikirim!</h1>
        <p className="text-slate-500 mt-2">
          Lamaran Anda untuk posisi <span className="font-semibold">{job.title}</span> di {job.company_name} telah terkirim. Pantau statusnya di dashboard.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate("/candidate/applications")} className="h-12 px-6 rounded-lg bg-slate-900 text-white font-semibold text-sm" data-testid="view-applications-btn">
            Lihat Lamaran Saya
          </button>
          <button onClick={() => navigate("/jobs")} className="h-12 px-6 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm" data-testid="browse-more-btn">
            Cari Lowongan Lain
          </button>
        </div>
      </div>
    );

  if (!job) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 page-fade" data-testid="apply-page">
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 mb-6">
        <img src={logoUrl(job.company_logo, job.company_name)} alt="" className="h-12 w-12 rounded-lg border border-slate-100 object-cover" />
        <div>
          <h1 className="font-display font-bold text-lg text-slate-900">Lamar: {job.title}</h1>
          <p className="text-sm text-slate-500 flex flex-wrap gap-x-3">
            <span>{job.company_name}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
            <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />{formatSalary(job.salary_min, job.salary_max)}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5" data-testid="apply-form">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
          <input required value={form.name} onChange={set("name")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="apply-name-input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input required type="email" value={form.email} onChange={set("email")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="apply-email-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor WhatsApp</label>
            <input required value={form.phone} onChange={set("phone")} placeholder="08xxxxxxxxxx" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="apply-phone-input" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Pendidikan Terakhir</label>
            <select value={form.education} onChange={set("education")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="apply-education-select">
              {EDUCATION_LEVELS.filter((e) => e !== "Tidak ada minimal").map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Pengalaman Kerja</label>
            <input value={form.experience} onChange={set("experience")} placeholder="Contoh: 2 tahun sebagai admin" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="apply-experience-input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Upload CV (PDF/DOC, maks 2MB)</label>
          <label className="flex items-center gap-3 h-24 px-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-sky-400 cursor-pointer transition-colors">
            <UploadCloud className="h-6 w-6 text-slate-400" />
            <span className="text-sm text-slate-500">
              {cvFile ? cvFile.name : user?.cv_filename ? `CV tersimpan: ${user.cv_filename} (unggah untuk mengganti)` : "Klik untuk memilih file CV"}
            </span>
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setCvFile(e.target.files[0] || null)} data-testid="apply-cv-input" />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Pesan untuk Perusahaan (opsional)</label>
          <textarea value={form.message} onChange={set("message")} rows={4} placeholder="Perkenalkan diri Anda secara singkat..." className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="apply-message-input" />
        </div>
        <button type="submit" disabled={submitting} className="w-full h-12 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2" data-testid="apply-submit-btn">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Kirim Lamaran
        </button>
      </form>
    </div>
  );
}
