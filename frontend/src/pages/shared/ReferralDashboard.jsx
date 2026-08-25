import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Gift, Copy, Check, Loader2, Share2, Wallet, Clock, ArrowDownToLine,
  Users, Crown, PauseCircle, MessageCircle, Facebook,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
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

const METHOD_LABELS = { bank: "Bank", dana: "DANA", ovo: "OVO", gopay: "GoPay" };
const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function ReferralDashboard({ menu }) {
  const [me, setMe] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [copied, setCopied] = useState(false);
  const [wdOpen, setWdOpen] = useState(false);
  const [wdForm, setWdForm] = useState({ amount: "", method: "bank", account_name: "", account_number: "" });
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(() => {
    api.get("/referral/me").then((r) => setMe(r.data)).catch(() => {});
    api.get("/referral/referrals").then((r) => setReferrals(r.data)).catch(() => {});
    api.get("/referral/withdrawals").then((r) => setWithdrawals(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const link = me?.code ? `${window.location.origin}/r/${me.code}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Salin link referral:", link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Referral link disalin");
  };

  const waShare = () => {
    const text = `Halo, kalau kamu sedang mencari kerja, daftar di CirebonKarir. Kamu bisa membuat profil karier dan CV profesional. Daftar melalui link saya: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const fbShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank", "noopener");
  };

  const submitWithdrawal = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/referral/withdrawals", { ...wdForm, amount: Number(wdForm.amount) || 0 });
      toast.success("Pengajuan penarikan terkirim. Admin akan memproses secara manual.");
      setWdOpen(false);
      setWdForm({ amount: "", method: "bank", account_name: "", account_number: "" });
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSending(false);
    }
  };

  if (!me)
    return (
      <DashboardLayout menu={menu} title="Referral & Komisi">
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      </DashboardLayout>
    );

  const w = me.wallet;
  const cards = [
    { label: "Total Komisi", value: w.total_earned, icon: Gift, cls: "bg-sky-100 text-sky-700", testId: "wallet-total" },
    { label: "Pending", value: w.pending, icon: Clock, cls: "bg-amber-100 text-amber-700", testId: "wallet-pending" },
    { label: "Saldo Tersedia", value: w.available, icon: Wallet, cls: "bg-emerald-100 text-emerald-700", testId: "wallet-available" },
    { label: "Sudah Ditarik", value: w.withdrawn, icon: ArrowDownToLine, cls: "bg-slate-200 text-slate-700", testId: "wallet-withdrawn" },
    { label: "Total Referral", value: me.total_referrals, icon: Users, cls: "bg-violet-100 text-violet-700", testId: "wallet-referrals", raw: true },
    { label: "Konversi Career Pro", value: me.conversions, icon: Crown, cls: "bg-amber-100 text-amber-700", testId: "wallet-conversions", raw: true },
  ];

  return (
    <DashboardLayout menu={menu} title="Referral & Komisi">
      <div className="space-y-5" data-testid="referral-dashboard">
        {me.active ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3" data-testid="referral-status-active">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display font-bold text-emerald-900">Referral Aktif</p>
              <p className="text-sm text-emerald-800 mt-0.5">
                Referral kamu aktif. Setiap teman yang kamu ajak dan berhasil upgrade Career Pro menghasilkan komisi {formatRupiah(me.settings.commission)}.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between" data-testid="referral-status-paused">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white shrink-0">
                <PauseCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display font-bold text-amber-900">Referral Dijeda</p>
                <p className="text-sm text-amber-800 mt-0.5">{me.paused_reason} Perpanjang untuk mengaktifkan kembali penghasilan referral. Komisi dan saldo kamu tidak hilang.</p>
              </div>
            </div>
            <Link to={me.activate_link} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold shrink-0 hover:bg-slate-800" data-testid="referral-activate-btn">
              {me.activate_label}
            </Link>
          </div>
        )}

        {me.code && (
          <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="referral-link-card">
            <h3 className="font-display font-semibold text-slate-900">Link Referral Kamu</h3>
            <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Kode: <span className="font-bold text-slate-800">{me.code}</span></p>
                <p className="text-sm font-medium text-sky-700 truncate" data-testid="referral-link-text">{link}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={copyLink} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800" data-testid="copy-referral-btn">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Tersalin" : "Copy Link"}
                </button>
                <button onClick={waShare} aria-label="Share WhatsApp" className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" data-testid="share-wa-btn">
                  <MessageCircle className="h-5 w-5" />
                </button>
                <button onClick={fbShare} aria-label="Share Facebook" className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700" data-testid="share-fb-btn">
                  <Facebook className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4" data-testid={c.testId}>
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.cls}`}>
                <c.icon className="h-4.5 w-4.5 h-5 w-5" />
              </span>
              <p className="mt-2.5 font-display text-lg font-bold text-slate-900 truncate">
                {c.raw ? c.value : formatRupiah(c.value)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="referral-history">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-sky-600" />
            <h3 className="font-display font-semibold text-slate-900">Riwayat Referral</h3>
          </div>
          {referrals.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8" data-testid="no-referrals">Belum ada referral. Bagikan link kamu untuk mulai mendapatkan komisi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Nama</th>
                    <th className="px-5 py-3 font-medium">Tanggal Daftar</th>
                    <th className="px-5 py-3 font-medium">Produk</th>
                    <th className="px-5 py-3 font-medium text-right">Komisi</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map((r, i) => (
                    <tr key={i} data-testid={`referral-row-${i}`}>
                      <td className="px-5 py-3 font-medium text-slate-900">{r.name}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(r.registered_at)}</td>
                      <td className="px-5 py-3 text-slate-600">{r.product}</td>
                      <td className="px-5 py-3 text-right text-slate-700">{r.amount ? formatRupiah(r.amount) : "-"}</td>
                      <td className="px-5 py-3">
                        {r.commission_status ? <StatusBadge status={r.commission_status} map={COMMISSION_STATUS} /> : <span className="text-xs text-slate-400">Belum upgrade</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="withdrawal-section">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-sky-600" />
              <h3 className="font-display font-semibold text-slate-900">Penarikan Komisi</h3>
            </div>
            <button
              onClick={() => setWdOpen(true)}
              disabled={!me.active || w.available < me.settings.min_withdrawal}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50"
              data-testid="withdraw-btn"
            >
              Tarik Dana
            </button>
          </div>
          <p className="px-5 pt-3 text-xs text-slate-400">
            Minimum penarikan {formatRupiah(me.settings.min_withdrawal)} · Pencairan manual oleh admin ·{" "}
            {w.available < me.settings.min_withdrawal ? "Saldo tersedia belum mencukupi." : "Saldo kamu mencukupi untuk penarikan."}
          </p>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6 pb-8" data-testid="no-withdrawals">Belum ada pengajuan penarikan.</p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Tanggal</th>
                    <th className="px-5 py-3 font-medium">Metode</th>
                    <th className="px-5 py-3 font-medium text-right">Jumlah</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((wd) => (
                    <tr key={wd.id} data-testid={`withdrawal-row-${wd.id}`}>
                      <td className="px-5 py-3 text-slate-500">{formatDate(wd.created_at)}</td>
                      <td className="px-5 py-3 text-slate-600">{METHOD_LABELS[wd.method] || wd.method} · {wd.account_number}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">{formatRupiah(wd.amount)}</td>
                      <td className="px-5 py-3"><StatusBadge status={wd.status} map={WD_STATUS} /></td>
                      <td className="px-5 py-3 text-xs text-slate-500 max-w-40 truncate">{wd.admin_note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {wdOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setWdOpen(false)} data-testid="withdrawal-modal">
            <form onSubmit={submitWithdrawal} className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-semibold text-slate-900">Ajukan Penarikan</h3>
              <p className="text-sm text-slate-500 mt-1">Saldo tersedia: <b>{formatRupiah(w.available)}</b></p>
              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah (Rp)</label>
                  <input type="number" required min={me.settings.min_withdrawal} max={w.available} value={wdForm.amount} onChange={(e) => setWdForm({ ...wdForm, amount: e.target.value })} placeholder={`Min. ${me.settings.min_withdrawal}`} className={inputCls} data-testid="wd-amount-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Metode</label>
                  <select value={wdForm.method} onChange={(e) => setWdForm({ ...wdForm, method: e.target.value })} className={inputCls} data-testid="wd-method-select">
                    {Object.entries(METHOD_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Pemilik Rekening/E-Wallet</label>
                  <input required value={wdForm.account_name} onChange={(e) => setWdForm({ ...wdForm, account_name: e.target.value })} className={inputCls} data-testid="wd-account-name-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor Rekening / E-Wallet</label>
                  <input required value={wdForm.account_number} onChange={(e) => setWdForm({ ...wdForm, account_number: e.target.value })} className={inputCls} data-testid="wd-account-number-input" />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setWdOpen(false)} className="flex-1 h-11 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700" data-testid="wd-cancel-btn">Batal</button>
                <button type="submit" disabled={sending} className="flex-1 h-11 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 inline-flex items-center justify-center gap-2" data-testid="wd-submit-btn">
                  {sending && <Loader2 className="h-4 w-4 animate-spin" />} Ajukan
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
