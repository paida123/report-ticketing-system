import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PageHeader from '../../components/PageHeader/PageHeader';
import StatsCard, { StatsRow } from '../../components/StatsCard/StatsCard';
import TicketService from '../../services/ticket.service';
import TicketTypeService from '../../services/ticketType.service';
import DepartmentService from '../../services/department.service';
import UserService from '../../services/user.service';
import SlaService from '../../services/sla.service';
import CreateTicketModal from '../../components/CreateTicketModal/CreateTicketModal';
import { useAuth } from '../../context/AuthContext';
import '../admin.css';
import './UserDashboard.css';

// Maps performance score → medal metadata
const getMedal = (score) => {
  if (score >= 0.9) return { label: 'Gold',   emoji: '🥇', cls: 'gold',   color: '#f59e0b', desc: 'Excellent' };
  if (score >= 0.7) return { label: 'Silver', emoji: '🥈', cls: 'silver', color: '#94a3b8', desc: 'On target' };
  if (score >= 0.5) return { label: 'Bronze', emoji: '🥉', cls: 'bronze', color: '#c2700a', desc: 'Needs improvement' };
  return               { label: 'Fail',   emoji: '❌', cls: 'fail',   color: '#ef4444', desc: 'Below standard' };
};

// SLA grade helpers — grade field from backend: EXCELLENT | ON_TARGET | POOR
const slaGradeColor = (g) => {
  switch ((g || '').toUpperCase()) {
    case 'EXCELLENT': return '#10b981';
    case 'ON_TARGET': return '#3b82f6';
    case 'POOR':      return '#ef4444';
    default:          return '#94a3b8';
  }
};
const slaIsMet = (r) => r.grade === 'EXCELLENT' || r.grade === 'ON_TARGET';

// Maps backend status strings → display label + CSS class + hex colour
const statusMeta = (s) => {
  switch (s) {
    case 'PENDING_APPROVAL': return { label: 'Pending Approval', cls: 'pending-approval', color: '#f59e0b' };
    case 'QUEUED':           return { label: 'In Queue',         cls: 'in-process',       color: '#3b82f6' };
    case 'PROCESSING':       return { label: 'In Progress',      cls: 'in-process',       color: '#06b6d4' };
    case 'RESOLVED':         return { label: 'Resolved',         cls: 'done',             color: '#10b981' };
    case 'CLOSED':           return { label: 'Closed',           cls: 'done',             color: '#10b981' };
    case 'REJECTED':         return { label: 'Rejected',         cls: 'overdue',          color: '#ef4444' };
    default:                 return { label: s || 'Unknown',     cls: 'unknown',          color: '#94a3b8' };
  }
};

const UserDashboard = () => {
  const { user } = useAuth();

  // ─── Tickets from API ────────────────────────────────────────────────────────
  const [apiTickets, setApiTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState('');

  // ─── UI state ────────────────────────────────────────────────────────────────
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [kpiModalKey, setKpiModalKey] = useState(null);
  const [closeTicketBusy, setCloseTicketBusy] = useState(false);
  const [closeTicketErr, setCloseTicketErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('assigned');

  // ─── Create ticket modal ─────────────────────────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [typesList, setTypesList] = useState([]);

  // ─── SLA data ────────────────────────────────────────────────────────────────
  const [slaData, setSlaData]       = useState([]);
  const [slaLoading, setSlaLoading] = useState(true);
  const [slaError, setSlaError]     = useState('');

  // ─── Load tickets from API ───────────────────────────────────────────────────
  const loadTickets = useCallback(() => {
    setTicketsLoading(true);
    setTicketsError('');
    TicketService.getAllTickets({ limit: 100 })
      .then(r => {
        const d = r?.data?.data;
        setApiTickets(Array.isArray(d?.tickets) ? d.tickets : []);
      })
      .catch(() => setTicketsError('Failed to load tickets. Please refresh.'))
      .finally(() => setTicketsLoading(false));
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // ─── Load ticket types ───────────────────────────────────────────────────────
  useEffect(() => {
    DepartmentService.getAllDepartments()
      .then(r => {
        const d = r?.data?.data;
        setDepartments(Array.isArray(d) ? d : []);
      })
      .catch(() => setDepartments([]));
  }, []);

  const loadTypes = useCallback(() => {
    TicketTypeService.getAllTicketTypes({ limit: 100 })
      .then(r => {
        const d = r?.data?.data;
        setTypesList(Array.isArray(d?.ticket_types) ? d.ticket_types : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  // ─── Load SLA data ───────────────────────────────────────────────────────────
  const loadSla = useCallback(() => {
    if (!user?.id) return;
    setSlaLoading(true);
    setSlaError('');
    SlaService.getAllSla({ limit: 100, user_id: user.id })
      .then(r => { const d = r?.data; setSlaData(Array.isArray(d?.data) ? d.data : []); })
      .catch(() => setSlaError('Failed to load SLA data. Please refresh.'))
      .finally(() => setSlaLoading(false));
  }, [user?.id]);

  useEffect(() => { loadSla(); }, [loadSla]);

  // ─── Body scroll lock ────────────────────────────────────────────────────────
  useEffect(() => {
    const open = openCreate || kpiModalOpen || !!selected;
    document.body.classList.toggle('modal-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.classList.remove('modal-open'); document.body.style.overflow = ''; };
  }, [openCreate, kpiModalOpen, selected]);

  const assignedToMeTickets = apiTickets.filter(t => {
    if (!user) return false;
    if (String(t.assignment?.assigned_to || '') === String(user.id || '')) return true;
    const officer = t.assignment?.officer;
    if (!officer) return false;
    if (user.id && String(officer.id || '') === String(user.id)) return true;
    if (user.email && String(officer.email || '').toLowerCase() === String(user.email).toLowerCase()) return true;
    return false;
  });

  const createdByMeTickets = apiTickets.filter(t => {
    if (!user?.id) return false;
    if (typeof t.created_by === 'number' || typeof t.created_by === 'string') {
      return String(t.created_by) === String(user.id);
    }
    return String(t.created_by?.id || '') === String(user.id);
  });

  const viewTickets = activeTab === 'assigned' ? assignedToMeTickets : createdByMeTickets;

  // ─── Derived groups using API statuses ──────────────────────────────────────
  const byStatus   = (...ss) => viewTickets.filter(t => ss.includes(t.status));
  const pending    = byStatus('PENDING_APPROVAL');
  const active     = byStatus('QUEUED', 'PROCESSING');
  const resolved   = byStatus('RESOLVED', 'CLOSED');
  const rejected   = byStatus('REJECTED');

  // ─── SLA filtered to the logged-in user's own tickets ───────────────────────
  // Backend scopes USER SLA records to a union of:
  // - tickets created by the user, and
  // - SLA rows where the user is the actor (service_level_agreement.user_id)
  // so slaData already contains the right records.
  const mySlaData = slaData;

  const slaBreached = apiTickets.filter(t => {
    if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(t.status)) return false;
    const expectedHours = t.ticket_type?.expected_sla_duration;
    if (!expectedHours || !t.created_at) return false;
    return (Date.now() - new Date(t.created_at).getTime()) / 3_600_000 > expectedHours;
  });

  // ─── KPI definitions ─────────────────────────────────────────────────────────
  const KPI_DEFS = [
    { key: 'pending',  label: 'Pending',  color: 'amber', items: pending  },
    { key: 'active',   label: 'Active',   color: 'blue',  items: active   },
    { key: 'resolved', label: 'Resolved', color: 'green', items: resolved },
    { key: 'rejected', label: 'Rejected', color: 'red',   items: rejected },
  ];

  // ─── KPI modal ────────────────────────────────────────────────────────────────
  const [modalFilter, setModalFilter] = useState('All');
  const [modalSearch, setModalSearch] = useState('');
  const openKpiModal  = (key) => { 
    console.log('Opening KPI modal:', key); 
    setModalFilter('All'); 
    setModalSearch(''); 
    setKpiModalKey(key); 
    setKpiModalOpen(true); 
  };
  const closeKpiModal = ()    => { 
    console.log('Closing KPI modal'); 
    setKpiModalOpen(false); 
    setKpiModalKey(null); 
  };
  const modalDef = KPI_DEFS.find(k => k.key === kpiModalKey) || { label: 'Details', items: [], color: 'blue' };

  const modalItems = (modalDef.items || [])
    .filter(t => kpiModalKey !== 'active' || modalFilter === 'All' || t.status === modalFilter)
    .filter(t => {
      const q = modalSearch.trim().toLowerCase();
      if (!q) return true;
      const id = String(t?.id ?? '').toLowerCase();
      const title = String(t?.title ?? '').toLowerCase();
      const status = String(t?.status ?? '').toLowerCase();
      const typeTitle = String(t?.ticket_type?.title ?? '').toLowerCase();
      return id.includes(q) || title.includes(q) || status.includes(q) || typeTitle.includes(q);
    });

  // ─── Create ticket handler ────────────────────────────────────────────────────
  const handleTicketCreated = () => {
    setOpenCreate(false);
    setSuccessMsg('Ticket created successfully!');
    setTimeout(() => setSuccessMsg(''), 3500);
    loadTickets();
  };

  // ─── Close ticket ─────────────────────────────────────────────────────────────
  const handleCloseTicket = async (ticketId) => {
    setCloseTicketBusy(true); setCloseTicketErr('');
    try {
      await TicketService.closeTicket(ticketId);
      setSelected(null);
      setSuccessMsg('Ticket closed successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadTickets();
    } catch (e) {
      setCloseTicketErr(e?.response?.data?.message || 'Failed to close ticket. Please try again.');
    } finally { setCloseTicketBusy(false); }
  };

  // ─── Shared ticket row card ─────────────────────────────────────────────────
  const TicketRow = ({ t }) => {
    const m = statusMeta(t.status);
    return (
      <div className="ts-card" role="button" tabIndex={0}
        onClick={() => { setCloseTicketErr(''); setSelected(t); }}
        onKeyDown={e => { if (e.key === 'Enter') { setCloseTicketErr(''); setSelected(t); } }}
        aria-label={`View ticket ${t.id}`}
      >
        <span className="tc-id" title={t.id}>{(t.id || '').slice(0, 10)}&hellip;</span>
        <span className="tc-title" title={t.title}>{t.title}</span>
        <span className="tc-status">
          <span className="ts-chip" style={{ background: m.color + '18', color: m.color, borderColor: m.color + '30' }}>{m.label}</span>
        </span>
      </div>
    );
  };

  // ─── Section empty state ──────────────────────────────────────────────────────
  const EmptyState = ({ msg }) => (
    <div className="ts-empty">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="#cbd5e1" strokeWidth="1.5"/><path d="M3 9h18" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round"/></svg>
      {msg}
    </div>
  );

  // ─── Skeleton rows while loading ──────────────────────────────────────────────
  const SkeletonRows = () => <>{[1,2,3].map(i => <div key={i} className="ts-skeleton" />)}</>;

  // ─── Newest-3 helpers ────────────────────────────────────────────────────────
  const newest3 = (arr) => [...arr].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={activeTab === 'assigned' ? 'View tickets assigned to you' : 'View tickets created by you'}
        actions={<button className="btn-primary" onClick={() => setOpenCreate(true)}>Create Ticket</button>}
      />

      <div className="ud-tabs">
        <button className={`ud-tab ${activeTab === 'assigned' ? 'active' : ''}`} onClick={() => setActiveTab('assigned')}>
          Assigned To Me
        </button>
        <button className={`ud-tab ${activeTab === 'created' ? 'active' : ''}`} onClick={() => setActiveTab('created')}>
          Created By Me
        </button>
      </div>

      {/* ── Success toast ── */}
      {successMsg && createPortal(
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: '#10b981', color: '#fff', borderRadius: 12, padding: '13px 22px', fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {successMsg}
        </div>,
        document.body
      )}

      <StatsRow>
        {KPI_DEFS.map(k => (
          <StatsCard key={k.key} label={k.label} value={ticketsLoading ? '…' : k.items.length} color={k.color} onClick={() => openKpiModal(k.key)} />
        ))}
      </StatsRow>

      <section className="panel user-panel">
        {ticketsError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 18px', color: '#b91c1c', fontSize: 14, marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
            {ticketsError}
            <button onClick={loadTickets} style={{ marginLeft: 'auto', fontSize: 13, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
          </div>
        )}

        <div className="user-tables">

          {/* ── Pending Approval ── */}
          <div className="table-section">
            <div className="ts-header">
              <div className="ts-title-wrap">
                <div className="ts-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="1.8"/><path d="M12 7v5l3 2" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <span className="ts-title">Pending Approval</span>
              </div>
              <span className="ts-badge amber">{ticketsLoading ? '…' : pending.length}</span>
            </div>
            <div className="ts-col-head"><span>ID</span><span>Title</span><span>Status</span></div>
            <div className="ts-body">
              {ticketsLoading ? <SkeletonRows />
                : pending.length ? newest3(pending).map(t => <TicketRow key={t.id} t={t} />)
                : <EmptyState msg="No pending tickets" />}
            </div>
            <div className="ts-footer">
              <span className="ts-footer-count">{!ticketsLoading && pending.length > 3 ? `+${pending.length - 3} more` : ''}</span>
              {!ticketsLoading && pending.length > 0 && (
                <button className="ts-footer-btn" onClick={() => openKpiModal('pending')} style={{ gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View all
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Active — QUEUED + PROCESSING ── */}
          <div className="table-section">
            <div className="ts-header">
              <div className="ts-title-wrap">
                <div className="ts-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.09 12.35A1 1 0 0 0 5 14h6l-1 8 8.91-10.35A1 1 0 0 0 18 10h-6l1-8Z" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span className="ts-title">Active</span>
              </div>
              <span className="ts-badge blue">{ticketsLoading ? '…' : active.length}</span>
            </div>
            <div className="ts-col-head"><span>ID</span><span>Title</span><span>Status</span></div>
            <div className="ts-body">
              {ticketsLoading ? <SkeletonRows />
                : active.length ? newest3(active).map(t => <TicketRow key={t.id} t={t} />)
                : <EmptyState msg="No active tickets" />}
            </div>
            <div className="ts-footer">
              <span className="ts-footer-count">{!ticketsLoading && active.length > 3 ? `+${active.length - 3} more` : ''}</span>
              {!ticketsLoading && active.length > 0 && (
                <button className="ts-footer-btn" onClick={() => openKpiModal('active')} style={{ gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View all
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Resolved ── */}
          <div className="table-section">
            <div className="ts-header">
              <div className="ts-title-wrap">
                <div className="ts-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="1.8"/><path d="M8 12l3 3 5-5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span className="ts-title">Resolved</span>
              </div>
              <span className="ts-badge green">{ticketsLoading ? '…' : resolved.length}</span>
            </div>
            <div className="ts-col-head"><span>ID</span><span>Title</span><span>Status</span></div>
            <div className="ts-body">
              {ticketsLoading ? <SkeletonRows />
                : resolved.length ? newest3(resolved).map(t => <TicketRow key={t.id} t={t} />)
                : <EmptyState msg="No resolved tickets" />}
            </div>
            <div className="ts-footer">
              <span className="ts-footer-count">{!ticketsLoading && resolved.length > 3 ? `+${resolved.length - 3} more` : ''}</span>
              {!ticketsLoading && resolved.length > 0 && (
                <button className="ts-footer-btn" onClick={() => openKpiModal('resolved')} style={{ gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View all
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Rejected ── */}
          <div className="table-section">
            <div className="ts-header">
              <div className="ts-title-wrap">
                <div className="ts-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="1.8"/><path d="M9 9l6 6M15 9l-6 6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <span className="ts-title">Rejected</span>
              </div>
              <span className="ts-badge red">{ticketsLoading ? '…' : rejected.length}</span>
            </div>
            <div className="ts-col-head"><span>ID</span><span>Title</span><span>Status</span></div>
            <div className="ts-body">
              {ticketsLoading ? <SkeletonRows />
                : rejected.length ? newest3(rejected).map(t => <TicketRow key={t.id} t={t} />)
                : <EmptyState msg="No rejected tickets" />}
            </div>
            <div className="ts-footer">
              <span className="ts-footer-count">{!ticketsLoading && rejected.length > 3 ? `+${rejected.length - 3} more` : ''}</span>
              {!ticketsLoading && rejected.length > 0 && (
                <button className="ts-footer-btn" onClick={() => openKpiModal('rejected')} style={{ gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View all
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Overall SLA Performance — spans full row ── */}
          {(() => {
            const total    = mySlaData.length;
            const met      = mySlaData.filter(r => slaIsMet(r)).length;
            const breached = total - met;
            const score    = total > 0 ? met / total : 1;
            const medal    = getMedal(score);
            const pct      = Math.round(score * 100);
            const topFive  = mySlaData.slice(0, 5);
            return (
              <div className="table-section ts-sla">
                <div className="ts-header">
                  <div className="ts-title-wrap">
                    <div className="ts-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#6366f1" strokeWidth="1.8"/><path d="M8 8l-3 9 7-3 7 3-3-9" stroke="#6366f1" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="ts-title">Overall SLA Performance</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }} title={medal.label}>{medal.emoji}</span>
                    <span className="ts-badge" style={{ background: medal.color + '1a', color: medal.color }}>
                      {slaLoading ? '…' : (slaError ? '—' : `${pct}%`)}
                    </span>
                  </div>
                </div>

                {/* Score bar + meta */}
                <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 7, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: (slaLoading || slaError) ? '0%' : `${pct}%`, background: `linear-gradient(90deg,${medal.color},${medal.color}bb)`, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: medal.color, minWidth: 38, textAlign: 'right' }}>
                      {slaLoading ? '…' : (slaError ? '—' : `${pct}%`)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                    <span>Total: <strong style={{ color: '#111827' }}>{slaLoading ? '…' : (slaError ? '—' : total)}</strong></span>
                    <span>Met: <strong style={{ color: '#10b981' }}>{slaLoading ? '…' : (slaError ? '—' : met)}</strong></span>
                    <span>Breached: <strong style={{ color: '#ef4444' }}>{slaLoading ? '…' : (slaError ? '—' : breached)}</strong></span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: medal.color }}>{medal.emoji} {medal.label} — {medal.desc}</span>
                  </div>
                </div>

                {/* Recent SLA rows */}
                <div className="ts-col-head ts-head-sla"><span>ID</span><span>Officer</span><span>Status · Grade</span></div>
                <div className="ts-body">
                  {slaLoading ? <SkeletonRows />
                    : slaError ? <EmptyState msg={slaError} />
                    : topFive.length ? topFive.map((r, i) => {
                        const isMet  = slaIsMet(r);
                        const gc     = slaGradeColor(r.grade);
                        return (
                          <div className="ts-card ts-card-sla" key={r.ticket_id || i} role="listitem">
                            <span className="tc-id" title={r.ticket_id} style={{ fontSize: 11 }}>{(r.ticket_id || '').slice(0, 12)}</span>
                            <span className="tc-title">{r.assigned_to ? `${r.assigned_to.first_name} ${r.assigned_to.last_name}` : '—'}</span>
                            <span className="tc-status">
                              <span className="ts-chip" style={{ background: (isMet ? '#10b981' : '#ef4444') + '1a', color: isMet ? '#10b981' : '#ef4444', borderColor: (isMet ? '#10b981' : '#ef4444') + '30', marginRight: 6 }}>{isMet ? 'Met' : 'Breached'}</span>
                              {r.grade && <span style={{ background: gc + '1a', color: gc, borderRadius: 6, padding: '2px 8px', fontWeight: 800, fontSize: 11 }}>{r.grade}</span>}
                            </span>
                          </div>
                        );
                      })
                    : <EmptyState msg="No SLA records yet" />}
                </div>
              </div>
            );
          })()}

        </div>

        {/* ── Create Ticket Modal ── */}
        {openCreate && createPortal(
          (() => {
            const selectedType = typesList.find(t => String(t.id) === String(ctForm.ticket_type_id)) || null;
            const descMax = 1000;
            return (
              <div role="dialog" aria-modal="true" aria-label="Create new ticket"
                style={{ position: 'fixed', top: 0, left: 260, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, background: 'rgba(2,6,23,0.45)', backdropFilter: 'blur(3px)' }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitCreateTicket(); }}
              >
                <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 32px 64px rgba(2,6,23,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden' }}>

                  {/* Header */}
                  <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="1.8"/><path d="M3 9h18" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 13h5M7 16h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>New Ticket</div>
                      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>Submit a new support request</div>
                    </div>
                    <button onClick={() => { setOpenCreate(false); setCtForm({ title: '', description: '', department_id: '', ticket_type_id: '', assigned_to: '' }); setCtTouched({}); setCtErr(''); }} disabled={ctBusy}
                      style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}
                      aria-label="Close">×</button>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                    {ctErr && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '11px 14px', marginBottom: 20, fontSize: 13, color: '#b91c1c' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
                        <span>{ctErr}</span>
                      </div>
                    )}

                    {/* Title */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                        <span>Title <span style={{ color: '#ef4444' }}>*</span></span>
                        {ctForm.title && <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>{ctForm.title.length} chars</span>}
                      </label>
                      <input value={ctForm.title} onChange={e => ctSet('title', e.target.value)} onBlur={() => ctTouch('title')} onFocus={() => setCtFocus('title')} onBlurCapture={() => setCtFocus('')}
                        placeholder="Brief, descriptive title for the issue" maxLength={200}
                        style={{ ...inputStyle(!!ctFieldErr('title')), boxShadow: ctFocus === 'title' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: ctFocus === 'title' && !ctFieldErr('title') ? '#93c5fd' : ctFieldErr('title') ? '#fca5a5' : '#e5e7eb' }}
                      />
                      {ctFieldErr('title') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{ctFieldErr('title')}</div>}
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                        <span>Description <span style={{ color: '#ef4444' }}>*</span></span>
                        <span style={{ fontWeight: 400, color: ctForm.description.length > descMax * 0.9 ? '#f59e0b' : '#9ca3af', fontSize: 12 }}>{ctForm.description.length} / {descMax}</span>
                      </label>
                      <textarea value={ctForm.description} onChange={e => ctSet('description', e.target.value)} onBlur={() => ctTouch('description')} onFocus={() => setCtFocus('description')} onBlurCapture={() => setCtFocus('')}
                        rows={5} maxLength={descMax} placeholder="Describe the issue in detail — steps to reproduce, expected vs actual behaviour…"
                        style={{ ...inputStyle(!!ctFieldErr('description')), resize: 'vertical', lineHeight: 1.65, boxShadow: ctFocus === 'description' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: ctFocus === 'description' && !ctFieldErr('description') ? '#93c5fd' : ctFieldErr('description') ? '#fca5a5' : '#e5e7eb' }}
                      />
                      {ctFieldErr('description') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{ctFieldErr('description')}</div>}
                    </div>

                    {/* Department */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Department <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={ctForm.department_id} onChange={e => ctSet('department_id', e.target.value)} onBlur={() => ctTouch('department_id')} onFocus={() => setCtFocus('department')} onBlurCapture={() => setCtFocus('')}
                        style={{ ...inputStyle(!!ctFieldErr('department_id')), boxShadow: ctFocus === 'department' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: ctFocus === 'department' && !ctFieldErr('department_id') ? '#93c5fd' : ctFieldErr('department_id') ? '#fca5a5' : '#e5e7eb', cursor: 'pointer' }}
                      >
                        <option value="">— Select a department —</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.department}</option>)}
                      </select>
                      {ctFieldErr('department_id') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{ctFieldErr('department_id')}</div>}
                    </div>

                    {/* Ticket Type */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Ticket Type <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={ctForm.ticket_type_id} onChange={e => ctSet('ticket_type_id', e.target.value)} onBlur={() => ctTouch('ticket_type_id')} onFocus={() => setCtFocus('type')} onBlurCapture={() => setCtFocus('')} disabled={!ctForm.department_id}
                        style={{ ...inputStyle(!!ctFieldErr('ticket_type_id')), boxShadow: ctFocus === 'type' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: ctFocus === 'type' && !ctFieldErr('ticket_type_id') ? '#93c5fd' : ctFieldErr('ticket_type_id') ? '#fca5a5' : '#e5e7eb', cursor: 'pointer' }}
                      >
                        <option value="">{ctForm.department_id ? '— Select a ticket type —' : '— Select department first —'}</option>
                        {filteredTicketTypes.map(t => <option key={t.id} value={t.id}>{t.title}{t.approval_required ? ' (Requires Approval)' : ''}</option>)}
                      </select>
                      {ctFieldErr('ticket_type_id') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{ctFieldErr('ticket_type_id')}</div>}
                      {selectedType && (
                        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{selectedType.title}</div>
                            <div style={{ color: '#4b5563', fontSize: 12, marginTop: 3 }}>
                              {selectedType.departmental?.department && <span style={{ marginRight: 10 }}>Dept: <strong>{selectedType.departmental.department}</strong></span>}
                              {selectedType.approval_required
                                ? <span style={{ color: '#92400e' }}>Requires <strong>{selectedType.approval_count}</strong> approval{selectedType.approval_count !== 1 ? 's' : ''}</span>
                                : <span style={{ color: '#065f46' }}>No approval needed</span>}
                            </div>
                          </div>
                          {selectedType.expected_sla_duration && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#dbeafe', color: '#1d4ed8', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              {selectedType.expected_sla_duration}h SLA
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Assign To (optional) */}
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                        <span>Assign To <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(optional)</span></span>
                        {ctForm.assigned_to && <button type="button" onClick={() => ctSet('assigned_to', '')} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>}
                      </label>
                      <select value={ctForm.assigned_to} onChange={e => ctSet('assigned_to', e.target.value)} onFocus={() => setCtFocus('assigned_to')} onBlurCapture={() => setCtFocus('')} disabled={officersLoading || !ctForm.department_id}
                        style={{ ...inputStyle(false), boxShadow: ctFocus === 'assigned_to' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: ctFocus === 'assigned_to' ? '#93c5fd' : '#e5e7eb', cursor: 'pointer', color: ctForm.assigned_to ? '#111827' : '#9ca3af' }}
                      >
                        <option value="">{!ctForm.department_id ? 'Select department first' : officersLoading ? 'Loading users…' : '— Auto-assign (recommended) —'}</option>
                        {officers.map(u => {
                          const deptName = typeof u.departments?.department === 'string' ? u.departments.department : (typeof u.department === 'string' ? u.department : u.department?.department);
                          return <option key={u.id} value={u.id}>{u.first_name} {u.last_name}{deptName ? ` · ${deptName}` : ''}</option>;
                        })}
                      </select>
                      <div style={{ marginTop: 7, fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#9ca3af" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/></svg>
                        If left blank, the system will auto-assign to an available officer.
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fafafa', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Ctrl+Enter to submit</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setOpenCreate(false); setCtForm({ title: '', description: '', department_id: '', ticket_type_id: '', assigned_to: '' }); setCtTouched({}); setCtErr(''); }} disabled={ctBusy}
                        style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: ctBusy ? 'not-allowed' : 'pointer', opacity: ctBusy ? 0.7 : 1 }}>Cancel</button>
                      <button onClick={submitCreateTicket} disabled={ctBusy}
                        style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: ctBusy ? '#93c5fd' : 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: ctBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: ctBusy ? 'none' : '0 4px 14px rgba(99,102,241,0.35)' }}>
                        {ctBusy && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                        {ctBusy ? 'Submitting…' : 'Submit Ticket'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })(),
          document.body
        )}

        {/* ── View Ticket Modal ── */}
        {selected && createPortal(
          <div role="dialog" aria-modal="true"
            style={{ position: 'fixed', top: 0, left: 260, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, background: 'rgba(2,6,23,0.65)', backdropFilter: 'blur(6px)', padding: '20px' }}
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
          >
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 920, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 40px 100px rgba(2,6,23,0.35)', border: '1px solid rgba(148,163,184,0.2)' }}
              onClick={e => e.stopPropagation()}>
              {(() => {
                const m = statusMeta(selected.status);
                const creatorInitials = (selected.created_by?.name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
                
                // Workflow stages based on ticket status
                const getWorkflowSteps = () => {
                  const allSteps = [
                    { key: 'CREATED', label: 'Created', icon: '📝', statuses: ['PENDING_APPROVAL', 'QUEUED', 'PROCESSING', 'RESOLVED', 'CLOSED', 'REJECTED'] },
                    { key: 'PENDING_APPROVAL', label: 'Pending Approval', icon: '⏳', statuses: ['PENDING_APPROVAL', 'QUEUED', 'PROCESSING', 'RESOLVED', 'CLOSED', 'REJECTED'] },
                    { key: 'QUEUED', label: 'In Queue', icon: '📋', statuses: ['QUEUED', 'PROCESSING', 'RESOLVED', 'CLOSED'] },
                    { key: 'PROCESSING', label: 'In Progress', icon: '⚙️', statuses: ['PROCESSING', 'RESOLVED', 'CLOSED'] },
                    { key: 'FINAL', label: selected.status === 'REJECTED' ? 'Rejected' : selected.status === 'CLOSED' ? 'Closed' : 'Resolved', 
                      icon: selected.status === 'REJECTED' ? '❌' : '✅', 
                      statuses: ['RESOLVED', 'CLOSED', 'REJECTED'] }
                  ];
                  
                  const currentStatus = selected.status;
                  const currentIndex = allSteps.findIndex(step => step.statuses.includes(currentStatus));
                  
                  return allSteps.map((step, idx) => ({
                    ...step,
                    completed: idx < currentIndex || (idx === currentIndex && ['RESOLVED', 'CLOSED', 'REJECTED'].includes(currentStatus)),
                    active: step.statuses.includes(currentStatus) && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(currentStatus),
                    isCurrent: idx === currentIndex
                  }));
                };
                
                const workflowSteps = getWorkflowSteps();
                
                return (
                  <>
                    {/* Header */}
                    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '28px 32px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <code style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.3)' }}>
                            #{selected.id}
                          </code>
                          <span style={{ background: m.color + '35', backdropFilter: 'blur(10px)', color: '#fff', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 800, border: `1px solid ${m.color}50` }}>
                            {m.label}
                          </span>
                        </div>
                        <button onClick={() => setSelected(null)}
                          style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: 10, 
                            border: '2px solid rgba(255,255,255,0.3)', 
                            background: 'rgba(255,255,255,0.2)', 
                            backdropFilter: 'blur(10px)',
                            color: '#fff', 
                            cursor: 'pointer', 
                            fontSize: 22, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 700, 
                            flexShrink: 0,
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >×</button>
                      </div>
                      <div style={{ color: '#ffffff', fontWeight: 800, fontSize: 22, lineHeight: 1.35, marginBottom: 8, letterSpacing: '-0.01em' }}>
                        {selected.title}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>
                        Created {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}
                        {selected.updated_at && selected.updated_at !== selected.created_at && (
                          <> • Last updated {new Date(selected.updated_at).toLocaleString()}</>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '28px 32px', overflowY: 'auto', flex: 1, background: '#fafbfc' }}>
                      
                      {/* Workflow Stepper */}
                      <div style={{ marginBottom: 28, background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                          </svg>
                          Ticket Workflow
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                          {/* Progress Line */}
                          <div style={{ position: 'absolute', top: 24, left: 0, right: 0, height: 3, background: '#e5e7eb', borderRadius: 3, zIndex: 0 }}>
                            <div style={{ 
                              height: '100%', 
                              background: 'linear-gradient(90deg, #667eea, #764ba2)', 
                              borderRadius: 3,
                              width: `${(workflowSteps.filter(s => s.completed).length / (workflowSteps.length - 1)) * 100}%`,
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          
                          {workflowSteps.map((step, idx) => (
                            <div key={step.key} style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              flex: 1, 
                              position: 'relative', 
                              zIndex: 1 
                            }}>
                              <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                background: step.completed || step.isCurrent 
                                  ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                                  : '#fff',
                                border: `3px solid ${step.completed || step.isCurrent ? '#667eea' : '#e5e7eb'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20,
                                fontWeight: 700,
                                marginBottom: 10,
                                boxShadow: step.isCurrent ? '0 4px 12px rgba(102,126,234,0.3)' : 'none',
                                transition: 'all 0.3s',
                                transform: step.isCurrent ? 'scale(1.1)' : 'scale(1)'
                              }}>
                                {step.icon}
                              </div>
                              <div style={{ 
                                fontSize: 12, 
                                fontWeight: 700, 
                                color: step.completed || step.isCurrent ? '#667eea' : '#94a3b8',
                                textAlign: 'center',
                                maxWidth: 100
                              }}>
                                {step.label}
                              </div>
                              {step.isCurrent && (
                                <div style={{ 
                                  marginTop: 6,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: '#10b981',
                                  background: '#d1fae5',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #a7f3d0'
                                }}>
                                  Current
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div style={{ marginBottom: 20, background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          Description
                        </div>
                        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, wordBreak: 'break-word' }}>
                          {selected.description || 'No description provided.'}
                        </div>
                      </div>

                      {/* Info Cards Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>

                        {/* Ticket Type */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            🎫 Ticket Type
                          </div>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 8 }}>{selected.ticket_type?.title || '—'}</div>
                          {selected.ticket_type?.expected_sla_duration && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#1e40af', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 800, marginTop: 4, border: '1px solid #93c5fd' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              SLA: {selected.ticket_type.expected_sla_duration}h
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, fontWeight: 500 }}>
                            {selected.ticket_type?.approval_required
                              ? `⚡ Requires ${selected.ticket_type.approval_count} approval${selected.ticket_type.approval_count !== 1 ? 's' : ''}`
                              : '✓ No approval needed'}
                          </div>
                        </div>

                        {/* Priority & Department */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            📊 Status & Department
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <span style={{ background: m.color + '20', color: m.color, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 800, border: `1.5px solid ${m.color}40`, display: 'inline-block' }}>
                              {m.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
                            🏢 {selected.ticket_type?.departmental?.department || 'General'}
                          </div>
                        </div>

                        {/* Created By */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            👤 Created By
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ 
                              width: 40, 
                              height: 40, 
                              borderRadius: '50%', 
                              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', 
                              color: '#fff', 
                              fontSize: 14, 
                              fontWeight: 800, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              flexShrink: 0,
                              border: '2px solid #e9d5ff'
                            }}>
                              {creatorInitials}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selected.created_by?.name || '—'}
                              </div>
                              <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selected.created_by?.email || ''}
                              </div>
                              {selected.created_by?.department && (
                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                  {typeof selected.created_by.department === 'string' 
                                    ? selected.created_by.department 
                                    : selected.created_by.department?.department || 'Unknown Department'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Assigned Officer */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            👨‍💼 Assigned Officer
                          </div>
                          {selected.assignment?.officer ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: '50%', 
                                background: 'linear-gradient(135deg, #10b981, #059669)', 
                                color: '#fff', 
                                fontSize: 14, 
                                fontWeight: 800, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                flexShrink: 0,
                                border: '2px solid #d1fae5'
                              }}>
                                {selected.assignment.officer.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'NA'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {selected.assignment.officer.name}
                                </div>
                                <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {selected.assignment.officer.email}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a' }}>
                              <span style={{ fontSize: 16 }}>⏳</span>
                              <span style={{ color: '#92400e', fontSize: 13, fontWeight: 600 }}>Awaiting assignment</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Close error */}
                      {closeTicketErr && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 10, background: '#fee2e2', border: '2px solid #fca5a5', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2.5"/>
                            <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                          {closeTicketErr}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '20px 32px', borderTop: '2px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexShrink: 0, background: '#fff' }}>
                      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                        Ticket ID: #{selected.id}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {['PENDING_APPROVAL', 'QUEUED'].includes(selected.status) && (String(selected.assignment?.assigned_to || '') === String(user?.id || '') || String(selected.assignment?.officer?.id || '') === String(user?.id || '')) && (
                          <button onClick={() => handleCloseTicket(selected.id)} disabled={closeTicketBusy}
                            style={{ 
                              padding: '11px 22px', 
                              borderRadius: 10, 
                              border: 'none', 
                              background: closeTicketBusy ? '#fca5a5' : 'linear-gradient(135deg, #ef4444, #dc2626)', 
                              color: '#fff', 
                              fontWeight: 700, 
                              fontSize: 14, 
                              cursor: closeTicketBusy ? 'not-allowed' : 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8,
                              transition: 'transform 0.2s',
                              boxShadow: closeTicketBusy ? 'none' : '0 4px 12px rgba(239,68,68,0.3)'
                            }}
                            onMouseOver={e => !closeTicketBusy && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            {closeTicketBusy && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                            {closeTicketBusy ? 'Closing…' : 'Close Ticket'}
                          </button>
                        )}
                        <button onClick={() => setSelected(null)}
                          style={{ 
                            padding: '11px 22px', 
                            borderRadius: 10, 
                            border: '2px solid #e5e7eb', 
                            background: '#fff', 
                            color: '#374151', 
                            fontWeight: 700, 
                            fontSize: 14, 
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => { 
                            e.currentTarget.style.background = '#f9fafb'; 
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          onMouseOut={e => { 
                            e.currentTarget.style.background = '#fff'; 
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}

        {/* ── KPI Details Modal ── */}
        {kpiModalOpen && createPortal(
          <div 
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              top: 0,
              left: 260,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(2,6,23,0.65)',
              zIndex: 10000,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              overflow: 'auto',
              padding: '20px'
            }}
            onClick={e => { if (e.target === e.currentTarget) closeKpiModal(); }}
          >
            <div 
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 1100,
                maxHeight: 'calc(100vh - 40px)',
                background: '#ffffff',
                borderRadius: 24,
                boxShadow: '0 40px 100px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '24px 32px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      border: '2px solid rgba(255,255,255,0.3)'
                    }}>
                      {modalDef.color === 'amber' ? '⏱️' : modalDef.color === 'blue' ? '⚡' : modalDef.color === 'green' ? '✅' : '❌'}
                    </div>
                    <div>
                      <h2 style={{
                        margin: 0,
                        fontSize: 24,
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                        textShadow: '0 2px 10px rgba(0,0,0,0.1)'
                      }}>
                        {modalDef.label} Tickets
                      </h2>
                      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: 600 }}>
                        {modalItems.length} {modalItems.length === 1 ? 'ticket' : 'tickets'} found
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={closeKpiModal}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      border: '2px solid rgba(255,255,255,0.25)',
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      fontSize: 20,
                      fontWeight: 700
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Filters + Search */}
              <div style={{
                padding: '20px 32px',
                background: '#f8fafc',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
                flexShrink: 0
              }}>
                {kpiModalKey === 'active' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Filter:</label>
                    <select
                      value={modalFilter}
                      onChange={e => setModalFilter(e.target.value)}
                      style={{
                        border: '2px solid #e5e7eb',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 14,
                        outline: 'none',
                        cursor: 'pointer',
                        background: '#fff',
                        fontWeight: 600,
                        color: '#374151',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.target.style.borderColor = '#667eea'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    >
                      <option value="All">All Active</option>
                      <option value="QUEUED">In Queue</option>
                      <option value="PROCESSING">In Progress</option>
                    </select>
                  </div>
                )}
                <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 480 }}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#94a3b8'
                    }}
                  >
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M16 16l5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <input
                    value={modalSearch}
                    onChange={e => setModalSearch(e.target.value)}
                    placeholder="Search by ID, title, type, or status..."
                    style={{
                      width: '100%',
                      border: '2px solid #e5e7eb',
                      borderRadius: 10,
                      padding: '10px 14px 10px 44px',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontWeight: 500,
                      background: '#fff'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Table Content */}
              <div style={{ flex: 1, overflow: 'auto', padding: '0 32px 20px' }}>
                <div style={{
                  marginTop: 20,
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#fff'
                }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 160px 140px 80px',
                    gap: 16,
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ID</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Action</div>
                  </div>

                  {/* Table Body */}
                  <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                    {modalItems.length > 0 ? modalItems.map((t, idx) => {
                      const m = statusMeta(t.status);
                      return (
                        <div
                          key={t.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '100px 1fr 160px 140px 80px',
                            gap: 16,
                            padding: '16px 20px',
                            alignItems: 'center',
                            borderBottom: idx < modalItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                            transition: 'background 0.15s',
                            cursor: 'pointer'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <code style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            background: 'linear-gradient(135deg, #667eea15, #764ba215)',
                            color: '#667eea',
                            padding: '6px 10px',
                            borderRadius: 8,
                            fontWeight: 700,
                            border: '1px solid #667eea25'
                          }}>
                            #{t.id}
                          </code>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#1e293b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {t.title}
                          </div>
                          <div style={{
                            fontSize: 13,
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: 500
                          }}>
                            {t.ticket_type?.title || '—'}
                          </div>
                          <span style={{
                            background: m.color + '15',
                            color: m.color,
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            border: `1.5px solid ${m.color}30`,
                            display: 'inline-block',
                            textAlign: 'center'
                          }}>
                            {m.label}
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                closeKpiModal();
                                setCloseTicketErr('');
                                setSelected(t);
                              }}
                              aria-label={`View ticket ${t.id}`}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                border: '2px solid #e5e7eb',
                                background: '#fff',
                                color: '#667eea',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={e => {
                                e.currentTarget.style.background = '#667eea';
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = '#fff';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                                e.currentTarget.style.color = '#667eea';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: '#94a3b8'
                      }}>
                        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>🔍</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No tickets found</div>
                        <div style={{ fontSize: 14, color: '#94a3b8' }}>Try adjusting your filters or search query</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '16px 32px',
                borderTop: '1px solid #e5e7eb',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
                  Showing {modalItems.length} of {modalDef.items.length} tickets
                </div>
                <button
                  onClick={closeKpiModal}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 10,
                    border: '2px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      </section>
    </>
  );
};

export default UserDashboard;
