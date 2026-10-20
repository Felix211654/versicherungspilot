export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Wird geladen …</span>
      <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-surface-muted" />
    </div>
  );
}
