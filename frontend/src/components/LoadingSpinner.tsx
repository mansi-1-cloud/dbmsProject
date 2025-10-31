/**
 * A "3 dot" loading spinner.
 */
export const LoadingSpinner = () => (
  <div className="flex justify-center items-center space-x-1">
    <span className="sr-only">Loading...</span>
    <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
  </div>
);

/**
 * Full-page loader
 */
export const PageLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
    <div className="flex justify-center items-center space-x-2">
      <span className="sr-only">Loading...</span>
      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
    </div>
  </div>
);

