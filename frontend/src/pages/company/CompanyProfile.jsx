import { useEffect, useState } from "react";
import { Loader2, BadgeCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { COMPANY_MENU } from "./menu";
import { LOCATIONS, CATEGORIES, COMPANY_SIZES, COMPANY_STATUS } from "../../lib/constants";
import { logoUrl } from "../../lib/format";
import StatusBadge from "../../components/StatusBadge";

export default function CompanyProfile() {
  const { setCompany } = useAuth();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState("pending");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get("/company/profile").then((r) => {
      const c = r.data;
      setForm({
        name: c.name || "", description: c.description || "", address: c.address || "",
        city: c.city || "", phone: c.phone || "", website: c.website || "",
        instagram: c.instagram || "", founded_year: c.founded_year || "",
        business_category: c.business_category || "", size: c.size || "",
      });
      setStatus(c.status);
      setLogo(c.logo);
    }).catch(() => toast.error("Gagal memuat profil"));
  }, []);

  if (!form)
    return (
      <DashboardLayout menu={COMPANY_MENU} title="Profil Perusahaan">
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      </DashboardLayout>
    );

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/company/profile", form);
      setCompany(data);
      toast.success("Profil perusahaan berhasil disimpan");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/company/logo", fd);
      setLogo(data.logo);
      toast.success("Logo berhasil diunggah");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Profil Perusahaan">
      <div className="max-w-3xl space-y-6" data-testid="company-profile-page">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <img src={logoUrl(logo, form.name)} alt="Logo" className="h-20 w-20 rounded-xl object-cover border border-slate-200" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-semibold text-slate-900 text-lg">{form.name}</h3>
                <StatusBadge status={status} map={COMPANY_STATUS} />
                {status === "verified" && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700" data-testid="verified-label">
                    <BadgeCheck className="h-4 w-4" /> Perusahaan Terverifikasi
                  </span>
                )}
              </div>
              <label className="mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors" data-testid="logo-upload-label">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {uploading ? "Mengunggah..." : "Unggah Logo (maks 2MB)"}
                <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleLogoUpload} data-testid="logo-upload-input" />
              </label>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5" data-testid="company-profile-form">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Perusahaan</label>
            <input required value={form.name} onChange={set("name")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-name-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi Perusahaan</label>
            <textarea value={form.description} onChange={set("description")} rows={4} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-description-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat</label>
            <input value={form.address} onChange={set("address")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-address-input" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kota</label>
              <select value={form.city} onChange={set("city")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-city-select">
                <option value="">Pilih Kota</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor WhatsApp</label>
              <input value={form.phone} onChange={set("phone")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-phone-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Website</label>
              <input value={form.website} onChange={set("website")} placeholder="https://" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-website-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Instagram</label>
              <input value={form.instagram} onChange={set("instagram")} placeholder="@username" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-instagram-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tahun Berdiri</label>
              <input value={form.founded_year} onChange={set("founded_year")} placeholder="2015" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-founded-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori Bisnis</label>
              <select value={form.business_category} onChange={set("business_category")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-category-select">
                <option value="">Pilih Kategori</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ukuran Perusahaan</label>
              <select value={form.size} onChange={set("size")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="cp-size-select">
                <option value="">Pilih Ukuran</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="h-12 px-8 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 inline-flex items-center gap-2" data-testid="cp-save-btn">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan Profil
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
