// Reusable loading skeleton components
export function SkeletonCard({ className = "" }) {
  return (
    <div className={`skeleton skeleton-card ${className}`} aria-hidden="true" />
  );
}

export function SkeletonText({ width = "100%", className = "" }) {
  return (
    <div
      className={`skeleton skeleton-text ${className}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton skeleton-text" style={{ width: i === 0 ? "80%" : `${50 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-blue-100 px-5 py-6 shadow-sm shadow-blue-500/10">
      <div className="skeleton skeleton-text" style={{ width: "50%" }} />
      <div className="skeleton mt-3" style={{ height: 36, width: "40%", borderRadius: 8 }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="skeleton" style={{ height: 14, width: "70%", borderRadius: 4 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
