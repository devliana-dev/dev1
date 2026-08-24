import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { CANDIDATE_MENU } from "./menu";

const SECTION_LABELS = { education: "Pendidikan", experience: "Pengalaman", skills: "Keahlian", certifications: "Sertifikasi", organizations: "Organisasi", languages: "Bahasa" };

export default function CvImport() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState(null);

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

  if (!allowed) return null;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Pilih file CV (PDF/DOCX) terlebih dahulu");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/cv-professional/import-cv", fd);
      setParsed(data.parsed);
      toast.success("CV berhasil dibaca. Periksa hasilnya di bawah.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const proceed = () => {
    sessionStorage.setItem("cv_import_data", JSON.stringify(parsed));
    navigate("/candidate/cv-professional/builder?import=1");
  };

  const foundSections = parsed ? Object.entries(SECTION_LABELS).filter(([k]) => (parsed[k] || []).length > 0) : [];

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Import CV Lama">
      <div className="max-w-2xl" data-testid="cv-import-page">
        <form onSubmit={handleUpload} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
          <h3 className="font-display font-semibold text-slate-900">Upload CV Lama (PDF/DOCX, maks 5MB)</h3>
          <p className="text-sm text-slate-500 mt-1">Sistem akan membaca informasi dari CV Anda dan mengonversinya ke format baru. Data yang terbaca dapat Anda periksa dan perbaiki sebelum disimpan.</p>
          <label className="mt-5 flex items-center gap-3 h-24 px-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-sky-400 cursor-pointer transition-colors">
            <FileUp className="h-6 w-6 text-slate-400" />
            <span className="text-sm text-slate-500">{file ? file.name : "Klik untuk memilih file CV"}</span>
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} data-testid="import-file-input" />
          </label>
          <button type="submit" disabled={uploading} className="mt-5 h-12 px-8 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60 inline-flex items-center gap-2" data-testid="import-submit-btn">
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            Baca CV
          </button>
        </form>

        {parsed && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 sm:p-8" data-testid="import-result">
            <h3 className="font-display font-semibold text-slate-900">Periksa Data CV</h3>
            <p className="text-sm text-slate-500 mt-1">Berikut data yang berhasil dibaca dari file Anda:</p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-slate-600"><span className="text-slate-400">Nama:</span> <span className="font-medium text-slate-900">{parsed.personal.name || "-"}</span></p>
              <p className="text-slate-600"><span className="text-slate-400">Email:</span> <span className="font-medium text-slate-900">{parsed.personal.email || "-"}</span></p>
              <p className="text-slate-600"><span className="text-slate-400">Telepon:</span> <span className="font-medium text-slate-900">{parsed.personal.phone || "-"}</span></p>
              <p className="text-slate-600">
                <span className="text-slate-400">Bagian terbaca:</span>{" "}
                {foundSections.length > 0
                  ? foundSections.map(([k, label]) => `${label} (${parsed[k].length})`).join(", ")
                  : "Tidak ada bagian yang terdeteksi otomatis"}
              </p>
            </div>
            <p className="mt-4 text-xs text-slate-400">Data yang tidak terbaca otomatis dapat dilengkapi manual di editor.</p>
            <button onClick={proceed} className="mt-5 inline-flex items-center gap-1.5 h-12 px-6 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors" data-testid="import-proceed-btn">
              Periksa & Edit Data <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
