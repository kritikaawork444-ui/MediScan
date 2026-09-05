import React from "react";

/** Catches render crashes so the UI never stays a silent blank page. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("MediScan UI error:", error, info);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#F5FAFF",
            color: "#0F2942",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#5B7A99", marginBottom: 12 }}>
            MediScan hit a UI error. Try refresh. Details:
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#fff",
              border: "1px solid #D3E7F7",
              borderRadius: 12,
              padding: 12,
              fontSize: 12,
              color: "#b91c1c",
            }}
          >
            {msg}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              background: "linear-gradient(to right, #0EA5E9, #2563EB)",
              color: "#fff",
              border: 0,
              borderRadius: 999,
              padding: "10px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
