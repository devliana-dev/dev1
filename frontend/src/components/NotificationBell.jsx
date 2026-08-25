import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import api from "../lib/api";

export default function NotificationBell({ to }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchCount = () =>
      api.get("/notifications/unread-count")
        .then((r) => { if (mounted) setUnread(r.data.unread); })
        .catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 60000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  return (
    <Link
      to={to}
      aria-label="Notifikasi"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
      data-testid="notification-bell"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold inline-flex items-center justify-center"
          data-testid="notification-unread-badge"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
