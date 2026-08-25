import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Loader2, CheckCheck } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import { timeAgo } from "../../lib/format";

const TYPE_CLS = {
  invite: "bg-violet-100 text-violet-700",
  interview: "bg-blue-100 text-blue-700",
  application_status: "bg-sky-100 text-sky-700",
  new_applicant: "bg-emerald-100 text-emerald-700",
  shortlist: "bg-amber-100 text-amber-700",
  job_alert: "bg-cyan-100 text-cyan-700",
  job_approved: "bg-emerald-100 text-emerald-700",
  launch_reminder: "bg-orange-100 text-orange-700",
  launch_ended: "bg-red-100 text-red-700",
  subscription_reminder: "bg-amber-100 text-amber-700",
  membership_active: "bg-emerald-100 text-emerald-700",
};

export default function NotificationsPage({ menu }) {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/notifications")
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const open = async (n) => {
    if (!n.is_read) {
      api.post(`/notifications/${n.id}/read`).catch(() => {});
      setData((prev) => ({
        unread: Math.max(0, prev.unread - 1),
        items: prev.items.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
      }));
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await api.post("/notifications/read-all").catch(() => {});
    setData((prev) => ({ unread: 0, items: prev.items.map((x) => ({ ...x, is_read: true })) }));
  };

  return (
    <DashboardLayout menu={menu} title="Notifikasi">
      <div data-testid="notifications-page">
        {data.unread > 0 && (
          <div className="mb-4 flex justify-end">
            <button onClick={markAll} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-white" data-testid="mark-all-read-btn">
              <CheckCheck className="h-4 w-4" /> Tandai semua dibaca
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : data.items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-notifications">
            <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada notifikasi</h3>
            <p className="text-sm text-slate-500 mt-1">Aktivitas terbaru akan muncul di sini.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100" data-testid="notifications-list">
            {data.items.map((n) => (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={`w-full flex items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${n.is_read ? "" : "bg-sky-50/50"}`}
                data-testid={`notification-${n.id}`}
              >
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${TYPE_CLS[n.type] || "bg-slate-100 text-slate-600"}`}>
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.is_read ? "font-medium text-slate-700" : "font-semibold text-slate-900"}`}>{n.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-sky-600 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
