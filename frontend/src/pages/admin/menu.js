import { LayoutDashboard, Briefcase, Building2, Users, Send, Tag, Crown, Rocket, Bell } from "lucide-react";

export const ADMIN_MENU = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/launch-program", label: "Launch Program", icon: Rocket },
  { to: "/admin/jobs", label: "Lowongan", icon: Briefcase },
  { to: "/admin/companies", label: "Perusahaan", icon: Building2 },
  { to: "/admin/candidates", label: "Pencari Kerja", icon: Users },
  { to: "/admin/applications", label: "Lamaran", icon: Send },
  { to: "/admin/categories", label: "Kategori", icon: Tag },
  { to: "/admin/monetisasi", label: "Membership & Monetisasi", icon: Crown },
  { to: "/admin/notifications", label: "Notifikasi", icon: Bell },
];
