"use client";

import {
  BarChart3,
  FileText,
  LayoutDashboard,
  X,
} from "lucide-react";

type AppSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const navigation = [
  { label: "Overview", href: "#overview", icon: LayoutDashboard },
  { label: "Reports", href: "#reports", icon: FileText },
  { label: "Financial analysis", href: "#analysis", icon: BarChart3 },
];

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  return (
    <>
      <button
        aria-label="Close navigation"
        aria-hidden={!isOpen}
        className={`sidebar-scrim${isOpen ? " is-visible" : ""}`}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />
      <aside
        aria-label="Main navigation"
        className={`sidebar${isOpen ? " is-open" : ""}`}
      >
        <div className="brand-lockup">
          <div aria-hidden="true" className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <span className="brand-name">ledger<span>void</span></span>
          <button
            aria-label="Close navigation"
            className="icon-button sidebar-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy">
            <span className="eyebrow">WORKSPACE</span>
            <strong>Analyst workspace</strong>
          </div>
          <span aria-hidden="true" className="workspace-dots">•••</span>
        </div>

        <span className="nav-label">WORKSPACE</span>
        <nav className="primary-nav">
          {navigation.map(({ label, href, icon: Icon }, index) => (
            <a
              aria-current={index === 0 ? "page" : undefined}
              className={`nav-link${index === 0 ? " is-active" : ""}`}
              href={href}
              key={label}
              onClick={onClose}
            >
              <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-indicator" />
            <div>
              <strong>Analysis on request</strong>
              <span>Reports are analysed when you choose.</span>
            </div>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">A</div>
            <div className="profile-copy">
              <strong>Analyst</strong>
              <span>Personal workspace</span>
            </div>
            <span aria-hidden="true" className="profile-menu">···</span>
          </div>
        </div>
      </aside>
    </>
  );
}
