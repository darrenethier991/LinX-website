/* global React */
// LinX — Marketing site recreation. Composes the LinX design-system
// primitives into the full contractor-network landing page.
const { useState, useEffect, useRef } = React;
const {
  Navbar, Button, SectionLabel, StatItem, Badge, LiveCard, StepItem,
  FeatureCard, Testimonial, PricingCard, FaqItem, Segmented, Field, Toast,
} = window.LinXDesignSystem_1b8a1a;

const wrap = { maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 var(--container-pad)" };
const section = { padding: "var(--sp-section) 0" };
const titleStyle = { fontSize: "var(--fs-title)", fontWeight: 800, lineHeight: 1.2, margin: "0 0 14px" };
const subStyle = { fontSize: "15px", color: "var(--text-secondary)", maxWidth: "560px", lineHeight: 1.7, margin: 0 };
const raised = { background: "var(--surface-raised)", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)" };

const carbonBg = {
  background: "var(--linx-carbon)",
  backgroundSize: "var(--linx-carbon-size)",
};

function CarbonSheen() {
  return <div style={{ position: "absolute", inset: 0, background: "var(--linx-carbon-sheen)", pointerEvents: "none" }} />;
}

function CarbonHost() { return null; }

function Hero() {
  return (
    <section style={{ padding: "110px 0 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <CarbonSheen />
      <div style={{ ...wrap, position: "relative" }}>
        <div style={{ display: "inline-flex", border: "1px solid var(--linx-gold-35)", color: "var(--linx-gold)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", padding: "5px 16px", borderRadius: "999px", marginBottom: "32px", background: "rgba(0,0,0,.6)" }}>
          Est. 2026 — Canada's Contractor Network
        </div>
        <h1 style={{ fontSize: "clamp(52px,7vw,80px)", fontWeight: 900, letterSpacing: "0.06em", margin: "0 0 22px", display: "inline-block", background: "var(--linx-gold-foil)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.6))" }}>
          LinX
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "460px", margin: "0 auto 40px", lineHeight: 1.6 }}>
          Quiet automation for busy teams.<br />SMS, CRM, and AI agents that just work.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "56px" }}>
          <Button variant="outline-gold" href="#contact">Post a Project Free</Button>
          <Button variant="outline" href="#contact">Join as Contractor</Button>
        </div>
        <div style={{ display: "flex", border: "1px solid var(--border-hairline)", borderRadius: "14px", overflow: "hidden", background: "rgba(5,5,7,.9)" }}>
          {[["1,400+", "Contractors"], ["3,200+", "Projects Posted"], ["97%", "Match Rate"], ["4.9 ★", "Avg Rating"]].map(([v, l], i) => (
            <div key={i} style={{ flex: 1, padding: "18px 12px", borderRight: i < 3 ? "1px solid var(--border-hairline)" : "none" }}>
              <StatItem value={v} label={l} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEED = [
  ["🏠", "Kitchen Renovation", "Toronto, ON · CAD $22k–$30k · 2h ago", "Live", "success"],
  ["⚡", "Panel Upgrade — 200A", "Calgary, AB · CAD $4,500 · 4h ago", "New", "info"],
  ["🔧", "Roof Repair — Shingles", "Vancouver, BC · CAD $5,000 · 6h ago", "Hot", "error"],
  ["🚿", "Bathroom Remodel", "Ottawa, ON · CAD $12k–$18k · 8h ago", "New", "info"],
  ["🌳", "Backyard Landscaping", "Barrie, ON · CAD $6,000 · 10h ago", "Live", "success"],
  ["🏗️", "Basement Finishing", "Edmonton, AB · CAD $35k · 12h ago", "Hot", "error"],
];

function LiveFeed() {
  return (
    <section style={raised}>
      <div style={{ ...wrap, ...section }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
          <div>
            <SectionLabel>Real-Time Activity</SectionLabel>
            <h2 style={{ ...titleStyle, fontSize: "26px", margin: 0 }}>Live Project Feed</h2>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: "var(--linx-success)", textTransform: "uppercase", letterSpacing: "0.16em" }}>
            <span style={{ width: "8px", height: "8px", background: "var(--linx-success)", borderRadius: "50%" }} />Live
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "12px" }}>
          {FEED.map((f, i) => <LiveCard key={i} icon={f[0]} title={f[1]} meta={f[2]} badge={f[3]} badgeTone={f[4]} />)}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["1", "Post Your Project", "Describe your job in 30 seconds — what, when, and budget. Free for homeowners."],
    ["2", "Get Matched Instantly", "Our algorithm surfaces the best verified contractors in your city."],
    ["3", "Review Real Quotes", "Transparent quotes, no hidden fees. Verified reviews from your neighbours."],
    ["4", "Hire With Confidence", "Choose your contractor, agree on terms, get the job done."],
  ];
  return (
    <section style={{ ...wrap, ...section, textAlign: "center" }}>
      <SectionLabel>Simple Process</SectionLabel>
      <h2 style={{ ...titleStyle, margin: "0 auto 14px" }}>How LinX Works</h2>
      <p style={{ ...subStyle, margin: "0 auto" }}>From posting a project to shaking hands on a quote — LinX makes every step effortless.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "28px", marginTop: "48px" }}>
        {steps.map((s, i) => <StepItem key={i} number={s[0]} title={s[1]} description={s[2]} />)}
      </div>
    </section>
  );
}

function WhoServes() {
  return (
    <section style={raised}>
      <div style={{ ...wrap, ...section }}>
        <SectionLabel>Built for Both Sides</SectionLabel>
        <h2 style={titleStyle}>Who LinX Serves</h2>
        <p style={subStyle}>Whether you own a home or run a trade business, LinX is built specifically for you.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px", marginTop: "40px" }}>
          <FeatureCard icon="🏡" title="Homeowners"
            description="Stop scrolling through sketchy listings. LinX gives you instant access to verified, local professionals who care about their reputation."
            features={["Completely free — forever", "Verified contractors only", "Real reviews from real neighbours", "Transparent quotes, no bidding wars", "All trades: plumbers, electricians, roofers"]} />
          <FeatureCard icon="🔨" title="Contractors"
            description="Stop chasing leads. LinX sends you qualified homeowners in your city who are ready to hire right now — no bidding wars, no wasted time."
            features={["Qualified leads delivered daily", "CRM to track your entire pipeline", "URL shortener with click analytics", "EchoForge automation marketplace", "Google Sheets sync for your data"]} />
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    [5, "I found a roofer in 10 minutes. Posted my project, got 3 quotes by the next morning. LinX is exactly what this industry needed.", "Jennifer M.", "Homeowner · Barrie, ON"],
    [5, "I went from 3 leads a month to 12 in my first 30 days on LinX. The CRM keeps everything organized and the automated follow-ups save me hours.", "Mike T.", "Electrical Contractor · Calgary, AB"],
    [5, "We'd been burned by contractors before. LinX's verification process gave us real confidence. Our kitchen turned out beautifully.", "Sandra & Dave K.", "Homeowners · Toronto, ON"],
  ];
  return (
    <section style={raised}>
      <div style={{ ...wrap, ...section }}>
        <SectionLabel>Client Stories</SectionLabel>
        <h2 style={titleStyle}>What People Are Saying</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "18px", marginTop: "40px" }}>
          {t.map((x, i) => <Testimonial key={i} rating={x[0]} quote={`"${x[1]}"`} author={x[2]} role={x[3]} />)}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const plans = [
    { name: "Starter", m: 29, a: 23, features: ["100 shortened links", "Basic click analytics", "CRM up to 500 leads", "Google Sheets sync", "15% EchoForge commission"], cta: "Get Started", featured: false },
    { name: "Pro", m: 79, a: 63, features: ["Unlimited shortened links", "Full analytics", "Unlimited CRM leads", "Sell on EchoForge", "Reduced 10% commission"], cta: "Subscribe Now", featured: true },
    { name: "Enterprise", m: 199, a: 159, features: ["Everything in Pro", "API access", "White-label shortener", "Bulk automation uploads", "Lowest 5% commission"], cta: "Contact Us", featured: false },
  ];
  return (
    <section style={{ ...wrap, ...section }}>
      <SectionLabel style={{ textAlign: "center" }}>Transparent Pricing</SectionLabel>
      <h2 style={{ ...titleStyle, textAlign: "center" }}>Plans for Every Business</h2>
      <p style={{ ...subStyle, textAlign: "center", margin: "0 auto" }}>Homeowners are always free. Contractors choose the plan that fits their growth stage.</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", margin: "32px 0", fontSize: "13px", fontWeight: 500 }}>
        <span>Monthly</span>
        <div onClick={() => setAnnual(!annual)} style={{ width: "44px", height: "24px", background: "var(--surface-card)", border: "1px solid var(--border-hairline)", borderRadius: "12px", position: "relative", cursor: "pointer" }}>
          <div style={{ width: "18px", height: "18px", background: "var(--linx-gold)", borderRadius: "50%", position: "absolute", top: "3px", left: annual ? "23px" : "3px", transition: "left .2s" }} />
        </div>
        <span>Annual <span style={{ background: "var(--linx-success-12)", color: "var(--linx-success)", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Save 20%</span></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "18px" }}>
        {plans.map((p, i) => (
          <PricingCard key={i} name={p.name} price={annual ? p.a : p.m}
            period={`per month, billed ${annual ? "annually" : "monthly"}`}
            features={p.features} cta={p.cta} featured={p.featured} />
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    ["Is LinX really free for homeowners?", "Yes — completely. Homeowners can post projects, receive quotes, read reviews, and hire without ever paying. LinX earns through contractor subscriptions and EchoForge commissions."],
    ["How are contractors verified?", "Every contractor goes through a profile review including business info, trade type, and service area. We encourage real reviews from past clients."],
    ["What trades does LinX cover?", "All major residential trades — plumbers, electricians, roofers, landscapers, general contractors, HVAC, painters, flooring, and more."],
    ["What is EchoForge?", "Our built-in automation marketplace. Contractors buy, remix, and sell workflow automations — from lead nurture sequences to social schedulers."],
    ["Can I cancel anytime?", "Yes. All plans are month-to-month (or annual with a 20% discount). Cancel anytime and keep access through your billing period."],
  ];
  return (
    <section style={{ ...raised, borderBottom: "none" }}>
      <div style={{ ...wrap, ...section }}>
        <SectionLabel>Got Questions?</SectionLabel>
        <h2 style={titleStyle}>Frequently Asked Questions</h2>
        <div style={{ marginTop: "40px" }}>
          {items.map((it, i) => <FaqItem key={i} question={it[0]} answer={it[1]} defaultOpen={i === 0} />)}
        </div>
      </div>
    </section>
  );
}

function Contact({ onToast }) {
  const [role, setRole] = useState("homeowner");
  return (
    <section style={{ ...raised, borderBottom: "none" }}>
      <div style={{ ...wrap, ...section }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "52px", alignItems: "start" }}>
          <div>
            <SectionLabel>Ready to Start?</SectionLabel>
            <div style={{ fontSize: "30px", fontWeight: 800, marginBottom: "10px" }}>Get In Touch</div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "26px", lineHeight: 1.7 }}>
              Whether you're a homeowner with a project or a contractor looking for quality leads — LinX is ready for you.
            </p>
            {[["Phone", "705-716-0803"], ["Email", "Darrenethier991@gmail.com"], ["Owner", "Darren Ethier"], ["Platform", "linxservices.ca"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 0", borderBottom: "1px solid var(--border-hairline)", fontSize: "14px" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", width: "70px", flexShrink: 0 }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <Segmented value={role} onChange={setRole} style={{ marginBottom: "20px" }}
              options={[{ label: "🏡 Homeowner", value: "homeowner" }, { label: "🔨 Contractor", value: "contractor" }]} />
            <Field label="Your Name" />
            <Field label="Phone" type="tel" />
            <Field label="Email" type="email" />
            {role === "homeowner"
              ? <Field label="Describe Your Project" multiline />
              : <Field label="Your Trade / Service" />}
            <Button variant="primary" block style={{ marginTop: "8px" }} onClick={() => onToast("✓ Message sent! We'll be in touch shortly.")}>Send Message</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    ["Platform", ["How It Works", "For Homeowners", "For Contractors", "Pricing"]],
    ["Features", ["Lead Matching", "CRM Pipeline", "URL Shortener", "EchoForge"]],
    ["Company", ["FAQ", "Contact", "Support", "Partner With Us"]],
  ];
  return (
    <footer style={{ background: "var(--surface-raised)", borderTop: "1px solid var(--border-hairline)", padding: "40px 0 22px" }}>
      <div style={wrap}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "32px", marginBottom: "32px" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--linx-gold)", letterSpacing: "-0.04em", marginBottom: "6px" }}>LinX</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px", fontStyle: "italic" }}>"Linking People Together" — Est. 2026</div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "280px", margin: 0 }}>Canada's Contractor Network. Built to connect homeowners with verified trades people across the country.</p>
          </div>
          {cols.map(([h, links]) => (
            <div key={h}>
              <h4 style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--text-secondary)", marginBottom: "12px" }}>{h}</h4>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "7px" }}>
                {links.map((l) => <li key={l}><a href="#" style={{ fontSize: "13px", color: "var(--text-secondary)", textDecoration: "none" }}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)" }}>
          <span>© 2026 LinX — Canada's Contractor Network.</span>
          <span>linxservices.ca</span>
        </div>
      </div>
    </footer>
  );
}

function MarketingApp() {
  const [toast, setToast] = useState(null);
  function showToast(msg) {
    setToast(msg);
    clearTimeout(window.__t);
    window.__t = setTimeout(() => setToast(null), 4000);
  }
  return (
    <div style={{ ...carbonBg, minHeight: "100vh" }}>
      <Navbar links={["How It Works", "Who It's For", "Pricing", "FAQ", "Contact"]} cta="Get Started Free" onCta={() => showToast("Welcome to LinX — let's get you set up.")} />
      <Hero />
      <LiveFeed />
      <HowItWorks />
      <WhoServes />
      <Testimonials />
      <Pricing />
      <Faq />
      <div id="contact"><Contact onToast={showToast} /></div>
      <Footer />
      {toast && <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}><Toast>{toast}</Toast></div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MarketingApp />);
