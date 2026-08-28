import { STATUS_META } from './constants';

const StatusBadge = ({ status, className = '' }: { status: string; className?: string }) => {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.color} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

export default StatusBadge;
