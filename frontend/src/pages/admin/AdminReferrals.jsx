import { useCallback, useEffect, useState } from "react";
import { Loader2, Gift, Users, Wallet, ArrowDownToLine, AlertTriangle, Crown } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { formatDate, formatRupiah } from "../../lib/format";

const COMMISSION_STATUS = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Disetujui", cls: "bg-blue-100 text-blue-800" },
  available: { label: "Tersedia", cls: "bg-emerald-100 text-emerald-800" },
  paid: { label: "Dibayar", cls: "bg-slate-200 text-slate-700" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-slate-100 text-slate-600" },
};

const WD_STATUS = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  processing: { label: "Diproses", cls: "bg-blue-100 text-blue-800" },
  paid: { label: "Dibayar", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
};

const REF_STATUS = {
  active: { label: "Aktif", cls: "bg-emerald-100 text-emerald-800" },
  paused: { label: "Dijeda", cls: "bg-amber-100 text-amber-800" },
  suspended: { label: "Suspended", cls: "bg-red-100 text-red-700" },
};

const TABS = [
  ["overview", "Overview"],
  ["referrers", "Referrers"],
  ["commissions", "Komisi"],
  ["withdrawals", "Withdrawals"],
];

function Overview() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/referrals/overview").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  const cards = [
    { label: "Total Referrers", value: data.total_referrers, icon: Users, raw: true },
    { label: "Referrer Aktif", value: data.active_referrers, icon: Gift, raw: true },
    { label: "Referrer Dijeda", value: data.paused_referrers, icon: AlertTriangle, raw: true },
    { label: "Total Referred Users", value: data.total_referred, icon: Users, raw: true },
    { label: "Konversi Career Pro", value: data.conversions, icon: Crown, raw: true },
    { label: "Total Komisi", value: formatRupiah(data.commission_total), icon: Wallet },
    { label: "Komisi Pending", value: formatRupiah(data.commission_pending), icon: Wallet },
    { label: "Komisi Tersedia", value: formatRupiah(data.commission_available), icon: Wallet },
    { label: "Komisi Dibayar", value: formatRupiah(data.commission_paid), icon: Wallet },
    { label: "Total Withdrawal", value: formatRupiah(data.withdrawal_total), icon: ArrowDownToLine },
  ];
  return (
    <div data-testid="referral-admin-overview">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4" data-testid={`ref-kpi-${c.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <c.icon className="h-4.5 w-4.5 h-5 w-5" />
            </span>
            <p className="mt-2.5 font-display text-lg font-bold text-slate-900 truncate">{c.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      {data.withdrawal_pending > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="withdrawal-alert">
          ⚠ {data.withdrawal_pending} pengajuan withdrawal menunggu diproses — buka tab Withdrawals.
        </div>
      )}
      {data.suspicious.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4" data-testid="suspicious-list">
          <p className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" /> Aktivitas Mencurigakan
          </p>
          <ul className="space-y-1 text-xs text-red-700">
            {data.suspicious.map((c) => (
              <li key={c.id}>Komisi {c.id.slice(0, 8)} — {formatRupiah(c.amount)} — status {c.status} (ditandai untuk review)</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Referrers() {
  const [items, setItems] = useState([]);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/admin/referrals/referrers", { params: { role, status } })
      .then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [role, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div data-testid="referrers-tab">
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white" data-testid="referrer-role-filter">
          <option value="">Semua Role</option>
          <option value="candidate">Pelamar</option>
          <option value="company">Perusahaan</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white" data-testid="referrer-status-filter">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="paused">Dijeda</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10 bg-white rounded-xl border border-slate-200" data-testid="no-referrers">Belum ada referrer pada filter ini.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">Nama</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Kode</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-center">Referral</th>
                  <th className="px-5 py-3 font-medium text-center">Konversi</th>
                  <th className="px-5 py-3 font-medium text-right">Komisi</th>
                  <th className="px-5 py-3 font-medium text-right">Tersedia</th>
                  <th className="px-5 py-3 font-medium text-right">Ditarik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r.code} data-testid={`referrer-row-${r.code}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{r.owner_type === "candidate" ? "Pelamar" : "Perusahaan"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{r.code}</td>
                    <td className="px-5 py-3"><StatusBadge status={r.referral_status} map={REF_STATUS} /></td>
                    <td className="px-5 py-3 text-center text-slate-600">{r.total_referrals}</td>
                    <td className="px-5 py-3 text-center text-slate-600">{r.conversions}</td>
                    <td className="px-5 py-3 text-right text-slate-700">{formatRupiah(r.wallet.total_earned)}</td>
                    <td className="px-5 py-3 text-right text-emerald-700 font-medium">{formatRupiah(r.wallet.available)}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{formatRupiah(r.wallet.withdrawn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Commissions() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/admin/referrals/commissions", { params: { status } })
      .then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const action = async (c, act) => {
    const labels = { approve: "Setujui", release: "Jadikan tersedia", reject: "Tolak (fraud)", cancel: "Batalkan (refund)" };
    if (!window.confirm(`${labels[act]} komisi ${formatRupiah(c.amount)} untuk ${c.referrer_name}?`)) return;
    try {
      await api.post(`/admin/referrals/commissions/${c.id}/action`, { action: act });
      toast.success("Status komisi diperbarui");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div data-testid="commissions-tab">
      <div className="mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white" data-testid="commission-status-filter">
          <option value="">Semua Status</option>
          {Object.entries(COMMISSION_STATUS).map(([val, conf]) => <option key={val} value={val}>{conf.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10 bg-white rounded-xl border border-slate-200" data-testid="no-commissions">Belum ada komisi.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">Referrer</th>
                  <th className="px-5 py-3 font-medium">Buyer</th>
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-5 py-3 font-medium text-right">Komisi</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} data-testid={`commission-row-${c.id}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{c.referrer_name}</p>
                      <p className="text-xs text-slate-400">{c.referrer_type === "candidate" ? "Pelamar" : "Perusahaan"}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c.buyer_name}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">{formatRupiah(c.amount)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={c.status} map={COMMISSION_STATUS} />
                      {c.suspicious && <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">SUSPICIOUS</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {c.status === "pending" && (
                          <button onClick={() => action(c, "approve")} className="h-8 px-3 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200" data-testid={`commission-approve-${c.id}`}>Approve</button>
                        )}
                        {c.status === "approved" && (
                          <button onClick={() => action(c, "release")} className="h-8 px-3 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200" data-testid={`commission-release-${c.id}`}>Release</button>
                        )}
                        {["pending", "approved"].includes(c.status) && (
                          <button onClick={() => action(c, "reject")} className="h-8 px-3 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200" data-testid={`commission-reject-${c.id}`}>Tolak</button>
                        )}
                        {["pending", "approved", "available"].includes(c.status) && (
                          <button onClick={() => action(c, "cancel")} className="h-8 px-3 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200" data-testid={`commission-cancel-${c.id}`}>Cancel</button>
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
    </div>
  );
}

function Withdrawals() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/admin/referrals/withdrawals", { params: { status } })
      .then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const action = async (w, act) => {
    const labels = { process: "Proses", paid: "Tandai sudah dibayar", reject: "Tolak" };
    let note = "";
    if (act === "reject") {
      note = window.prompt("Alasan penolakan (terlihat oleh pengguna):") || "";
      if (note === null) return;
    } else if (!window.confirm(`${labels[act]} penarikan ${formatRupiah(w.amount)} milik ${w.owner_name}?`)) {
      return;
    }
    try {
      await api.post(`/admin/referrals/withdrawals/${w.id}/action`, { action: act, note });
      toast.success("Status withdrawal diperbarui");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div data-testid="withdrawals-tab">
      <div className="mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white" data-testid="withdrawal-status-filter">
          <option value="">Semua Status</option>
          {Object.entries(WD_STATUS).map(([val, conf]) => <option key={val} value={val}>{conf.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10 bg-white rounded-xl border border-slate-200" data-testid="no-withdrawals">Belum ada pengajuan withdrawal.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">Referrer</th>
                  <th className="px-5 py-3 font-medium">Tujuan</th>
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-5 py-3 font-medium text-right">Jumlah</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((w) => (
                  <tr key={w.id} data-testid={`withdrawal-row-${w.id}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{w.owner_name}</p>
                      <p className="text-xs text-slate-400">{w.referrer_type === "candidate" ? "Pelamar" : "Perusahaan"}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <p>{w.account_name}</p>
                      <p className="text-xs text-slate-400 uppercase">{w.method} · {w.account_number}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(w.created_at)}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">{formatRupiah(w.amount)}</td>
                    <td className="px-5 py-3"><StatusBadge status={w.status} map={WD_STATUS} /></td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {w.status === "pending" && (
                          <button onClick={() => action(w, "process")} className="h-8 px-3 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200" data-testid={`wd-process-${w.id}`}>Proses</button>
                        )}
                        {["pending", "processing"].includes(w.status) && (
                          <>
                            <button onClick={() => action(w, "paid")} className="h-8 px-3 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200" data-testid={`wd-paid-${w.id}`}>Paid</button>
                            <button onClick={() => action(w, "reject")} className="h-8 px-3 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200" data-testid={`wd-reject-${w.id}`}>Tolak</button>
                          </>
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
    </div>
  );
}

export default function AdminReferrals() {
  const [tab, setTab] = useState("overview");
  return (
    <DashboardLayout menu={ADMIN_MENU} title="Referral Management">
      <div data-testid="admin-referrals-page">
        <div className="flex flex-wrap gap-2 mb-5" data-testid="referral-tabs">
          {TABS.map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${tab === val ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
              data-testid={`referral-tab-${val}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === "overview" && <Overview />}
        {tab === "referrers" && <Referrers />}
        {tab === "commissions" && <Commissions />}
        {tab === "withdrawals" && <Withdrawals />}
      </div>
    </DashboardLayout>
  );
}
