import { useEffect, useState, useCallback } from "react";
import { Loader2, Users, Ban, RotateCcw, Crown, Search } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { formatDate, timeAgo } from "../../lib/format";

const PLAN_FILTERS = [
  { value: "", label: "Semua" },
  { value: "pro", label: "Career Pro" },
  { value: "free", label: "Free" },
];

const STATUS_FILTERS = [
  { value: "", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "suspended", label: "Suspended" },
];

const selectCls = "h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");

  const fetchCandidates = useCallback(() => {
    setLoading(true);
    api.get("/admin/candidates", { params: { q, plan, status } })
      .then((r) => setCandidates(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, plan, status]);

  useEffect(() => {
    const t = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(t);
  }, [fetchCandidates]);

  const toggleBlock = async (user) => {
    try {
      await api.post(`/admin/users/${user.id}/status`, { blocked: !user.blocked });
      toast.success(user.blocked ? "Akun dibuka kembali" : "Akun disuspend");
      fetchCandidates();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Semua Pelamar">
      <div data-testid="admin-candidates-page">
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="candidates-filters">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / email"
              className="w-full h-11 pl-9 pr-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              data-testid="candidates-search" />
          </div>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={selectCls} data-testid="candidates-plan-filter">
            {PLAN_FILTERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} data-testid="candidates-status-filter">
            {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-candidates">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Tidak ada pelamar pada filter ini.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="candidates-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Nama</th>
                    <th className="px-5 py-3 font-medium">Kontak</th>
                    <th className="px-5 py-3 font-medium">Paket</th>
                    <th className="px-5 py-3 font-medium text-center">Kuota Apply</th>
                    <th className="px-5 py-3 font-medium text-center">Lamaran</th>
                    <th className="px-5 py-3 font-medium">Daftar</th>
                    <th className="px-5 py-3 font-medium">Aktivitas Terakhir</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((c) => (
                    <tr key={c.id} data-testid={`candidate-row-${c.id}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{c.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <p>{c.email}</p>
                        <p className="text-xs text-slate-400">{c.phone || "-"}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {c.career_pro ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800" data-testid={`candidate-pro-${c.id}`}>
                            <Crown className="h-3 w-3" /> Career Pro
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Free</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-600">{c.apply_used}</td>
                      <td className="px-5 py-3.5 text-center text-slate-600">{c.applications_count}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(c.created_at)}</td>
                      <td className="px-5 py-3.5 text-slate-500">{c.last_activity ? timeAgo(c.last_activity) : "-"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.blocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`} data-testid={`candidate-status-${c.id}`}>
                          {c.blocked ? "Suspended" : "Aktif"}
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
                          {c.blocked ? <><RotateCcw className="h-3.5 w-3.5" /> Unsuspend</> : <><Ban className="h-3.5 w-3.5" /> Suspend</>}
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
