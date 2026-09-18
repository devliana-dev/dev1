import { imageUrl } from "../lib/format";

// ============================================================================
// CV Profesional - 8 templates × 6 accent colors
// Single source of truth: uses career profile data (personal + sections)
// ============================================================================

export const CV_ACCENTS = [
  { id: "navy", label: "Navy", hex: "#0f172a", soft: "#e2e8f0", text: "#0f172a" },
  { id: "blue", label: "Blue", hex: "#0284c7", soft: "#e0f2fe", text: "#075985" },
  { id: "black", label: "Black", hex: "#111827", soft: "#f3f4f6", text: "#111827" },
  { id: "green", label: "Green", hex: "#047857", soft: "#d1fae5", text: "#065f46" },
  { id: "purple", label: "Purple", hex: "#6d28d9", soft: "#ede9fe", text: "#5b21b6" },
  { id: "gold", label: "Gold", hex: "#a16207", soft: "#fef3c7", text: "#854d0e" },
];

export const CV_TEMPLATES = [
  { id: "modern", name: "Modern Profesional", description: "Header berwarna, blok konten bersih, cocok untuk semua profesi." },
  { id: "ats", name: "ATS Friendly", description: "Format satu kolom sederhana, terbaca sempurna oleh sistem ATS." },
  { id: "executive", name: "Executive", description: "Serif klasik, sidebar gelap, kesan senior dan berwibawa." },
  { id: "creative", name: "Creative", description: "Timeline vertikal & aksen ikon, cocok untuk kreatif & desainer." },
  { id: "minimalis", name: "Minimalist", description: "Dua kolom minimalis dengan tipografi rapi dan luas napas." },
  { id: "corporate", name: "Corporate", description: "Header kartu-nama korporat, blok grid data, formal untuk BUMN/enterprise." },
  { id: "fresh_graduate", name: "Fresh Graduate", description: "Layout ceria, menonjolkan pendidikan, magang, & organisasi." },
  { id: "elegant", name: "Professional Elegant", description: "Serif elegan, garis tipis emas, kesan premium & konsultan." },
];

export function emptyCvData() {
  return {
    personal: { name: "", email: "", phone: "", address: "", city: "", photo: "" },
    summary: "",
    education: [],
    experience: [],
    skills: [],
    certifications: [],
    organizations: [],
    languages: [],
    portfolios: [],
    achievements: [],
    job_preferences: [],
  };
}

// Convert full career-profile object -> cv data (single source of truth)
export function profileToCvData(user, profile) {
  return {
    personal: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: profile?.address || "",
      city: profile?.city || "",
      photo: profile?.photo_path || "",
    },
    summary: profile?.summary || user?.about || "",
    education: profile?.education || [],
    experience: profile?.experience || [],
    skills: profile?.skills || [],
    certifications: profile?.certifications || [],
    organizations: profile?.organizations || [],
    languages: profile?.languages || [],
    portfolios: profile?.portfolios || [],
    achievements: profile?.achievements || [],
    job_preferences: profile?.job_preferences || [],
    target_position: profile?.target_position || "",
  };
}

const getAccent = (id) => CV_ACCENTS.find((a) => a.id === id) || CV_ACCENTS[0];

function ContactLine({ personal, sep = "  ·  ", className }) {
  const items = [personal.email, personal.phone, [personal.address, personal.city].filter(Boolean).join(", ")].filter(Boolean);
  return <p className={className}>{items.join(sep)}</p>;
}

const dateRange = (a, b, current) => [a, current ? "Sekarang" : b].filter(Boolean).join(" – ");

// ============================================================================
// 1. MODERN PROFESIONAL
// ============================================================================
function ModernTemplate({ data, accent }) {
  const a = getAccent(accent);
  const { personal } = data;
  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed">
      <div className="px-8 py-7 flex items-center gap-5" style={{ background: a.hex }}>
        {personal.photo && (
          <img src={imageUrl(personal.photo)} alt={personal.name} className="h-20 w-20 rounded-full object-cover border-2 border-white/40 shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold text-white">{personal.name || "Nama Lengkap"}</h1>
          {data.target_position && <p className="text-white/80 text-sm font-medium mt-0.5">{data.target_position}</p>}
          <ContactLine personal={personal} className="mt-1.5 text-white/70 text-xs" />
        </div>
      </div>
      <div className="px-8 py-6 space-y-5">
        {data.summary && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide pl-2.5" style={{ color: a.text, borderLeft: `4px solid ${a.hex}` }}>Ringkasan Profesional</h2>
            <p className="mt-2 text-slate-700">{data.summary}</p>
          </section>
        )}
        {data.experience.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide pl-2.5" style={{ color: a.text, borderLeft: `4px solid ${a.hex}` }}>Pengalaman Kerja</h2>
            <div className="mt-2 space-y-3">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <p className="font-semibold">{e.position || "Posisi"} <span className="font-normal text-slate-500">— {e.company}</span></p>
                  <p className="text-xs text-slate-400">{dateRange(e.start_date, e.end_date, e.current)}</p>
                  {e.description && <p className="mt-0.5 text-slate-600">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide pl-2.5" style={{ color: a.text, borderLeft: `4px solid ${a.hex}` }}>Pendidikan</h2>
            <div className="mt-2 space-y-2">
              {data.education.map((e, i) => (
                <div key={i}>
                  <p className="font-semibold">{e.institution}{e.major ? ` — ${e.major}` : ""}</p>
                  <p className="text-xs text-slate-400">{[e.start_year, e.end_year].filter(Boolean).join(" – ")}</p>
                </div>
              ))}
            </div>
          </section>
        )}
        {data.skills.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide pl-2.5" style={{ color: a.text, borderLeft: `4px solid ${a.hex}` }}>Keahlian</h2>
            <p className="mt-2 text-slate-700">{data.skills.map((s) => s.level ? `${s.name} (${s.level})` : s.name).join(" · ")}</p>
          </section>
        )}
        {data.certifications.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide pl-2.5" style={{ color: a.text, borderLeft: `4px solid ${a.hex}` }}>Sertifikasi</h2>
            <ul className="mt-2 space-y-1">
              {data.certifications.map((c, i) => (
                <li key={i} className="text-slate-700">• {c.name}{c.issuer ? ` — ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}</li>
              ))}
            </ul>
          </section>
        )}
        {data.portfolios.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide pl-2.5" style={{ color: a.text, borderLeft: `4px solid ${a.hex}` }}>Portfolio</h2>
            <ul className="mt-2 space-y-1 text-slate-700">
              {data.portfolios.map((p, i) => <li key={i}>• {p.title}{p.link ? ` — ${p.link}` : ""}</li>)}
            </ul>
          </section>
        )}
        {data.languages.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide pl-2.5" style={{ color: a.text, borderLeft: `4px solid ${a.hex}` }}>Bahasa</h2>
            <p className="mt-2 text-slate-700">{data.languages.map((l) => l.level ? `${l.name} (${l.level})` : l.name).join(" · ")}</p>
          </section>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 2. ATS FRIENDLY
// ============================================================================
function AtsTemplate({ data, accent }) {
  const a = getAccent(accent);
  const { personal } = data;
  const Sec = ({ title, children }) => (
    <section className="mt-4">
      <h2 className="text-xs font-bold uppercase tracking-widest pb-1" style={{ color: a.text, borderBottom: `1px solid ${a.hex}` }}>{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed px-8 py-7">
      <h1 className="font-display text-2xl font-bold text-center" style={{ color: a.text }}>{personal.name || "Nama Lengkap"}</h1>
      {data.target_position && <p className="text-center text-sm mt-0.5 text-slate-600">{data.target_position}</p>}
      <ContactLine personal={personal} className="mt-1 text-center text-xs text-slate-600" />
      {data.summary && <Sec title="Ringkasan Profesional"><p>{data.summary}</p></Sec>}
      {data.experience.length > 0 && (
        <Sec title="Pengalaman Kerja">
          {data.experience.map((e, i) => (
            <div key={i} className="mb-2.5">
              <p className="font-semibold">{e.position}, {e.company} <span className="font-normal text-slate-500">({dateRange(e.start_date, e.end_date, e.current)})</span></p>
              {e.description && <p className="text-slate-600">{e.description}</p>}
            </div>
          ))}
        </Sec>
      )}
      {data.education.length > 0 && (
        <Sec title="Pendidikan">
          {data.education.map((e, i) => (
            <p key={i} className="mb-1.5"><span className="font-semibold">{e.institution}{e.major ? `, ${e.major}` : ""}</span> <span className="text-slate-500">({[e.start_year, e.end_year].filter(Boolean).join(" – ")})</span></p>
          ))}
        </Sec>
      )}
      {data.skills.length > 0 && <Sec title="Keahlian"><p>{data.skills.map((s) => s.level ? `${s.name} (${s.level})` : s.name).join(", ")}</p></Sec>}
      {data.certifications.length > 0 && <Sec title="Sertifikasi">{data.certifications.map((c, i) => <p key={i}>{c.name}{c.issuer ? `, ${c.issuer}` : ""}{c.year ? `, ${c.year}` : ""}</p>)}</Sec>}
      {data.languages.length > 0 && <Sec title="Bahasa"><p>{data.languages.map((l) => l.level ? `${l.name} (${l.level})` : l.name).join(", ")}</p></Sec>}
      {data.portfolios.length > 0 && <Sec title="Portfolio">{data.portfolios.map((p, i) => <p key={i}>{p.title}{p.link ? ` — ${p.link}` : ""}</p>)}</Sec>}
    </div>
  );
}

// ============================================================================
// 3. EXECUTIVE — serif, sidebar gelap
// ============================================================================
function ExecutiveTemplate({ data, accent }) {
  const a = getAccent(accent);
  const { personal } = data;
  return (
    <div className="bg-white text-slate-900 flex" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "13px" }}>
      <div className="w-[36%] text-white px-6 py-8" style={{ background: a.hex }}>
        {personal.photo && (
          <img src={imageUrl(personal.photo)} alt={personal.name} className="h-24 w-24 rounded-full object-cover border-2 border-white/60 mx-auto mb-4" />
        )}
        <h1 className="text-xl font-bold text-center leading-tight tracking-wide">{personal.name || "Nama Lengkap"}</h1>
        {data.target_position && <p className="text-center text-xs italic mt-1 opacity-80">{data.target_position}</p>}
        <div className="mt-5 space-y-1.5 text-xs opacity-90 border-t border-white/20 pt-4">
          {personal.email && <p className="break-words">{personal.email}</p>}
          {personal.phone && <p>{personal.phone}</p>}
          {(personal.address || personal.city) && <p>{[personal.address, personal.city].filter(Boolean).join(", ")}</p>}
        </div>
        {data.skills.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1">Keahlian</h2>
            <ul className="mt-2 space-y-1 text-xs">{data.skills.map((s, i) => <li key={i}>• {s.name}{s.level ? ` — ${s.level}` : ""}</li>)}</ul>
          </div>
        )}
        {data.languages.length > 0 && (
          <div className="mt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1">Bahasa</h2>
            <ul className="mt-2 space-y-1 text-xs">{data.languages.map((l, i) => <li key={i}>• {l.name}{l.level ? ` — ${l.level}` : ""}</li>)}</ul>
          </div>
        )}
        {data.certifications.length > 0 && (
          <div className="mt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1">Sertifikasi</h2>
            <ul className="mt-2 space-y-1 text-xs">{data.certifications.map((c, i) => <li key={i}>• {c.name}{c.year ? ` (${c.year})` : ""}</li>)}</ul>
          </div>
        )}
      </div>
      <div className="flex-1 px-7 py-8 space-y-5">
        {data.summary && (
          <section>
            <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: a.text }}>Ringkasan Profesional</h2>
            <div className="h-[2px] w-16 mt-1" style={{ background: a.hex }} />
            <p className="mt-2 text-slate-700 italic">{data.summary}</p>
          </section>
        )}
        {data.experience.length > 0 && (
          <section>
            <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: a.text }}>Pengalaman Kerja</h2>
            <div className="h-[2px] w-16 mt-1" style={{ background: a.hex }} />
            <div className="mt-3 space-y-4">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <p className="font-bold">{e.position || "Posisi"}</p>
                  <p className="text-sm italic text-slate-600">{e.company} · {dateRange(e.start_date, e.end_date, e.current)}</p>
                  {e.description && <p className="mt-1 text-slate-700">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: a.text }}>Pendidikan</h2>
            <div className="h-[2px] w-16 mt-1" style={{ background: a.hex }} />
            <div className="mt-3 space-y-2">
              {data.education.map((e, i) => (
                <div key={i}>
                  <p className="font-bold">{e.institution}</p>
                  <p className="text-sm italic text-slate-600">{e.major}{e.major && (e.start_year || e.end_year) ? " · " : ""}{[e.start_year, e.end_year].filter(Boolean).join(" – ")}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 4. CREATIVE — timeline & rounded shapes
// ============================================================================
function CreativeTemplate({ data, accent }) {
  const a = getAccent(accent);
  const { personal } = data;
  const Timeline = ({ items, render }) => (
    <div className="relative pl-5 mt-3">
      <div className="absolute left-1.5 top-1 bottom-1 w-[2px]" style={{ background: a.hex, opacity: 0.25 }} />
      {items.map((it, i) => (
        <div key={i} className="relative pb-4 last:pb-0">
          <span className="absolute -left-[15px] top-1.5 h-3 w-3 rounded-full ring-2 ring-white" style={{ background: a.hex }} />
          {render(it)}
        </div>
      ))}
    </div>
  );
  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed">
      <div className="px-8 pt-8 pb-6 flex items-center gap-5" style={{ background: a.soft }}>
        {personal.photo && (
          <img src={imageUrl(personal.photo)} alt={personal.name} className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-md" />
        )}
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight" style={{ color: a.text }}>{personal.name || "Nama Lengkap"}</h1>
          {data.target_position && <p className="text-slate-700 font-medium mt-0.5">{data.target_position}</p>}
          <ContactLine personal={personal} sep="  |  " className="mt-2 text-xs text-slate-600" />
        </div>
      </div>
      <div className="px-8 py-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {data.summary && (
            <section>
              <h2 className="text-sm font-black uppercase" style={{ color: a.text }}>◆ Tentang Saya</h2>
              <p className="mt-2 text-slate-700">{data.summary}</p>
            </section>
          )}
          {data.experience.length > 0 && (
            <section>
              <h2 className="text-sm font-black uppercase" style={{ color: a.text }}>◆ Pengalaman</h2>
              <Timeline items={data.experience} render={(e) => (
                <>
                  <p className="font-bold">{e.position} <span className="font-normal text-slate-500">@ {e.company}</span></p>
                  <p className="text-xs text-slate-400">{dateRange(e.start_date, e.end_date, e.current)}</p>
                  {e.description && <p className="mt-1 text-slate-600">{e.description}</p>}
                </>
              )} />
            </section>
          )}
          {data.portfolios.length > 0 && (
            <section>
              <h2 className="text-sm font-black uppercase" style={{ color: a.text }}>◆ Portfolio</h2>
              <ul className="mt-2 space-y-1 text-slate-700">
                {data.portfolios.map((p, i) => <li key={i} className="text-sm">◈ {p.title}{p.link ? ` — ${p.link}` : ""}</li>)}
              </ul>
            </section>
          )}
        </div>
        <div className="space-y-5">
          {data.skills.length > 0 && (
            <section>
              <h2 className="text-sm font-black uppercase" style={{ color: a.text }}>◆ Skills</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.skills.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: a.soft, color: a.text }}>{s.name}</span>
                ))}
              </div>
            </section>
          )}
          {data.education.length > 0 && (
            <section>
              <h2 className="text-sm font-black uppercase" style={{ color: a.text }}>◆ Pendidikan</h2>
              <div className="mt-2 space-y-2 text-sm">
                {data.education.map((e, i) => (
                  <div key={i}>
                    <p className="font-semibold">{e.institution}</p>
                    <p className="text-xs text-slate-500">{e.major}{e.major && (e.start_year || e.end_year) ? " · " : ""}{[e.start_year, e.end_year].filter(Boolean).join("–")}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.languages.length > 0 && (
            <section>
              <h2 className="text-sm font-black uppercase" style={{ color: a.text }}>◆ Bahasa</h2>
              <ul className="mt-2 space-y-1 text-sm">{data.languages.map((l, i) => <li key={i}>• {l.name}{l.level ? ` (${l.level})` : ""}</li>)}</ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. MINIMALIST — dua kolom bersih
// ============================================================================
function MinimalisTemplate({ data, accent }) {
  const a = getAccent(accent);
  const { personal } = data;
  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed flex">
      <div className="w-[32%] px-6 py-8" style={{ background: a.soft }}>
        {personal.photo && (
          <img src={imageUrl(personal.photo)} alt={personal.name} className="h-20 w-20 rounded-full object-cover border border-white mb-4" />
        )}
        <h1 className="font-display text-xl font-extrabold leading-tight" style={{ color: a.text }}>{personal.name || "Nama Lengkap"}</h1>
        {data.target_position && <p className="text-xs text-slate-600 mt-1">{data.target_position}</p>}
        <div className="mt-4 space-y-1.5 text-xs text-slate-700 break-words">
          {personal.email && <p>{personal.email}</p>}
          {personal.phone && <p>{personal.phone}</p>}
          {(personal.address || personal.city) && <p>{[personal.address, personal.city].filter(Boolean).join(", ")}</p>}
        </div>
        {data.skills.length > 0 && (
          <div className="mt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: a.text }}>Keahlian</h2>
            <ul className="mt-2 space-y-1">{data.skills.map((s, i) => <li key={i}>• {s.name}{s.level ? ` (${s.level})` : ""}</li>)}</ul>
          </div>
        )}
        {data.languages.length > 0 && (
          <div className="mt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: a.text }}>Bahasa</h2>
            <ul className="mt-2 space-y-1">{data.languages.map((l, i) => <li key={i}>• {l.name}{l.level ? ` (${l.level})` : ""}</li>)}</ul>
          </div>
        )}
        {data.certifications.length > 0 && (
          <div className="mt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: a.text }}>Sertifikasi</h2>
            <ul className="mt-2 space-y-1 text-xs">{data.certifications.map((c, i) => <li key={i}>• {c.name}{c.year ? ` (${c.year})` : ""}</li>)}</ul>
          </div>
        )}
      </div>
      <div className="flex-1 px-6 py-7 space-y-5">
        {data.summary && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: a.text }}>Ringkasan Profesional</h2>
            <p className="mt-2 text-slate-700">{data.summary}</p>
          </section>
        )}
        {data.experience.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: a.text }}>Pengalaman Kerja</h2>
            <div className="mt-2 space-y-3">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <p className="font-semibold">{e.position} <span className="font-normal text-slate-500">— {e.company}</span></p>
                  <p className="text-xs text-slate-400">{dateRange(e.start_date, e.end_date, e.current)}</p>
                  {e.description && <p className="mt-0.5 text-slate-600">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: a.text }}>Pendidikan</h2>
            <div className="mt-2 space-y-2">
              {data.education.map((e, i) => (
                <div key={i}>
                  <p className="font-semibold">{e.institution}{e.major ? ` — ${e.major}` : ""}</p>
                  <p className="text-xs text-slate-400">{[e.start_year, e.end_year].filter(Boolean).join(" – ")}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 6. CORPORATE — header kartu-nama, grid data formal
// ============================================================================
function CorporateTemplate({ data, accent }) {
  const a = getAccent(accent);
  const { personal } = data;
  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed">
      <div className="border-t-8" style={{ borderColor: a.hex }} />
      <div className="px-8 py-6 border-b border-slate-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight uppercase" style={{ color: a.text }}>{personal.name || "Nama Lengkap"}</h1>
          {data.target_position && <p className="text-slate-600 font-semibold uppercase tracking-widest text-xs mt-1">{data.target_position}</p>}
        </div>
        {personal.photo && (
          <img src={imageUrl(personal.photo)} alt={personal.name} className="h-24 w-24 object-cover" style={{ border: `3px solid ${a.hex}` }} />
        )}
      </div>
      <div className="px-8 py-4 grid grid-cols-3 gap-3 text-xs bg-slate-50 border-b border-slate-200">
        <div><span className="font-bold uppercase tracking-wide text-[10px]" style={{ color: a.text }}>Email</span><p className="text-slate-700 break-words">{personal.email || "-"}</p></div>
        <div><span className="font-bold uppercase tracking-wide text-[10px]" style={{ color: a.text }}>Telepon</span><p className="text-slate-700">{personal.phone || "-"}</p></div>
        <div><span className="font-bold uppercase tracking-wide text-[10px]" style={{ color: a.text }}>Lokasi</span><p className="text-slate-700">{[personal.address, personal.city].filter(Boolean).join(", ") || "-"}</p></div>
      </div>
      <div className="px-8 py-6 space-y-5">
        {data.summary && (
          <section>
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: a.text }}>Profil</h2>
            <p className="mt-1 text-slate-700">{data.summary}</p>
          </section>
        )}
        {data.experience.length > 0 && (
          <section>
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: a.text }}>Pengalaman Kerja</h2>
            <table className="mt-2 w-full">
              <tbody>
                {data.experience.map((e, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 align-top w-32 text-xs text-slate-500 whitespace-nowrap">{dateRange(e.start_date, e.end_date, e.current)}</td>
                    <td className="py-2 align-top">
                      <p className="font-bold">{e.position}</p>
                      <p className="text-xs italic text-slate-600">{e.company}</p>
                      {e.description && <p className="mt-0.5 text-slate-700">{e.description}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: a.text }}>Pendidikan</h2>
            <table className="mt-2 w-full">
              <tbody>
                {data.education.map((e, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 align-top w-32 text-xs text-slate-500 whitespace-nowrap">{[e.start_year, e.end_year].filter(Boolean).join(" – ")}</td>
                    <td className="py-2 align-top">
                      <p className="font-bold">{e.institution}</p>
                      {e.major && <p className="text-xs italic text-slate-600">{e.major}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <div className="grid grid-cols-2 gap-6">
          {data.skills.length > 0 && (
            <section>
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: a.text }}>Keahlian</h2>
              <p className="mt-1 text-slate-700">{data.skills.map((s) => s.name).join(", ")}</p>
            </section>
          )}
          {data.languages.length > 0 && (
            <section>
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: a.text }}>Bahasa</h2>
              <p className="mt-1 text-slate-700">{data.languages.map((l) => l.level ? `${l.name} (${l.level})` : l.name).join(", ")}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 7. FRESH GRADUATE — menonjolkan pendidikan & organisasi
// ============================================================================
function FreshGraduateTemplate({ data, accent }) {
  const a = getAccent(accent);
  const { personal } = data;
  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed px-8 py-8">
      <div className="flex flex-col items-center text-center pb-5 border-b-2 border-dashed" style={{ borderColor: a.hex }}>
        {personal.photo && (
          <img src={imageUrl(personal.photo)} alt={personal.name} className="h-24 w-24 rounded-full object-cover mb-3" style={{ border: `4px solid ${a.hex}` }} />
        )}
        <h1 className="font-display text-2xl font-extrabold" style={{ color: a.text }}>{personal.name || "Nama Lengkap"}</h1>
        {data.target_position && <p className="text-slate-600 font-medium mt-1">{data.target_position}</p>}
        <ContactLine personal={personal} sep="  ·  " className="mt-2 text-xs text-slate-500" />
      </div>
      <div className="mt-6 space-y-5">
        {data.summary && (
          <section className="p-4 rounded-lg" style={{ background: a.soft }}>
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: a.text }}>Tentang Saya</h2>
            <p className="mt-1.5 text-slate-700">{data.summary}</p>
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: a.text }}>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px]" style={{ background: a.hex }}>1</span> Pendidikan
            </h2>
            <div className="mt-2 space-y-2 pl-7">
              {data.education.map((e, i) => (
                <div key={i}>
                  <p className="font-bold">{e.institution}</p>
                  <p className="text-xs text-slate-600">{e.major}{e.major && (e.start_year || e.end_year) ? " · " : ""}{[e.start_year, e.end_year].filter(Boolean).join(" – ")}</p>
                  {e.description && <p className="text-slate-600">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.organizations.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: a.text }}>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px]" style={{ background: a.hex }}>2</span> Organisasi
            </h2>
            <div className="mt-2 space-y-2 pl-7">
              {data.organizations.map((o, i) => (
                <div key={i}>
                  <p className="font-bold">{o.name} <span className="font-normal text-slate-500">— {o.role}</span></p>
                  <p className="text-xs text-slate-500">{o.period}</p>
                  {o.description && <p className="text-slate-600">{o.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.experience.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: a.text }}>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px]" style={{ background: a.hex }}>3</span> Pengalaman / Magang
            </h2>
            <div className="mt-2 space-y-2 pl-7">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <p className="font-bold">{e.position} <span className="font-normal text-slate-500">@ {e.company}</span></p>
                  <p className="text-xs text-slate-500">{dateRange(e.start_date, e.end_date, e.current)}</p>
                  {e.description && <p className="text-slate-600">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="grid grid-cols-2 gap-5">
          {data.skills.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: a.text }}>Keahlian</h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {data.skills.map((s, i) => <span key={i} className="px-2 py-0.5 rounded-md text-xs" style={{ background: a.soft, color: a.text }}>{s.name}</span>)}
              </div>
            </section>
          )}
          {data.achievements.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: a.text }}>Prestasi</h2>
              <ul className="mt-1.5 space-y-0.5 text-sm">{data.achievements.map((v, i) => <li key={i}>★ {v.name}{v.year ? ` (${v.year})` : ""}</li>)}</ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 8. PROFESSIONAL ELEGANT — serif elegan, garis emas
// ============================================================================
function ElegantTemplate({ data, accent }) {
  const a = getAccent(accent);
  const { personal } = data;
  return (
    <div className="bg-white text-slate-900" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "13px" }}>
      <div className="px-10 pt-10 pb-6 text-center">
        <h1 className="text-4xl font-black tracking-wide" style={{ color: a.text }}>{personal.name || "Nama Lengkap"}</h1>
        <div className="mx-auto mt-2 h-[1px] w-24" style={{ background: a.hex }} />
        {data.target_position && <p className="mt-2 text-sm italic tracking-widest uppercase text-slate-500">{data.target_position}</p>}
        <ContactLine personal={personal} sep="  •  " className="mt-3 text-xs text-slate-600 tracking-wide" />
      </div>
      <div className="mx-10 h-[3px] flex items-center gap-1">
        <span className="flex-1 h-[1px]" style={{ background: a.hex }} />
        <span className="h-2 w-2 rotate-45" style={{ background: a.hex }} />
        <span className="flex-1 h-[1px]" style={{ background: a.hex }} />
      </div>
      <div className="px-10 py-6 space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {data.summary && (
          <section className="text-center">
            <p className="italic text-slate-600 max-w-xl mx-auto leading-relaxed">"{data.summary}"</p>
          </section>
        )}
        {data.experience.length > 0 && (
          <section>
            <h2 className="text-center text-sm font-bold uppercase tracking-[0.3em]" style={{ color: a.text, fontFamily: "'Playfair Display', Georgia, serif" }}>Pengalaman</h2>
            <div className="mt-3 space-y-4">
              {data.experience.map((e, i) => (
                <div key={i} className="text-center">
                  <p className="font-bold text-slate-900">{e.position}</p>
                  <p className="text-sm italic text-slate-600">{e.company} · {dateRange(e.start_date, e.end_date, e.current)}</p>
                  {e.description && <p className="mt-1 text-slate-700 max-w-xl mx-auto">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <h2 className="text-center text-sm font-bold uppercase tracking-[0.3em]" style={{ color: a.text, fontFamily: "'Playfair Display', Georgia, serif" }}>Pendidikan</h2>
            <div className="mt-3 space-y-2 text-center">
              {data.education.map((e, i) => (
                <div key={i}>
                  <p className="font-bold">{e.institution}</p>
                  <p className="text-sm italic text-slate-600">{e.major}{e.major && (e.start_year || e.end_year) ? " · " : ""}{[e.start_year, e.end_year].filter(Boolean).join(" – ")}</p>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="grid grid-cols-3 gap-6 text-center">
          {data.skills.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: a.text, fontFamily: "'Playfair Display', Georgia, serif" }}>Keahlian</h2>
              <p className="mt-2 text-slate-700 text-sm">{data.skills.map((s) => s.name).join(" · ")}</p>
            </section>
          )}
          {data.languages.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: a.text, fontFamily: "'Playfair Display', Georgia, serif" }}>Bahasa</h2>
              <p className="mt-2 text-slate-700 text-sm">{data.languages.map((l) => l.name).join(" · ")}</p>
            </section>
          )}
          {data.certifications.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: a.text, fontFamily: "'Playfair Display', Georgia, serif" }}>Sertifikasi</h2>
              <ul className="mt-2 text-slate-700 text-sm space-y-0.5">{data.certifications.map((c, i) => <li key={i}>{c.name}</li>)}</ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Renderer
// ============================================================================
const TEMPLATE_MAP = {
  modern: ModernTemplate,
  ats: AtsTemplate,
  executive: ExecutiveTemplate,
  creative: CreativeTemplate,
  minimalis: MinimalisTemplate,
  corporate: CorporateTemplate,
  fresh_graduate: FreshGraduateTemplate,
  elegant: ElegantTemplate,
};

export function CvTemplateRenderer({ template, accent = "navy", data }) {
  const Component = TEMPLATE_MAP[template] || ModernTemplate;
  return <Component data={data} accent={accent} />;
}
