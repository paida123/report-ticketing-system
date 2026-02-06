import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './topnav.css';

const TopNav = ({ brand = 'OmniAdmin', initials = 'RT', userName = 'Admin', pageTitle = '' }) => {
  const [open, setOpen] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const navigate = useNavigate();

  const signOut = () => {
    // simple navigation to login; parent pages may also handle clearing auth
    try { navigate('/login'); } catch (e) {}
  };

  return (
    <header className="um-header" role="banner">
      {/* hamburger for small screens: dispatches a toggleSidebar event */}
      <button className="hamburger" aria-label="Toggle navigation" onClick={() => {
        try { window.dispatchEvent(new Event('toggleSidebar')); } catch (e) {}
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" fill="currentColor"/></svg>
      </button>
      {/* If a pageTitle is provided, show it on the left so page headings sit inline with the admin profile */}
      {pageTitle ? (
        <div className="page-title">
          <h1>{pageTitle}</h1>
        </div>
      ) : null}

      <div className="um-actions">
        <div className="profile" tabIndex={0} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(s => !s)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(s => !s); }}>
          <div className="profile-initials" aria-hidden>{initials}</div>
          <div className="profile-name">{userName}</div>
        </div>

        {open && (
          <div className="profile-menu" role="menu">
            <button className="pm-item" onClick={() => { setShowChange(true); setOpen(false); }} role="menuitem">Change password</button>
            <button className="pm-item" onClick={signOut} role="menuitem">Sign out</button>
          </div>
        )}

        {showChange && (
          <div className="um-modal-overlay" role="dialog" aria-modal="true">
            <div className="um-modal small">
              <h3>Change password</h3>
              <form onSubmit={(e) => { e.preventDefault(); setShowChange(false); }}>
                <div className="row"><label>Current password<input type="password" required /></label></div>
                <div className="row"><label>New password<input type="password" required /></label></div>
                <div className="row actions"><button type="button" className="btn-muted" onClick={() => setShowChange(false)}>Cancel</button><button className="btn-primary">Save</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopNav;
