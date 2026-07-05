/* global React */
// LinX Admin — internal crawler & lead-intelligence dashboard.
// Slate + sky theme. Composes AdminStatCard / AdminBadge from the DS.
const { useState } = React;
const { AdminStatCard, AdminBadge } = window.LinXDesignSystem_1b8a1a;

const A = {
  bg: "var(--admin-bg)", surface: "var(--admin-surface)", soft: "var(--admin-surface-soft)",
  border: "var(--admin-border)", accent: "var(--admin-accent)", text: "var(--admin-text-primary)",
  muted: "var(--admin-text-secondary)",
};

function AdminBtn({ children, variant = "outline", onClick, type = "button", full }) {
  const styles = {
    primary: { background: A.accent, color: "#020617" },
    outline: { background: "transparent", color: A.text, border: `1px solid ${A.border}` },
  };
  return (
    <button type={type} onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", width: full ? "100%" : "auto",
      padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-sans)",
      border: "1px solid transparent", cursor: "pointer", ...styles[variant],
    }}>{children}</button>
  );
}

function Login({ onIn }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: A.bg }}>
      <form onSubmit={(e) => { e.preventDefault(); onIn(); }} style={{ width: "100%", maxWidth: "360px", background: "rgba(15,23,42,.8)", border: `1px solid ${A.soft}`, borderRadius: "12px", padding: "24px", boxShadow: "var(--shadow-admin)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
          <div style={{ height: "28px", width: "28px", borderRadius: "8px", background: "rgba(56,189,248,.2)", border: "1px solid rgba(56,189,248,.4)", display: "flex", alignItems: "center", justifyContent: "center", color: A.accent, fontSize: "12px", fontWeight: 700 }}>LX</div>
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: A.muted }}>LinX Admin</div>
            <div style={{ fontSize: "17px", fontWeight: 600, color: A.text }}>Sign in to dashboard</div>
          </div>
        </div>
        {["Username", "Password"].map((l) => (
          <div key={l} style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: A.muted, marginBottom: "6px" }}>{l}</label>
            <input type={l === "Password" ? "password" : "text"} defaultValue={l === "Username" ? "darren" : "••••••••"} style={{ width: "100%", borderRadius: "8px", background: A.surface, border: `1px solid ${A.border}`, padding: "8px 12px", fontSize: "14px", color: A.text, boxSizing: "border-box", outline: "none", fontFamily: "var(--font-sans)" }} />
          </div>
        ))}
        <AdminBtn variant="primary" type="submit" full>Sign in</AdminBtn>
      </form>
    </div>
  );
}

const CATS = [["Renovation", 42], ["Electrical", 31], ["Roofing", 24], ["Plumbing", 19], ["Landscaping", 14], ["HVAC", 9]];
const SRC = [["Kijiji", 38], ["HomeStars", 27], ["Facebook", 21], ["Referral", 14]];
const LEADS = [
  ["Kitchen Renovation", "Toronto, ON", "Renovation", "Kijiji", "Active"],
  ["200A Panel Upgrade", "Calgary, AB", "Electrical", "HomeStars", "Active"],
  ["Roof Repair", "Vancouver, BC", "Roofing", "Facebook", "Active"],
  ["Bathroom Remodel", "Ottawa, ON", "Renovation", "Referral", "Expired"],
  ["Backyard Landscaping", "Barrie, ON", "Landscaping", "Kijiji", "Active"],
];

function Bars({ title, data, max }) {
  return (
    <div style={{ background: "rgba(15,23,42,.8)", border: `1px solid ${A.soft}`, borderRadius: "12px", padding: "16px", boxShadow: "var(--shadow-admin)" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: A.text, marginBottom: "14px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {data.map(([label, v]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "92px", fontSize: "12px", color: A.muted, flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, height: "8px", background: A.surface, borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${(v / max) * 100}%`, height: "100%", background: A.accent, borderRadius: "4px" }} />
            </div>
            <div style={{ width: "24px", fontSize: "12px", color: A.text, textAlign: "right" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ onOut }) {
  const [crawling, setCrawling] = useState(true);
  return (
    <div style={{ minHeight: "100vh", background: A.bg, color: A.text }}>
      <header style={{ borderBottom: `1px solid ${A.soft}`, background: "rgba(2,6,23,.8)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ height: "28px", width: "28px", borderRadius: "8px", background: "rgba(56,189,248,.2)", border: "1px solid rgba(56,189,248,.4)", display: "flex", alignItems: "center", justifyContent: "center", color: A.accent, fontSize: "12px", fontWeight: 700 }}>LX</div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>LinX Admin</div>
              <div style={{ fontSize: "12px", color: A.muted }}>Crawler &amp; Lead Intelligence</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <AdminBtn>Refresh</AdminBtn>
            <AdminBtn onClick={onOut}>Sign out</AdminBtn>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
          <AdminStatCard label="Total Leads" value="3,204" delta={42} />
          <AdminStatCard label="Active Leads" value="1,180" delta={12} accent="success" />
          <AdminStatCard label="New Today" value="42" accent="accent" />
          <AdminStatCard label="Expired Leads" value="88" delta={-5} accent="danger" />
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Bars title="Leads by Category" data={CATS} max={42} />
            <Bars title="Leads by Source" data={SRC} max={38} />
          </div>
          <div style={{ background: "rgba(15,23,42,.8)", border: `1px solid ${A.soft}`, borderRadius: "12px", padding: "16px", boxShadow: "var(--shadow-admin)" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px" }}>Crawler</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: crawling ? A.accent : A.muted }} />
              <span style={{ fontSize: "13px", color: A.muted }}>{crawling ? "Running — 6 sources" : "Stopped"}</span>
            </div>
            <div style={{ fontSize: "12px", color: A.muted, marginBottom: "16px", lineHeight: 1.6 }}>Last run 4 min ago · 128 new records ingested this hour.</div>
            {crawling
              ? <AdminBtn full onClick={() => setCrawling(false)}>Stop Crawler</AdminBtn>
              : <AdminBtn variant="primary" full onClick={() => setCrawling(true)}>Start Crawler</AdminBtn>}
          </div>
        </section>

        <section style={{ background: "rgba(15,23,42,.8)", border: `1px solid ${A.soft}`, borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-admin)" }}>
          <div style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, borderBottom: `1px solid ${A.soft}` }}>Recent Leads</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ color: A.muted, textAlign: "left" }}>
                {["Project", "Location", "Category", "Source", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${A.soft}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEADS.map((l, i) => (
                <tr key={i}>
                  <td style={{ padding: "12px 16px", color: A.text, borderBottom: `1px solid ${A.surface}` }}>{l[0]}</td>
                  <td style={{ padding: "12px 16px", color: A.muted, borderBottom: `1px solid ${A.surface}` }}>{l[1]}</td>
                  <td style={{ padding: "12px 16px", color: A.muted, borderBottom: `1px solid ${A.surface}` }}>{l[2]}</td>
                  <td style={{ padding: "12px 16px", color: A.muted, borderBottom: `1px solid ${A.surface}` }}>{l[3]}</td>
                  <td style={{ padding: "12px 16px", borderBottom: `1px solid ${A.surface}` }}>
                    <AdminBadge tone={l[4] === "Active" ? "success" : "muted"}>{l[4]}</AdminBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

function AdminApp() {
  const [authed, setAuthed] = useState(false);
  return authed ? <Dashboard onOut={() => setAuthed(false)} /> : <Login onIn={() => setAuthed(true)} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdminApp />);
