import { LayoutDashboard, Building2, Briefcase, FilePlus2, Users, Settings, Crown } from "lucide-react";

export const COMPANY_MENU = [
  { to: "/company/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/company/profile", label: "Profil Perusahaan", icon: Building2 },
  { to: "/company/jobs", label: "Lowongan Saya", icon: Briefcase },
  { to: "/company/jobs/new", label: "Tambah Lowongan", icon: FilePlus2 },
  { to: "/company/applicants", label: "Pelamar", icon: Users },
  { to: "/company/membership", label: "Membership", icon: Crown },
  { to: "/company/profile", label: "Pengaturan", icon: Settings },
];
