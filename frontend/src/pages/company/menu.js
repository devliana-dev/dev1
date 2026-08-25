import { LayoutDashboard, Building2, Briefcase, FilePlus2, Users, Crown, UserSearch, Star, CalendarCheck, BarChart3, Bell, Gift } from "lucide-react";

export const COMPANY_MENU = [
  { to: "/company/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/company/jobs", label: "Lowongan Saya", icon: Briefcase },
  { to: "/company/jobs/new", label: "Tambah Lowongan", icon: FilePlus2 },
  { to: "/company/applicants", label: "Pelamar", icon: Users },
  { to: "/company/candidates", label: "Cari Kandidat", icon: UserSearch },
  { to: "/company/shortlists", label: "Kandidat Shortlist", icon: Star },
  { to: "/company/interviews", label: "Interview", icon: CalendarCheck },
  { to: "/company/stats", label: "Statistik", icon: BarChart3 },
  { to: "/company/membership", label: "Membership", icon: Crown },
  { to: "/company/referral", label: "Referral", icon: Gift },
  { to: "/company/profile", label: "Profil Perusahaan", icon: Building2 },
  { to: "/company/notifications", label: "Notifikasi", icon: Bell },
];
