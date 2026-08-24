import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Crown, Loader2, BadgeCheck, Clock, XCircle, UploadCloud, FilePlus2,
  Briefcase, RefreshCw, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { formatDate, formatRupiah } from "../../lib/format";

const PAY_STATUS = {
  pending: { label: "Menunggu Verifikasi", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-slate-100 text-slate-600" },
};

export default function CompanyMembership() {
  const [ent, setEnt] = useState(null);
  const [payments, setPayments] = useState([]);
  const [methods, setMethods] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState("");
  const [proof, setProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(() => {
    api.get("/company/entitlement").then((r) => setEnt(r.data)).catch(() => toast.error("Gagal memuat status membership"));
    api.get("/membership/payments").then((r) => setPayments(r.data.filter((p) => p.product_code === "company_membership"))).catch(() => {});
    api.get("/membership/payment-info").then((r) => setMethods(r.data.payment_methods || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const submit = async (e) => {
    e.preventDefault();
    if (!method) return toast.error("Pilih metode pembayaran terlebih dahulu");
    if (!proof) return toast.error("Bukti pembayaran wajib diunggah");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("product_code", "company_membership");
      fd.append("payment_method", method);
      fd.append("proof", proof);
      await api.post("/membership/payments", fd);
      toast.success("Pembayaran berhasil dikirim dan sedang menunggu verifikasi admin.");
      setShowForm(false);
      setProof(null);
      setMethod("");
      fetchAll();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

  if (!ent)
    return (
      <DashboardLayout menu={COMPANY_MENU} title="Member Perusahaan">
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      </DashboardLayout>
    );

  const pendingPayment = payments.find((p) => p.status === "pending");
  const rejectedPayment = payments.find((p) => p.status === "rejected");
  const daysLeft = ent.is_member ? Math.max(0, Math.ceil((new Date(ent.member_expires_at).getTime() - Date.now()) / 86400000)) : 0;

  const paymentForm = (
    <form onSubmit={submit} className="mt-6 bg-white rounded-xl border border-slate-200 p-6 sm:p-8" data-testid="membership-payment-form">
      <h3 className="font-display font-semibold text-slate-900 text-lg">Pembayaran Member Perusahaan</h3>
      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
        <p className="text-slate-600">Paket: <span className="font-semibold text-slate-900">Member Perusahaan</span></p>
        <p className="text-slate-600">Harga: <span className="font-semibold text-slate-900">Rp 50.000</span></p>
        <p className="text-slate-600">Durasi: <span className="font-semibold text-slate-900">90 hari (3 bulan)</span></p>
      </div>
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-800 mb-2">Tujuan Pembayaran</h4>
        {methods.length > 0 ? (
          <ul className="space-y-2">
            {methods.map((m, i) => (
              <li key={i} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-900">{m.type === "ewallet" ? "E-Wallet" : "Bank"}: {m.name}</span>
                <span className="block text-slate-600 mt-0.5">{m.account_number} a.n. {m.account_name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-300 px-4 py-3">
            Informasi rekening pembayaran sedang disiapkan. Silakan hubungi admin untuk detail pembayaran.
          </p>
        )}
      </div>
      <div className="mt-5">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Metode Pembayaran</label>
        {methods.length > 0 ? (
          <select required value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls} data-testid="membership-method-select">
            <option value="">Pilih metode</option>
            {methods.map((m, i) => (
              <option key={i} value={`${m.type === "ewallet" ? "E-Wallet" : "Bank"} ${m.name}`}>
                {m.type === "ewallet" ? "E-Wallet" : "Bank"} — {m.name}
              </option>
            ))}
          </select>
        ) : (
          <input required value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Contoh: Transfer Bank / DANA" className={inputCls} data-testid="membership-method-input" />
        )}
      </div>
      <div className="mt-5">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Upload Bukti Pembayaran (gambar/PDF, maks 2MB)</label>
        <label className="flex items-center gap-3 h-24 px-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-sky-400 cursor-pointer transition-colors">
          <UploadCloud className="h-6 w-6 text-slate-400" />
          <span className="text-sm text-slate-500">{proof ? proof.name : "Klik untuk memilih bukti pembayaran"}</span>
          <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={(e) => setProof(e.target.files[0] || null)} data-testid="membership-proof-input" />
        </label>
      </div>
      <button type="submit" disabled={submitting} className="mt-6 w-full h-12 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2" data-testid="membership-submit-btn">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Kirim Pembayaran
      </button>
    </form>
  );

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Member Perusahaan">
      <div className="max-w-3xl" data-testid="membership-page">
        {ent.is_member ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8" data-testid="member-active-card">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><BadgeCheck className="h-6 w-6" /></span>
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">Member Perusahaan <span className="text-emerald-600 text-base">✓ Member Aktif</span></h2>
                <p className="text-sm text-slate-500">Rp 50.000 / 3 Bulan</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-slate-400 text-xs">Berlaku sampai</p>
                <p className="font-semibold text-slate-900 mt-0.5" data-testid="member-expires-at">{formatDate(ent.member_expires_at)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-slate-400 text-xs">Sisa masa aktif</p>
                <p className="font-semibold text-slate-900 mt-0.5">{daysLeft} hari</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-slate-400 text-xs">Masa tayang lowongan</p>
                <p className="font-semibold text-slate-900 mt-0.5">30 hari</p>
              </div>
            </div>
            {daysLeft <= 7 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="member-expiry-warning">
                Member Anda akan berakhir dalam {daysLeft} hari.
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link to="/company/jobs/new" className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700" data-testid="member-post-job-btn">
                <FilePlus2 className="h-4 w-4" /> Pasang Lowongan
              </Link>
              <Link to="/company/jobs" className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid="member-manage-jobs-btn">
                <Briefcase className="h-4 w-4" /> Kelola Lowongan
              </Link>
              {!pendingPayment && (
                <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-sky-300 text-sm font-semibold text-sky-700 hover:bg-sky-50" data-testid="member-renew-btn">
                  <RefreshCw className="h-4 w-4" /> Perpanjang Member
                </button>
              )}
            </div>
          </div>
        ) : pendingPayment ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center" data-testid="membership-pending-card">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Clock className="h-7 w-7" /></span>
            <h2 className="mt-4 font-display text-xl font-bold text-slate-900">Pembayaran Sedang Diverifikasi</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">Pengajuan Member Perusahaan Anda sedang diperiksa oleh admin.</p>
            <p className="mt-3 text-sm text-slate-500">Diajukan {formatDate(pendingPayment.submitted_at)}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10 text-center" data-testid="membership-upgrade-card">
            {rejectedPayment && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left flex items-start gap-3" data-testid="membership-rejected-note">
                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Pembayaran sebelumnya ditolak</p>
                  {rejectedPayment.rejection_reason && <p className="text-xs text-red-600 mt-0.5">Alasan: {rejectedPayment.rejection_reason}</p>}
                </div>
              </div>
            )}
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700"><Crown className="h-7 w-7" /></span>
            <h2 className="mt-4 font-display text-2xl font-bold text-slate-900">Member Perusahaan</h2>
            <p className="mt-5 font-display text-3xl font-extrabold text-slate-900">
              Rp 50.000 <span className="text-base font-medium text-slate-500">/ 3 Bulan</span>
            </p>
            <ul className="mt-6 max-w-xs mx-auto space-y-2.5 text-left">
              {["Masa tayang lowongan hingga 30 hari", "Posting tanpa batas kuota bulanan", "Prioritas moderasi lowongan", "Badge Member Perusahaan"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            {!showForm && (
              <button onClick={() => setShowForm(true)} className="mt-7 inline-flex items-center h-12 px-8 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors" data-testid="upgrade-member-btn">
                Upgrade Member
              </button>
            )}
          </div>
        )}

        {showForm && paymentForm}

        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6" data-testid="payment-history">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Riwayat Pembayaran</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada riwayat pembayaran.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.map((p) => (
                <li key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm" data-testid={`payment-row-${p.id}`}>
                  <div>
                    <p className="font-medium text-slate-900">{p.product_name}</p>
                    <p className="text-xs text-slate-500">{formatRupiah(p.amount)} · {formatDate(p.submitted_at)} · {p.payment_method}</p>
                  </div>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${PAY_STATUS[p.status]?.cls || ""}`}>
                    {PAY_STATUS[p.status]?.label || p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
