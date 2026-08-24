import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  MapPin, Wallet, Clock, BadgeCheck, ArrowLeft, Share2, MessageCircle,
  GraduationCap, Briefcase, CalendarDays, Users, CheckCircle2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatSalary, timeAgo, logoUrl, waLink, splitLines, formatDate } from "../lib/format";

function ListSection({ title, text, testId }) {
  const items = splitLines(text);
  if (items.length === 0) return null;
  return (
    <div className="mt-8" data-testid={testId}>
      <h2 className="font-display text-lg font-semibold text-slate-800 mb-3">{title}</h2>
      {items.length === 1 ? (
        <p className="text-slate-600 leading-relaxed">{items[0]}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-slate-600 leading-relaxed">
              <CheckCircle2 className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JobDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/jobs/${slug}`)
      .then((r) => setJob(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!job) return;
    document.title = `${job.title} — ${job.company_name} | CirebonKarir.com`;
    const ld = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: job.description,
      datePosted: job.created_at,
      validThrough: job.deadline,
      hiringOrganization: { "@type": "Organization", name: job.company_name },
      jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "ID" } },
      employmentType: job.job_type,
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
      document.title = "CirebonKarir.com — Lowongan Kerja Cirebon Terbaru";
    };
  }, [job]);

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="job-detail-loading">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );

  if (notFound || !job)
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center" data-testid="job-not-found">
        <h1 className="font-display text-2xl font-bold text-slate-900">Lowongan tidak ditemukan</h1>
        <p className="text-slate-500 mt-2">Lowongan mungkin sudah ditutup atau dihapus.</p>
        <Link to="/jobs" className="inline-flex items-center h-11 px-6 mt-6 rounded-lg bg-slate-900 text-white text-sm font-semibold" data-testid="back-to-jobs-btn">
          Lihat Lowongan Lain
        </Link>
      </div>
    );

  const closed = job.status !== "active";

  const handleApply = () => {
    if (!user) {
      navigate("/login", { state: { from: `/jobs/${job.slug}/apply` } });
      return;
    }
    if (user.role !== "candidate") {
      toast.error("Hanya akun pencari kerja yang dapat melamar.");
      return;
    }
    navigate(`/jobs/${job.slug}/apply`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Tautan lowongan disalin");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-fade" data-testid="job-detail-page">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5" data-testid="back-link">
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar lowongan
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <img src={logoUrl(job.company_logo, job.company_name)} alt={job.company_name} className="h-16 w-16 rounded-xl object-cover border border-slate-100" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">{job.title}</h1>
              {closed && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700" data-testid="closed-badge">
                  Lowongan Ditutup
                </span>
              )}
            </div>
            <Link to={`/companies/${job.company_slug}`} className="mt-1 inline-flex items-center gap-1 text-slate-600 hover:text-sky-700 font-medium" data-testid="company-link">
              {job.company_name}
              {job.company_verified && <BadgeCheck className="h-4 w-4 text-sky-600" />}
            </Link>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {job.location}</span>
              <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-slate-400" /> {formatSalary(job.salary_min, job.salary_max)}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{job.job_type}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" /> Diposting {timeAgo(job.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-slate-800">Deskripsi Pekerjaan</h2>
          <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-line" data-testid="job-description">{job.description}</p>
          <ListSection title="Persyaratan" text={job.requirements} testId="job-requirements" />
          <ListSection title="Tanggung Jawab" text={job.responsibilities} testId="job-responsibilities" />
          <ListSection title="Benefit" text={job.benefits} testId="job-benefits" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 lg:sticky lg:top-24" data-testid="job-info-card">
          <h2 className="font-display font-semibold text-slate-900 mb-4">Informasi Lowongan</h2>
          <dl className="space-y-3 text-sm">
            {[
              { icon: GraduationCap, label: "Pendidikan", value: job.education },
              { icon: Briefcase, label: "Pengalaman", value: job.experience || "-" },
              { icon: Users, label: "Usia", value: job.age_requirement || "-" },
              { icon: MapPin, label: "Lokasi", value: job.location },
              { icon: Clock, label: "Tipe", value: job.job_type },
              { icon: Wallet, label: "Gaji", value: formatSalary(job.salary_min, job.salary_max) },
              { icon: CalendarDays, label: "Deadline", value: formatDate(job.deadline) },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3">
                <row.icon className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <dt className="text-slate-400 text-xs">{row.label}</dt>
                  <dd className="text-slate-800 font-medium">{row.value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={handleApply}
              disabled={closed}
              className="w-full h-12 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="apply-job-button"
            >
              {closed ? "Lowongan Ditutup" : "Lamar Sekarang"}
            </button>
            {job.whatsapp && (
              <a
                href={waLink(job.whatsapp, job.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-2"
                data-testid="whatsapp-button"
              >
                <MessageCircle className="h-5 w-5" /> Hubungi via WhatsApp
              </a>
            )}
            <button
              onClick={handleShare}
              className="w-full h-12 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2"
              data-testid="share-job-button"
            >
              <Share2 className="h-4 w-4" /> Bagikan Lowongan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
