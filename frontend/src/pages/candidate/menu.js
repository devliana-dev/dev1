import { LayoutDashboard, Send, User, FileText, Crown, Heart, BellRing, Bell } from "lucide-react";

export const CANDIDATE_MENU = [
  { to: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/candidate/applications", label: "Lamaran Saya", icon: Send },
  { to: "/candidate/saved", label: "Lowongan Tersimpan", icon: Heart },
  { to: "/candidate/job-alerts", label: "Job Alert", icon: BellRing },
  { to: "/candidate/profile", label: "Profil Karier", icon: User },
  { to: "/candidate/cv", label: "CV Saya", icon: FileText },
  { to: "/candidate/cv-professional", label: "Career Pro", icon: Crown },
  { to: "/candidate/notifications", label: "Notifikasi", icon: Bell },
];
