export default function StatusBadge({ status, map }) {
  const conf = map[status] || { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${conf.cls}`} data-testid={`status-badge-${status}`}>
      {conf.label}
    </span>
  );
}
