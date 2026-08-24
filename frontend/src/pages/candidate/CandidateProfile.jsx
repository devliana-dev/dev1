import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { CANDIDATE_MENU } from "./menu";
import { EDUCATION_LEVELS } from "../../lib/constants";

export default function CandidateProfile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "",
    education: user?.education || "SMA/SMK", experience: user?.experience || "", about: user?.about || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/candidate/profile", form);
      await refresh();
      toast.success("Profil berhasil disimpan");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Profil Saya">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5 max-w-2xl" data-testid="candidate-profile-form">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
          <input required value={form.name} onChange={set("name")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="profile-name-input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input value={user?.email || ""} disabled className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500" data-testid="profile-email-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor WhatsApp</label>
            <input required value={form.phone} onChange={set("phone")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="profile-phone-input" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Pendidikan Terakhir</label>
            <select value={form.education} onChange={set("education")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="profile-education-select">
              {EDUCATION_LEVELS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Pengalaman Kerja</label>
            <input value={form.experience} onChange={set("experience")} placeholder="Contoh: 2 tahun sebagai admin" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="profile-experience-input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tentang Saya</label>
          <textarea value={form.about} onChange={set("about")} rows={4} placeholder="Ceritakan singkat tentang diri dan keahlian Anda" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="profile-about-input" />
        </div>
        <button type="submit" disabled={saving} className="h-12 px-8 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 inline-flex items-center gap-2" data-testid="profile-save-btn">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Profil
        </button>
      </form>
    </DashboardLayout>
  );
}
