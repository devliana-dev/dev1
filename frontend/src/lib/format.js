import { API } from "./api";

export function formatRupiah(n) {
  if (n === null || n === undefined || n === "" || Number(n) === 0) return "";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

export function formatSalary(min, max) {
  if (!min && !max) return "Gaji tidak ditampilkan";
  if (min && max) return `${formatRupiah(min)} - ${formatRupiah(max)}`;
  return formatRupiah(min || max);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return "-";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} minggu lalu`;
  return formatDate(iso);
}

export function isNewJob(iso) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 3 * 24 * 3600 * 1000;
}

export function logoUrl(logo, name) {
  if (!logo)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent((name || "C").slice(0, 2))}&background=0F172A&color=fff&size=128&bold=true`;
  if (logo.startsWith("http")) return logo;
  return `${API}/files/${logo}`;
}

export function waLink(phone, jobTitle) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  const text = encodeURIComponent(`Halo, saya melihat lowongan ${jobTitle} di CirebonKarir.com dan tertarik untuk melamar.`);
  return `https://wa.me/${digits}?text=${text}`;
}

export function waApplicantLink(phone, applicantName, jobTitle) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  const text = encodeURIComponent(`Halo ${applicantName}, kami menghubungi Anda terkait lamaran posisi ${jobTitle} di CirebonKarir.com.`);
  return `https://wa.me/${digits}?text=${text}`;
}

export function fileUrl(path) {
  const token = localStorage.getItem("ck_token");
  return `${API}/files/${path}${token ? `?auth=${token}` : ""}`;
}

export function splitLines(text) {
  return (text || "").split("\n").map((s) => s.trim()).filter(Boolean);
}
