import { LayoutDashboard, Send, User, FileText, Crown } from "lucide-react";

export const CANDIDATE_MENU = [
  { to: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/candidate/applications", label: "Lamaran Saya", icon: Send },
  { to: "/candidate/profile", label: "Profil Saya", icon: User },
  { to: "/candidate/cv", label: "CV Saya", icon: FileText },
  { to: "/candidate/cv-professional", label: "CV Profesional", icon: Crown },
];
