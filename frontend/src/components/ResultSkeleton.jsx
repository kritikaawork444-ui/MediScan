export default function ResultSkeleton() {
  return (
    <div className="bg-panel border border-border rounded-xl2 p-4 mt-5 mb-4 animate-fade-slide-up">
      <div className="flex items-center gap-4">
        <div className="skeleton animate-shimmer w-16 h-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton animate-shimmer h-3 w-24 rounded-full" />
          <div className="skeleton animate-shimmer h-4 w-40 rounded-full" />
          <div className="skeleton animate-shimmer h-2.5 w-full rounded-full" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <div className="skeleton animate-shimmer h-2.5 w-full rounded-full" />
        <div className="skeleton animate-shimmer h-2.5 w-5/6 rounded-full" />
        <div className="skeleton animate-shimmer h-2.5 w-2/3 rounded-full" />
      </div>
    </div>
  );
}
