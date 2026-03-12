import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserService from '../../services/user.service';
import './topnav.css';

const pathToTitle = (pathname = '') => {
  const p = pathname.toLowerCase();
  if (/\/(tickets?)$/.test(p))         return 'My Tickets';
  if (/\/sla$/.test(p))                return 'SLA & Performance';
  if (/\/pending-approval$/.test(p))   return 'Pending Approval';
  if (/\/users?$/.test(p))             return 'User Management';
  if (/\/departments?$/.test(p))       return 'Departments';
  if (/\/roles?$/.test(p))             return 'Roles';
  return 'Dashboard';
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const TopNav = ({ initials = 'RT', userName = 'Admin' }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Get user initials and name from auth context if available
  const displayName = user?.name || user?.email?.split('@')[0] || userName;
  const displayEmail = user?.email || '';
  const displayInitials = displayName ? displayName.substring(0, 2).toUpperCase() : initials;
  const firstName = displayName.split(/[._\s@]/)[0];
  const pageTitle = pathToTitle(location.pathname);

  const signOut = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    try { navigate('/login'); } catch (e) {}
  };

  useEffect(() => {
    const onDocClick = (event) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target)) setOpen(false);
    };
    const onEsc = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setShowChange(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  return (
    <header className="um-header" role="banner">
      {/* hamburger for small screens */}
      <button className="hamburger" aria-label="Toggle navigation" onClick={() => {
        try { window.dispatchEvent(new Event('toggleSidebar')); } catch (e) {}
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" fill="currentColor"/></svg>
      </button>

      {/* Page title */}
      <div className="header-context">
        <span className="header-greeting">{greeting()}, {firstName}</span>
        <span className="header-title">{pageTitle}</span>
      </div>

      {/* Spacer */}
      <div className="header-spacer" />

      <div className="um-actions" ref={profileRef}>
        {/* Initials-only avatar button */}
        <div
          className="profile"
          tabIndex={0}
          role="button"
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Open profile menu"
          onClick={() => setOpen(s => !s)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(s => !s); }}
        >
          <div className="profile-initials" aria-hidden>{displayInitials}</div>
        </div>

        {open && (
          <div className="profile-menu" role="menu">
            {/* User identity header */}
            <div className="pm-user-header">
              <div className="pm-avatar">{displayInitials}</div>
              <div className="pm-user-info">
                <div className="pm-user-name">{displayName}</div>
                {displayEmail && <div className="pm-user-email">{displayEmail}</div>}
              </div>
            </div>

            <button className="pm-item" onClick={() => { setShowChange(true); setOpen(false); }} role="menuitem">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm-6 8h12v10H6V11z" fill="currentColor"/></svg>
              Change password
            </button>
            <button className="pm-item danger" onClick={signOut} role="menuitem">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16 13v-2H7V8l-5 4 5 4v-3zM20 3h-8v2h8v14h-8v2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" fill="currentColor"/></svg>
              Sign out
            </button>
          </div>
        )}

        {showChange && createPortal(
          <div className="um-modal-overlay" role="dialog" aria-modal="true">
            <div className="um-modal small">
              <h3>Change password</h3>
              {pwSuccess && <div style={{ background: '#ecfdf5', color: '#065f46', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{pwSuccess}</div>}
              {pwErr && <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{pwErr}</div>}
              <form onSubmit={async (e) => {
                e.preventDefault();
                setPwErr(''); setPwSuccess('');
                if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) return setPwErr('All fields are required.');
                if (pwForm.newPw !== pwForm.confirm) return setPwErr('New passwords do not match.');
                if (pwForm.newPw.length < 6) return setPwErr('New password must be at least 6 characters.');
                setPwSaving(true);
                try {
                  await UserService.changePassword(user.id, pwForm.current, pwForm.newPw);
                  setPwSuccess('Password changed successfully.');
                  setPwForm({ current: '', newPw: '', confirm: '' });
                  setTimeout(() => { setShowChange(false); setPwSuccess(''); }, 1800);
                } catch (ex) {
                  setPwErr(ex?.response?.data?.message || 'Failed to change password.');
                } finally { setPwSaving(false); }
              }}>
                <div className="row"><label>Current password<input type="password" required value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} /></label></div>
                <div className="row"><label>New password<input type="password" required value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} /></label></div>
                <div className="row"><label>Confirm new password<input type="password" required value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} /></label></div>
                <div className="row actions">
                  <button type="button" className="btn-muted" onClick={() => { setShowChange(false); setPwErr(''); setPwSuccess(''); setPwForm({ current: '', newPw: '', confirm: '' }); }} disabled={pwSaving}>Cancel</button>
                  <button className="btn-primary" disabled={pwSaving}>{pwSaving ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </header>
  );
};

export default TopNav;
