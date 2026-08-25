import { useEffect, useState } from "react";
import {
  Loader2, Plus, X, GraduationCap, Briefcase, Award, Languages, Users,
  Trophy, FolderGit2, Target, UserRound, Eye, EyeOff, Camera, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { CANDIDATE_MENU } from "./menu";
import {
  EDUCATION_LEVELS, LOCATIONS, JOB_TYPES, CATEGORIES,
  SKILL_LEVELS, LANGUAGE_LEVELS, EDU_LEVEL_OPTIONS,
} from "../../lib/constants";
import { imageUrl } from "../../lib/format";

const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";
const smInput = "w-full h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

function ListEditor({ title, icon: Icon, items, fields, onChange, testId }) {
  const add = () => onChange([...items, Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? false : ""]))]);
  const update = (i, key, val) => onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid={testId}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
          <Icon className="h-5 w-5 text-sky-600" /> {title}
        </h3>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800" data-testid={`${testId}-add`}>
          <Plus className="h-4 w-4" /> Tambah
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Belum ada data. Klik Tambah untuk menambahkan.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="relative rounded-lg border border-slate-200 p-4" data-testid={`${testId}-item-${i}`}>
              <button type="button" onClick={() => remove(i)} aria-label="Hapus" className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" data-testid={`${testId}-remove-${i}`}>
                <X className="h-4 w-4" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                {fields.map((f) => {
                  if (f.type === "checkbox") {
                    return (
                      <label key={f.key} className="flex items-center gap-2 text-sm text-slate-600 self-end pb-2">
                        <input type="checkbox" checked={!!item[f.key]} onChange={(e) => update(i, f.key, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-sky-600" data-testid={`${testId}-${f.key}-${i}`} />
                        {f.label}
                      </label>
                    );
                  }
                  return (
                    <div key={f.key} className={f.span || f.textarea ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                      {f.options ? (
                        <select value={item[f.key] || ""} onChange={(e) => update(i, f.key, e.target.value)} className={smInput} data-testid={`${testId}-${f.key}-${i}`}>
                          <option value="">Pilih</option>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.textarea ? (
                        <textarea rows={2} value={item[f.key] || ""} onChange={(e) => update(i, f.key, e.target.value)} placeholder={f.placeholder || ""} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid={`${testId}-${f.key}-${i}`} />
                      ) : (
                        <input value={item[f.key] || ""} onChange={(e) => update(i, f.key, e.target.value)} placeholder={f.placeholder || ""} className={smInput} data-testid={`${testId}-${f.key}-${i}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_PROFILE = {
  photo_path: "", address: "", city: "", summary: "", target_position: "", target_category: "",
  target_location: "", target_job_type: "", expected_salary: 0, visibility: "private",
  education: [], experience: [], skills: [], certifications: [], languages: [],
  organizations: [], achievements: [], portfolios: [],
};

export default function CandidateProfile() {
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", phone: "", education: "SMA/SMK", experience: "", about: "" });
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [completion, setCompletion] = useState(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    api.get("/candidate/career-profile")
      .then((r) => {
        setUserForm({
          name: r.data.user.name || "", phone: r.data.user.phone || "",
          education: r.data.user.education || "SMA/SMK", experience: r.data.user.experience || "",
          about: r.data.user.about || "",
        });
        setEmail(r.data.user.email || "");
        setProfile({ ...EMPTY_PROFILE, ...r.data.profile });
        setCompletion(r.data.completion);
      })
      .catch(() => toast.error("Gagal memuat profil karier"))
      .finally(() => setLoading(false));
  }, []);

  const setU = (key) => (e) => setUserForm({ ...userForm, [key]: e.target.value });
  const setP = (key) => (e) => setProfile({ ...profile, [key]: e.target.value });
  const setList = (key) => (items) => setProfile({ ...profile, [key]: items });

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/candidate/career-profile/photo", fd);
      setProfile((p) => ({ ...p, photo_path: r.data.photo_path }));
      toast.success("Foto profil diperbarui");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/candidate/profile", userForm);
      const r = await api.put("/candidate/career-profile", { ...profile, expected_salary: Number(profile.expected_salary) || 0 });
      setCompletion(r.data.completion);
      await refresh();
      toast.success("Profil Karier berhasil disimpan");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <DashboardLayout menu={CANDIDATE_MENU} title="Profil Karier">
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Profil Karier">
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5" data-testid="career-profile-form">
        {completion && (
          <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="profile-completion-card">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display font-semibold text-slate-900">
                Profil Karier {completion.percent}% Lengkap
              </p>
              <span className="text-sm font-bold text-sky-700" data-testid="completion-percent">{completion.percent}%</span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${completion.percent}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {completion.checks.map((c) => (
                <span key={c.key} className={`inline-flex items-center gap-1 text-xs ${c.done ? "text-emerald-700" : "text-slate-400"}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${c.done ? "text-emerald-500" : "text-slate-300"}`} /> {c.label}
                </span>
              ))}
            </div>
            {completion.missing.length > 0 && (
              <p className="mt-3 text-xs text-slate-500" data-testid="completion-recommendation">
                Rekomendasi: lengkapi {completion.missing.slice(0, 2).join(" dan ").toLowerCase()} untuk meningkatkan kelengkapan profil.
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="visibility-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${profile.visibility === "public" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                {profile.visibility === "public" ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-display font-semibold text-slate-900">
                  {profile.visibility === "public" ? "Profil Terbuka" : "Profil Privat"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                  {profile.visibility === "public"
                    ? "Perusahaan dapat menemukan profil Anda melalui pencarian kandidat dan mengirim undangan melamar."
                    : "Perusahaan tidak dapat menemukan profil Anda. Profil hanya terlihat saat Anda melamar lowongan."}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setProfile({ ...profile, visibility: profile.visibility === "public" ? "private" : "public" })}
              className={`h-10 px-4 rounded-lg text-sm font-semibold shrink-0 ${profile.visibility === "public" ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
              data-testid="visibility-toggle">
              {profile.visibility === "public" ? "Jadikan Privat" : "Buka Profil Saya"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4" data-testid="personal-section">
          <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-sky-600" /> Data Pribadi
          </h3>
          <div className="flex items-center gap-4">
            {imageUrl(profile.photo_path) ? (
              <img src={imageUrl(profile.photo_path)} alt="Foto profil" className="h-16 w-16 rounded-xl object-cover border border-slate-200" data-testid="profile-photo-preview" />
            ) : (
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Camera className="h-6 w-6" />
              </span>
            )}
            <label className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {profile.photo_path ? "Ganti Foto" : "Upload Foto"}
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={uploadPhoto} data-testid="photo-upload-input" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
              <input required value={userForm.name} onChange={setU("name")} className={inputCls} data-testid="profile-name-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor WhatsApp</label>
              <input required value={userForm.phone} onChange={setU("phone")} className={inputCls} data-testid="profile-phone-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input value={email} disabled className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500" data-testid="profile-email-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kota/Kabupaten</label>
              <select value={profile.city} onChange={setP("city")} className={inputCls} data-testid="profile-city-select">
                <option value="">Pilih kota/kabupaten</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat</label>
            <input value={profile.address} onChange={setP("address")} placeholder="Alamat domisili" className={inputCls} data-testid="profile-address-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ringkasan Profil</label>
            <textarea value={profile.summary || userForm.about} onChange={(e) => { setProfile({ ...profile, summary: e.target.value }); setUserForm({ ...userForm, about: e.target.value }); }} rows={3} placeholder="Ceritakan singkat tentang diri dan keahlian Anda" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="profile-summary-input" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4" data-testid="target-section">
          <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-sky-600" /> Target Karier
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Posisi yang Diminati</label>
              <input value={profile.target_position} onChange={setP("target_position")} placeholder="Contoh: Operator Produksi" className={inputCls} data-testid="target-position-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori Pekerjaan</label>
              <select value={profile.target_category} onChange={setP("target_category")} className={inputCls} data-testid="target-category-select">
                <option value="">Pilih kategori</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lokasi Kerja Diinginkan</label>
              <select value={profile.target_location} onChange={setP("target_location")} className={inputCls} data-testid="target-location-select">
                <option value="">Pilih lokasi</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipe Pekerjaan</label>
              <select value={profile.target_job_type} onChange={setP("target_job_type")} className={inputCls} data-testid="target-type-select">
                <option value="">Pilih tipe</option>
                {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ekspektasi Gaji (Rp/bulan)</label>
              <input type="number" min="0" value={profile.expected_salary || ""} onChange={setP("expected_salary")} placeholder="Contoh: 3000000" className={inputCls} data-testid="target-salary-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pendidikan Terakhir</label>
              <select value={userForm.education} onChange={setU("education")} className={inputCls} data-testid="profile-education-select">
                {EDUCATION_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Pengalaman Singkat</label>
            <input value={userForm.experience} onChange={setU("experience")} placeholder="Contoh: 2 tahun sebagai admin gudang" className={inputCls} data-testid="profile-experience-input" />
          </div>
        </div>

        <ListEditor title="Pendidikan" icon={GraduationCap} items={profile.education} onChange={setList("education")} testId="edu-editor"
          fields={[
            { key: "level", label: "Jenjang", options: EDU_LEVEL_OPTIONS },
            { key: "institution", label: "Sekolah/Institusi", placeholder: "SMKN 1 Cirebon" },
            { key: "major", label: "Jurusan", placeholder: "Akuntansi" },
            { key: "start_year", label: "Tahun Mulai", placeholder: "2019" },
            { key: "end_year", label: "Tahun Selesai", placeholder: "2022" },
            { key: "description", label: "Keterangan", textarea: true },
          ]} />

        <ListEditor title="Pengalaman Kerja" icon={Briefcase} items={profile.experience} onChange={setList("experience")} testId="exp-editor"
          fields={[
            { key: "company", label: "Nama Perusahaan", placeholder: "PT Maju Bersama" },
            { key: "position", label: "Jabatan", placeholder: "Staff Admin" },
            { key: "start_date", label: "Tanggal Mulai", placeholder: "2023-01" },
            { key: "end_date", label: "Tanggal Selesai", placeholder: "2024-06" },
            { key: "current", label: "Masih bekerja di sini", type: "checkbox" },
            { key: "description", label: "Deskripsi Pekerjaan", textarea: true },
          ]} />

        <ListEditor title="Skill" icon={Award} items={profile.skills} onChange={setList("skills")} testId="skill-editor"
          fields={[
            { key: "name", label: "Nama Skill", placeholder: "Microsoft Excel" },
            { key: "level", label: "Level", options: SKILL_LEVELS },
          ]} />

        <ListEditor title="Sertifikasi" icon={Award} items={profile.certifications} onChange={setList("certifications")} testId="cert-editor"
          fields={[
            { key: "name", label: "Nama Sertifikat", placeholder: "Sertifikat K3 Umum" },
            { key: "issuer", label: "Lembaga", placeholder: "Kemnaker" },
            { key: "year", label: "Tahun", placeholder: "2024" },
          ]} />

        <ListEditor title="Bahasa" icon={Languages} items={profile.languages} onChange={setList("languages")} testId="lang-editor"
          fields={[
            { key: "name", label: "Bahasa", placeholder: "Inggris" },
            { key: "level", label: "Kemampuan", options: LANGUAGE_LEVELS },
          ]} />

        <ListEditor title="Organisasi" icon={Users} items={profile.organizations} onChange={setList("organizations")} testId="org-editor"
          fields={[
            { key: "name", label: "Nama Organisasi", placeholder: "Karang Taruna" },
            { key: "role", label: "Peran", placeholder: "Sekretaris" },
            { key: "period", label: "Periode", placeholder: "2022 - 2024" },
            { key: "description", label: "Deskripsi", textarea: true },
          ]} />

        <ListEditor title="Prestasi" icon={Trophy} items={profile.achievements} onChange={setList("achievements")} testId="ach-editor"
          fields={[
            { key: "name", label: "Prestasi", placeholder: "Juara 1 LKS" },
            { key: "year", label: "Tahun", placeholder: "2023" },
            { key: "description", label: "Deskripsi", textarea: true },
          ]} />

        <ListEditor title="Portfolio" icon={FolderGit2} items={profile.portfolios} onChange={setList("portfolios")} testId="portfolio-editor"
          fields={[
            { key: "title", label: "Judul", placeholder: "Desain Katalog Produk" },
            { key: "link", label: "Link", placeholder: "https://..." },
            { key: "description", label: "Deskripsi", textarea: true },
          ]} />

        <button type="submit" disabled={saving} className="h-12 px-8 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 inline-flex items-center gap-2" data-testid="career-profile-save-btn">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Profil Karier
        </button>
      </form>
    </DashboardLayout>
  );
}
