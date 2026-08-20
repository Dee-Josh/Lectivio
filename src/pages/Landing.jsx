import { useState } from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="landing">
      {/* Nav */}
      <header className="landing-nav">
        <div className="landing-logo">
          <span className="sidebar-logo-icon">📖</span> <span className="sidebar-logo-text">Lectivio</span>
        </div>

        <nav className={`landing-nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <div className="landing-nav-mobile-actions">
            <Link to="/login" className="landing-login-link" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
            <Link to="/signup" className="primary-btn" onClick={() => setMenuOpen(false)}>
              Get Started Free
            </Link>
          </div>
        </nav>

        <div className="landing-nav-actions">
          <Link to="/login" className="landing-login-link">Log in</Link>
          <Link to="/signup" className="primary-btn">Get Started Free</Link>
        </div>

        <button
          className="landing-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-badge">The Smart Teaching Assistant for Lecturers</span>
          <h1>
            Less Admin. <br /><span className="text-accent">Better Teaching.</span>
          </h1>
          <p>
            Lectivio helps lecturers save time, reduce paperwork, stay organized, and focus on
            what truly matters — teaching, inspiring, and impacting lives.
          </p>

          {/* <div className="landing-mini-features">
            <div className="landing-mini-feature">
              <span className="landing-mini-icon">🕐</span>
              <div>
                <h5>Save Time</h5>
                <p>Automate repetitive academic tasks.</p>
              </div>
            </div>
            <div className="landing-mini-feature">
              <span className="landing-mini-icon">📊</span>
              <div>
                <h5>Stay Organized</h5>
                <p>Manage your courses, students and records in one place.</p>
              </div>
            </div>
            <div className="landing-mini-feature">
              <span className="landing-mini-icon">📈</span>
              <div>
                <h5>Make Better Decisions</h5>
                <p>Get insights that help you track performance and improve outcomes.</p>
              </div>
            </div>
          </div> */}

          <div className="landing-hero-actions">
            <Link to="/signup" className="primary-btn large">Get Started Free →</Link>
          </div>
          <div className="landing-hero-trust">
            <span>✓ No credit card</span>
            <span>✓ Free forever plan</span>
            <span>✓ Setup in minutes</span>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-hero-card">
            {/* <p className="muted small">Dashboard preview</p> */}
            <img src="./dashboard.png" className="dashboard-img" alt="Dashboard Snapshot" />
          </div>
        </div>
      </section>

      {/* Challenges / Features split */}
      <section className="landing-split" id="featuress">
        <div className="landing-split-left" id="solutions">
          <span className="landing-eyebrow landing-badge">Challenges we solve</span>
          <h2>Still doing these <span className="text-accent">manually?</span></h2>
          <p className="muted">
            Lectivio automates the time-consuming tasks that keep you from
            what matters most.
          </p>
          <ul className="landing-problem-list">
            <li><span className="x-red">✕</span> Manual attendance taking</li>
            <li><span className="x-red">✕</span> Complex score calculations</li>
            <li><span className="x-red">✕</span> Spreadsheets everywhere</li>
            <li><span className="x-red">✕</span> Lost or incomplete records</li>
            <li><span className="x-red">✕</span> Difficult result compilation</li>
            <li><span className="x-red">✕</span> Limited insights into performance</li>
          </ul>

          <div className="landing-mini-features">
            <div className="landing-mini-feature">
              <span className="landing-mini-icon">🕐</span>
              <div>
                <h5>Save Time</h5>
                <p>Automate repetitive academic tasks.</p>
              </div>
            </div>
            <div className="landing-mini-feature">
              <span className="landing-mini-icon">📊</span>
              <div>
                <h5>Stay Organized</h5>
                <p>Manage your courses, students and records in one place.</p>
              </div>
            </div>
            <div className="landing-mini-feature">
              <span className="landing-mini-icon">📈</span>
              <div>
                <h5>Make Better Decisions</h5>
                <p>Get insights that help you track performance and improve outcomes.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-split-right" id="features">
          <span className="landing-eyebrow landing-badge">Core features</span>
          <h2>Everything you need, <br /> all in <span className="text-accent">one place.</span></h2>

          <div className="landing-feature-grid">
            <div className="landing-feature-card">
              <p className="landing-card-icon">✅</p>
              <h4>Smart Attendance</h4>
              <p>Take attendance in seconds with real-time tracking.</p>
            </div>
            <div className="landing-feature-card">
              <p className="landing-card-icon">✅</p>
              <h4>Result Computation</h4>
              <p>Fast score calculation and grading, done for you.</p>
            </div>
            <div className="landing-feature-card">
              <p className="landing-card-icon">✅</p>
              <h4>Student Management</h4>
              <p>Organize student records and profiles in one place.</p>
            </div>
            <div className="landing-feature-card">
              <p className="landing-card-icon">✅</p>
              <h4>Insights</h4>
              <p>Track attendance and performance trends at a glance.</p>
            </div>
            <div className="landing-feature-card soon">
              <div className="landing-feature-card-header">
                <p className="landing-card-icon">✅</p>
                <span className="coming-soon-badge">Coming soon</span>
              </div>
                <h4>Assessment Management</h4>
              <p>Create and manage assignments, tests and exams with ease.</p>
            </div>
            <div className="landing-feature-card soon">
              <div className="landing-feature-card-header">
                <p className="landing-card-icon">✅</p>
                <span className="coming-soon-badge">Coming soon</span>
              </div>
                <h4>Analytics & Reports</h4>
              <p>Export results, attendance reports and grade sheets in one click.</p>
            </div>
            <div className="landing-feature-card soon">
              <div className="landing-feature-card-header">
                <p className="landing-card-icon">✅</p>
                <span className="coming-soon-badge">Coming soon</span>
              </div>
                <h4>Course Communication</h4>
              <p>Manage announcements and class communication in one place.</p>
            </div>
            <div className="landing-feature-card soon">
              <div className="landing-feature-card-header">
                <p className="landing-card-icon">✅</p>
                <span className="coming-soon-badge">Coming soon</span>
              </div>
                <h4>AI Teaching Assistant</h4>
              <p>Generate quizzes, lesson plans and summaries with the power of AI.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform / Devices */}
      <section className="landing-platform">
        <div className="landing-platform-description">
            <span className="landing-eyebrow center landing-badge">Built for modern teaching</span>
            <h2 className="center">A platform that works <span className="text-accent">beautifully, anywhere.</span></h2>
            <p className="muted platform-description-text">
            Use Lectivio on any device. Manage your classes on the go and stay
            productive always.
            </p>
            <div className="landing-platform-badges">
                <div className="landing-platform-badge">
                    <span>🌐</span> Web App <small>Access in browser</small>
                </div>
                <div className="landing-platform-badge soon">
                    <span>📱</span> Google Play <small>Coming soon</small>
                </div>
                <div className="landing-platform-badge soon">
                    <span>🍎</span> App Store <small>Coming soon</small>
                </div>
            </div>
        </div>
        <div className="landing-platform-image">
            <img src="./src/assets/devices.png" alt="Lectivio across different devices" />
        </div>
      </section>

      {/* How it works */}
      <section className="landing-steps" id="how-it-works">
        <span className="landing-eyebrow center">How it works</span>
        <h2 className="center">Simple steps. Powerful <span className="text-accent">Results.</span></h2>
        <div className="landing-steps-grid">
          <div className="landing-step">
            <span className="landing-step-num">1</span>
            <h4>Create Your Account</h4>
            <p className="muted small">Sign up in minutes and set up your lecturer profile.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">2</span>
            <h4>Create Courses</h4>
            <p className="muted small">Add your courses and class information.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">3</span>
            <h4>Add Students</h4>
            <p className="muted small">Import or add students easily.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">4</span>
            <h4>Take Attendance</h4>
            <p className="muted small">Mark attendance quickly and accurately.</p>
          </div>
          <div className="landing-step soon">
            <span className="landing-step-num muted-num">5</span>
            <h4>Grade & Assess <span className="coming-soon-badge inline">Soon</span></h4>
            <p className="muted small">Create assessments and grade with ease.</p>
          </div>
          <div className="landing-step soon">
            <span className="landing-step-num muted-num">6</span>
            <h4>Export Results <span className="coming-soon-badge inline">Soon</span></h4>
            <p className="muted small">Generate reports and share results instantly.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta" id="footer">
        <div>
          <h2>Ready to transform your teaching?</h2>
          <p>Join lecturers saving time and reducing admin stress with Lectivio.</p>
        </div>
        <Link to="/signup" className="primary-btn large light">Get Started Free →</Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-logo">📖 Lectivio</div>
        <p className="muted small">
          The smart teaching assistant that helps lecturers teach better and
          manage smarter.
        </p>
        <p className="muted small">© 2026 Lectivio. All rights reserved.</p>
      </footer>
    </div>
  );
}