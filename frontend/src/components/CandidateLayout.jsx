import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Briefcase, Search, Menu, X, LogOut, User, Settings, ChevronDown, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import api from "../lib/api";
import { imageUrl } from "../lib/format";

let layoutCache = { completion: 0, photo: "" };

export default function CandidateLayout({ menu, children }) {
  const [open, setOpen] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [completion, setCompletion] = useState(layoutCache.completion);
  const [photo, setPhoto] = useState(layoutCache.photo);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const ddRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.get("/candidate/career-profile")
      .then((r) => {
        const c = r.data.completion;
        const comp = typeof c === "number" ? Math.round(c) : Math.round(c?.percent ?? 0);
        const ph = r.data.profile?.photo_path || "";
        layoutCache = { completion: comp, photo: ph };
        setCompletion(comp);
        setPhoto(ph);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const onClick = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const search = (e) => {
    e.preventDefault();
    navigate(keyword ? `/jobs?q=${encodeURIComponent(keyword)}` : "/jobs");
  };

  const avatar = (size = "h-9 w-9", text = "text-sm") =>
    photo ? (
      <img src={imageUrl(photo)} alt={user?.name || "Avatar"} className={`${size} rounded-full object-cover border border-slate-200 shrink-0`} />
    ) : (
      <span className={`${size} rounded-full bg-sky-600 text-white inline-flex items-center justify-center font-bold ${text} shrink-0`}>
        {(user?.name || "U").charAt(0).toUpperCase()}
      </span>
    );

  const navItems = (
    <>
      {menu.map((item) =>
        item.header ? (
          <p
            key={item.header}
            className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400"
            data-testid={`sidebar-group-${item.header.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {item.header}
          </p>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
                isActive ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
            data-testid={`sidebar-${item.label.toLowerCase().replace(/&/g, "dan").replace(/\s+/g, "-")}`}
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold">{item.badge}</span>
                )}
              </>
            )}
          </NavLink>
        )
      )}
    </>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4">
        <Link to="/" className="flex items-center gap-2.5" data-testid="sidebar-logo">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Briefcase className="h-5 w-5" />
          </span>
          <span className="font-display font-extrabold text-slate-900">
            CirebonKarir<span className="text-sky-600">.com</span>
          </span>
        </Link>
      </div>
      <div className="px-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-3" data-testid="sidebar-profile-mini">
          {avatar("h-11 w-11", "text-base")}
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-slate-900 truncate">{user?.name}</p>
            <span className="mt-0.5 inline-flex px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold">Pencari Kerja</span>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500" data-testid="sidebar-active-status">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aktif
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">{navItems}</nav>
      <div className="p-4 border-t border-slate-100">
        <div className="rounded-2xl bg-slate-900 p-4 text-white" data-testid="sidebar-cta-card">
          <p className="font-display font-bold text-sm flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-400" /> Tingkatkan Peluangmu!
          </p>
          <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
            Lengkapi profil dan CV kamu agar lebih mudah dilirik perusahaan.
          </p>
          <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-[width] duration-500"
              style={{ width: `${completion}%` }}
              data-testid="sidebar-completion-bar"
            />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-sky-300" data-testid="sidebar-completion-text">{completion}% lengkap</p>
          <Link
            to="/candidate/profile"
            className="mt-3 flex items-center justify-center h-10 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 active:scale-95 transition-[background-color,transform]"
            data-testid="sidebar-complete-profile-btn"
          >
            Lengkapi Sekarang
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 bg-white border-r border-slate-200 z-40" data-testid="dashboard-sidebar">
        {sidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="dashboard-mobile-menu">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
            <div className="flex justify-end p-3 shrink-0">
              <button onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600" aria-label="Tutup menu" data-testid="drawer-close-btn">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto -mt-1">{sidebarContent}</div>
          </aside>
        </div>
      )}

      <div className="lg:ml-72 min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200" data-testid="candidate-topnav">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
              aria-label="Buka menu"
              data-testid="dashboard-hamburger-btn"
            >
              <Menu className="h-5 w-5" />
            </button>
            <form onSubmit={search} className="hidden md:flex items-center gap-2 flex-1 max-w-md h-11 px-4 rounded-full bg-slate-100 border border-transparent focus-within:border-sky-300 focus-within:bg-white transition-colors">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari lowongan pekerjaan..."
                className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
                data-testid="topnav-search-input"
              />
            </form>
            <div className="flex-1 md:hidden" />
            <Link
              to="/jobs"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
              aria-label="Cari lowongan"
              data-testid="topnav-search-mobile-btn"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              to="/jobs"
              className="hidden md:inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 active:scale-95 transition-[background-color,transform]"
              data-testid="topnav-find-jobs-btn"
            >
              <Search className="h-4 w-4" /> Cari Lowongan
            </Link>
            <NotificationBell to="/candidate/notifications" />
            <div className="relative" ref={ddRef}>
              <button
                onClick={() => setDdOpen(!ddOpen)}
                className="flex items-center gap-1 rounded-full p-1 hover:bg-slate-100 transition-colors"
                data-testid="topnav-avatar-btn"
                aria-label="Menu profil"
              >
                {avatar()}
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${ddOpen ? "rotate-180" : ""}`} />
              </button>
              {ddOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 p-1.5 page-fade" data-testid="topnav-avatar-dropdown">
                  <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  {[
                    { to: "/candidate/profile", label: "Profil Saya", icon: User },
                    { to: "/candidate/settings", label: "Pengaturan", icon: Settings },
                  ].map((i) => (
                    <Link
                      key={i.to}
                      to={i.to}
                      onClick={() => setDdOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      data-testid={`dropdown-${i.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <i.icon className="h-4 w-4 text-slate-400" /> {i.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    data-testid="dropdown-logout"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 page-fade">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
