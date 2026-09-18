import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, CheckCircle2, Eye, X, Palette, Sparkles, ArrowRight,
  UserRound, FileText, Zap, Info,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { CANDIDATE_MENU } from "./menu";
import { CV_TEMPLATES, CV_ACCENTS, CvTemplateRenderer, profileToCvData } from "../../components/cvTemplates";

const STEPS = [
  { label: "Pilih Template", icon: Palette },
  { label: "Isi Data", icon: UserRound },
  { label: "Preview", icon: Eye },
  { label: "Simpan CV Aktif", icon: CheckCircle2 },
];

function ThumbnailPreview({ template, accent, data, scale = 0.36 }) {
  // A4 210x297mm at 96dpi ≈ 794x1123px. Scale it to fit container.
  const w = 794 * scale;
  const h = 1123 * scale;
  return (
    <div
      className="relative rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mx-auto"
      style={{ width: `${w}px`, height: `${h}px`, maxWidth: "100%" }}
      data-testid={`cv-thumb-${template}`}>
      <div style={{ width: "794px", height: "1123px", transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <CvTemplateRenderer template={template} accent={accent} data={data} />
      </div>
    </div>
  );
}

function PreviewModal({ template, accent, data, onClose, onUse, active }) {
  const meta = CV_TEMPLATES.find((t) => t.id === template);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" data-testid="cv-preview-modal">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-slate-900 truncate" data-testid="preview-template-name">{meta?.name}</h3>
            <p className="text-xs text-slate-500 truncate">{meta?.description}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-slate-500 hover:bg-slate-100" data-testid="preview-close-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 p-4 sm:p-8 flex justify-center">
          <div className="shadow-xl rounded-lg overflow-hidden" style={{ width: 794 }}>
            <CvTemplateRenderer template={template} accent={accent} data={data} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-500 hidden sm:block">Data otomatis diambil dari Profil Karier Anda.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-11 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid="preview-cancel-btn">
              Batal
            </button>
            <button onClick={onUse} className="h-11 px-5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 inline-flex items-center gap-1.5" data-testid="preview-use-btn">
              {active ? "Simpan Sebagai CV Aktif" : "Gunakan Template"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CvProfessional() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [design, setDesign] = useState({ template: "modern", accent: "navy" });
  const [selected, setSelected] = useState({ template: "modern", accent: "navy" });
  const [previewTpl, setPreviewTpl] = useState(null);
  const [quota, setQuota] = useState(null);
  const [subStatus, setSubStatus] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, designRes, quotaRes, statusRes] = await Promise.all([
        api.get("/candidate/career-profile"),
        api.get("/candidate/cv-design"),
        api.get("/candidate/apply-quota").catch(() => ({ data: null })),
        api.get("/cv-professional/status").catch(() => ({ data: null })),
      ]);
      setProfileData({ user: profileRes.data.user, profile: profileRes.data.profile, completion: profileRes.data.completion });
      setDesign(designRes.data);
      setSelected(designRes.data);
      setQuota(quotaRes.data);
      setSubStatus(statusRes.data);
    } catch (err) {
      toast.error(formatApiError(err) || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const cvData = useMemo(
    () => (profileData ? profileToCvData(profileData.user, profileData.profile) : { personal: {}, summary: "" }),
    [profileData]
  );

  const activeChanged = selected.template !== design.template || selected.accent !== design.accent;

  const saveDesign = async (payload) => {
    setSaving(true);
    try {
      const body = payload || selected;
      await api.put("/candidate/cv-design", body);
      setDesign(body);
      setSelected(body);
      setPreviewTpl(null);
      toast.success("CV Aktif berhasil disimpan. Data sudah tersinkron dengan Profil Karier.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout menu={CANDIDATE_MENU} title="CV Profesional">
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      </DashboardLayout>
    );
  }

  const isPro = !!subStatus?.has_access;
  const missing = profileData?.completion?.missing || [];

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="CV Profesional">
      <div className="space-y-5" data-testid="cv-professional-page">
        {/* Hero header */}
        <div className="rounded-2xl overflow-hidden text-white p-6 sm:p-8 relative" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e40af 60%, #0284c7 100%)" }}>
          <div className="max-w-2xl relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> Studio CV Profesional CirebonKarir
            </div>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl font-black tracking-tight">Bangun CV Profesional yang siap dilamar</h2>
            <p className="mt-2 text-sm text-white/80">
              Pilih dari 8 template modern & 6 aksen warna profesional. Data CV otomatis diambil dari Profil Karier — cukup isi sekali, seluruh CV & lamaran ikut ter-update.
            </p>
          </div>
        </div>

        {/* Alur / Steps */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5" data-testid="cv-alur">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Alur pembuatan CV</p>
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="inline-flex h-8 w-8 rounded-lg items-center justify-center bg-sky-600 text-white font-bold text-sm shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{s.label}</p>
                  <p className="text-[11px] text-slate-500 hidden sm:block truncate">
                    {i === 0 && "Pilih 1 dari 8 template"}
                    {i === 1 && "Data diambil dari Profil Karier"}
                    {i === 2 && "Cek tampilan CV Anda"}
                    {i === 3 && "Sinkron ke lamaran"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Active CV summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6" data-testid="active-cv-card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">CV Aktif Anda</p>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-900" data-testid="active-cv-name">
                  {CV_TEMPLATES.find((t) => t.id === design.template)?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aksen: <span className="font-semibold" style={{ color: CV_ACCENTS.find((a) => a.id === design.accent)?.hex }}>
                    {CV_ACCENTS.find((a) => a.id === design.accent)?.label}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setPreviewTpl({ template: design.template, accent: design.accent, active: true })}
                className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                data-testid="preview-active-btn">
                <Eye className="h-4 w-4" /> Preview
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex justify-center p-4">
              <ThumbnailPreview template={design.template} accent={design.accent} data={cvData} scale={0.5} />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5" data-testid="profile-sync-card">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shrink-0"><UserRound className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-slate-900">Sinkron Profil Karier</p>
                  <p className="text-xs text-slate-500 mt-0.5">Data pribadi, pengalaman, pendidikan, & keahlian pada CV mengikuti Profil Karier Anda ({profileData?.completion?.percent || 0}% lengkap).</p>
                </div>
              </div>
              {missing.length > 0 && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5" data-testid="profile-missing-hint">
                  Lengkapi: {missing.slice(0, 3).join(", ").toLowerCase()}
                </p>
              )}
              <Link to="/candidate/profile" className="mt-4 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800" data-testid="edit-profile-btn">
                <UserRound className="h-4 w-4" /> Isi/Edit Profil Karier
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5" data-testid="quick-apply-card">
              <div className="flex items-start gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${isPro ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  <Zap className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-slate-900">Lamar Cepat</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isPro
                      ? <>Career Pro aktif. Sisa <b>{quota?.remaining ?? 0}</b> dari {quota?.limit ?? 30} kuota (masa aktif 3 bulan).</>
                      : "Aktifkan Career Pro untuk gunakan Lamar Cepat menggunakan Profil Karier — max 30x / 3 bulan."}
                  </p>
                </div>
              </div>
              {!isPro && (
                <Link to="/candidate/cv-professional/upgrade" className="mt-4 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600" data-testid="upgrade-career-pro-btn">
                  Upgrade Career Pro
                </Link>
              )}
              {isPro && (
                <Link to="/jobs" className="mt-4 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700" data-testid="jobs-with-quick-apply-btn">
                  Cari Lowongan
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Accent Picker */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6" data-testid="accent-picker-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Aksen Warna</p>
              <h3 className="mt-1 font-display text-lg font-bold text-slate-900">Pilih warna CV Anda</h3>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3" data-testid="accent-picker">
            {CV_ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected((s) => ({ ...s, accent: a.id }))}
                className={`p-3 rounded-xl border-2 transition-all text-left ${selected.accent === a.id ? "border-slate-900 shadow-md" : "border-slate-200 hover:border-slate-400"}`}
                data-testid={`accent-${a.id}`}>
                <div className="h-10 w-full rounded-lg" style={{ background: a.hex }} />
                <p className="mt-2 text-xs font-semibold text-slate-900">{a.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Template Gallery */}
        <div id="template-gallery" data-testid="template-gallery">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-display text-xl font-bold text-slate-900">Pilihan Template</h3>
            <p className="text-xs text-slate-500 hidden sm:block">Klik "Preview" atau "Gunakan Template" untuk mengubah CV Aktif.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CV_TEMPLATES.map((t) => {
              const isActive = design.template === t.id && design.accent === selected.accent;
              return (
                <div key={t.id} className={`bg-white rounded-2xl border p-4 transition-all ${isActive ? "border-sky-500 ring-2 ring-sky-200 shadow-md" : "border-slate-200 hover:shadow-md"}`} data-testid={`template-card-${t.id}`}>
                  <div className="flex justify-center bg-slate-50 rounded-lg p-2 -mx-2">
                    <ThumbnailPreview template={t.id} accent={selected.accent} data={cvData} scale={0.34} />
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-slate-900 truncate">{t.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{t.description}</p>
                    </div>
                    {isActive && <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5" data-testid={`active-badge-${t.id}`}><CheckCircle2 className="h-3 w-3" /> Aktif</span>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPreviewTpl({ template: t.id, accent: selected.accent, active: false })}
                      className="h-10 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-1"
                      data-testid={`btn-preview-${t.id}`}>
                      <Eye className="h-4 w-4" /> Preview
                    </button>
                    <button
                      onClick={() => saveDesign({ template: t.id, accent: selected.accent })}
                      disabled={saving}
                      className="h-10 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                      data-testid={`btn-use-${t.id}`}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Gunakan <ArrowRight className="h-3.5 w-3.5" /></>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advanced builder link (Career Pro) */}
        {isPro && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center gap-4 justify-between" data-testid="advanced-builder-card">
            <div>
              <p className="font-display text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5" /> Butuh CV custom lebih detail?</p>
              <p className="text-sm text-white/70 mt-1 max-w-md">Gunakan CV Builder Career Pro untuk membuat multiple CV, import CV lama, dan download PDF.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/candidate/cv-professional/list" className="h-11 px-4 rounded-lg bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 inline-flex items-center gap-2" data-testid="cv-list-btn">
                CV Saya
              </Link>
              <Link to="/candidate/cv-professional/builder" className="h-11 px-4 rounded-lg bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 inline-flex items-center gap-2" data-testid="cv-builder-btn">
                Buka CV Builder
              </Link>
            </div>
          </div>
        )}

        {/* Info footer */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 flex items-start gap-3" data-testid="cv-info-footer">
          <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-900">
            <b>Satu Sumber Data Kandidat.</b> CV Profesional dan Profil Karier menggunakan data yang sama. Perubahan di Profil Karier otomatis muncul di CV Aktif Anda, dan sebaliknya. Ini mempercepat proses melamar kerja tanpa perlu mengisi ulang data.
          </div>
        </div>
      </div>

      {previewTpl && (
        <PreviewModal
          template={previewTpl.template}
          accent={previewTpl.accent}
          data={cvData}
          active={previewTpl.active}
          onClose={() => setPreviewTpl(null)}
          onUse={() => saveDesign({ template: previewTpl.template, accent: previewTpl.accent })}
        />
      )}
    </DashboardLayout>
  );
}
