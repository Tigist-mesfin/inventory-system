import { Link } from "react-router-dom";

const HELP_PHONES = [
  { label: "0951 050 364", href: "tel:0951050364" },
  { label: "0940 637 672", href: "tel:0940637672" },
];

const COMPANY_ADDRESS = "Megenagna City Mall, 8th floor";

const PLAY_STORE_URL =
  String(import.meta.env.VITE_PLAY_STORE_URL || "").trim() ||
  "https://play.google.com/store/apps";
const APP_STORE_URL =
  String(import.meta.env.VITE_APP_STORE_URL || "").trim() ||
  "https://apps.apple.com/";

function PlayStoreIcon() {
  return (
    <svg className="store-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.6 2.3c-.4.2-.6.6-.6 1.1v17.2c0 .5.2.9.6 1.1l9.7-9.7L3.6 2.3zm12.3 7.1L13.2 12l2.7 2.6 3.4-1.9c.9-.5.9-1.9 0-2.4l-3.4-1.9zM4.8 21.5l8-8 2.3 2.3-8.7 5c-.6.3-1.2.2-1.6-.3zM4.8 2.5c.4-.5 1-.6 1.6-.3l8.7 5-2.3 2.3-8-8z"
      />
    </svg>
  );
}

function AppStoreIcon() {
  return (
    <svg className="store-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.4 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1-.1 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.7zM14.2 6.4c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-1 2.5 1 .1 1.9-.5 2.6-1.1z"
      />
    </svg>
  );
}

/**
 * Shared shell for login / register / OTP / forgot-password screens.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  footerLinks = null,
}) {
  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-shell">
        <header className="auth-brand">
          <p className="auth-app-name">Nigd Stock</p>
          <div className="auth-logo-frame">
            <img
              src="/logo.png"
              alt="Nigd Stock"
              className="auth-logo"
            />
          </div>
          <h1 className="auth-title">{title}</h1>
          {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
        </header>

        <div className="auth-card card">{children}</div>

        {footerLinks}

        <div className="auth-store-row">
          <a
            className="store-btn play"
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
          >
            <PlayStoreIcon />
            <span>
              <small>Download on</small>
              <strong>Google Play</strong>
            </span>
          </a>
          <a
            className="store-btn apple"
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
          >
            <AppStoreIcon />
            <span>
              <small>Download on the</small>
              <strong>App Store</strong>
            </span>
          </a>
        </div>

        <footer className="auth-footer">
          <p className="auth-help">
            For any help call{" "}
            {HELP_PHONES.map((phone, index) => (
              <span key={phone.href}>
                {index > 0 ? " / " : null}
                <a href={phone.href}>{phone.label}</a>
              </span>
            ))}
          </p>
          <p className="auth-powered">
            Powered by <strong>Abyssinia Software Technology PLC</strong>
          </p>
          <p className="auth-address">{COMPANY_ADDRESS}</p>
        </footer>
      </div>
    </div>
  );
}

export function AuthNavLinks({ links }) {
  if (!links?.length) return null;
  return (
    <nav className="auth-nav-links" aria-label="Account links">
      {links.map((link) => (
        <Link key={link.to} to={link.to} className={link.primary ? "auth-link-btn primary" : "auth-link-btn"}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
