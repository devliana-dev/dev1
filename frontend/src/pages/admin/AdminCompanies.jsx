import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Building2, Trash2, Crown } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { COMPANY_STATUS, COMPANY_PLAN } from "../../lib/constants";
import { formatDate, logoUrl } from "../../lib/format";

const TABS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Terverifikasi" },
  { value: "rejected", label: "Ditolak" },
  { value: "blocked", label: "Diblokir" },
];

const PLAN_TABS = [
  { value: "", label: "Semua Paket" },
  { value: "launch_free", label: "Launch Free" },
  { value: "free", label: "Free" },
  { value: "member", label: "Member" },
  { value: "expired", label: "Expired" },
];

export default function AdminCompanies() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("");
  const [plan, setPlan] = useState(searchParams.get("plan") || "");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    const params = {};
    if (tab) params.status = tab;
    if (plan) params.plan = plan;
    api.get("/admin/companies", { params })
      .then((r) => setCompanies(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, plan]);

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

  const membershipAction = async (company, action) => {
    const labels = { activate: "Mengaktifkan", extend: "Memperpanjang", deactivate: "Menonaktifkan" };
    if (!window.confirm(`${labels[action]} membership untuk "${company.name}"?`)) return;
    try {
      await api.post(`/admin/companies/${company.id}/membership`, { action });
      toast.success(`Membership ${company.name} diperbarui`);
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
        <div className="flex flex-wrap gap-2 mb-2.5" data-testid="company-tabs">
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
        <div className="flex flex-wrap gap-2 mb-5" data-testid="plan-tabs">
          {PLAN_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setPlan(t.value)}
              className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition-colors ${
                plan === t.value ? "bg-sky-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
              data-testid={`plan-tab-${t.value || "all"}`}
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
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img src={logoUrl(c.logo, c.name)} alt="" className="h-12 w-12 rounded-lg object-cover border border-slate-100" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-semibold text-slate-900">{c.name}</h3>
                        <StatusBadge status={c.status} map={COMPANY_STATUS} />
                        <StatusBadge status={c.plan_type || "free"} map={COMPANY_PLAN} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {c.email} · {c.city || "-"} · Daftar {formatDate(c.created_at)} · {c.jobs_count ?? 0} lowongan · {c.applicants_count ?? 0} pelamar
                      </p>
                      {c.plan_type === "member" && c.subscription_end_date && (
                        <p className="text-xs text-emerald-700 mt-0.5" data-testid={`member-expiry-${c.id}`}>
                          Member aktif s/d {formatDate(c.subscription_end_date)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {c.plan_type === "member" ? (
                      <>
                        <button onClick={() => membershipAction(c, "extend")} className="h-9 px-3 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 inline-flex items-center gap-1" data-testid={`extend-member-${c.id}`}>
                          <Crown className="h-3.5 w-3.5" /> Perpanjang
                        </button>
                        <button onClick={() => membershipAction(c, "deactivate")} className="h-9 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200" data-testid={`deactivate-member-${c.id}`}>
                          Nonaktifkan
                        </button>
                      </>
                    ) : (
                      <button onClick={() => membershipAction(c, "activate")} className="h-9 px-3 rounded-lg bg-sky-100 text-sky-700 text-xs font-semibold hover:bg-sky-200 inline-flex items-center gap-1" data-testid={`activate-member-${c.id}`}>
                        <Crown className="h-3.5 w-3.5" /> Aktifkan Member
                      </button>
                    )}
                    {c.status !== "verified" && (
                      <button onClick={() => setStatus(c, "verified")} className="h-9 px-3 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200" data-testid={`verify-company-${c.id}`}>
                        Verifikasi
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
