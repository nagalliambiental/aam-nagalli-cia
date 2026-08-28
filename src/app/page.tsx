export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #021e4c 0%, #02296b 100%)",
        color: "#fff",
      }}
    >
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "2rem",
            letterSpacing: "0.02em",
            fontWeight: 700,
          }}
        >
          AAM <span style={{ color: "#ffcc00" }}>Ambiental &amp; Mineral</span>
        </h1>
        <p style={{ marginTop: "0.75rem", opacity: 0.85 }}>
          Sistema em construção — base (schema) aprovada na ETAPA 4.
        </p>
      </div>
    </main>
  );
}
