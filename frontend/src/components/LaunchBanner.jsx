import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PartyPopper, Rocket } from "lucide-react";
import api from "../lib/api";

const pad = (n) => String(Math.max(0, n)).padStart(2, "0");

export default function LaunchBanner() {
  const [launch, setLaunch] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    api.get("/launch-program").then((r) => setLaunch(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!launch?.active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [launch?.active]);

  if (!launch || !launch.is_enabled || launch.not_started) return null;

  if (launch.active) {
    const diff = Math.max(0, new Date(launch.end_date).getTime() - now);
    const units = [
      { v: Math.floor(diff / 86400000), l: "Hari" },
      { v: Math.floor((diff % 86400000) / 3600000), l: "Jam" },
      { v: Math.floor((diff % 3600000) / 60000), l: "Menit" },
      { v: Math.floor((diff % 60000) / 1000), l: "Detik" },
    ];
    return (
      <div className="rounded-xl bg-slate-900 text-white p-5 sm:p-6" data-testid="launch-banner">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 shrink-0">
              <PartyPopper className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display font-bold">Program Launching CirebonKarir</p>
              <p className="text-sm text-slate-300 mt-0.5">
                Gunakan seluruh fitur rekrutmen GRATIS selama periode launching.
              </p>
            </div>
          </div>
          <div className="flex gap-2" data-testid="launch-countdown">
            {units.map((u) => (
              <div key={u.l} className="min-w-16 rounded-lg bg-white/10 px-3 py-2 text-center">
                <p className="font-display text-xl font-extrabold tabular-nums">{pad(u.v)}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-300">{u.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
      data-testid="launch-ended-banner"
    >
      <div>
        <p className="font-display font-bold text-amber-900">Program Launching telah berakhir.</p>
        <p className="text-sm text-amber-800 mt-0.5">
          Anda sekarang menggunakan Paket Free. Upgrade ke Member Perusahaan untuk mendapatkan fitur
          dan masa tayang lowongan yang lebih lengkap.
        </p>
      </div>
      <Link
        to="/company/membership"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold shrink-0 hover:bg-slate-800"
        data-testid="launch-ended-upgrade-btn"
      >
        <Rocket className="h-4 w-4" /> Upgrade Member
      </Link>
    </div>
  );
}
