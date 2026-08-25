import { useCallback, useEffect, useState } from "react";
import { Activity, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { timeAgo } from "../../lib/format";

const TYPE_CLS = {
  user_registered: "bg-emerald-100 text-emerald-700",
  company_registered: "bg-violet-100 text-violet-700",
  job_posted: "bg-sky-100 text-sky-700",
  application: "bg-blue-100 text-blue-700",
  subscription: "bg-amber-100 text-amber-700",
  shortlist: "bg-cyan-100 text-cyan-700",
  interview: "bg-indigo-100 text-indigo-700",
};

export default function AdminLiveActivity() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/admin/analytics/live-activity", { params: { page, limit: 20 } })
      .then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Live Activity">
      <div data-testid="live-activity-page">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : data.items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-activity">
            <Activity className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Belum ada aktivitas.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100" data-testid="activity-feed">
            {data.items.map((e, i) => (
              <div key={i} className="flex items-center gap-3.5 px-5 py-3.5" data-testid={`activity-item-${i}`}>
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${(TYPE_CLS[e.type] || "bg-slate-100").split(" ")[0]}`} />
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${TYPE_CLS[e.type] || "bg-slate-100 text-slate-600"}`}>
                  {e.type.replace(/_/g, " ")}
                </span>
                <p className="text-sm text-slate-700 flex-1 min-w-0 truncate">{e.text}</p>
                <span className="text-xs text-slate-400 shrink-0">{timeAgo(e.created_at)}</span>
              </div>
            ))}
          </div>
        )}
        {data.pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40" data-testid="activity-prev">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-500">Halaman {data.page} / {data.pages}</span>
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40" data-testid="activity-next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
