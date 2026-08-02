export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-6">
      <div className="h-7 w-40 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
      <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 max-w-lg animate-pulse rounded bg-muted" />
    </div>
  );
}
