import { useCallback, useEffect, useState } from "react";
import { Loader2, Crown, ChevronDown, ChevronLeft, ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { formatDate, formatRupiah, fileUrl } from "../../lib/format";

const PAY_STATUS = {
  pending: { label: "Menunggu Verifikasi", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-slate-100 text-slate-600" },
};

const SUB_STATUS = {
  active: { label: "Aktif", cls: "bg-emerald-100 text-emerald-800" },
  expired: { label: "Expired", cls: "bg-slate-200 text-slate-600" },
  cancelled: { label: "Dinonaktifkan", cls: "bg-slate-100 text-slate-600" },
};

const PRODUCT_LABELS = { cv_professional: "CV Profesional", company_membership: "Member Perusahaan" };

const TABS = [
  ["overview", "Overview"],
  ["pembayaran", "Pembayaran"],
  ["subscription", "Subscription"],
  ["member", "Member Perusahaan"],
  ["produk", "Produk & Harga"],
  ["pengaturan", "Pengaturan Pembayaran"],
  ["audit", "Audit Log"],
];

const inputCls = "w-full h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function AdminMonetization() {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);

  const [payments, setPayments] = useState({ items: [], total: 0, pages: 1 });
  const [pStatus, setPStatus] = useState("");
  const [pProduct, setPProduct] = useState("");
  const [pQ, setPQ] = useState("");
  const [pPage, setPPage] = useState(1);
  const [pLoading, setPLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [payDetail, setPayDetail] = useState(null);

  const [subs, setSubs] = useState({ items: [], total: 0, pages: 1 });
  const [sProduct, setSProduct] = useState("");
  const [sStatus, setSStatus] = useState("");
  const [sPage, setSPage] = useState(1);
  const [sLoading, setSLoading] = useState(false);

  const [products, setProducts] = useState(null);
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchOverview = useCallback(() => {
    api.get("/admin/monetization/overview").then((r) => setOverview(r.data)).catch(() => {});
  }, []);

  const fetchPayments = useCallback(() => {
    setPLoading(true);
    api.get("/admin/monetization/payments", { params: { status: pStatus, product: pProduct, q: pQ, page: pPage, limit: 10 } })
      .then((r) => setPayments(r.data)).catch(() => {}).finally(() => setPLoading(false));
  }, [pStatus, pProduct, pQ, pPage]);

  const fetchSubs = useCallback(() => {
    setSLoading(true);
    api.get("/admin/monetization/subscriptions", { params: { product: sProduct, status: sStatus, page: sPage, limit: 10 } })
      .then((r) => setSubs(r.data)).catch(() => {}).finally(() => setSLoading(false));
  }, [sProduct, sStatus, sPage]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { if (tab === "pembayaran") fetchPayments(); }, [tab, fetchPayments]);
  useEffect(() => { if (tab === "subscription" || tab === "member") fetchSubs(); }, [tab, fetchSubs]);
  useEffect(() => { if (tab === "member" && sProduct !== "company_membership") setSProduct("company_membership"); }, [tab, sProduct]);
  useEffect(() => { if (tab === "produk" && !products) api.get("/admin/monetization/products").then((r) => setProducts(r.data)).catch(() => {}); }, [tab, products]);
  useEffect(() => { if (tab === "pengaturan" && !settings) api.get("/admin/monetization/payment-settings").then((r) => setSettings(r.data)).catch(() => {}); }, [tab, settings]);
  useEffect(() => { if (tab === "audit" && !logs) api.get("/admin/monetization/audit-logs").then((r) => setLogs(r.data)).catch(() => {}); }, [tab, logs]);

  const togglePayment = async (p) => {
    if (expanded === p.id) return setExpanded(null);
    setExpanded(p.id);
    setPayDetail(null);
    try {
      const { data } = await api.get(`/admin/monetization/payments/${p.id}`);
      setPayDetail(data);
    } catch {
      toast.error("Gagal memuat detail pembayaran");
    }
  };

  const paymentAction = async (p, act) => {
    try {
      if (act === "reject") {
        const reason = window.prompt("Alasan penolakan (akan terlihat oleh pengguna):");
        if (reason === null) return;
        await api.post(`/admin/monetization/payments/${p.id}/reject`, { reason });
        toast.success("Pembayaran ditolak");
      } else {
        await api.post(`/admin/monetization/payments/${p.id}/approve`);
        toast.success("Pembayaran disetujui, subscription diaktifkan");
      }
      setExpanded(null);
      fetchPayments();
      fetchOverview();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const subAction = async (s, act) => {
    try {
      if (act === "cancel" && !window.confirm("Nonaktifkan subscription ini?")) return;
      await api.post(`/admin/monetization/subscriptions/${s.id}/${act}`);
      toast.success(act === "extend" ? "Subscription diperpanjang" : "Subscription dinonaktifkan");
      fetchSubs();
      fetchOverview();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const saveProduct = async (p) => {
    setSaving(true);
    try {
      await api.put(`/admin/monetization/products/${p.id}`, p);
      toast.success(`Produk "${p.name}" disimpan`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/admin/monetization/payment-settings", settings);
      setSettings(data);
      toast.success("Pengaturan pembayaran disimpan");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const overviewCards = [
    { label: "Total Pendapatan", value: overview ? formatRupiah(overview.revenue) : "-" },
    { label: "Pembayaran Pending", value: overview?.payments_pending },
    { label: "Pembayaran Approved", value: overview?.payments_approved },
    { label: "Pembayaran Rejected", value: overview?.payments_rejected },
    { label: "CV Profesional Aktif", value: overview?.cv_active },
    { label: "Member Perusahaan Aktif", value: overview?.member_active },
    { label: "Subscription Expired", value: overview?.subs_expired },
    { label: "Total Perusahaan Member", value: overview?.member_companies },
  ];

  const pagination = (data, page, setPage, prefix) => (
    data.pages > 1 && (
      <div className="mt-5 flex items-center justify-center gap-3">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40" data-testid={`${prefix}-prev`}><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm text-slate-600">Halaman {page} dari {data.pages}</span>
        <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40" data-testid={`${prefix}-next`}><ChevronRight className="h-4 w-4" /></button>
      </div>
    )
  );

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Membership & Monetisasi">
      <div data-testid="admin-monetization-page">
        <div className="flex flex-wrap gap-2 mb-6" data-testid="monetization-tabs">
          {TABS.map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${tab === val ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`} data-testid={`mon-tab-${val}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="mon-overview">
            {overviewCards.map((c) => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`mon-stat-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <p className="font-display text-xl font-bold text-slate-900">{c.value ?? "-"}</p>
                <p className="text-xs text-slate-500 mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "pembayaran" && (
          <div data-testid="mon-payments">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input value={pQ} onChange={(e) => { setPQ(e.target.value); setPPage(1); }} placeholder="Cari user/perusahaan" className={`${inputCls} sm:max-w-xs`} data-testid="pay-search" />
              <select value={pProduct} onChange={(e) => { setPProduct(e.target.value); setPPage(1); }} className={`${inputCls} sm:max-w-[200px]`} data-testid="pay-product-filter">
                <option value="">Semua Produk</option>
                <option value="cv_professional">CV Profesional</option>
                <option value="company_membership">Member Perusahaan</option>
              </select>
              <select value={pStatus} onChange={(e) => { setPStatus(e.target.value); setPPage(1); }} className={`${inputCls} sm:max-w-[200px]`} data-testid="pay-status-filter">
                <option value="">Semua Status</option>
                {Object.entries(PAY_STATUS).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            {pLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
            ) : payments.items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-payments">
                <Crown className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Belum ada pembayaran.</p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="payments-list">
                {payments.items.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid={`payment-row-${p.id}`}>
                    <button onClick={() => togglePayment(p)} className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 text-left" data-testid={`payment-toggle-${p.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{p.company_name || p.user_name} <span className="font-normal text-slate-400 text-xs">{p.user_email}</span></p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.product_name} · {formatRupiah(p.amount)} · {formatDate(p.submitted_at)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={p.status} map={PAY_STATUS} />
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded === p.id ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {expanded === p.id && (
                      <div className="border-t border-slate-100 p-5 bg-slate-50/50" data-testid={`payment-detail-${p.id}`}>
                        {!payDetail ? <Loader2 className="h-5 w-5 animate-spin text-sky-600" /> : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm">
                              <p className="text-slate-600"><span className="text-slate-400">Produk:</span> {payDetail.product_name}</p>
                              <p className="text-slate-600"><span className="text-slate-400">Jumlah:</span> {formatRupiah(payDetail.amount)}</p>
                              <p className="text-slate-600"><span className="text-slate-400">Metode:</span> {payDetail.payment_method}</p>
                              <p className="text-slate-600"><span className="text-slate-400">Provider:</span> {payDetail.payment_provider}</p>
                              <p className="text-slate-600"><span className="text-slate-400">Diajukan:</span> {formatDate(payDetail.submitted_at)}</p>
                              <p className="text-slate-600"><span className="text-slate-400">Diverifikasi oleh:</span> {payDetail.verified_by || "-"}</p>
                            </div>
                            {payDetail.rejection_reason && <p className="mt-2 text-sm text-red-600">Alasan penolakan: {payDetail.rejection_reason}</p>}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {payDetail.payment_proof ? (
                                <a href={fileUrl(payDetail.payment_proof)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white" data-testid={`pay-proof-${p.id}`}>
                                  <FileText className="h-3.5 w-3.5" /> Lihat Bukti Pembayaran
                                </a>
                              ) : <span className="text-xs text-slate-400">Tidak ada bukti pembayaran</span>}
                              {p.status === "pending" && (
                                <>
                                  <button onClick={() => paymentAction(p, "approve")} className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700" data-testid={`pay-approve-${p.id}`}>Approve</button>
                                  <button onClick={() => paymentAction(p, "reject")} className="h-9 px-4 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200" data-testid={`pay-reject-${p.id}`}>Reject</button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {pagination(payments, pPage, setPPage, "pay")}
          </div>
        )}

        {(tab === "subscription" || tab === "member") && (
          <div data-testid="mon-subscriptions">
            {tab === "subscription" && (
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <select value={sProduct} onChange={(e) => { setSProduct(e.target.value); setSPage(1); }} className={`${inputCls} sm:max-w-[200px]`} data-testid="sub-product-filter">
                  <option value="">Semua Produk</option>
                  <option value="cv_professional">CV Profesional</option>
                  <option value="company_membership">Member Perusahaan</option>
                </select>
                <select value={sStatus} onChange={(e) => { setSStatus(e.target.value); setSPage(1); }} className={`${inputCls} sm:max-w-[200px]`} data-testid="sub-status-filter">
                  <option value="">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Dinonaktifkan</option>
                </select>
              </div>
            )}
            {sLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
            ) : subs.items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-subs">
                <p className="text-slate-500 text-sm">Belum ada subscription.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="subs-table">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead className="bg-slate-50 text-slate-500 text-left">
                      <tr>
                        <th className="px-5 py-3 font-medium">{tab === "member" ? "Perusahaan" : "Pemilik"}</th>
                        <th className="px-5 py-3 font-medium">Paket</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Mulai</th>
                        <th className="px-5 py-3 font-medium">Berakhir</th>
                        {tab === "member" && <th className="px-5 py-3 font-medium">Lowongan</th>}
                        <th className="px-5 py-3 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subs.items.map((s) => (
                        <tr key={s.id} data-testid={`sub-row-${s.id}`}>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-900">{s.company_name || s.user_name}</p>
                            <p className="text-xs text-slate-400">{s.user_email}</p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{PRODUCT_LABELS[s.product_type] || s.product_type}</td>
                          <td className="px-5 py-3.5"><StatusBadge status={s.status} map={SUB_STATUS} /></td>
                          <td className="px-5 py-3.5 text-slate-500">{formatDate(s.started_at)}</td>
                          <td className="px-5 py-3.5 text-slate-500">{formatDate(s.expires_at)}</td>
                          {tab === "member" && <td className="px-5 py-3.5 text-slate-600">{s.jobs_count}</td>}
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1.5">
                              {(s.status === "active" || s.status === "expired") && (
                                <button onClick={() => subAction(s, "extend")} className="h-8 px-3 rounded-lg bg-sky-100 text-sky-700 text-xs font-semibold hover:bg-sky-200" data-testid={`sub-extend-${s.id}`}>Perpanjang</button>
                              )}
                              {s.status === "active" && (
                                <button onClick={() => subAction(s, "cancel")} className="h-8 px-3 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200" data-testid={`sub-cancel-${s.id}`}>Nonaktifkan</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {pagination(subs, sPage, setSPage, "sub")}
          </div>
        )}

        {tab === "produk" && (
          !products ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="products-tab">
              {products.map((p, i) => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4" data-testid={`product-card-${p.product_code}`}>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nama Produk</label>
                    <input value={p.name} onChange={(e) => { const a = [...products]; a[i] = { ...p, name: e.target.value }; setProducts(a); }} className={inputCls} data-testid={`product-name-${p.product_code}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Harga (Rp)</label>
                      <input type="number" min="1" value={p.price} onChange={(e) => { const a = [...products]; a[i] = { ...p, price: Number(e.target.value) }; setProducts(a); }} className={inputCls} data-testid={`product-price-${p.product_code}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Durasi (hari)</label>
                      <input type="number" min="1" value={p.duration_days} onChange={(e) => { const a = [...products]; a[i] = { ...p, duration_days: Number(e.target.value) }; setProducts(a); }} className={inputCls} data-testid={`product-duration-${p.product_code}`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Deskripsi</label>
                    <input value={p.description || ""} onChange={(e) => { const a = [...products]; a[i] = { ...p, description: e.target.value }; setProducts(a); }} className={inputCls} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={p.active} onChange={(e) => { const a = [...products]; a[i] = { ...p, active: e.target.checked }; setProducts(a); }} className="h-4 w-4 rounded border-slate-300" data-testid={`product-active-${p.product_code}`} />
                    Produk aktif (dapat dibeli)
                  </label>
                  <button onClick={() => saveProduct(p)} disabled={saving} className="h-10 px-6 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-2" data-testid={`product-save-${p.product_code}`}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "pengaturan" && (
          !settings ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div> : (
            <form onSubmit={saveSettings} className="max-w-2xl bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5" data-testid="payment-settings-form">
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
                      <select value={m.type} onChange={(e) => { const a = [...settings.payment_methods]; a[i] = { ...m, type: e.target.value }; setSettings({ ...settings, payment_methods: a }); }} className={inputCls}>
                        <option value="bank">Bank</option>
                        <option value="ewallet">E-Wallet</option>
                      </select>
                      <input value={m.name} placeholder="Nama (mis. BCA / DANA)" onChange={(e) => { const a = [...settings.payment_methods]; a[i] = { ...m, name: e.target.value }; setSettings({ ...settings, payment_methods: a }); }} className={inputCls} />
                      <input value={m.account_number} placeholder="No. rekening / akun" onChange={(e) => { const a = [...settings.payment_methods]; a[i] = { ...m, account_number: e.target.value }; setSettings({ ...settings, payment_methods: a }); }} className={inputCls} />
                      <div className="flex gap-2">
                        <input value={m.account_name} placeholder="Nama pemilik" onChange={(e) => { const a = [...settings.payment_methods]; a[i] = { ...m, account_name: e.target.value }; setSettings({ ...settings, payment_methods: a }); }} className={inputCls} />
                        <button type="button" onClick={() => setSettings({ ...settings, payment_methods: settings.payment_methods.filter((_, x) => x !== i) })} className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" data-testid={`remove-payment-method-${i}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} className="h-11 px-8 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-2" data-testid="payment-settings-save">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Pengaturan
              </button>
            </form>
          )
        )}

        {tab === "audit" && (
          !logs ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div> : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="audit-log-table">
              {logs.length === 0 ? (
                <p className="p-10 text-center text-sm text-slate-500">Belum ada aktivitas tercatat.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <li key={log.id} className="px-5 py-3 text-sm flex flex-wrap gap-x-3 gap-y-1" data-testid={`audit-row-${log.id}`}>
                      <span className="text-slate-400 text-xs shrink-0">{formatDate(log.created_at)}</span>
                      <span className="font-medium text-slate-800">{log.action}</span>
                      <span className="text-slate-500 text-xs">{log.entity_type} · oleh {log.actor_id === "system" ? "system" : log.actor_id.slice(0, 8) + "…"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
