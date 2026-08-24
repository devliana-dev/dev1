import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, MapPin, Globe, Instagram, Loader2, Building2 } from "lucide-react";
import api from "../lib/api";
import { logoUrl } from "../lib/format";
import JobCard from "../components/JobCard";

export default function CompanyDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/companies/${slug}`)
      .then((r) => setData(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );

  if (notFound || !data)
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center" data-testid="company-not-found">
        <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h1 className="font-display text-2xl font-bold text-slate-900">Perusahaan tidak ditemukan</h1>
        <Link to="/companies" className="inline-flex items-center h-11 px-6 mt-6 rounded-lg bg-slate-900 text-white text-sm font-semibold" data-testid="back-to-companies-btn">
          Lihat Semua Perusahaan
        </Link>
      </div>
    );

  const { company, jobs } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 page-fade" data-testid="company-detail-page">
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <img src={logoUrl(company.logo, company.name)} alt={company.name} className="h-20 w-20 rounded-xl object-cover border border-slate-100" />
          <div className="flex-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
              {company.name} <BadgeCheck className="h-6 w-6 text-sky-600" />
            </h1>
            <span className="inline-flex mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800" data-testid="verified-badge">
              Perusahaan Terverifikasi
            </span>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              {company.city && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {company.city}</span>}
              {company.business_category && <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-slate-400" /> {company.business_category}</span>}
              {company.website && (
                <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sky-700 hover:underline">
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
              {company.instagram && (
                <a href={`https://instagram.com/${company.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sky-700 hover:underline">
                  <Instagram className="h-4 w-4" /> {company.instagram}
                </a>
              )}
            </div>
          </div>
        </div>
        {company.description && <p className="mt-5 text-slate-600 leading-relaxed">{company.description}</p>}
      </div>

      <h2 className="font-display text-xl font-bold text-slate-900 mt-10 mb-5">Lowongan Aktif ({jobs.length})</h2>
      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500" data-testid="no-company-jobs">
          Perusahaan ini belum memiliki lowongan aktif.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
