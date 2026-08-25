import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Briefcase, Menu, X, LogOut, Home } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function DashboardLayout({ menu, title, children }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const notifPath = user?.role === "company" ? "/company/notifications" : user?.role === "admin" ? "/admin/notifications" : "/candidate/notifications";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navItems = (
    <>
      {menu.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`
          }
          data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <item.icon className="h-4.5 w-4.5 h-5 w-5" /> {item.label}
        </NavLink>
      ))}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
        data-testid="sidebar-logout"
      >
        <LogOut className="h-5 w-5" /> Logout
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 bg-white border-r border-slate-200 z-40" data-testid="dashboard-sidebar">
        <div className="p-5 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Briefcase className="h-5 w-5" />
            </span>
            <span className="font-display font-extrabold text-slate-900">
              CirebonKarir<span className="text-sky-600">.com</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">{navItems}</nav>
        <div className="p-4 border-t border-slate-100">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <Home className="h-4 w-4" /> Kembali ke Beranda
          </Link>
        </div>
      </aside>

      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <span className="font-display font-bold text-slate-900">{title}</span>
        <div className="flex items-center gap-2">
          <NotificationBell to={notifPath} />
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300"
            aria-label="Menu dashboard"
            data-testid="dashboard-hamburger-btn"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden bg-white border-b border-slate-200 p-3 space-y-1 sticky top-14 z-30" data-testid="dashboard-mobile-menu">
          {navItems}
        </div>
      )}

      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 page-fade">
        <div className="max-w-6xl mx-auto">
          <div className="hidden lg:flex items-start justify-between gap-4 mb-6">
            <div>
              {title && <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>}
              <p className="text-sm text-slate-500 mt-1">Masuk sebagai {user?.name} ({user?.email})</p>
            </div>
            <NotificationBell to={notifPath} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
