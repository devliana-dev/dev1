import {
  LayoutDashboard, Activity, Users, Crown, Building2, Rocket, Briefcase,
  Send, BarChart3, Wallet, Tag, ScrollText, ShieldCheck, Settings, Bell, Gift,
} from "lucide-react";

export const ADMIN_MENU = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/live-activity", label: "Live Activity", icon: Activity },
  { header: "PELAMAR" },
  { to: "/admin/candidates", label: "Semua Pelamar", icon: Users },
  { to: "/admin/career-pro", label: "Career Pro", icon: Crown },
  { header: "PERUSAHAAN" },
  { to: "/admin/companies", label: "Semua Perusahaan", icon: Building2 },
  { to: "/admin/launch-program", label: "Launch Program", icon: Rocket },
  { header: "LOWONGAN & LAMARAN" },
  { to: "/admin/jobs", label: "Semua Lowongan", icon: Briefcase },
  { to: "/admin/applications", label: "Lamaran", icon: Send },
  { header: "ANALITIK" },
  { to: "/admin/analytics", label: "Analytics & Insight", icon: BarChart3 },
  { header: "MONETISASI" },
  { to: "/admin/monetisasi", label: "Monetization", icon: Wallet },
  { to: "/admin/referrals", label: "Referral", icon: Gift },
  { header: "SISTEM" },
  { to: "/admin/categories", label: "Kategori", icon: Tag },
  { to: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { to: "/admin/staff", label: "Tim Admin", icon: ShieldCheck, ownerOnly: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, ownerOnly: true },
  { to: "/admin/notifications", label: "Notifikasi", icon: Bell },
];
