import { Link } from "react-router-dom";
import { MapPin, Wallet, Clock, BadgeCheck } from "lucide-react";
import { formatSalary, timeAgo, isNewJob, logoUrl } from "../lib/format";

export default function JobCard({ job }) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 flex flex-col"
      data-testid={`job-card-${job.id}`}
    >
      <div className="flex items-start gap-3">
        <img
          src={logoUrl(job.company_logo, job.company_name)}
          alt={job.company_name}
          className="h-12 w-12 rounded-lg object-cover border border-slate-100 bg-white"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-semibold text-slate-900 leading-snug">{job.title}</h3>
            {isNewJob(job.created_at) && (
              <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800" data-testid={`job-badge-new-${job.id}`}>
                Baru
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5 truncate">
            {job.company_name}
            {job.company_verified && <BadgeCheck className="h-4 w-4 text-sky-600 shrink-0" />}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-slate-600">
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {job.location}</p>
        <p className="flex items-center gap-2"><Wallet className="h-4 w-4 text-slate-400" /> {formatSalary(job.salary_min, job.salary_max)}</p>
        <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> Diposting {timeAgo(job.created_at)}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{job.job_type}</span>
        <Link
          to={`/jobs/${job.slug}`}
          className="inline-flex items-center h-9 px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
          data-testid={`job-detail-btn-${job.id}`}
        >
          Lihat Detail
        </Link>
      </div>
    </div>
  );
}
