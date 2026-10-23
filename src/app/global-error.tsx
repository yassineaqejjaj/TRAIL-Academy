"use client";

// Last-resort boundary: replaces the whole document, so it cannot rely on the layout, fonts or design tokens.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>Une erreur est survenue</h1>
          <p style={{ color: "#555" }}>Veuillez réessayer dans un instant.{error.digest ? ` Référence : ${error.digest}` : ""}</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 24px", fontSize: 16, cursor: "pointer" }}>Réessayer</button>
        </div>
      </body>
    </html>
  );
}
