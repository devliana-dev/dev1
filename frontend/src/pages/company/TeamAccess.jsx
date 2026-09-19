import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCog, Plus, X, Crown, ShieldCheck, Users, Trash2, ArrowRight } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/format";
import { COMPANY_MENU } from "./menu";

const ROLE_STYLE = {
  owner: "bg-gradient-to-r from-yellow-400 to-amber-400 text-[#0B1F4B]",
  admin: "bg-blue-100 text-blue-700",
  recruiter: "bg-emerald-100 text-emerald-700",
};
const ROLE_LABEL = { owner: "Owner", admin: "Admin", recruiter: "Recruiter" };

const ROLE_INFO = [
  { role: "Owner", icon: Crown, tone: "bg-yellow-100 text-amber-600", desc: "Akses penuh termasuk Membership, Referral, dan Tim & Akses." },
  { role: "Admin", icon: ShieldCheck, tone: "bg-blue-100 text-blue-600", desc: "Semua fitur rekrutmen + mengelola anggota tim." },
  { role: "Recruiter", icon: Users, tone: "bg-emerald-100 text-emerald-600", desc: "Fitur rekrutmen harian: lowongan, pelamar, interview, kandidat." },
];

export default function TeamAccess() {
  const { user } = useAuth();
  const [members, setMembers] = useState(null);
  const [myRole, setMyRole] = useState("owner");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "recruiter" });

  const myId = user?.id || "";

  const loadTeam = () => {
    api.get("/company/team")
      .then((r) => {
        setMembers(r.data);
        const me = r.data.find((m) => m.id === myId);
        if (me) setMyRole(me.company_role);
      })
      .catch((e) => {
        setMembers([]);
        toast.error(e?.response?.data?.detail || "Gagal memuat data tim");
      });
  };

  useEffect(() => { loadTeam(); }, []);

  const addMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/company/team", form);
      toast.success(`Anggota tim ${form.name} ditambahkan`);
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "recruiter" });
      loadTeam();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menambah anggota tim");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (m, role) => {
    try {
      await api.put(`/company/team/${m.id}`, { role });
      toast.success(`Peran ${m.name} diubah menjadi ${ROLE_LABEL[role]}`);
      loadTeam();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengubah peran");
    }
  };

  const removeMember = async (m) => {
    if (!window.confirm(`Hapus ${m.name} dari tim?`)) return;
    try {
      await api.delete(`/company/team/${m.id}`);
      toast.success(`${m.name} dihapus dari tim`);
      loadTeam();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menghapus anggota tim");
    }
  };

  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Tim & Akses">
    <div className="max-w-5xl mx-auto page-fade" data-testid="team-access-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A1F4B] to-[#12307A] text-white shadow-md">
            <UserCog className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold text-[#0B1F4B]">Tim &amp; Akses</h1>
            <p className="text-[12px] text-slate-500">Kelola anggota tim rekrutmen dan peran aksesnya.</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-blue-600 text-white text-[13px] font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-colors"
            data-testid="add-member-toggle"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Tambah Anggota
          </button>
        )}
      </div>

      {/* Info peran */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6" data-testid="role-info">
        {ROLE_INFO.map((r) => (
          <div key={r.role} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${r.tone}`}>
              <r.icon className="h-5 w-5" />
            </span>
            <p className="mt-2.5 font-display font-bold text-[14px] text-[#0B1F4B]">{r.role}</p>
            <p className="mt-1 text-[11.5px] text-slate-500 leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Form tambah anggota */}
      {showForm && canManage && (
        <form onSubmit={addMember} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 mb-6" data-testid="add-member-form">
          <h3 className="font-display font-bold text-[15px] text-slate-900 mb-4">Undang Anggota Tim Baru</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-bold text-slate-600 mb-1.5">Nama Lengkap</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. Rina Melati"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none text-[13px] focus:border-blue-500"
                data-testid="member-name-input"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-slate-600 mb-1.5">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@perusahaan.id"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none text-[13px] focus:border-blue-500"
                data-testid="member-email-input"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-slate-600 mb-1.5">Password Sementara</label>
              <input
                required
                type="text"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 6 karakter"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none text-[13px] focus:border-blue-500"
                data-testid="member-password-input"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-slate-600 mb-1.5">Peran</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 outline-none text-[13px] bg-white focus:border-blue-500"
                data-testid="member-role-select"
              >
                <option value="recruiter">Recruiter — fitur rekrutmen harian</option>
                <option value="admin">Admin — rekrutmen + kelola tim</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-10 px-6 rounded-xl bg-blue-600 text-white text-[13px] font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-colors disabled:opacity-60"
              data-testid="member-submit"
            >
              {saving ? "Menyimpan..." : "Simpan Anggota"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="h-10 px-5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-50">
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Daftar anggota */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5" data-testid="team-list">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-display font-bold text-[15px] text-slate-900">Anggota Tim</h3>
          <span className="text-[11.5px] text-slate-400">{members ? members.length : "-"} orang</span>
        </div>
        {members === null ? (
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse" />)}
          </div>
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-[12.5px] text-slate-400">Belum ada anggota tim.</p>
        ) : (
          <div className="space-y-2.5">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors" data-testid={`team-member-${m.email.replace(/[^a-z0-9]+/g, "-")}`}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-display font-bold text-sm shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
                    {m.name}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${ROLE_STYLE[m.company_role] || "bg-slate-100 text-slate-600"}`} data-testid={`role-badge-${m.id}`}>
                      {m.is_owner && <Crown className="h-3 w-3 mr-1" />} {ROLE_LABEL[m.company_role] || m.company_role}
                    </span>
                  </p>
                  <p className="text-[11.5px] text-slate-500 truncate">{m.email} • bergabung {formatDate(m.created_at)}</p>
                </div>
                {canManage && !m.is_owner && m.id !== myId && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={m.company_role}
                      onChange={(e) => changeRole(m, e.target.value)}
                      className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 outline-none focus:border-blue-500"
                      data-testid={`role-select-${m.id}`}
                    >
                      <option value="recruiter">Recruiter</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => removeMember(m)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                      aria-label={`Hapus ${m.name}`}
                      data-testid={`remove-member-${m.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {m.is_owner && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 shrink-0">
                    <ArrowRight className="h-3 w-3" /> Akses penuh
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!canManage && (
        <p className="mt-4 text-center text-[11.5px] text-slate-400">Hanya Owner/Admin yang dapat mengelola Tim &amp; Akses.</p>
      )}
    </div>
    </DashboardLayout>
  );
}
