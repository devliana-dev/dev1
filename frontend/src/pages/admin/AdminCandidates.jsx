import { useEffect, useState, useCallback } from "react";
import { Loader2, Users, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { formatDate } from "../../lib/format";

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = useCallback(() => {
    setLoading(true);
    api.get("/admin/candidates")
      .then((r) => setCandidates(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const toggleBlock = async (user) => {
    try {
      await api.post(`/admin/users/${user.id}/status`, { blocked: !user.blocked });
      toast.success(user.blocked ? "Akun dibuka kembali" : "Akun diblokir");
      fetchCandidates();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Pencari Kerja">
      <div data-testid="admin-candidates-page">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-candidates">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Belum ada pencari kerja terdaftar.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="candidates-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Nama</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">WhatsApp</th>
                    <th className="px-5 py-3 font-medium">Tanggal Daftar</th>
                    <th className="px-5 py-3 font-medium">Lamaran</th>
                    <th className="px-5 py-3 font-medium">Status Akun</th>
                    <th className="px-5 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((c) => (
                    <tr key={c.id} data-testid={`candidate-row-${c.id}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{c.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.email}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.phone}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(c.created_at)}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.applications_count}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.blocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`} data-testid={`candidate-status-${c.id}`}>
                          {c.blocked ? "Diblokir" : "Aktif"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => toggleBlock(c)}
                          className={`inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold ${
                            c.blocked ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-red-100 text-red-600 hover:bg-red-200"
                          }`}
                          data-testid={`block-candidate-${c.id}`}
                        >
                          {c.blocked ? <><RotateCcw className="h-3.5 w-3.5" /> Buka Blokir</> : <><Ban className="h-3.5 w-3.5" /> Blokir</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
