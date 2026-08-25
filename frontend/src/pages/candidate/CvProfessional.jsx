import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Crown, Loader2, CheckCircle2, Clock, XCircle, UploadCloud,
  FilePlus2, FolderOpen, LayoutTemplate, FileUp, BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { CANDIDATE_MENU } from "./menu";
import { CV_SUB_STATUS } from "../../lib/constants";
import { formatDate, formatRupiah } from "../../lib/format";
import { CV_TEMPLATES } from "../../components/cvTemplates";

const PAY_STATUS = {
  pending: { label: "Menunggu Verifikasi", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-slate-100 text-slate-600" },
};

const FEATURES = ["Akses semua template CV premium", "Buat & edit CV baru", "Import & konversi CV lama", "Download CV PDF", "30 One-Click Apply per periode aktif", "Berlaku selama 30 hari"];

export default function CvProfessional() {
  const [status, setStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState("");
  const [proof, setProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [quota, setQuota] = useState(null);

  const fetchStatus = useCallback(() => {
    api.get("/cv-professional/status").then((r) => setStatus(r.data)).catch(() => toast.error("Gagal memuat status Career Pro"));
    api.get("/cv-professional/payment-info").then((r) => setPaymentInfo(r.data)).catch(() => {});
    api.get("/membership/payments").then((r) => setPayments(r.data.filter((p) => p.product_code === "cv_professional"))).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
    api.get("/candidate/apply-quota").then((r) => setQuota(r.data)).catch(() => {});
  }, [fetchStatus]);

  const submit = async (e) => {
    e.preventDefault();
    if (!method) return toast.error("Pilih metode pembayaran terlebih dahulu");
    if (!proof) return toast.error("Bukti pembayaran wajib diunggah");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("payment_method", method);
      fd.append("proof", proof);
      await api.post("/cv-professional/subscribe", fd);
      toast.success("Pembayaran berhasil dikirim dan sedang menunggu verifikasi admin.");
      setShowForm(false);
      setProof(null);
      setMethod("");
      fetchStatus();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

  const renderPaymentForm = () => (
    <form onSubmit={submit} className="mt-6 bg-white rounded-xl border border-slate-200 p-6 sm:p-8" data-testid="payment-form">
      <h3 className="font-display font-semibold text-slate-900 text-lg">Pembayaran Career Pro</h3>
      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
        <p className="text-slate-600">Paket: <span className="font-semibold text-slate-900">{status?.settings?.package_name}</span></p>
        <p className="text-slate-600">Harga: <span className="font-semibold text-slate-900">{formatRupiah(status?.settings?.price)}</span></p>
        <p className="text-slate-600">Durasi: <span className="font-semibold text-slate-900">{status?.settings?.duration_days} hari</span></p>
      </div>
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-800 mb-2">Tujuan Pembayaran</h4>
        {paymentInfo?.payment_methods?.length > 0 ? (
          <ul className="space-y-2">
            {paymentInfo.payment_methods.map((m, i) => (
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
        {paymentInfo?.payment_methods?.length > 0 ? (
          <select required value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls} data-testid="payment-method-select">
            <option value="">Pilih metode</option>
            {paymentInfo.payment_methods.map((m, i) => (
              <option key={i} value={`${m.type === "ewallet" ? "E-Wallet" : "Bank"} ${m.name}`}>
                {m.type === "ewallet" ? "E-Wallet" : "Bank"} — {m.name}
              </option>
            ))}
          </select>
        ) : (
          <input required value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Contoh: Transfer Bank / DANA / OVO" className={inputCls} data-testid="payment-method-input" />
        )}
      </div>
      <div className="mt-5">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Upload Bukti Pembayaran (gambar/PDF, maks 2MB)</label>
        <label className="flex items-center gap-3 h-24 px-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-sky-400 cursor-pointer transition-colors">
          <UploadCloud className="h-6 w-6 text-slate-400" />
          <span className="text-sm text-slate-500">{proof ? proof.name : "Klik untuk memilih bukti pembayaran"}</span>
          <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={(e) => setProof(e.target.files[0] || null)} data-testid="payment-proof-input" />
        </label>
      </div>
      <button type="submit" disabled={submitting} className="mt-6 w-full h-12 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2" data-testid="payment-submit-btn">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Kirim Pengajuan
      </button>
    </form>
  );

  const renderContent = () => {
    if (!status)
      return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;

    const sub = status.subscription;

    if (status.has_access && sub?.status === "active") {
      const daysLeft = Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000));
      return (
        <div data-testid="cv-premium-active">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><BadgeCheck className="h-6 w-6" /></span>
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">Career Pro <span className="text-emerald-600 text-base">✓ Premium Aktif</span></h2>
                <p className="text-sm text-slate-500">{sub.package_name} · {formatRupiah(sub.price)} / {sub.duration_days} Hari</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-slate-400 text-xs">Status</p>
                <p className="font-semibold text-emerald-700 mt-0.5">Aktif</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-slate-400 text-xs">Berlaku sampai</p>
                <p className="font-semibold text-slate-900 mt-0.5" data-testid="premium-expires-at">{formatDate(sub.expires_at)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-slate-400 text-xs">Sisa masa aktif</p>
                <p className="font-semibold text-slate-900 mt-0.5" data-testid="premium-days-left">{daysLeft} hari</p>
              </div>
            </div>
            {quota && (
              <div className="mt-4 rounded-lg bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-sky-900" data-testid="apply-quota-card">
                One-Click Apply: <b>{quota.remaining}</b> dari {quota.limit} tersisa ({quota.period}).
              </div>
            )}
            {daysLeft <= 7 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="expiry-warning">
                Career Pro Anda akan berakhir dalam {daysLeft} hari.
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Link to="/candidate/cv-professional/builder" className="inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors" data-testid="btn-buat-cv">
                <FilePlus2 className="h-4 w-4" /> Buat CV
              </Link>
              <Link to="/candidate/cv-professional/list" className="inline-flex items-center justify-center gap-2 h-12 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors" data-testid="btn-cv-saya">
                <FolderOpen className="h-4 w-4" /> CV Saya
              </Link>
              <a href="#template-cv" className="inline-flex items-center justify-center gap-2 h-12 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors" data-testid="btn-template-cv">
                <LayoutTemplate className="h-4 w-4" /> Template CV
              </a>
              <Link to="/candidate/cv-professional/import" className="inline-flex items-center justify-center gap-2 h-12 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors" data-testid="btn-import-cv">
                <FileUp className="h-4 w-4" /> Import CV Lama
              </Link>
            </div>
          </div>

          <div id="template-cv" className="mt-6" data-testid="template-gallery">
            <h3 className="font-display font-semibold text-slate-900 mb-4">Template CV</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CV_TEMPLATES.map((t) => (
                <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid={`template-card-${t.id}`}>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700"><LayoutTemplate className="h-5 w-5" /></span>
                  <h4 className="mt-3 font-display font-semibold text-slate-900">{t.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                  <Link to={`/candidate/cv-professional/builder?template=${t.id}`} className="mt-4 inline-flex items-center h-10 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors" data-testid={`use-template-${t.id}`}>
                    Gunakan Template
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (sub?.status === "pending")
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center" data-testid="cv-pending-state">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Clock className="h-7 w-7" /></span>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900">Pembayaran Sedang Diverifikasi</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">Pengajuan Career Pro Anda sedang diperiksa oleh admin.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <StatusBadge status="pending" map={CV_SUB_STATUS} />
            <span className="text-sm text-slate-500">Diajukan {formatDate(sub.requested_at)}</span>
          </div>
        </div>
      );

    return (
      <div data-testid="cv-upgrade-state">
        {sub?.status === "rejected" && (
          <div className="mb-5 bg-white rounded-xl border border-red-200 p-6" data-testid="cv-rejected-state">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <h3 className="font-display font-semibold text-slate-900">Pembayaran Ditolak</h3>
                {sub.rejection_reason && <p className="text-sm text-red-600 mt-1">Alasan: {sub.rejection_reason}</p>}
                <p className="text-sm text-slate-500 mt-1">Silakan ajukan pembayaran kembali dengan bukti yang valid.</p>
              </div>
            </div>
          </div>
        )}
        {sub?.status === "expired" && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600" data-testid="cv-expired-state">
            Akses Career Pro Anda telah berakhir pada {formatDate(sub.expires_at)}. Lakukan upgrade untuk mengaktifkan kembali.
          </div>
        )}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700"><Crown className="h-7 w-7" /></span>
          <h2 className="mt-4 font-display text-2xl font-bold text-slate-900">Career Pro</h2>
          <p className="mt-2 text-slate-500 max-w-md mx-auto text-sm">Buat CV lebih profesional dan siap digunakan untuk melamar pekerjaan.</p>
          <p className="mt-5 font-display text-3xl font-extrabold text-slate-900" data-testid="package-price">
            {formatRupiah(status.settings.price)} <span className="text-base font-medium text-slate-500">/ {status.settings.duration_days} Hari</span>
          </p>
          <ul className="mt-6 max-w-xs mx-auto space-y-2.5 text-left">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="h-4.5 w-4.5 h-5 w-5 text-emerald-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="mt-7 inline-flex items-center h-12 px-8 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors" data-testid="upgrade-btn">
              {sub?.status === "rejected" || sub?.status === "expired" ? "Ajukan Pembayaran Lagi" : "Upgrade Career Pro"}
            </button>
          )}
        </div>
        {showForm && renderPaymentForm()}
      </div>
    );
  };

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Career Pro">
      <div className="max-w-3xl">
        {renderContent()}
        {payments.length > 0 && (
          <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6" data-testid="cv-payment-history">
            <h3 className="font-display font-semibold text-slate-900 mb-4">Riwayat Pembayaran</h3>
            <ul className="divide-y divide-slate-100">
              {payments.map((p) => (
                <li key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm" data-testid={`cv-payment-row-${p.id}`}>
                  <div>
                    <p className="font-medium text-slate-900">{p.product_name || "Career Pro"}</p>
                    <p className="text-xs text-slate-500">{formatRupiah(p.amount)} · {formatDate(p.submitted_at)} · {p.payment_method}</p>
                  </div>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${PAY_STATUS[p.status]?.cls || ""}`}>{PAY_STATUS[p.status]?.label || p.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
