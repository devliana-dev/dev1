import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, ScrollText } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import { ADMIN_MENU } from "./menu";

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/admin/audit-logs", { params: { page, limit: 20 } })
      .then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Audit Log">
      <div data-testid="audit-log-page">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : data.items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-audit-logs">
            <ScrollText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Belum ada aktivitas admin tercatat.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="audit-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Waktu</th>
                    <th className="px-5 py-3 font-medium">Admin</th>
                    <th className="px-5 py-3 font-medium">Aksi</th>
                    <th className="px-5 py-3 font-medium">Target</th>
                    <th className="px-5 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((l) => (
                    <tr key={l.id} data-testid={`audit-row-${l.id}`}>
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                      <td className="px-5 py-3 text-slate-700">{l.actor_email || "-"}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{l.action}</td>
                      <td className="px-5 py-3 text-slate-500">{l.target_type}#{String(l.target_id).slice(0, 8)}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs max-w-64 truncate">
                        {l.metadata && Object.keys(l.metadata).length > 0
                          ? Object.entries(l.metadata).map(([k, v]) => `${k}: ${v}`).join(" · ")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {data.pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40" data-testid="audit-prev">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-500">Halaman {data.page} / {data.pages}</span>
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40" data-testid="audit-next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
