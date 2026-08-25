import { imageUrl } from "../lib/format";

export const CV_TEMPLATES = [
  { id: "modern", name: "Template Modern", description: "Header berwarna dengan aksen profesional" },
  { id: "ats", name: "Template ATS", description: "Format sederhana yang ramah sistem ATS" },
  { id: "minimalis", name: "Template Minimalis", description: "Dua kolom bersih dan ringkas" },
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
  };
}

const SECTION_TITLES = {
  summary: "Ringkasan Profesional",
  experience: "Pengalaman Kerja",
  education: "Pendidikan",
  skills: "Keahlian",
  certifications: "Sertifikasi",
  organizations: "Organisasi",
  languages: "Bahasa",
};

function ContactLine({ personal, className }) {
  const items = [personal.email, personal.phone, [personal.address, personal.city].filter(Boolean).join(", ")].filter(Boolean);
  return <p className={className}>{items.join("  ·  ")}</p>;
}

function ModernTemplate({ data }) {
  const { personal } = data;
  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed">
      <div className="bg-slate-900 px-8 py-7 flex items-center gap-5">
        {personal.photo && (
          <img src={imageUrl(personal.photo)} alt={personal.name || "Foto"} className="h-20 w-20 rounded-full object-cover border-2 border-sky-400/50 shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold text-white">{personal.name || "Nama Lengkap"}</h1>
          <ContactLine personal={personal} className="mt-1.5 text-sky-300 text-xs" />
        </div>
      </div>
      <div className="px-8 py-6 space-y-5">
        {data.summary && (
          <section>
            <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wide border-l-4 border-sky-600 pl-2.5">{SECTION_TITLES.summary}</h2>
            <p className="mt-2 text-slate-700">{data.summary}</p>
          </section>
        )}
        {data.experience.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wide border-l-4 border-sky-600 pl-2.5">{SECTION_TITLES.experience}</h2>
            <div className="mt-2 space-y-3">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <p className="font-semibold">{e.position || "Posisi"} <span className="font-normal text-slate-500">— {e.company}</span></p>
                  <p className="text-xs text-slate-400">{[e.start_date, e.end_date].filter(Boolean).join(" – ")}</p>
                  {e.description && <p className="mt-0.5 text-slate-600">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wide border-l-4 border-sky-600 pl-2.5">{SECTION_TITLES.education}</h2>
            <div className="mt-2 space-y-2">
              {data.education.map((e, i) => (
                <div key={i}>
                  <p className="font-semibold">{e.institution}{e.major ? ` — ${e.major}` : ""}</p>
                  <p className="text-xs text-slate-400">{[e.start_year, e.end_year].filter(Boolean).join(" – ")}</p>
                  {e.description && <p className="text-slate-600">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.skills.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wide border-l-4 border-sky-600 pl-2.5">{SECTION_TITLES.skills}</h2>
            <p className="mt-2 text-slate-700">{data.skills.map((s) => s.level ? `${s.name} (${s.level})` : s.name).join(" · ")}</p>
          </section>
        )}
        {data.certifications.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wide border-l-4 border-sky-600 pl-2.5">{SECTION_TITLES.certifications}</h2>
            <ul className="mt-2 space-y-1">
              {data.certifications.map((c, i) => (
                <li key={i} className="text-slate-700">• {c.name}{c.issuer ? ` — ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}</li>
              ))}
            </ul>
          </section>
        )}
        {data.organizations.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wide border-l-4 border-sky-600 pl-2.5">{SECTION_TITLES.organizations}</h2>
            <ul className="mt-2 space-y-1">
              {data.organizations.map((o, i) => (
                <li key={i} className="text-slate-700">• {o.name}{o.role ? ` — ${o.role}` : ""}{o.period ? ` (${o.period})` : ""}{o.description ? `: ${o.description}` : ""}</li>
              ))}
            </ul>
          </section>
        )}
        {data.languages.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wide border-l-4 border-sky-600 pl-2.5">{SECTION_TITLES.languages}</h2>
            <p className="mt-2 text-slate-700">{data.languages.map((l) => l.level ? `${l.name} (${l.level})` : l.name).join(" · ")}</p>
          </section>
        )}
      </div>
    </div>
  );
}

function AtsTemplate({ data }) {
  const { personal } = data;
  const Sec = ({ title, children }) => (
    <section className="mt-4">
      <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-800 pb-1">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed px-8 py-7">
      {personal.photo && (
        <div className="flex justify-center mb-3">
          <img src={imageUrl(personal.photo)} alt={personal.name || "Foto"} className="h-20 w-20 rounded-full object-cover border border-slate-200" />
        </div>
      )}
      <h1 className="font-display text-2xl font-bold text-center">{personal.name || "Nama Lengkap"}</h1>
      <ContactLine personal={personal} className="mt-1 text-center text-xs text-slate-600" />
      {data.summary && <Sec title={SECTION_TITLES.summary}><p>{data.summary}</p></Sec>}
      {data.experience.length > 0 && (
        <Sec title={SECTION_TITLES.experience}>
          {data.experience.map((e, i) => (
            <div key={i} className="mb-2.5">
              <p className="font-semibold">{e.position}, {e.company} <span className="font-normal text-slate-500">({[e.start_date, e.end_date].filter(Boolean).join(" – ")})</span></p>
              {e.description && <p className="text-slate-600">{e.description}</p>}
            </div>
          ))}
        </Sec>
      )}
      {data.education.length > 0 && (
        <Sec title={SECTION_TITLES.education}>
          {data.education.map((e, i) => (
            <p key={i} className="mb-1.5"><span className="font-semibold">{e.institution}{e.major ? `, ${e.major}` : ""}</span> <span className="text-slate-500">({[e.start_year, e.end_year].filter(Boolean).join(" – ")})</span>{e.description ? ` — ${e.description}` : ""}</p>
          ))}
        </Sec>
      )}
      {data.skills.length > 0 && <Sec title={SECTION_TITLES.skills}><p>{data.skills.map((s) => s.level ? `${s.name} (${s.level})` : s.name).join(", ")}</p></Sec>}
      {data.certifications.length > 0 && <Sec title={SECTION_TITLES.certifications}>{data.certifications.map((c, i) => <p key={i}>{c.name}{c.issuer ? `, ${c.issuer}` : ""}{c.year ? `, ${c.year}` : ""}</p>)}</Sec>}
      {data.organizations.length > 0 && <Sec title={SECTION_TITLES.organizations}>{data.organizations.map((o, i) => <p key={i}>{o.name}{o.role ? ` — ${o.role}` : ""}{o.period ? ` (${o.period})` : ""}{o.description ? `: ${o.description}` : ""}</p>)}</Sec>}
      {data.languages.length > 0 && <Sec title={SECTION_TITLES.languages}><p>{data.languages.map((l) => l.level ? `${l.name} (${l.level})` : l.name).join(", ")}</p></Sec>}
    </div>
  );
}

function MinimalisTemplate({ data }) {
  const { personal } = data;
  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed flex">
      <div className="w-[32%] bg-sky-50 px-6 py-7">
        {personal.photo && (
          <img src={imageUrl(personal.photo)} alt={personal.name || "Foto"} className="h-20 w-20 rounded-full object-cover border border-slate-200 mb-4" />
        )}
        <h1 className="font-display text-xl font-extrabold leading-tight">{personal.name || "Nama Lengkap"}</h1>
        <div className="mt-4 space-y-1.5 text-xs text-slate-600 break-words">
          {personal.email && <p>{personal.email}</p>}
          {personal.phone && <p>{personal.phone}</p>}
          {(personal.address || personal.city) && <p>{[personal.address, personal.city].filter(Boolean).join(", ")}</p>}
        </div>
        {data.skills.length > 0 && (
          <div className="mt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-700">{SECTION_TITLES.skills}</h2>
            <ul className="mt-2 space-y-1">
              {data.skills.map((s, i) => <li key={i}>• {s.name}{s.level ? ` (${s.level})` : ""}</li>)}
            </ul>
          </div>
        )}
        {data.languages.length > 0 && (
          <div className="mt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-700">{SECTION_TITLES.languages}</h2>
            <ul className="mt-2 space-y-1">
              {data.languages.map((l, i) => <li key={i}>• {l.name}{l.level ? ` (${l.level})` : ""}</li>)}
            </ul>
          </div>
        )}
        {data.certifications.length > 0 && (
          <div className="mt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-700">{SECTION_TITLES.certifications}</h2>
            <ul className="mt-2 space-y-1 text-xs">
              {data.certifications.map((c, i) => <li key={i}>• {c.name}{c.year ? ` (${c.year})` : ""}</li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="flex-1 px-6 py-7 space-y-5">
        {data.summary && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-700">{SECTION_TITLES.summary}</h2>
            <p className="mt-2 text-slate-700">{data.summary}</p>
          </section>
        )}
        {data.experience.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-700">{SECTION_TITLES.experience}</h2>
            <div className="mt-2 space-y-3">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <p className="font-semibold">{e.position} <span className="font-normal text-slate-500">— {e.company}</span></p>
                  <p className="text-xs text-slate-400">{[e.start_date, e.end_date].filter(Boolean).join(" – ")}</p>
                  {e.description && <p className="mt-0.5 text-slate-600">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-700">{SECTION_TITLES.education}</h2>
            <div className="mt-2 space-y-2">
              {data.education.map((e, i) => (
                <div key={i}>
                  <p className="font-semibold">{e.institution}{e.major ? ` — ${e.major}` : ""}</p>
                  <p className="text-xs text-slate-400">{[e.start_year, e.end_year].filter(Boolean).join(" – ")}</p>
                  {e.description && <p className="text-slate-600">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {data.organizations.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-700">{SECTION_TITLES.organizations}</h2>
            <ul className="mt-2 space-y-1">
              {data.organizations.map((o, i) => <li key={i}>• {o.name}{o.role ? ` — ${o.role}` : ""}{o.period ? ` (${o.period})` : ""}</li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export function CvTemplateRenderer({ template, data }) {
  if (template === "ats") return <AtsTemplate data={data} />;
  if (template === "minimalis") return <MinimalisTemplate data={data} />;
  return <ModernTemplate data={data} />;
}
