import { LayoutDashboard, Send, User, FileText, Crown, Heart, BellRing, Bell, Gift, Settings, HelpCircle } from "lucide-react";

export const CANDIDATE_MENU = [
  { header: "UTAMA" },
  { to: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/candidate/applications", label: "Lamaran Saya", icon: Send },
  { to: "/candidate/saved", label: "Lowongan Tersimpan", icon: Heart },
  { to: "/candidate/job-alerts", label: "Job Alert", icon: BellRing },
  { header: "KARIER" },
  { to: "/candidate/profile", label: "Profil Karier", icon: User },
  { to: "/candidate/cv", label: "CV Saya", icon: FileText },
  { to: "/candidate/cv-professional", label: "Career Pro", icon: Crown, badge: "Baru" },
  { to: "/candidate/referral", label: "Referral & Komisi", icon: Gift },
  { header: "LAINNYA" },
  { to: "/candidate/notifications", label: "Notifikasi", icon: Bell },
  { to: "/candidate/settings", label: "Pengaturan Akun", icon: Settings },
  { to: "/candidate/help", label: "Bantuan & Kontak", icon: HelpCircle },
];
