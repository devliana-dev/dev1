import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, Plus, Trash2, Save, Eye, Pencil, Download, User } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { imageUrl } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { CANDIDATE_MENU } from "./menu";
import { CV_TEMPLATES, CvTemplateRenderer, emptyCvData } from "../../components/cvTemplates";

const SECTION_META = {
  experience: {
    label: "Pengalaman Kerja",
    empty: { company: "", position: "", start_date: "", end_date: "", description: "" },
    fields: [
      { key: "position", label: "Posisi" }, { key: "company", label: "Perusahaan" },
      { key: "start_date", label: "Tanggal Mulai" }, { key: "end_date", label: "Tanggal Selesai" },
      { key: "description", label: "Deskripsi Pekerjaan", textarea: true },
    ],
  },
  education: {
    label: "Pendidikan",
    empty: { institution: "", major: "", start_year: "", end_year: "", description: "" },
    fields: [
      { key: "institution", label: "Institusi" }, { key: "major", label: "Jurusan" },
      { key: "start_year", label: "Tahun Masuk" }, { key: "end_year", label: "Tahun Lulus" },
      { key: "description", label: "Deskripsi", textarea: true },
    ],
  },
  skills: {
    label: "Keahlian",
    empty: { name: "", level: "" },
    fields: [{ key: "name", label: "Nama Skill" }, { key: "level", label: "Level (opsional)" }],
  },
  certifications: {
    label: "Sertifikasi",
    empty: { name: "", issuer: "", year: "" },
    fields: [{ key: "name", label: "Nama Sertifikat" }, { key: "issuer", label: "Lembaga" }, { key: "year", label: "Tahun" }],
  },
  organizations: {
    label: "Organisasi",
    empty: { name: "", role: "", period: "", description: "" },
    fields: [
      { key: "name", label: "Nama Organisasi" }, { key: "role", label: "Jabatan" },
      { key: "period", label: "Periode" }, { key: "description", label: "Deskripsi", textarea: true },
    ],
  },
  languages: {
    label: "Bahasa",
    empty: { name: "", level: "" },
    fields: [{ key: "name", label: "Bahasa" }, { key: "level", label: "Level" }],
  },
};

const inputCls = "w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
const areaCls = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function CvBuilder() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState(null);
  const [allowed, setAllowed] = useState(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(searchParams.get("preview") === "1");
  const printed = useRef(false);

  useEffect(() => {
    api.get("/cv-professional/status").then((r) => {
      if (!r.data.has_access) {
        toast.error("Fitur ini memerlukan akses CV Profesional yang aktif");
        navigate("/candidate/cv-professional", { replace: true });
        return;
      }
      setAllowed(true);
    }).catch(() => navigate("/candidate/cv-professional", { replace: true }));
  }, [navigate]);

  useEffect(() => {
    if (allowed !== true) return;
    if (id) {
      api.get(`/cv-professional/cvs/${id}`)
        .then((r) => setDoc({ name: r.data.name, template: r.data.template, data: { ...emptyCvData(), ...r.data.data } }))
        .catch(() => {
          toast.error("CV tidak ditemukan");
          navigate("/candidate/cv-professional/list");
        });
    } else if (searchParams.get("import") === "1") {
      const raw = sessionStorage.getItem("cv_import_data");
      const imported = raw ? JSON.parse(raw) : {};
      sessionStorage.removeItem("cv_import_data");
      setDoc({ name: "CV Hasil Import", template: "modern", data: { ...emptyCvData(), ...imported } });
      toast.success("Data CV lama berhasil dibaca. Periksa dan lengkapi sebelum menyimpan.");
    } else {
      const data = emptyCvData();
      data.personal = { ...data.personal, name: user?.name || "", email: user?.email || "", phone: user?.phone || "" };
      setDoc({ name: "CV Baru", template: searchParams.get("template") || "modern", data });
    }
  }, [allowed, id, navigate, searchParams, user]);

  useEffect(() => {
    if (doc && id && searchParams.get("download") === "1" && !printed.current) {
      printed.current = true;
      downloadPdf();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, id, searchParams]);

  if (!allowed || !doc)
    return (
      <DashboardLayout menu={CANDIDATE_MENU} title="CV Builder">
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      </DashboardLayout>
    );

  const setPersonal = (key, value) => setDoc({ ...doc, data: { ...doc.data, personal: { ...doc.data.personal, [key]: value } } });
  const setItem = (section, index, key, value) => {
    const items = [...doc.data[section]];
    items[index] = { ...items[index], [key]: value };
    setDoc({ ...doc, data: { ...doc.data, [section]: items } });
  };
  const addItem = (section) => setDoc({ ...doc, data: { ...doc.data, [section]: [...doc.data[section], { ...SECTION_META[section].empty }] } });
  const removeItem = (section, index) => setDoc({ ...doc, data: { ...doc.data, [section]: doc.data[section].filter((_, i) => i !== index) } });

  const loadProfilePhoto = async () => {
    try {
      const { data } = await api.get("/candidate/career-profile");
      const photo = data.photo_path || data.profile?.photo_path || "";
      if (!photo) {
        toast.error("Profil Karier Anda belum memiliki foto. Unggah dulu di halaman Profil Karier.");
        return;
      }
      setPersonal("photo", photo);
      toast.success("Foto profil dimasukkan ke CV");
    } catch {
      toast.error("Gagal memuat foto profil");
    }
  };

  const downloadPdf = async () => {
    if (!id) {
      toast.error("Simpan CV terlebih dahulu sebelum mengunduh PDF");
      return;
    }
    setDownloading(true);
    try {
      const res = await api.get(`/cv-professional/cvs/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.name || "cv"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF CV berhasil diunduh");
    } catch {
      toast.error("Gagal mengunduh PDF");
    } finally {
      setDownloading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (id) {
        await api.put(`/cv-professional/cvs/${id}`, doc);
      } else {
        const { data: created } = await api.post("/cv-professional/cvs", doc);
        navigate(`/candidate/cv-professional/builder/${created.id}`, { replace: true });
      }
      toast.success("CV berhasil disimpan");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama CV</label>
            <input value={doc.name} onChange={(e) => setDoc({ ...doc, name: e.target.value })} className={inputCls} data-testid="cv-name-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Template</label>
            <select value={doc.template} onChange={(e) => setDoc({ ...doc, template: e.target.value })} className={`${inputCls} bg-white`} data-testid="cv-template-select">
              {CV_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="section-personal">
        <h3 className="font-display font-semibold text-slate-900 mb-3">Informasi Pribadi</h3>
        <div className="flex items-center gap-4 mb-4">
          {doc.data.personal.photo ? (
            <img src={imageUrl(doc.data.personal.photo)} alt="Foto profil" className="h-16 w-16 rounded-full object-cover border border-slate-200" data-testid="cv-photo-preview" />
          ) : (
            <span className="h-16 w-16 rounded-full bg-slate-100 border border-slate-200 inline-flex items-center justify-center text-slate-400">
              <User className="h-6 w-6" />
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={loadProfilePhoto} className="inline-flex items-center h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid="cv-photo-load-btn">
              Ambil dari Profil Karier
            </button>
            {doc.data.personal.photo && (
              <button type="button" onClick={() => setPersonal("photo", "")} className="inline-flex items-center h-9 px-3 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50" data-testid="cv-photo-remove-btn">
                Hapus Foto
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "name", label: "Nama Lengkap" }, { key: "email", label: "Email" },
            { key: "phone", label: "Nomor HP" }, { key: "city", label: "Kota" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
              <input value={doc.data.personal[f.key]} onChange={(e) => setPersonal(f.key, e.target.value)} className={inputCls} data-testid={`cv-personal-${f.key}`} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Alamat</label>
            <input value={doc.data.personal.address} onChange={(e) => setPersonal("address", e.target.value)} className={inputCls} data-testid="cv-personal-address" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Ringkasan Profesional</label>
            <textarea rows={3} value={doc.data.summary} onChange={(e) => setDoc({ ...doc, data: { ...doc.data, summary: e.target.value } })} className={areaCls} data-testid="cv-summary-input" />
          </div>
        </div>
      </div>

      {Object.entries(SECTION_META).map(([section, meta]) => (
        <div key={section} className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`section-${section}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-slate-900">{meta.label}</h3>
            <button onClick={() => addItem(section)} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100" data-testid={`add-${section}`}>
              <Plus className="h-3.5 w-3.5" /> Tambah
            </button>
          </div>
          {doc.data[section].length === 0 && <p className="text-xs text-slate-400">Belum ada data. Klik Tambah untuk menambahkan.</p>}
          <div className="space-y-4">
            {doc.data[section].map((item, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-4 relative">
                <button onClick={() => removeItem(section, index)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500" data-testid={`remove-${section}-${index}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                  {meta.fields.map((f) => (
                    <div key={f.key} className={f.textarea ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                      {f.textarea ? (
                        <textarea rows={2} value={item[f.key]} onChange={(e) => setItem(section, index, f.key, e.target.value)} className={areaCls} />
                      ) : (
                        <input value={item[f.key]} onChange={(e) => setItem(section, index, f.key, e.target.value)} className={inputCls} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="CV Builder">
      <div data-testid="cv-builder-page">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 h-11 px-5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60" data-testid="cv-save-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan CV
          </button>
          <button onClick={downloadPdf} disabled={downloading} className="inline-flex items-center gap-1.5 h-11 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60" data-testid="cv-download-btn">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
          </button>
          <button onClick={() => setMobilePreview(!mobilePreview)} className="lg:hidden inline-flex items-center gap-1.5 h-11 px-5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700" data-testid="cv-preview-toggle">
            {mobilePreview ? <><Pencil className="h-4 w-4" /> Edit Data</> : <><Eye className="h-4 w-4" /> Preview</>}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className={mobilePreview ? "hidden lg:block" : ""}>{formContent}</div>
          <div className={`${mobilePreview ? "" : "hidden lg:block"} lg:sticky lg:top-6`} data-testid="cv-preview-panel">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Live Preview</p>
            <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-slate-100">
              <div className="origin-top-left scale-[0.52] sm:scale-[0.62] lg:scale-[0.55] xl:scale-[0.62] w-[794px]">
                <CvTemplateRenderer template={doc.template} data={doc.data} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
