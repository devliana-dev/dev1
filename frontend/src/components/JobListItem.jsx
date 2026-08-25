import { Link } from "react-router-dom";
import { Building2, MapPin, Clock, BadgeCheck } from "lucide-react";
import { timeAgo, logoUrl } from "../lib/format";

export default function JobListItem({ job }) {
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-[box-shadow,border-color] duration-200 md:flex md:items-center md:gap-6"
      data-testid={`job-item-${job.id}`}
    >
      <div className="flex gap-3.5 flex-1 min-w-0">
        <img
          src={logoUrl(job.company_logo, job.company_name)}
          alt={job.company_name}
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-md border border-slate-100 bg-white object-contain shrink-0"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">Info Lowongan</p>
          <Link to={`/jobs/${job.slug}`} className="block mt-0.5" data-testid={`job-title-${job.id}`}>
            <h3 className="font-display font-bold text-slate-900 leading-snug hover:text-sky-700 transition-colors line-clamp-1">
              {job.title}
            </h3>
          </Link>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{job.company_name}</span>
              {job.company_verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {job.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {timeAgo(job.created_at)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3.5 flex items-center justify-between gap-3 md:mt-0 md:contents">
        {job.employer_type === "umkm" && (
          <span
            className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold whitespace-nowrap"
            data-testid={`job-umkm-badge-${job.id}`}
          >
            🏪 UMKM
          </span>
        )}
        <span
          className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold whitespace-nowrap"
          data-testid={`job-category-${job.id}`}
        >
          {job.category}
        </span>
        <Link
          to={`/jobs/${job.slug}`}
          className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 active:bg-sky-800 transition-colors whitespace-nowrap"
          data-testid={`job-apply-btn-${job.id}`}
        >
          Lamar Sekarang
        </Link>
      </div>
    </div>
  );
}
