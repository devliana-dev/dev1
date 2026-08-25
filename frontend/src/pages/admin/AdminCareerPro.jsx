import { useCallback, useEffect, useState } from "react";
import { Crown, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { CV_SUB_STATUS } from "../../lib/constants";
import { formatDate, formatRupiah } from "../../lib/format";

export default function AdminCareerPro() {
  const [subs, setSubs] = useState([]);
  const [money, setMoney] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/admin/career-pro"),
      api.get("/admin/analytics/monetization"),
    ])
      .then(([s, m]) => { setSubs(s.data); setMoney(m.data.career_pro); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const extend = async (s) => {
    if (!window.confirm(`Perpanjang Career Pro ${s.user_name} selama ${s.duration_days} hari?`)) return;
    try {
      await api.post(`/admin/monetization/subscriptions/${s.id}/extend`);
      toast.success("Career Pro diperpanjang");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const cancel = async (s) => {
    if (!window.confirm(`Nonaktifkan Career Pro ${s.user_name}?`)) return;
    try {
      await api.post(`/admin/monetization/subscriptions/${s.id}/cancel`);
      toast.success("Career Pro dinonaktifkan");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const kpis = money ? [
    { label: "Aktif", value: money.active },
    { label: "Baru (30 hari)", value: money.new_30d },
    { label: "Expired", value: money.expired },
    { label: "Revenue", value: formatRupiah(money.revenue) },
    { label: "Renewal Rate", value: `${money.renewal_rate}%` },
  ] : [];

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Career Pro">
      <div data-testid="admin-career-pro-page">
        {money && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4" data-testid={`cp-kpi-${k.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                <p className="font-display text-lg font-bold text-slate-900 truncate">{k.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : subs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-career-pro">
            <Crown className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Belum ada pengguna Career Pro.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="career-pro-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Mulai</th>
                    <th className="px-5 py-3 font-medium">Berakhir</th>
                    <th className="px-5 py-3 font-medium text-center">Kuota Apply</th>
                    <th className="px-5 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subs.map((s) => (
                    <tr key={s.id} data-testid={`cp-row-${s.id}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{s.user_name}</p>
                        <p className="text-xs text-slate-400">{s.user_email}</p>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={s.status} map={CV_SUB_STATUS} /></td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(s.started_at)}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(s.expires_at)}</td>
                      <td className="px-5 py-3.5 text-center text-slate-600" data-testid={`cp-quota-${s.id}`}>
                        {s.apply_used} / {s.apply_limit}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.status === "active" && (
                          <div className="flex gap-1.5">
                            <button onClick={() => extend(s)} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200" data-testid={`cp-extend-${s.id}`}>
                              <RefreshCw className="h-3.5 w-3.5" /> Perpanjang
                            </button>
                            <button onClick={() => cancel(s)} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200" data-testid={`cp-cancel-${s.id}`}>
                              <XCircle className="h-3.5 w-3.5" /> Nonaktifkan
                            </button>
                          </div>
                        )}
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
