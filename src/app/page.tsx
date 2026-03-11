export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        background: "#111",
        color: "#fff",
        padding: 24,
      }}
    >
      <h1>ShowtimeProp Landings</h1>
      <p>Escaneá el QR del cartel para ver el tour virtual.</p>
    </div>
  );
}
