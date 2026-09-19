import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardShell from "./DashboardShell";

export default function DashboardLayout({ menu, title, children }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const visibleMenu = (menu || []).filter((item) => !item.ownerOnly || user?.role === "owner");

  // SATU shell navy per role: sidebar + header tetap, hanya konten tengah berganti.
  if (user?.role === "candidate") {
    return (
      <DashboardShell variant="candidate" title={title || "Dashboard Kandidat"} subtitle="Kelola kariermu dari satu tempat">
        {children}
      </DashboardShell>
    );
  }
  if (user?.role === "company") {
    return (
      <DashboardShell variant="company" title={title || "Dashboard Perusahaan"} subtitle="Kelola rekrutmen tim Anda">
        {children}
      </DashboardShell>
    );
  }
  if (user?.role === "admin" || user?.role === "owner") {
    return (
      <DashboardShell variant="admin" menu={visibleMenu} title={title || "Dashboard Admin"} subtitle="Kelola platform CirebonKarir">
        {children}
      </DashboardShell>
    );
  }

  // Fallback (role tidak dikenal)
  navigate("/");
  return null;
}
