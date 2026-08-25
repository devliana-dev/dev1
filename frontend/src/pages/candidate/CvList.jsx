import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, FilePlus2, Pencil, Eye, Printer, Copy, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { CANDIDATE_MENU } from "./menu";
import { formatDate } from "../../lib/format";
import { CV_TEMPLATES } from "../../components/cvTemplates";

export default function CvList() {
  const navigate = useNavigate();
  const [cvs, setCvs] = useState(null);
  const [allowed, setAllowed] = useState(true);

  const fetchCvs = () => {
    api.get("/cv-professional/my-cvs").then((r) => setCvs(r.data)).catch(() => setCvs([]));
  };

  useEffect(() => {
    api.get("/cv-professional/status").then((r) => {
      if (!r.data.has_access) {
        toast.error("Fitur ini memerlukan akses CV Profesional yang aktif");
        setAllowed(false);
        navigate("/candidate/cv-professional", { replace: true });
      }
    }).catch(() => {});
    fetchCvs();
  }, [navigate]);

  if (!allowed) return null;

  const templateName = (id) => CV_TEMPLATES.find((t) => t.id === id)?.name || id;

  const duplicate = async (cv) => {
    try {
      await api.post(`/cv-professional/cvs/${cv.id}/duplicate`);
      toast.success("CV berhasil diduplikat");
      fetchCvs();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const remove = async (cv) => {
    if (!window.confirm(`Hapus CV "${cv.name}"?`)) return;
    try {
      await api.delete(`/cv-professional/cvs/${cv.id}`);
      toast.success("CV dihapus");
      fetchCvs();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const downloadPdf = async (cv) => {
    try {
      const res = await api.get(`/cv-professional/cvs/${cv.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cv.name || "cv"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF CV berhasil diunduh");
    } catch {
      toast.error("Gagal mengunduh PDF");
    }
  };

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="CV Saya">
      <div data-testid="cv-list-page">
        <div className="flex justify-end mb-4">
          <Link to="/candidate/cv-professional/builder" className="inline-flex items-center gap-1.5 h-11 px-5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors" data-testid="create-cv-btn">
            <FilePlus2 className="h-4 w-4" /> Buat CV Baru
          </Link>
        </div>
        {cvs === null ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : cvs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-cvs">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada CV</h3>
            <p className="text-sm text-slate-500 mt-1">Buat CV profesional pertama Anda dengan template yang tersedia.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="cv-list">
            {cvs.map((cv) => (
              <div key={cv.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4" data-testid={`cv-row-${cv.id}`}>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-slate-900 truncate">{cv.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{templateName(cv.template)} · Terakhir diperbarui {formatDate(cv.updated_at)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <Link to={`/candidate/cv-professional/builder/${cv.id}`} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid={`cv-edit-${cv.id}`}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <Link to={`/candidate/cv-professional/builder/${cv.id}?preview=1`} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid={`cv-preview-${cv.id}`}>
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Link>
                  <button onClick={() => downloadPdf(cv)} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid={`cv-download-${cv.id}`}>
                    <Printer className="h-3.5 w-3.5" /> Download
                  </button>
                  <button onClick={() => duplicate(cv)} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid={`cv-duplicate-${cv.id}`}>
                    <Copy className="h-3.5 w-3.5" /> Duplikat
                  </button>
                  <button onClick={() => remove(cv)} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100" data-testid={`cv-delete-${cv.id}`}>
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
