export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-72 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200/80 lg:col-span-2" />
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200/80" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-3xl bg-slate-200/80" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200/80" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200/80" />
      </div>
    </div>
  );
}
