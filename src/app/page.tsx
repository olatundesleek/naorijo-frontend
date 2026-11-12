import { Brand } from "@/components/primitives";
import Link from "next/link";

const features = [
  { number: "01", title: "One clear source of truth", text: "Keep products, production batches, and verification activity together in one considered workspace." },
  { number: "02", title: "Every code has a story", text: "Generate verification items for a batch and follow their journey when customers check a product." },
  { number: "03", title: "Access with intention", text: "Give teams the right level of access with company roles designed for the work they do." },
  { number: "04", title: "Policies that fit", text: "Set how repeated or blocked code use should be handled, then adjust as your needs change." },
];

export default function HomePage() {
  return (
    <main className="marketing">
      <header className="marketing-header">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Platform</a>
          <Link href="/register-company">Register company</Link>
          <a className="button button-secondary header-login" href="/login">Sign in <span aria-hidden="true">↗</span></a>
        </nav>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> CONFIDENCE, FROM SOURCE TO SHELF</p>
          <h1>Know what’s real.<br /><span>Prove what you make.</span></h1>
          <p className="hero-description">Origin helps companies manage products and batches, create verification codes, and give every customer a simple way to check authenticity.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/login">Sign in to Origin <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
          </div>
          <p className="hero-register">New company? <Link href="/register-company">Register your company <span aria-hidden="true">↗</span></Link></p>
          <div className="hero-note"><span className="avatar-stack"><i>O</i><i>✓</i><i>↗</i></span><span>For the people who make it<br />and the people who choose it.</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of a product verification label">
          <div className="art-glow" />
          <div className="product-card">
            <div className="product-top"><span className="product-logo">o.</span><span className="product-label">ORIGIN VERIFIED</span></div>
            <div className="bottle">
              <div className="bottle-cap" />
              <div className="bottle-neck" />
              <div className="bottle-body"><span>FIELD<br />NOTES</span><small>BOTANICAL CARE<br />EST. WITH INTENTION</small></div>
            </div>
            <div className="product-bottom"><span>Scan to verify</span><span className="tiny-code"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span></div>
          </div>
          <div className="floating-check"><span>✓</span><div><b>Product verified</b><small>Traceable to its batch</small></div></div>
          <span className="art-caption">A little more certainty,<br />right where it matters.</span>
        </div>
      </section>
      <div className="ticker" aria-label="Product verification made clear">
        <span>PRODUCTS WITH PROVENANCE</span><i>✳</i><span>TEAMS WITH CLARITY</span><i>✳</i><span>CONFIDENCE FOR EVERYONE</span><i>✳</i><span>PRODUCTS WITH PROVENANCE</span>
      </div>
      <section className="section how-section" id="how-it-works">
        <div className="section-intro">
          <p className="eyebrow">A SIMPLE PATH TO TRUST</p>
          <h2>From the people<br />who make it to you.</h2>
          <p>Two sides of the same promise: thoughtful tools for companies, and a clear answer for customers.</p>
        </div>
        <div className="steps">
          <article className="step-card"><span className="step-number">01</span><span className="step-icon">▤</span><h3>Organize your products</h3><p>Set up products and batches in a central workspace built for your team.</p><span className="step-line" /></article>
          <article className="step-card"><span className="step-number">02</span><span className="step-icon">⌗</span><h3>Create verification items</h3><p>Generate traceable codes for a batch and prepare a secure print export.</p><span className="step-line" /></article>
          <article className="step-card"><span className="step-number">03</span><span className="step-icon">✓</span><h3>Check with confidence</h3><p>Customers enter a code on the public verification page and see its status.</p><span className="step-line" /></article>
        </div>
      </section>
      <section className="feature-section" id="features">
        <div className="feature-top">
          <p className="eyebrow">MADE FOR THE WHOLE JOURNEY</p>
          <h2>Less guesswork.<br /><span>More good decisions.</span></h2>
        </div>
        <div className="feature-grid">{features.map((feature) => (
          <article key={feature.number} className="feature-card"><span>{feature.number}</span><h3>{feature.title}</h3><p>{feature.text}</p><i aria-hidden="true">↗</i></article>
        ))}</div>
        <div className="trust-panel">
          <div className="trust-symbol">◈</div>
          <div><p className="eyebrow">BUILT AROUND ACCOUNTABILITY</p><h3>Trust should be transparent.</h3><p>Verification results reflect the information and policies available to the platform. Company roles help teams work with appropriate access, while verification activity provides a traceable record. No claim is made that a result replaces a company’s own quality or safety checks.</p></div>
        </div>
      </section>
      <section className="closing-cta">
        <span className="closing-orbit orbit-one" /><span className="closing-orbit orbit-two" />
        <p className="eyebrow">A BETTER WAY TO KNOW</p><h2>Bring your product story<br />a little closer.</h2>
        <p>Origin is for the companies protecting what they make—and the customers who want to know.</p>
        <a className="button button-light" href="/login">Sign in to Origin <span aria-hidden="true">↗</span></a>
      </section>
      <footer className="marketing-footer"><Brand /><p>Making product authenticity easier to understand.</p><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#features">Platform</a><Link href="/register-company">Register company</Link><Link href="/login">Sign in</Link><Link href="/verify">Verify a product</Link></nav><small>© {new Date().getFullYear()} Origin. Product information is provided by participating companies.</small></footer>
    </main>
  );
}
