"use client";

import { reportError } from "@/lib/reportError";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: "40px", textAlign: "center", fontFamily: "system-ui" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>
            An error occurred in the admin portal. Our team has been notified.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "12px 24px",
              backgroundColor: "#1a1a2e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
