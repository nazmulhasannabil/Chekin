export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <svg
            className="h-8 w-8 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">You&apos;re Offline</h1>
        <p className="text-muted-foreground text-sm mb-6">
          No internet connection. Your attendance check-ins will be saved locally and
          automatically synced when you reconnect.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
