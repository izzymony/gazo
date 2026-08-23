"use client";

// Lightweight CSS spinner — replaces a 74 kB lottie-web + animation.json payload
// that was loading just to render a loading indicator. (Perf P3 — bundle.)
export default function Loader({ text }: { text?: string }) {
  return (
    <div className="h-screen w-full px-6 flex flex-col justify-center items-center gap-3 z-toast">
      <div
        role="status"
        aria-label="Loading"
        className="h-10 w-10 rounded-full border-4 border-ink-10 border-t-brand animate-spin"
      />
      {text && (
        <p className="text-center text-body-sm text-ink-60 max-w-[max-content]">
          {text}
        </p>
      )}
    </div>
  );
}
