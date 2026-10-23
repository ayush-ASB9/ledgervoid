"use client";

import { Menu, Upload } from "lucide-react";

type TopbarProps = {
  onMenuClick: () => void;
  onUploadClick: () => void;
};

export function Topbar({
  onMenuClick,
  onUploadClick,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-heading">
        <button
          aria-label="Open navigation"
          className="icon-button menu-button"
          onClick={onMenuClick}
          type="button"
        >
          <Menu size={20} />
        </button>
        <div>
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <h1>Financial overview</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <button
          aria-label="Upload annual report"
          className="button button-primary"
          onClick={onUploadClick}
          type="button"
        >
          <Upload size={15} />
          <span>Upload annual report</span>
        </button>
      </div>
    </header>
  );
}
