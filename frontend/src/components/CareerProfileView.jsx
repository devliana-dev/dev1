import {
  MapPin, GraduationCap, Briefcase, Award, Languages, Users, Trophy,
  FolderGit2, Mail, Phone, FileText, ExternalLink, Target,
} from "lucide-react";
import { fileUrl, imageUrl } from "../lib/format";

function Section({ icon: Icon, title, children, testId }) {
  return (
    <div className="mt-5" data-testid={testId}>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
        <Icon className="h-4 w-4 text-sky-600" /> {title}
      </h4>
      {children}
    </div>
  );
}

function Item({ title, subtitle, description }) {
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      {description && <p className="text-xs text-slate-600 mt-0.5">{description}</p>}
    </li>
  );
}

export default function CareerProfileView({ user = {}, profile = {}, showContact = false }) {
  const edu = profile.education || [];
  const exp = profile.experience || [];
  const skills = profile.skills || [];
  const certs = profile.certifications || [];
  const langs = profile.languages || [];
  const orgs = profile.organizations || [];
  const achievements = profile.achievements || [];
  const portfolios = profile.portfolios || [];
  const photo = imageUrl(profile.photo_path);

  return (
    <div data-testid="career-profile-view">
      <div className="flex items-start gap-4">
        {photo ? (
          <img src={photo} alt={user.name} className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
        ) : (
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-slate-900 text-white font-display text-xl font-bold shrink-0">
            {(user.name || "K").slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-slate-900">{user.name}</h3>
          {profile.target_position && (
            <p className="text-sm text-sky-700 font-medium flex items-center gap-1.5 mt-0.5">
              <Target className="h-4 w-4" /> {profile.target_position}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {profile.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.city}</span>}
            {showContact && user.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {user.email}</span>}
            {showContact && user.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {user.phone}</span>}
          </div>
        </div>
      </div>

      {(profile.summary || user.about) && (
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">{profile.summary || user.about}</p>
      )}

      {edu.length > 0 && (
        <Section icon={GraduationCap} title="Pendidikan" testId="cp-education">
          <ul className="divide-y divide-slate-100">
            {edu.map((e, i) => (
              <Item key={i} title={`${e.level ? `${e.level} — ` : ""}${e.institution || "-"}`}
                subtitle={[e.major, [e.start_year, e.current ? "Sekarang" : e.end_year].filter(Boolean).join(" - ")].filter(Boolean).join(" · ")}
                description={e.description} />
            ))}
          </ul>
        </Section>
      )}

      {exp.length > 0 && (
        <Section icon={Briefcase} title="Pengalaman Kerja" testId="cp-experience">
          <ul className="divide-y divide-slate-100">
            {exp.map((e, i) => (
              <Item key={i} title={`${e.position || "-"} — ${e.company || ""}`}
                subtitle={[e.start_date, e.current ? "Sekarang" : e.end_date].filter(Boolean).join(" - ")}
                description={e.description} />
            ))}
          </ul>
        </Section>
      )}
      {exp.length === 0 && user.experience && (
        <Section icon={Briefcase} title="Pengalaman Kerja" testId="cp-experience-text">
          <p className="text-sm text-slate-600">{user.experience}</p>
        </Section>
      )}

      {skills.length > 0 && (
        <Section icon={Award} title="Skill" testId="cp-skills">
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-medium border border-sky-100">
                {s.name}{s.level ? ` · ${s.level}` : ""}
              </span>
            ))}
          </div>
        </Section>
      )}

      {certs.length > 0 && (
        <Section icon={Award} title="Sertifikasi" testId="cp-certifications">
          <ul className="divide-y divide-slate-100">
            {certs.map((c, i) => (
              <li key={i} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500">{[c.issuer, c.year].filter(Boolean).join(" · ")}</p>
                </div>
                {c.file_path && (
                  <a href={fileUrl(c.file_path)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-sky-700 inline-flex items-center gap-1 shrink-0">
                    <FileText className="h-3.5 w-3.5" /> File
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {langs.length > 0 && (
        <Section icon={Languages} title="Bahasa" testId="cp-languages">
          <div className="flex flex-wrap gap-1.5">
            {langs.map((l, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                {l.name}{l.level ? ` · ${l.level}` : ""}
              </span>
            ))}
          </div>
        </Section>
      )}

      {orgs.length > 0 && (
        <Section icon={Users} title="Organisasi" testId="cp-organizations">
          <ul className="divide-y divide-slate-100">
            {orgs.map((o, i) => (
              <Item key={i} title={o.name} subtitle={[o.role, o.period].filter(Boolean).join(" · ")} description={o.description} />
            ))}
          </ul>
        </Section>
      )}

      {achievements.length > 0 && (
        <Section icon={Trophy} title="Prestasi" testId="cp-achievements">
          <ul className="divide-y divide-slate-100">
            {achievements.map((a, i) => (
              <Item key={i} title={a.name} subtitle={a.year} description={a.description} />
            ))}
          </ul>
        </Section>
      )}

      {portfolios.length > 0 && (
        <Section icon={FolderGit2} title="Portfolio" testId="cp-portfolios">
          <ul className="divide-y divide-slate-100">
            {portfolios.map((p, i) => (
              <li key={i} className="py-2 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-slate-800">{p.title}</p>
                {p.description && <p className="text-xs text-slate-600 mt-0.5">{p.description}</p>}
                {p.link && (
                  <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-sky-700 inline-flex items-center gap-1 mt-0.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Buka tautan
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {showContact && user.cv_path && (
        <a href={fileUrl(user.cv_path)} target="_blank" rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          data-testid="cp-cv-link">
          <FileText className="h-4 w-4" /> Lihat CV ({user.cv_filename || "CV"})
        </a>
      )}
    </div>
  );
}
