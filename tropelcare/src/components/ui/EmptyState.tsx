interface EmptyStateProps {
  title: string;
  hint?: string;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-8 text-center text-slate-500">
      <span className="text-4xl">🔍</span>
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="text-sm">{hint}</p>}
    </div>
  );
}
