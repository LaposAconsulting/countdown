export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 24px",
        color: "#f3e9d2",
      }}
    >
      <p
        style={{
          fontFamily: '"Courier New", monospace',
          fontSize: "14px",
          letterSpacing: "8px",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        404
      </p>
      <h1
        style={{
          marginTop: "18px",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: "56px",
        }}
      >
        Straten&yacute; na mori
      </h1>
      <p style={{ marginTop: "12px", fontSize: "20px", opacity: 0.7 }}>
        T&aacute;to str&aacute;nka neexistuje.
      </p>
    </main>
  );
}
