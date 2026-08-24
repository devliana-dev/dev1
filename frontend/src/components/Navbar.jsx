import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Briefcase, Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { to: "/", label: "Beranda" },
  { to: "/jobs", label: "Cari Lowongan" },
  { to: "/companies", label: "Perusahaan" },
  { to: "/untuk-perusahaan", label: "Untuk Perusahaan" },
  { to: "/blog", label: "Blog" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const dashboardPath =
    user?.role === "admin" ? "/admin" : user?.role === "company" ? "/company/dashboard" : "/candidate/dashboard";

  const postJobPath = user?.role === "company" ? "/company/jobs/new" : "/register-company";

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" data-testid="navbar-logo">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Briefcase className="h-5 w-5" />
            </span>
            <span className="font-display font-extrabold text-lg text-slate-900">
              CirebonKarir<span className="text-sky-600">.com</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" data-testid="navbar-menu">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "text-sky-700 bg-sky-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`
                }
                data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  data-testid="nav-dashboard-btn"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  data-testid="nav-logout-btn"
                >
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center h-10 px-4 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                data-testid="nav-login-btn"
              >
                Login
              </Link>
            )}
            <Link
              to={postJobPath}
              className="inline-flex items-center h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              data-testid="nav-post-job-btn"
            >
              Pasang Lowongan
            </Link>
          </div>

          <button
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            data-testid="nav-hamburger-btn"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1" data-testid="navbar-mobile-menu">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? "text-sky-700 bg-sky-50" : "text-slate-600"}`
              }
              data-testid={`nav-mobile-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {l.label}
            </NavLink>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 h-11 rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
                  data-testid="nav-mobile-dashboard-btn"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-1.5 h-11 rounded-lg text-sm font-medium text-red-600 border border-red-200"
                  data-testid="nav-mobile-logout-btn"
                >
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center h-11 rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
                data-testid="nav-mobile-login-btn"
              >
                Login
              </Link>
            )}
            <Link
              to={postJobPath}
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center h-11 rounded-lg bg-slate-900 text-white text-sm font-semibold"
              data-testid="nav-mobile-post-job-btn"
            >
              Pasang Lowongan
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
