import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPin, Search, Send, UserRound, Crown, X } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import CareerProfileView from "../../components/CareerProfileView";
import api, { formatApiError } from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { LOCATIONS, EDUCATION_LEVELS } from "../../lib/constants";
import { imageUrl } from "../../lib/format";

const inputCls = "h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function CandidateSearch() {
  const [filters, setFilters] = useState({ q: "", location: "", education: "", skill: "" });
  const [results, setResults] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [profileModal, setProfileModal] = useState(null);
  const [inviteFor, setInviteFor] = useState(null);
  const [inviteJob, setInviteJob] = useState("");
  const [inviting, setInviting] = useState(false);

  const search = useCallback((f = filters) => {
    setLoading(true);
    api.get("/company/candidates", { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) })
      .then((r) => { setResults(r.data); setForbidden(false); })
      .catch((err) => { if (err?.response?.status === 403) setForbidden(true); })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    search();
    api.get("/company/jobs").then((r) => setJobs(r.data.filter((j) => j.status === "active"))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  const openProfile = async (c) => {
    try {
      const r = await api.get(`/company/candidates/${c.user_id}/profile`);
      setProfileModal(r.data);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const sendInvite = async () => {
    if (!inviteJob) return toast.error("Pilih lowongan terlebih dahulu");
    setInviting(true);
    try {
      await api.post(`/company/candidates/${inviteFor.user_id}/invite`, { job_id: inviteJob });
      toast.success(`Undangan melamar terkirim ke ${inviteFor.name}`);
      setInviteFor(null);
      setInviteJob("");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setInviting(false);
    }
  };

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Cari Kandidat">
      <div data-testid="candidate-search-page">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input value={filters.q} onChange={set("q")} placeholder="Nama / posisi / skill" className={inputCls} data-testid="cs-q-input" />
            <select value={filters.location} onChange={set("location")} className={inputCls} data-testid="cs-location-select">
              <option value="">Semua lokasi</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={filters.education} onChange={set("education")} className={inputCls} data-testid="cs-education-select">
              <option value="">Semua pendidikan</option>
              {EDUCATION_LEVELS.filter((e) => e !== "Tidak ada minimal").map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <input value={filters.skill} onChange={set("skill")} placeholder="Skill" className={inputCls} data-testid="cs-skill-input" />
            <button onClick={() => search()} className="h-11 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 inline-flex items-center justify-center gap-2" data-testid="cs-search-btn">
              <Search className="h-4 w-4" /> Cari
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">Hanya kandidat dengan Profil Karier terbuka yang dapat ditemukan.</p>
        </div>

        {forbidden ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center" data-testid="cs-upgrade-prompt">
            <Crown className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Fitur Member Perusahaan</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Pencarian kandidat dan Undang Melamar tersedia untuk Member Perusahaan.
            </p>
            <Link to="/company/membership" className="mt-5 inline-flex items-center h-11 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700" data-testid="cs-upgrade-btn">
              Upgrade Member
            </Link>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="cs-empty">
            <UserRound className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Tidak ada kandidat ditemukan</h3>
            <p className="text-sm text-slate-500 mt-1">Coba ubah kriteria pencarian Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="cs-results">
            {results.map((c) => (
              <div key={c.user_id} className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`cs-card-${c.user_id}`}>
                <div className="flex items-start gap-3">
                  {imageUrl(c.photo_path) ? (
                    <img src={imageUrl(c.photo_path)} alt="" className="h-12 w-12 rounded-xl object-cover border border-slate-100" />
                  ) : (
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white font-display font-bold shrink-0">
                      {c.name.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-slate-900">{c.name}</h3>
                    {c.target_position && <p className="text-sm text-sky-700 font-medium">{c.target_position}</p>}
                    <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                      {c.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.city}</span>}
                      {(c.education_level || c.education?.[0]?.level) && <span>{c.education_level || c.education[0].level}</span>}
                    </p>
                  </div>
                </div>
                {c.skills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.skills.slice(0, 5).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[11px] font-medium border border-sky-100">{s.name}</span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => openProfile(c)} className="flex-1 h-10 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid={`cs-view-${c.user_id}`}>
                    Lihat Profil
                  </button>
                  <button onClick={() => { setInviteFor(c); setInviteJob(""); }} className="flex-1 h-10 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center justify-center gap-1.5" data-testid={`cs-invite-${c.user_id}`}>
                    <Send className="h-4 w-4" /> Undang Melamar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {profileModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setProfileModal(null)} data-testid="cs-profile-modal">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end">
                <button onClick={() => setProfileModal(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Tutup" data-testid="cs-profile-close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <CareerProfileView user={profileModal.user} profile={profileModal.profile} showContact={profileModal.applied} />
            </div>
          </div>
        )}

        {inviteFor && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setInviteFor(null)} data-testid="cs-invite-modal">
            <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-semibold text-slate-900">Undang {inviteFor.name} Melamar</h3>
              <p className="text-sm text-slate-500 mt-1">
                Kandidat akan menerima notifikasi dan memutuskan sendiri apakah ingin melamar.
              </p>
              <select value={inviteJob} onChange={(e) => setInviteJob(e.target.value)} className={`mt-4 w-full ${inputCls}`} data-testid="cs-invite-job-select">
                <option value="">Pilih lowongan aktif</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              {jobs.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">Belum ada lowongan aktif. Buat lowongan terlebih dahulu.</p>
              )}
              <div className="mt-5 flex gap-2">
                <button onClick={() => setInviteFor(null)} className="flex-1 h-11 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700" data-testid="cs-invite-cancel">
                  Batal
                </button>
                <button onClick={sendInvite} disabled={inviting || !inviteJob} className="flex-1 h-11 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 inline-flex items-center justify-center gap-2" data-testid="cs-invite-send">
                  {inviting && <Loader2 className="h-4 w-4 animate-spin" />} Kirim Undangan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
