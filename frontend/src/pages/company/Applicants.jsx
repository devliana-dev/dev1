import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Loader2, Users, MessageCircle, FileText, ChevronDown, Star, StickyNote,
  CalendarPlus, History, Crown, Trash2, Video, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import CareerProfileView from "../../components/CareerProfileView";
import api, { formatApiError } from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { APPLICATION_STATUS, INTERVIEW_STATUS, EDUCATION_LEVELS, LOCATIONS } from "../../lib/constants";
import { formatDate, fileUrl, waApplicantLink, imageUrl } from "../../lib/format";

const filterCls = "h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function UpgradeLock({ label }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 text-sm text-amber-800" data-testid="upgrade-lock">
      <Crown className="h-4 w-4 shrink-0" />
      <span>{label} tersedia untuk Member Perusahaan. <Link to="/company/membership" className="font-semibold underline">Upgrade</Link></span>
    </div>
  );
}

export default function Applicants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get("job_id") || "";
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [ent, setEnt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState([]);
  const [history, setHistory] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [showIvForm, setShowIvForm] = useState(false);
  const [ivForm, setIvForm] = useState({ scheduled_at: "", method: "offline", location: "", link: "", notes: "" });
  const [savingIv, setSavingIv] = useState(false);
  const [filters, setFilters] = useState({ q: "", status: "", education: "", location: "", skill: "" });

  const fullAccess = !!ent && ["member", "launch_free"].includes(ent.plan?.plan_type);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/company/applications", { params: jobId ? { job_id: jobId } : {} }),
      api.get("/company/jobs"),
      api.get("/company/entitlement"),
    ])
      .then(([appsRes, jobsRes, entRes]) => {
        setApplications(appsRes.data);
        setJobs(jobsRes.data);
        setEnt(entRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadDetail = async (app) => {
    try {
      const r = await api.get(`/company/applications/${app.id}`);
      setDetail(r.data);
      setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: r.data.status } : a)));
      if (fullAccess) {
        api.get(`/company/applications/${app.id}/notes`).then((r2) => setNotes(r2.data)).catch(() => setNotes([]));
        api.get(`/company/applications/${app.id}/history`).then((r3) => setHistory(r3.data)).catch(() => setHistory([]));
      }
    } catch {}
  };

  const toggleExpand = (app) => {
    if (expanded === app.id) {
      setExpanded(null);
      setDetail(null);
      setShowIvForm(false);
      return;
    }
    setExpanded(app.id);
    setDetail(null);
    setNotes([]);
    setHistory([]);
    setNoteText("");
    setShowIvForm(false);
    loadDetail(app);
  };

  const updateStatus = async (appId, status) => {
    try {
      await api.put(`/company/applications/${appId}`, { status });
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status, is_shortlisted: status === "shortlist" ? true : a.is_shortlisted } : a)));
      if (detail?.id === appId) setDetail({ ...detail, status });
      toast.success("Status kandidat diperbarui");
      if (fullAccess) api.get(`/company/applications/${appId}/history`).then((r) => setHistory(r.data)).catch(() => {});
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const toggleStar = async (app) => {
    try {
      const r = await api.post(`/company/applications/${app.id}/shortlist`, { shortlisted: !app.is_shortlisted });
      setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, is_shortlisted: r.data.shortlisted } : a)));
      toast.success(r.data.shortlisted ? `${app.name} masuk Kandidat Pilihan` : `${app.name} dihapus dari shortlist`);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !detail) return;
    try {
      const r = await api.post(`/company/applications/${detail.id}/notes`, { note: noteText });
      setNotes((prev) => [r.data, ...prev]);
      setNoteText("");
      toast.success("Catatan disimpan");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await api.delete(`/company/applications/${detail.id}/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const submitInterview = async (e) => {
    e.preventDefault();
    if (!ivForm.scheduled_at) return toast.error("Tanggal & jam interview wajib diisi");
    setSavingIv(true);
    try {
      await api.post(`/company/applications/${detail.id}/interviews`, {
        ...ivForm,
        scheduled_at: new Date(ivForm.scheduled_at).toISOString(),
      });
      toast.success("Jadwal interview dibuat. Kandidat menerima notifikasi.");
      setShowIvForm(false);
      setIvForm({ scheduled_at: "", method: "offline", location: "", link: "", notes: "" });
      setApplications((prev) => prev.map((a) => (a.id === detail.id ? { ...a, status: a.status === "diterima" || a.status === "ditolak" ? a.status : "interview" } : a)));
      loadDetail({ ...detail });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingIv(false);
    }
  };

  const filtered = applications.filter((a) => {
    if (filters.q && !a.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.education) {
      const levels = [a.education, ...(a.career_profile?.education_list || []).map((e) => e.level)];
      if (!levels.filter(Boolean).includes(filters.education)) return false;
    }
    if (filters.location && a.career_profile?.city !== filters.location) return false;
    if (filters.skill) {
      const skills = (a.career_profile?.skills || []).map((s) => s.name.toLowerCase()).join(" ");
      if (!skills.includes(filters.skill.toLowerCase())) return false;
    }
    return true;
  });

  const setF = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Pelamar">
      <div data-testid="applicants-page">
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5" data-testid="applicant-filters">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <select
              value={jobId}
              onChange={(e) => {
                const p = new URLSearchParams(searchParams);
                if (e.target.value) p.set("job_id", e.target.value);
                else p.delete("job_id");
                setSearchParams(p);
              }}
              className={filterCls}
              data-testid="applicants-job-filter"
            >
              <option value="">Semua Lowongan</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <input value={filters.q} onChange={setF("q")} placeholder="Cari nama" className={filterCls} data-testid="filter-q" />
            <select value={filters.status} onChange={setF("status")} className={filterCls} data-testid="filter-status">
              <option value="">Semua Status</option>
              {Object.entries(APPLICATION_STATUS).map(([val, conf]) => (
                <option key={val} value={val}>{conf.label}</option>
              ))}
            </select>
            <select value={filters.education} onChange={setF("education")} className={filterCls} data-testid="filter-education">
              <option value="">Semua Pendidikan</option>
              {EDUCATION_LEVELS.filter((e2) => e2 !== "Tidak ada minimal").map((e2) => (
                <option key={e2} value={e2}>{e2}</option>
              ))}
            </select>
            <select value={filters.location} onChange={setF("location")} className={filterCls} data-testid="filter-location">
              <option value="">Semua Lokasi</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <input value={filters.skill} onChange={setF("skill")} placeholder="Skill" className={filterCls} data-testid="filter-skill" />
          </div>
        </div>

        {ent && !fullAccess && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 flex items-center gap-2.5" data-testid="basic-mode-note">
            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Paket Free: manajemen pelamar dasar. Shortlist, catatan internal, interview, dan pencarian kandidat tersedia untuk Member.</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-applicants">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada pelamar</h3>
            <p className="text-sm text-slate-500 mt-1">Pelamar akan muncul di sini setelah lowongan Anda aktif.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="applicants-list">
            {filtered.map((app) => (
              <div key={app.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid={`applicant-row-${app.id}`}>
                <div className="w-full flex items-center gap-3 p-4 sm:p-5">
                  <button onClick={() => toggleExpand(app)} className="flex items-center gap-3 flex-1 min-w-0 text-left" data-testid={`applicant-toggle-${app.id}`}>
                    {imageUrl(app.career_profile?.photo_path) ? (
                      <img src={imageUrl(app.career_profile.photo_path)} alt="" className="h-11 w-11 rounded-xl object-cover border border-slate-100 shrink-0" />
                    ) : (
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white font-display font-bold shrink-0">
                        {app.name.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-semibold text-slate-900">{app.name}</h3>
                        <StatusBadge status={app.status} map={APPLICATION_STATUS} />
                        {app.is_shortlisted && <Star className="h-4 w-4 text-amber-500 fill-current" />}
                        {app.match?.score > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700" data-testid={`match-badge-${app.id}`}>
                            {app.match.score}% cocok
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">
                        {app.job_title} · {app.career_profile?.city || app.education || "-"} · Melamar {formatDate(app.created_at)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleStar(app)}
                      aria-label="Tandai kandidat pilihan"
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${app.is_shortlisted ? "border-amber-300 bg-amber-50 text-amber-500" : "border-slate-200 text-slate-400 hover:bg-amber-50 hover:text-amber-500"}`}
                      data-testid={`applicant-star-${app.id}`}
                    >
                      <Star className={`h-5 w-5 ${app.is_shortlisted ? "fill-current" : ""}`} />
                    </button>
                    <button onClick={() => toggleExpand(app)} aria-label="Detail" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
                      <ChevronDown className={`h-5 w-5 transition-transform ${expanded === app.id ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {expanded === app.id && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50" data-testid={`applicant-detail-${app.id}`}>
                    {!detail ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /></div>
                    ) : (
                      <>
                        {detail.match?.reasons?.length > 0 && (
                          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3" data-testid="match-reasons">
                            <p className="text-xs font-semibold text-emerald-800">Kecocokan {detail.match.score}%</p>
                            <ul className="mt-1 space-y-0.5">
                              {detail.match.reasons.map((r, i) => (
                                <li key={i} className="text-xs text-emerald-700">✓ {r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {detail.message && (
                          <div className="mb-4 rounded-lg bg-white border border-slate-200 p-3.5 text-sm text-slate-600">
                            <span className="text-slate-400">Pesan pelamar:</span> {detail.message}
                          </div>
                        )}

                        <div className="rounded-lg bg-white border border-slate-200 p-4">
                          <h4 className="text-sm font-semibold text-slate-800 mb-2">Profil Karier</h4>
                          <CareerProfileView
                            user={{ name: detail.name, email: detail.email, phone: detail.phone, education: detail.education, experience: detail.experience, cv_path: detail.cv_path, cv_filename: detail.cv_filename }}
                            profile={detail.career_profile || {}}
                            showContact
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2.5">
                          {detail.cv_path && (
                            <a href={fileUrl(detail.cv_path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-white" data-testid={`applicant-cv-${app.id}`}>
                              <FileText className="h-4 w-4" /> Lihat CV
                            </a>
                          )}
                          <a href={waApplicantLink(detail.phone, detail.name, detail.job_title)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700" data-testid={`applicant-wa-${app.id}`}>
                            <MessageCircle className="h-4 w-4" /> WhatsApp
                          </a>
                          <select
                            value={detail.status}
                            onChange={(e) => updateStatus(detail.id, e.target.value)}
                            className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                            data-testid={`applicant-status-${app.id}`}
                          >
                            {Object.entries(APPLICATION_STATUS).map(([val, conf]) => (
                              <option key={val} value={val}>{conf.label}</option>
                            ))}
                          </select>
                          {fullAccess && (
                            <button onClick={() => setShowIvForm(!showIvForm)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800" data-testid={`applicant-interview-btn-${app.id}`}>
                              <CalendarPlus className="h-4 w-4" /> Jadwalkan Interview
                            </button>
                          )}
                        </div>

                        {detail.interviews?.length > 0 && (
                          <div className="mt-4 rounded-lg bg-white border border-slate-200 p-4">
                            <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                              <CalendarPlus className="h-4 w-4 text-sky-600" /> Interview
                            </h4>
                            <ul className="space-y-2">
                              {detail.interviews.map((iv) => (
                                <li key={iv.id} className="text-sm flex flex-wrap items-center gap-2" data-testid={`detail-interview-${iv.id}`}>
                                  <span className="font-medium text-slate-800">{formatDateTime(iv.scheduled_at)}</span>
                                  <StatusBadge status={iv.status} map={INTERVIEW_STATUS} />
                                  <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                                    {iv.method === "online" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                                    {iv.method === "online" ? (iv.link || "Online") : (iv.location || "Offline")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {showIvForm && fullAccess && (
                          <form onSubmit={submitInterview} className="mt-4 rounded-lg bg-white border border-slate-200 p-4" data-testid="interview-form">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3">Jadwalkan Interview</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal & Jam</label>
                                <input type="datetime-local" required value={ivForm.scheduled_at} onChange={(e) => setIvForm({ ...ivForm, scheduled_at: e.target.value })} className={filterCls + " w-full"} data-testid="interview-datetime" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Metode</label>
                                <select value={ivForm.method} onChange={(e) => setIvForm({ ...ivForm, method: e.target.value })} className={filterCls + " w-full"} data-testid="interview-method">
                                  <option value="offline">Offline (tatap muka)</option>
                                  <option value="online">Online</option>
                                </select>
                              </div>
                              {ivForm.method === "offline" ? (
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Lokasi</label>
                                  <input value={ivForm.location} onChange={(e) => setIvForm({ ...ivForm, location: e.target.value })} placeholder="Alamat kantor / tempat interview" className={filterCls + " w-full"} data-testid="interview-location" />
                                </div>
                              ) : (
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Link Meeting</label>
                                  <input value={ivForm.link} onChange={(e) => setIvForm({ ...ivForm, link: e.target.value })} placeholder="https://meet.google.com/..." className={filterCls + " w-full"} data-testid="interview-link" />
                                </div>
                              )}
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Catatan</label>
                                <textarea rows={2} value={ivForm.notes} onChange={(e) => setIvForm({ ...ivForm, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="interview-notes" />
                              </div>
                            </div>
                            <button type="submit" disabled={savingIv} className="mt-3 h-10 px-5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 inline-flex items-center gap-2" data-testid="interview-submit">
                              {savingIv && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Jadwal
                            </button>
                          </form>
                        )}

                        <div className="mt-4 rounded-lg bg-white border border-slate-200 p-4" data-testid="notes-panel">
                          <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                            <StickyNote className="h-4 w-4 text-sky-600" /> Catatan Internal
                            <span className="text-[10px] font-normal text-slate-400">(hanya terlihat oleh perusahaan Anda)</span>
                          </h4>
                          {fullAccess ? (
                            <>
                              <div className="flex gap-2">
                                <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Contoh: Pengalaman 3 tahun, komunikasi bagus" className={filterCls + " flex-1"} data-testid="note-input" />
                                <button onClick={addNote} className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800" data-testid="note-add-btn">Simpan</button>
                              </div>
                              {notes.length > 0 && (
                                <ul className="mt-3 divide-y divide-slate-100">
                                  {notes.map((n) => (
                                    <li key={n.id} className="py-2 flex items-start justify-between gap-2 text-sm" data-testid={`note-${n.id}`}>
                                      <div>
                                        <p className="text-slate-700">{n.note}</p>
                                        <p className="text-[11px] text-slate-400">{n.author_name} · {formatDateTime(n.created_at)}</p>
                                      </div>
                                      <button onClick={() => deleteNote(n.id)} aria-label="Hapus catatan" className="text-slate-300 hover:text-red-500" data-testid={`note-delete-${n.id}`}>
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </>
                          ) : (
                            <UpgradeLock label="Catatan kandidat" />
                          )}
                        </div>

                        {fullAccess && history.length > 0 && (
                          <div className="mt-4 rounded-lg bg-white border border-slate-200 p-4" data-testid="history-panel">
                            <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                              <History className="h-4 w-4 text-sky-600" /> Riwayat
                            </h4>
                            <ul className="space-y-1.5">
                              {history.map((h) => (
                                <li key={h.id} className="text-xs text-slate-600" data-testid={`history-${h.id}`}>
                                  <span className="font-medium text-slate-800">
                                    {h.from_status ? `${APPLICATION_STATUS[h.from_status]?.label || h.from_status} → ` : ""}
                                    {APPLICATION_STATUS[h.to_status]?.label || h.to_status}
                                  </span>
                                  {h.note ? ` · ${h.note}` : ""} · {formatDateTime(h.created_at)}
                                </li>
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
        )}
      </div>
    </DashboardLayout>
  );
}
