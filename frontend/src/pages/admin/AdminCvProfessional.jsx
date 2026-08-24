import { useCallback, useEffect, useState } from "react";
import { Loader2, Crown, ChevronDown, FileText, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { CV_SUB_STATUS } from "../../lib/constants";
import { formatDate, formatRupiah, fileUrl } from "../../lib/format";

export default function AdminCvProfessional() {
  const [tab, setTab] = useState("pengajuan");
  const [stats, setStats] = useState(null);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchStats = useCallback(() => {
    api.get("/admin/cv-professional/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const fetchSubs = useCallback(() => {
    setLoading(true);
    api.get("/admin/cv-professional/subscriptions", { params: { status: statusFilter, q, page, limit: 10 } })
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter, q, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  useEffect(() => {
    if (tab === "pengaturan" && !settings) {
      api.get("/admin/cv-professional/settings").then((r) => setSettings(r.data)).catch(() => toast.error("Gagal memuat pengaturan"));
    }
  }, [tab, settings]);

  const toggleDetail = async (sub) => {
    if (expanded === sub.id) {
      setExpanded(null);
      return;
    }
    setExpanded(sub.id);
    setDetail(null);
    try {
      const { data: d } = await api.get(`/admin/cv-professional/subscriptions/${sub.id}`);
      setDetail(d);
    } catch {
      toast.error("Gagal memuat detail");
    }
  };

  const action = async (sub, act) => {
    try {
      if (act === "reject") {
        const reason = window.prompt("Alasan penolakan (akan terlihat oleh pengguna):");
        if (reason === null) return;
        await api.post(`/admin/cv-professional/subscriptions/${sub.id}/reject`, { reason });
        toast.success("Pengajuan ditolak");
      } else if (act === "cancel") {
        if (!window.confirm("Nonaktifkan akses premium pengguna ini?")) return;
        await api.post(`/admin/cv-professional/subscriptions/${sub.id}/cancel`);
        toast.success("Subscription dinonaktifkan");
      } else {
        await api.post(`/admin/cv-professional/subscriptions/${sub.id}/${act}`);
        toast.success(act === "approve" ? "CV Profesional diaktifkan selama 30 hari" : "Subscription diperpanjang 30 hari");
      }
      setExpanded(null);
      fetchSubs();
      fetchStats();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const { data: saved } = await api.put("/admin/cv-professional/settings", settings);
      setSettings(saved);
      toast.success("Pengaturan berhasil disimpan");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const statCards = [
    { label: "Total Pengajuan", value: stats?.total },
    { label: "Menunggu Verifikasi", value: stats?.pending },
    { label: "Aktif", value: stats?.active },
    { label: "Expired", value: stats?.expired },
    { label: "Ditolak", value: stats?.rejected },
    { label: "Total Pendapatan", value: stats ? formatRupiah(stats.revenue) : "-" },
  ];

  const inputCls = "w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <DashboardLayout menu={ADMIN_MENU} title="CV Profesional">
      <div data-testid="admin-cv-page">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statCards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4" data-testid={`cv-stat-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <p className="font-display text-xl font-bold text-slate-900">{c.value ?? "-"}</p>
              <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-5">
          {[["pengajuan", "Pengajuan"], ["pengaturan", "Pengaturan"]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} className={`h-10 px-5 rounded-lg text-sm font-semibold transition-colors ${tab === val ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`} data-testid={`cv-tab-${val}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "pengajuan" && (
          <>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari nama/email pengguna" className={`${inputCls} sm:max-w-xs`} data-testid="cv-search-input" />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${inputCls} sm:max-w-[200px] bg-white`} data-testid="cv-status-filter">
                <option value="">Semua Status</option>
                {Object.entries(CV_SUB_STATUS).map(([val, conf]) => <option key={val} value={val}>{conf.label}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
            ) : data.items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-cv-subs">
                <Crown className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Belum ada pengajuan CV Profesional.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3" data-testid="cv-subs-list">
                  {data.items.map((sub) => (
                    <div key={sub.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid={`cv-sub-row-${sub.id}`}>
                      <button onClick={() => toggleDetail(sub)} className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 text-left" data-testid={`cv-sub-toggle-${sub.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{sub.user_name} <span className="font-normal text-slate-400 text-xs">{sub.user_email}</span></p>
                          <p className="text-xs text-slate-500 mt-0.5">{sub.package_name} · {formatRupiah(sub.price)} · Diajukan {formatDate(sub.requested_at)}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {sub.expires_at && <span className="text-xs text-slate-500">s.d. {formatDate(sub.expires_at)}</span>}
                          <StatusBadge status={sub.status} map={CV_SUB_STATUS} />
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded === sub.id ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {expanded === sub.id && (
                        <div className="border-t border-slate-100 p-5 bg-slate-50/50" data-testid={`cv-sub-detail-${sub.id}`}>
                          {!detail ? (
                            <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                          ) : (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm">
                                <p className="text-slate-600"><span className="text-slate-400">ID User:</span> {detail.subscription.user_id.slice(0, 8)}…</p>
                                <p className="text-slate-600"><span className="text-slate-400">Metode:</span> {detail.subscription.payment_method}</p>
                                <p className="text-slate-600"><span className="text-slate-400">Pengajuan:</span> {formatDate(detail.subscription.requested_at)}</p>
                                <p className="text-slate-600"><span className="text-slate-400">Aktivasi:</span> {detail.subscription.activated_at ? formatDate(detail.subscription.activated_at) : "-"}</p>
                                <p className="text-slate-600"><span className="text-slate-400">Expired:</span> {detail.subscription.expires_at ? formatDate(detail.subscription.expires_at) : "-"}</p>
                                <p className="text-slate-600"><span className="text-slate-400">Diaktifkan oleh:</span> {detail.subscription.activated_by || "-"}</p>
                              </div>
                              {detail.subscription.rejection_reason && (
                                <p className="mt-2 text-sm text-red-600">Alasan penolakan: {detail.subscription.rejection_reason}</p>
                              )}
                              <div className="mt-4 flex flex-wrap items-center gap-2">
                                {detail.subscription.payment_proof ? (
                                  <a href={fileUrl(detail.subscription.payment_proof)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white" data-testid={`cv-proof-${sub.id}`}>
                                    <FileText className="h-3.5 w-3.5" /> Lihat Bukti Pembayaran
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400">Tidak ada bukti pembayaran</span>
                                )}
                                {sub.status === "pending" && (
                                  <>
                                    <button onClick={() => action(sub, "approve")} className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700" data-testid={`cv-approve-${sub.id}`}>Aktifkan</button>
                                    <button onClick={() => action(sub, "reject")} className="h-9 px-4 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200" data-testid={`cv-reject-${sub.id}`}>Tolak</button>
                                  </>
                                )}
                                {(sub.status === "active" || sub.status === "expired") && (
                                  <button onClick={() => action(sub, "extend")} className="h-9 px-4 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700" data-testid={`cv-extend-${sub.id}`}>Perpanjang 30 Hari</button>
                                )}
                                {sub.status === "active" && (
                                  <button onClick={() => action(sub, "cancel")} className="h-9 px-4 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300" data-testid={`cv-cancel-${sub.id}`}>Nonaktifkan</button>
                                )}
                              </div>
                              {detail.logs.length > 0 && (
                                <div className="mt-4">
                                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Riwayat Aktivasi</p>
                                  <ul className="space-y-1 text-xs text-slate-500">
                                    {detail.logs.map((log) => (
                                      <li key={log.id}>{formatDate(log.created_at)} — {log.action} ({log.old_status || "-"} → {log.new_status}) oleh {log.activated_by}{log.notes ? ` · ${log.notes}` : ""}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {data.pages > 1 && (
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40" data-testid="cv-prev-page"><ChevronLeft className="h-4 w-4" /></button>
                    <span className="text-sm text-slate-600">Halaman {page} dari {data.pages}</span>
                    <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40" data-testid="cv-next-page"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "pengaturan" && (
          !settings ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
          ) : (
            <form onSubmit={saveSettings} className="max-w-2xl bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5" data-testid="cv-settings-form">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Paket</label>
                  <input required value={settings.package_name} onChange={(e) => setSettings({ ...settings, package_name: e.target.value })} className={inputCls} data-testid="settings-package-name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Harga (Rp)</label>
                  <input required type="number" min="1" value={settings.price} onChange={(e) => setSettings({ ...settings, price: Number(e.target.value) })} className={inputCls} data-testid="settings-price" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Durasi (hari)</label>
                  <input required type="number" min="1" value={settings.duration_days} onChange={(e) => setSettings({ ...settings, duration_days: Number(e.target.value) })} className={inputCls} data-testid="settings-duration" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Metode Pembayaran (Bank / E-wallet)</label>
                  <button type="button" onClick={() => setSettings({ ...settings, payment_methods: [...settings.payment_methods, { type: "bank", name: "", account_number: "", account_name: "" }] })} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100" data-testid="add-payment-method">
                    <Plus className="h-3.5 w-3.5" /> Tambah
                  </button>
                </div>
                {settings.payment_methods.length === 0 && (
                  <p className="text-xs text-slate-400 rounded-lg border border-dashed border-slate-300 px-4 py-3">Belum ada metode pembayaran. Tambahkan agar pengguna tahu ke mana harus membayar.</p>
                )}
                <div className="space-y-3">
                  {settings.payment_methods.map((m, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 relative" data-testid={`payment-method-row-${i}`}>
                      <select value={m.type} onChange={(e) => { const arr = [...settings.payment_methods]; arr[i] = { ...m, type: e.target.value }; setSettings({ ...settings, payment_methods: arr }); }} className={`${inputCls} bg-white`}>
                        <option value="bank">Bank</option>
                        <option value="ewallet">E-Wallet</option>
                      </select>
                      <input value={m.name} placeholder="Nama (mis. BCA / DANA)" onChange={(e) => { const arr = [...settings.payment_methods]; arr[i] = { ...m, name: e.target.value }; setSettings({ ...settings, payment_methods: arr }); }} className={inputCls} />
                      <input value={m.account_number} placeholder="No. rekening / akun" onChange={(e) => { const arr = [...settings.payment_methods]; arr[i] = { ...m, account_number: e.target.value }; setSettings({ ...settings, payment_methods: arr }); }} className={inputCls} />
                      <div className="flex gap-2">
                        <input value={m.account_name} placeholder="Nama pemilik" onChange={(e) => { const arr = [...settings.payment_methods]; arr[i] = { ...m, account_name: e.target.value }; setSettings({ ...settings, payment_methods: arr }); }} className={inputCls} />
                        <button type="button" onClick={() => setSettings({ ...settings, payment_methods: settings.payment_methods.filter((_, x) => x !== i) })} className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" data-testid={`remove-payment-method-${i}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={savingSettings} className="h-11 px-8 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 inline-flex items-center gap-2" data-testid="settings-save-btn">
                {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Pengaturan
              </button>
            </form>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
