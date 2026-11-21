import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { experiences } from "./data/experiences.js";

const categories = ["All", "Games", "Tools", "Create", "System"];

function ExperienceCard({ item }) {
  return (
    <Link className="experience-card" to={"/" + item.href}>
      <div className="experience-preview">
        <span className="preview-tag">{item.tag}</span>
        <span className="preview-icon" aria-hidden="true">{item.icon}</span>
      </div>
      <div className="experience-info">
        <span className="experience-category">{item.category}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <span className="open-link">Open {item.title} <span aria-hidden="true">→</span></span>
      </div>
    </Link>
  );
}

function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return experiences.filter(item => {
      const inCategory = category === "All" || item.category === category;
      const matches = !term || [item.title, item.description, item.category, item.tag, item.href].join(" ").toLowerCase().includes(term);
      return inCategory && matches;
    });
  }, [query, category]);

  const surprise = () => {
    const choices = experiences.filter(item => item.category === "Games");
    const item = choices[Math.floor(Math.random() * choices.length)];
    navigate("/" + item.href);
  };

  return (
    <div className="home-page">
      <header className="topbar">
        <button className="brand-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Hyper-Pop home">
          <img src="/icon.svg" alt="" />
          <span>Hyper-Pop</span>
        </button>
        <nav className="top-actions" aria-label="Main navigation">
          <button className="quiet-button" onClick={() => setMenuOpen(true)}>☰ <span>Explore</span></button>
          <button className="quiet-button" onClick={surprise}>Surprise ✨</button>
          <Link className="quiet-button" to="/leaderboard.html">🏆</Link>
          <Link className="account-button" to="/accounts.html">Account ↗</Link>
        </nav>
      </header>

      {menuOpen && <div className="menu-scrim" onClick={() => setMenuOpen(false)}>
        <aside className="explore-menu" onClick={event => event.stopPropagation()}>
          <div className="menu-heading"><strong>Explore Hyper-Pop</strong><button onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button></div>
          <p>Every experience has its own little universe.</p>
          {categories.map(value => <button key={value} className="menu-category" onClick={() => { setCategory(value); setMenuOpen(false); window.scrollTo({ top: 500, behavior: "smooth" }); }}>{value}<span>→</span></button>)}
          <Link className="menu-category" to="/terminal.html" onClick={() => setMenuOpen(false)}>Terminal <span>↗</span></Link>
          <Link className="menu-category" to="/social.html" onClick={() => setMenuOpen(false)}>Social <span>↗</span></Link>
          <Link className="menu-category" to="/stats.html" onClick={() => setMenuOpen(false)}>Status & stats <span>↗</span></Link>
        </aside>
      </div>}

      <main className="content-wrap">
        <section className="hero">
          <span className="eyebrow">A SMALL INTERNET OF YOUR OWN</span>
          <h1>Curiosity,<br /><span>Go.</span></h1>
          <p>Games, tools, experiments, and strange little corners of the internet. Pick a door.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => document.getElementById("experiences")?.scrollIntoView({ behavior: "smooth" })}>Explore experiences <span>↓</span></button>
            <button className="secondary-button" onClick={surprise}>Surprise me ✨</button>
          </div>
        </section>

        <section className="catalog" id="experiences">
          <div className="section-heading">
            <div><span className="eyebrow">THE COLLECTION</span><h2>Find your next rabbit hole.</h2></div>
            <span className="result-count">{filtered.length} experiences</span>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search games, tools, and ideas..." aria-label="Search experiences" />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search">✕</button>}
          </label>
          <div className="category-tabs" role="group" aria-label="Filter by category">
            {categories.map(value => <button key={value} className={category === value ? "active" : ""} onClick={() => setCategory(value)}>{value}</button>)}
          </div>
          {filtered.length ? <div className="experience-grid">{filtered.map(item => <ExperienceCard key={item.href} item={item} />)}</div> : <div className="empty-state">Nothing here yet. The tiny internet is confused. 🤔</div>}
        </section>
      </main>
      <footer className="site-footer">made for curious people ✦ Hyper-Pop © {new Date().getFullYear()}<br /><span>Each experience lives on its own page.</span></footer>
    </div>
  );
}

function LegacyExperience() {
  const location = useLocation();
  const navigate = useNavigate();
  const source = location.pathname + (location.search ? location.search + "&" : "?") + "hp-react-embed=1" + location.hash;
  return (
    <main className="legacy-view">
      <div className="legacy-toolbar">
        <button onClick={() => navigate("/")}>← Hyper-Pop</button>
        <span>Legacy experience · React shell</span>
        <button onClick={() => window.open(source, "_blank", "noopener,noreferrer")}>Open separately ↗</button>
      </div>
      <iframe key={source} src={source} title="Hyper-Pop experience" allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write" allowFullScreen />
    </main>
  );
}

export default function App() {
  const location = useLocation();
  useEffect(() => {
    const embedded = location.pathname !== "/" && location.pathname !== "/index.html";
    document.body.classList.toggle("hp-legacy-active", embedded);
    window.HyperPopSoundtrack?.onPageChange?.(location.pathname);
    return () => document.body.classList.remove("hp-legacy-active");
  }, [location.pathname]);
  return location.pathname === "/" || location.pathname === "/index.html" ? <Home /> : <LegacyExperience />;
}
