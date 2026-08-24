import { useState } from "react";
import { FileText, UploadCloud, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { CANDIDATE_MENU } from "./menu";
import { fileUrl } from "../../lib/format";

export default function CandidateCV() {
  const { user, refresh } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file CV terlebih dahulu");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/candidate/cv", fd);
      await refresh();
      setFile(null);
      toast.success("CV berhasil diunggah");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="CV Saya">
      <div className="max-w-2xl space-y-6" data-testid="candidate-cv-page">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
          <h3 className="font-display font-semibold text-slate-900 mb-4">CV Tersimpan</h3>
          {user?.cv_path ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" data-testid="current-cv">
              <span className="flex items-center gap-2.5 text-sm text-slate-700 min-w-0">
                <FileText className="h-5 w-5 text-sky-600 shrink-0" />
                <span className="truncate">{user.cv_filename || "CV Anda"}</span>
              </span>
              <a href={fileUrl(user.cv_path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:underline shrink-0" data-testid="download-cv-link">
                <Download className="h-4 w-4" /> Unduh
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-500" data-testid="no-cv-message">Belum ada CV tersimpan. Unggah CV agar lebih cepat saat melamar.</p>
          )}
        </div>

        <form onSubmit={handleUpload} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8" data-testid="cv-upload-form">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Unggah CV Baru (PDF/DOC, maks 2MB)</h3>
          <label className="flex items-center gap-3 h-24 px-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-sky-400 cursor-pointer transition-colors">
            <UploadCloud className="h-6 w-6 text-slate-400" />
            <span className="text-sm text-slate-500">{file ? file.name : "Klik untuk memilih file CV"}</span>
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} data-testid="cv-file-input" />
          </label>
          <button type="submit" disabled={uploading} className="mt-5 h-12 px-8 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 inline-flex items-center gap-2" data-testid="cv-upload-btn">
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan CV
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
