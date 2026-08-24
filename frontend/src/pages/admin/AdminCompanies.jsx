import { useEffect, useState, useCallback } from "react";
import { Loader2, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { COMPANY_STATUS } from "../../lib/constants";
import { formatDate, logoUrl } from "../../lib/format";

const TABS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Terverifikasi" },
  { value: "rejected", label: "Ditolak" },
  { value: "blocked", label: "Diblokir" },
];

export default function AdminCompanies() {
  const [tab, setTab] = useState("");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    api.get("/admin/companies", { params: tab ? { status: tab } : {} })
      .then((r) => setCompanies(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const setStatus = async (company, status) => {
    try {
      await api.post(`/admin/companies/${company.id}/status`, { status });
      toast.success(`Status ${company.name} diperbarui`);
      fetchCompanies();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const remove = async (company) => {
    if (!window.confirm(`Hapus perusahaan "${company.name}" beserta lowongan dan akunnya?`)) return;
    try {
      await api.delete(`/admin/companies/${company.id}`);
      toast.success("Perusahaan dihapus");
      fetchCompanies();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Kelola Perusahaan">
      <div data-testid="admin-companies-page">
        <div className="flex flex-wrap gap-2 mb-5" data-testid="company-tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.value ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
              data-testid={`company-tab-${t.label.toLowerCase()}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-admin-companies">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Tidak ada perusahaan pada kategori ini.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="admin-companies-list">
            {companies.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`admin-company-row-${c.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img src={logoUrl(c.logo, c.name)} alt="" className="h-12 w-12 rounded-lg object-cover border border-slate-100" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-semibold text-slate-900">{c.name}</h3>
                        <StatusBadge status={c.status} map={COMPANY_STATUS} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {c.email} · {c.phone} · {c.city || "-"} · Daftar {formatDate(c.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {c.status !== "verified" && (
                      <button onClick={() => setStatus(c, "verified")} className="h-9 px-3 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200" data-testid={`verify-company-${c.id}`}>
                        Verifikasi
                      </button>
                    )}
                    {c.status !== "rejected" && (
                      <button onClick={() => setStatus(c, "rejected")} className="h-9 px-3 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200" data-testid={`reject-company-${c.id}`}>
                        Tolak
                      </button>
                    )}
                    {c.status !== "blocked" ? (
                      <button onClick={() => setStatus(c, "blocked")} className="h-9 px-3 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200" data-testid={`block-company-${c.id}`}>
                        Blokir
                      </button>
                    ) : (
                      <button onClick={() => setStatus(c, "pending")} className="h-9 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200" data-testid={`unblock-company-${c.id}`}>
                        Buka Blokir
                      </button>
                    )}
                    <button onClick={() => remove(c)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200" data-testid={`delete-company-${c.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
