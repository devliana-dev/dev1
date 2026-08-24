import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, MapPin, Briefcase } from "lucide-react";
import api from "../lib/api";
import { logoUrl } from "../lib/format";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/companies")
      .then((r) => setCompanies(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-fade">
      <div className="bg-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Perusahaan</h1>
          <p className="text-slate-300 text-sm mt-1">Perusahaan dan UMKM terverifikasi yang membuka lowongan</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500" data-testid="no-companies">
            Belum ada perusahaan terverifikasi.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="companies-grid">
            {companies.map((c) => (
              <Link
                key={c.id}
                to={`/companies/${c.slug}`}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow]"
                data-testid={`company-card-${c.id}`}
              >
                <div className="flex items-center gap-4">
                  <img src={logoUrl(c.logo, c.name)} alt={c.name} className="h-14 w-14 rounded-xl object-cover border border-slate-100" />
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                      {c.name} <BadgeCheck className="h-4 w-4 text-sky-600 shrink-0" />
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" /> {c.city || "Cirebon"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-500 line-clamp-2">{c.description}</p>
                <p className="mt-3 text-sm font-medium text-sky-700 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" /> {c.active_jobs} lowongan aktif
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
