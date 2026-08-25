import { useCallback, useEffect, useState } from "react";
import { Loader2, TrendingUp, Target, Award, Users, Wallet, Crown, Building2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { formatRupiah } from "../../lib/format";

const TABS = [
  ["growth", "Pertumbuhan"],
  ["funnel", "Funnel Lamaran"],
  ["market", "Pasar Kerja"],
  ["talent", "Talent & Matching"],
  ["money", "Revenue & Konversi"],
];

const RANGES = [
  { label: "7 hari", days: 7 }, { label: "30 hari", days: 30 }, { label: "90 hari", days: 90 },
  { label: "6 bulan", days: 180 }, { label: "1 tahun", days: 365 },
];

function GrowthTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/admin/analytics/growth", { params: { days } })
      .then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const charts = [
    { key: "users", label: "Pelamar Baru", color: "#0284c7", fill: "#e0f2fe" },
    { key: "companies", label: "Perusahaan Baru", color: "#7c3aed", fill: "#ede9fe" },
    { key: "jobs", label: "Lowongan Baru", color: "#059669", fill: "#d1fae5" },
    { key: "applications", label: "Lamaran Baru", color: "#d97706", fill: "#fef3c7" },
  ];

  return (
    <div data-testid="analytics-growth">
      <div className="flex flex-wrap gap-2 mb-5" data-testid="growth-ranges">
        {RANGES.map((r) => (
          <button key={r.days} onClick={() => setDays(r.days)}
            className={`h-9 px-4 rounded-lg text-xs font-semibold ${days === r.days ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600"}`}
            data-testid={`range-${r.days}`}>
            {r.label}
          </button>
        ))}
      </div>
      {loading || !data ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {charts.map((c) => (
            <div key={c.key} className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`growth-chart-${c.key}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">{c.label}</h3>
                <span className="font-display text-lg font-bold text-slate-900">{data.totals[c.key]}</span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.series[c.key].map((p) => ({ ...p, date: p.date.slice(5) }))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke={c.color} fill={c.fill} strokeWidth={2} name={c.label} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FunnelTab() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/analytics/funnel").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  const steps = [
    { label: "Views Lowongan", value: data.views },
    { label: "Lamaran Masuk", value: data.applications },
    { label: "Screening", value: data.screening },
    { label: "Shortlist", value: data.shortlist },
    { label: "Interview", value: data.interview },
    { label: "Diterima", value: data.hired },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl" data-testid="funnel-chart">
      {steps.every((s) => s.value === 0) ? (
        <p className="text-sm text-slate-400 text-center py-6">Belum ada data pada funnel recruitment.</p>
      ) : (
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={s.label} data-testid={`funnel-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600 font-medium">{s.label}</span>
                <span className="font-bold text-slate-900">{s.value.toLocaleString("id-ID")}</span>
              </div>
              <div className="h-7 rounded-lg bg-slate-100 overflow-hidden">
                <div className="h-full rounded-lg transition-all" style={{ width: `${(s.value / max) * 100}%`, background: `rgba(2, 132, 199, ${1 - i * 0.13})` }} />
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400 pt-2">Ditolak: {data.rejected} lamaran</p>
        </div>
      )}
    </div>
  );
}

function MarketTab() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/analytics/market").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  const Table = ({ title, rows, testId }) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid={testId}>
      <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-display font-semibold text-slate-900">{title}</h3></div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Belum ada data.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium text-center">Lowongan</th>
                <th className="px-4 py-3 font-medium text-center">Pelamar</th>
                <th className="px-4 py-3 font-medium text-center">Rasio</th>
                <th className="px-4 py-3 font-medium text-center">Views</th>
                <th className="px-4 py-3 font-medium text-center">Diterima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="px-5 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{r.jobs}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{r.applications}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{r.ratio}x</td>
                  <td className="px-4 py-3 text-center text-slate-600">{r.views}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-700">{r.hired}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Table title="Kategori Pekerjaan" rows={data.categories} testId="market-categories" />
      <Table title="Distribusi Lokasi" rows={data.locations} testId="market-locations" />
    </div>
  );
}

function TalentTab() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/analytics/talent").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="talent-tab">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2"><Users className="h-4 w-4 text-sky-600" /> Kelengkapan Profil Karier</h3>
        <p className="text-xs text-slate-400 mb-4">{data.open_to_work} dari {data.total_candidates} pelamar membuka profil untuk perusahaan</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.completion_distribution} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]} name="Pelamar" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-sky-600" /> Job Matching</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-sky-50 border border-sky-100 p-4" data-testid="avg-match-card">
            <p className="font-display text-2xl font-bold text-sky-800">{data.avg_match}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Rata-rata match pelamar</p>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4" data-testid="high-match-card">
            <p className="font-display text-2xl font-bold text-emerald-800">{data.high_match_pct}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Lamaran dengan match ≥80%</p>
          </div>
        </div>
        <h4 className="text-sm font-semibold text-slate-800 mt-5 mb-2 flex items-center gap-2"><Award className="h-4 w-4 text-sky-600" /> Skill Populer</h4>
        {data.top_skills.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada data skill dari Profil Karier.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5" data-testid="top-skills">
            {data.top_skills.map((s) => (
              <span key={s.name} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{s.name} · {s.count}</span>
            ))}
          </div>
        )}
        {data.top_education.length > 0 && (
          <>
            <h4 className="text-sm font-semibold text-slate-800 mt-4 mb-2">Pendidikan Populer</h4>
            <div className="flex flex-wrap gap-1.5">
              {data.top_education.map((e) => (
                <span key={e.name} className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-medium border border-violet-100">{e.name} · {e.count}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MoneyTab() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/analytics/monetization").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  const revCards = [
    { label: "Hari Ini", value: data.revenue_today }, { label: "7 Hari", value: data.revenue_week },
    { label: "30 Hari", value: data.revenue_month }, { label: "1 Tahun", value: data.revenue_year },
    { label: "Total", value: data.revenue_total },
  ];
  const ProductBlock = ({ title, icon: Icon, d, testId }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid={testId}>
      <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><Icon className="h-4 w-4 text-sky-600" /> {title}</h3>
      <div className="grid grid-cols-2 gap-2.5 text-sm">
        {[["Aktif", d.active], ["Baru (30 hari)", d.new_30d], ["Expired", d.expired], ["Revenue", formatRupiah(d.revenue)],
          ["Renewal Due (14 hari)", d.renewal_due], ["Renewal Rate", `${d.renewal_rate}%`]].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="font-display font-bold text-slate-900">{v}</p>
            <p className="text-[11px] text-slate-500">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-4" data-testid="money-tab">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {revCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4" data-testid={`revenue-${c.label.toLowerCase().replace(/\s/g, "-")}`}>
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Wallet className="h-3 w-3" /> {c.label}</p>
            <p className="mt-1.5 font-display text-lg font-bold text-slate-900 truncate">{formatRupiah(c.value)}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProductBlock title="Career Pro" icon={Crown} d={data.career_pro} testId="money-career-pro" />
        <ProductBlock title="Company Member" icon={Building2} d={data.company_member} testId="money-member" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="conversion-pro">
          <p className="text-xs text-slate-500">Konversi Pelamar → Career Pro</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900">{data.conversion.career_pro_rate}%</p>
          <p className="text-xs text-slate-400 mt-1">{data.conversion.career_pro_ever} dari {data.conversion.candidates_total} pelamar pernah berlangganan</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="conversion-member">
          <p className="text-xs text-slate-500">Konversi Perusahaan → Member</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900">{data.conversion.member_rate}%</p>
          <p className="text-xs text-slate-400 mt-1">{data.conversion.member_ever} dari {data.conversion.companies_total} perusahaan pernah menjadi member</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [tab, setTab] = useState("growth");
  return (
    <DashboardLayout menu={ADMIN_MENU} title="Analytics & Insight">
      <div data-testid="admin-analytics-page">
        <div className="flex flex-wrap gap-2 mb-5" data-testid="analytics-tabs">
          {TABS.map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${tab === val ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
              data-testid={`analytics-tab-${val}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === "growth" && <GrowthTab />}
        {tab === "funnel" && <FunnelTab />}
        {tab === "market" && <MarketTab />}
        {tab === "talent" && <TalentTab />}
        {tab === "money" && <MoneyTab />}
        <p className="mt-5 text-xs text-slate-400 flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" /> Semua angka dihitung dari data database secara real-time.
        </p>
      </div>
    </DashboardLayout>
  );
}
