export default function LoadingSkeleton({ variant = 'card', count = 1 }) {
  const skeletons = Array(count).fill(0);

  if (variant === 'stats') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {skeletons.map((_, i) => (
          <div key={i} className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl h-32 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {skeletons.map((_, i) => (
        <div key={i} className="bg-gray-900/50 border border-gray-800 p-5 rounded-xl h-64 animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-2/3 mb-4"></div>
          <div className="flex gap-2 mb-8">
            <div className="h-4 bg-gray-800 rounded w-16"></div>
            <div className="h-4 bg-gray-800 rounded w-16"></div>
          </div>
          <div className="mt-auto h-12 bg-gray-800/50 rounded-xl"></div>
        </div>
      ))}
    </div>
  );
}
