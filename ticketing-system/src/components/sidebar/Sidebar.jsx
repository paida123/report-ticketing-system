import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import './sidebarStyles.css';
import omniLogo from '../../images/OmniLogo.png';

const NavItem = ({ icon, label, active, onClick, badge }) => (
    <li className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} role="button" tabIndex={0}>
        <span className="icon" aria-hidden="true">{icon}</span>
        <span className="label">{label}</span>
        {badge != null && <span className="badge">{badge}</span>}
    </li>
);

const inferActiveKeyFromPath = (pathname = '') => {
    const p = String(pathname || '').toLowerCase();
    // user
    if (p === '/user' || p.startsWith('/user/')) {
        if (p.includes('/tickets')) return 'mytickets';
        if (p.includes('/sla')) return 'mysla';
        return 'dashboard';
    }
    // manager
    if (p === '/manager' || p.startsWith('/manager/')) {
        if (p.includes('/tickets')) return 'mytickets';
        if (p.includes('/sla')) return 'mysla';
        if (p.includes('/pending-approval')) return 'pendingApproval';
        return 'dashboard';
    }
    // executive
    if (p === '/executive' || p.startsWith('/executive/') || p.startsWith('/exec')) {
        if (p.includes('/tickets')) return 'mytickets';
        if (p.includes('/sla')) return 'mysla';
        if (p.includes('/pending-approval')) return 'pendingApproval';
        return 'dashboard';
    }
    // admin
    if (p.includes('/admin/users')) return 'users';
    if (p.includes('/admin/tickets')) return 'notifications';
    if (p.includes('/admin/departments')) return 'departments';
    if (p.includes('/admin/roles')) return 'roles';
    if (p.includes('/admin/sla')) return 'sla';
   
    if (p.startsWith('/admin') || p.startsWith('/admindashboard')) return 'dashboard';
    return 'dashboard';
};

const Sidebar = ({ activeKey = 'dashboard', onNavigate = () => { }, stats = {} }) => {
    const initialActive = (() => {
        try {
            const p = typeof window !== 'undefined' ? window.location.pathname : '';
            return inferActiveKeyFromPath(p);
        } catch (e) {
            return activeKey;
        }
    })();
    const [active, setActive] = useState(initialActive || activeKey);
    // control open state for small screens (off-canvas)
    const initialOpen = typeof window !== 'undefined' ? window.innerWidth > 1200 : true;
    const [isOpen, setIsOpen] = useState(initialOpen);
    
    // Get auth context
    const { user, logout } = useAuth();
    
    useEffect(() => {
        const handler = () => setIsOpen(s => !s);
        window.addEventListener('toggleSidebar', handler);

        const syncActiveFromPath = () => {
            try {
                const key = inferActiveKeyFromPath(window.location.pathname);
                setActive(key);
            } catch (e) {}
        };

        // Close sidebar on navigation (small/medium screens) + sync active
        const navHandler = () => {
            try { if (window.innerWidth <= 1200) setIsOpen(false); } catch (e) {}
            syncActiveFromPath();
        };

        window.addEventListener('locationchange', navHandler);
        window.addEventListener('popstate', syncActiveFromPath);
        // initial sync
        syncActiveFromPath();

        // cleanup
        return () => {
            window.removeEventListener('toggleSidebar', handler);
            window.removeEventListener('locationchange', navHandler);
            window.removeEventListener('popstate', syncActiveFromPath);
        };
    }, []);
    const navigate = useNavigate();

    // Determine current user role from auth context, then fallback to localStorage or URL path
    let rawRole = user?.role || null;
    if (!rawRole) {
        try { rawRole = typeof window !== 'undefined' ? localStorage.getItem('currentUserRole') : null; } catch (e) { rawRole = null; }
    }
    const roleFromStorage = rawRole ? String(rawRole).toUpperCase() : null;
    let roleFromPath = null;
    try {
        const p = typeof window !== 'undefined' ? (window.location.pathname || '').toLowerCase() : '';
        if (p.startsWith('/user')) roleFromPath = 'USER';
        else if (p.startsWith('/manager')) roleFromPath = 'MANAGER';
        else if (p.startsWith('/executive') || p.startsWith('/exec')) roleFromPath = 'EXECUTIVE';
        else if (p.startsWith('/super') || p.startsWith('/superadmin')) roleFromPath = 'SUPER_ADMIN';
        else if (p.startsWith('/admin') || p.startsWith('/admindashboard')) roleFromPath = 'ADMIN';
    } catch (e) { roleFromPath = null; }
    const userRole = roleFromStorage || roleFromPath || 'ADMIN';

    const items = [
        {
            key: 'dashboard', label: 'Dashboard', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zM3 21h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="currentColor" /></svg>
            )
        },
        {
            key: 'mytickets', label: 'My Tickets', badge: stats.myTickets || 0, icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18v2H3V6zm0 5h12v2H3v-2zm0 5h18v2H3v-2z" fill="currentColor"/></svg>
            )
        },
        {
            key: 'mysla', label: 'My SLA', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm1 10h-2V7h2v6z" fill="currentColor"/></svg>
            )
        },
        {
            key: 'pendingApproval', label: 'Pending Approval', badge: stats.forApproval || 0, icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/></svg>
            )
        },
        {
            key: 'manager', label: 'Manager', badge: stats.forApproval || 0, icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z" fill="currentColor"/></svg>
            )
        },
        {
            key: 'notifications', label: 'Tickets', badge: stats.pendingNotifications || 0, icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zM18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-1.99 2H20l-2-2z" fill="currentColor" /></svg>
            )
        },
        {
            key: 'departments', label: 'Departments', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="currentColor" /></svg>
            )
        },
        {
            key: 'roles', label: 'Roles', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z" fill="currentColor"/></svg>
            )
        },
        {
            key: 'users', label: 'User Management', badge: stats.activeUsers || 0, icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C15.68 13.73 17 15 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-6-3.5z" fill="currentColor" /></svg>
            )
        },
        
        {
            key: 'sla', label: 'SLA & Performance', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3a9 9 0 1 0 9 9 9.01 9.01 0 0 0-9-9zm.5 5h-1v6l5.25 3.15.5-.86-4.75-2.79V8z" fill="currentColor" /></svg>
            )
        },
       
        
    ];

    const mapKeyToPath = (key) => {
        const p = typeof window !== 'undefined' ? (window.location.pathname || '').toLowerCase() : '';
        const isUserContext = userRole === 'USER' || p.startsWith('/user');
        const isManagerContext = userRole === 'MANAGER' || p.startsWith('/manager');
        const isExecContext = userRole === 'EXECUTIVE' || p.startsWith('/executive') || p.startsWith('/exec');
        switch (key) {
            case 'dashboard':
                if (isManagerContext) return '/manager';
                if (isExecContext) return '/executive';
                return isUserContext ? '/user' : '/admin';
            case 'users': return '/admin/users';
            case 'notifications': return '/admin/tickets';
            case 'departments': return '/admin/departments';
            case 'roles': return '/admin/roles';
            case 'mytickets':
                if (isManagerContext) return '/manager/tickets';
                if (isExecContext) return '/executive/tickets';
                return '/user/tickets';
            case 'mysla':
                if (isManagerContext) return '/manager/sla';
                if (isExecContext) return '/executive/sla';
                return '/user/sla';
            case 'pendingApproval':
                if (isManagerContext) return '/manager/pending-approval';
                if (isExecContext) return '/executive/pending-approval';
                return '/user';
            case 'manager': return '/manager';
            
            case 'sla': return '/admin/sla';
            case 'settings': return '/admin/settings';
            default: return isUserContext ? '/user' : '/admin';
        }
    };

    const handleClick = (key) => {
        setActive(key);
        const path = mapKeyToPath(key);
        try { navigate(path); } catch (e) { /* noop if not inside router */ }
        // close the off-canvas sidebar on small screens after navigation
        try { if (window.innerWidth <= 992) setIsOpen(false); } catch (e) {}
        onNavigate(key);
    };

    return (
        <>
        <div className={`sidebar-backdrop ${isOpen ? 'show' : ''}`} onClick={()=>setIsOpen(false)} aria-hidden />
        <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`} aria-label="Admin navigation">
            <div className="branding">
                <div className="brand-logo-wrap">
                    <img src={omniLogo} alt="Omni Logo" className="brand-logo" />
                </div>
                <div className="brand-text">
                    <div className="brand-title">OmniTrack</div>
                    <div className="brand-sub">Tickets & Notifications</div>
                </div>
            </div>

            <div className="nav">
                {/* compute role-specific menus */}
                {(() => {
                    // Build a role-specific final list of items.
                    let finalItems = items;

                    if (userRole === 'USER') {
                        // Only show Dashboard, My Tickets, My SLA for users (in that order)
                        const desired = ['dashboard', 'mytickets', 'mysla'];
                        finalItems = desired.map(k => items.find(it => it.key === k)).filter(Boolean);
                    } else if (userRole === 'MANAGER') {
                        const desired = ['dashboard', 'mytickets', 'mysla'];
                        finalItems = desired.map(k => items.find(it => it.key === k)).filter(Boolean);
                    } else if (userRole === 'EXECUTIVE') {
                        const desired = ['dashboard', 'mytickets', 'mysla', 'pendingApproval'];
                        finalItems = desired.map(k => items.find(it => it.key === k)).filter(Boolean);
                    } else {
                        // For ADMIN/other roles: show all existing items but remove user-only entries
                        finalItems = items.filter(it => !['mytickets', 'mysla', 'pendingApproval', 'manager'].includes(it.key));
                    }

                    const mainItems = finalItems.filter(it => !['departments','users','roles'].includes(it.key));
                    const configItems = finalItems.filter(it => ['departments','users','roles'].includes(it.key));

                    return (
                        <>
                            <ul className="nav-main">
                                {mainItems.map((it) => (
                                    <NavItem
                                        key={it.key}
                                        icon={it.icon}
                                        label={it.label}
                                        badge={it.badge}
                                        active={active === it.key}
                                        onClick={() => handleClick(it.key)}
                                    />
                                ))}
                            </ul>

                            {configItems.length > 0 && (
                                <div className="nav-section nav-config">
                                    <div className="nav-section-title">Configurations</div>
                                    <ul>
                                        {configItems.map((it) => (
                                            <NavItem
                                                key={it.key}
                                                icon={it.icon}
                                                label={it.label}
                                                badge={it.badge}
                                                active={active === it.key}
                                                onClick={() => handleClick(it.key)}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            <div className="sidebar-footer">
                {user && (
                    <div className="sidebar-user-card">
                        <div className="user-avatar">
                            {(user.name || user.email || 'U').charAt(0)}
                        </div>
                        <div className="user-info">
                            <div className="user-name">{user.name || user.email}</div>
                            <span className="user-role-chip">{(user.role || 'User').toLowerCase()}</span>
                        </div>
                    </div>
                )}
                <button
                    className="signout-btn"
                    onClick={async () => {
                        // Call auth context logout
                        try {
                            await logout();
                        } catch (e) {
                            console.error('Logout error:', e);
                        }
                        // Allow parent to handle sign out if provided via onNavigate
                        try {
                            onNavigate('signout');
                        } catch (e) {}
                        try { navigate('/login'); } catch (e) {}
                    }}
                    aria-label="Sign out"
                    title="Sign out"
                >
                    <span className="signout-icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 13v-2H7V8l-5 4 5 4v-3zM20 3h-8v2h8v14h-8v2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" fill="currentColor"/></svg>
                    </span>
                    <span className="signout-label">Sign out</span>
                </button>
            </div>

        </aside>
        </>
    );
};

export default Sidebar;
