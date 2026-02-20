import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PageHeader from '../../components/PageHeader/PageHeader';
import StatsCard, { StatsRow } from '../../components/StatsCard/StatsCard';
import TicketService from '../../services/ticket.service';
import TicketTypeService from '../../services/ticketType.service';
import UserService from '../../services/user.service';
import SlaService from '../../services/sla.service';
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

  // ─── Create ticket modal ─────────────────────────────────────────────────────
  const [ctForm, setCtForm] = useState({ title: '', description: '', ticket_type_id: '', assigned_to: '' });
  const [ctTouched, setCtTouched] = useState({});
  const [ctBusy, setCtBusy] = useState(false);
  const [ctErr, setCtErr] = useState('');
  const [ctFocus, setCtFocus] = useState('');
  const [typesList, setTypesList] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(true);

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
    setSlaLoading(true);
    setSlaError('');
    SlaService.getAllSla({ limit: 100 })
      .then(r => { const d = r?.data; setSlaData(Array.isArray(d?.data) ? d.data : []); })
      .catch(() => setSlaError('Failed to load SLA data. Please refresh.'))
      .finally(() => setSlaLoading(false));
  }, []);

  useEffect(() => { loadSla(); }, [loadSla]);

  // ─── Load officers for optional assignment ───────────────────────────────────
  useEffect(() => {
    UserService.getAllUsers({ limit: 200 })
      .then(r => {
        const users = r?.data?.data?.users || r?.data?.data || [];
        setOfficers(Array.isArray(users) ? users : []);
      })
      .catch(() => setOfficers([]))
      .finally(() => setOfficersLoading(false));
  }, []);

  // ─── Body scroll lock ────────────────────────────────────────────────────────
  useEffect(() => {
    const open = openCreate || kpiModalOpen || !!selected;
    document.body.classList.toggle('modal-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.classList.remove('modal-open'); document.body.style.overflow = ''; };
  }, [openCreate, kpiModalOpen, selected]);

  // ─── Derived groups using API statuses ──────────────────────────────────────
  const byStatus   = (...ss) => apiTickets.filter(t => ss.includes(t.status));
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
  const openKpiModal  = (key) => { setModalFilter('All'); setKpiModalKey(key); setKpiModalOpen(true); };
  const closeKpiModal = ()    => { setKpiModalOpen(false); setKpiModalKey(null); };
  const modalDef = KPI_DEFS.find(k => k.key === kpiModalKey) || { label: 'Details', items: [] };

  // ─── Create ticket helpers ───────────────────────────────────────────────────
  const ctSet   = (k, v) => { setCtForm(f => ({ ...f, [k]: v })); setCtTouched(t => ({ ...t, [k]: true })); };
  const ctTouch = (k)    => setCtTouched(t => ({ ...t, [k]: true }));
  const ctFieldErr = (k) => {
    if (!ctTouched[k]) return '';
    if (k === 'title'          && !ctForm.title.trim())       return 'Title is required.';
    if (k === 'description'    && !ctForm.description.trim()) return 'Description is required.';
    if (k === 'ticket_type_id' && !ctForm.ticket_type_id)     return 'Please select a ticket type.';
    return '';
  };

  const submitCreateTicket = async () => {
    setCtTouched({ title: true, description: true, ticket_type_id: true });
    if (!ctForm.title.trim() || !ctForm.description.trim() || !ctForm.ticket_type_id) {
      setCtErr('Please fill in all required fields.');
      return;
    }
    setCtBusy(true); setCtErr('');
    try {
      const payload = { title: ctForm.title.trim(), description: ctForm.description.trim(), ticket_type_id: Number(ctForm.ticket_type_id) };
      if (ctForm.assigned_to) payload.assigned_to = Number(ctForm.assigned_to);
      await TicketService.createTicket(payload);
      setCtForm({ title: '', description: '', ticket_type_id: '', assigned_to: '' });
      setCtTouched({});
      setOpenCreate(false);
      setSuccessMsg('Ticket created successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadTickets();
    } catch (e) {
      setCtErr(e?.response?.data?.message || 'Failed to create ticket. Please try again.');
    } finally { setCtBusy(false); }
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

  // ─── Shared input style for create modal ──────────────────────────────────────
  const inputStyle = (hasErr) => ({
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1.5px solid ${hasErr ? '#fca5a5' : '#e5e7eb'}`,
    fontSize: 14, outline: 'none', background: hasErr ? '#fff7f7' : '#ffffff',
    boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827',
  });

  // ─── Newest-3 helpers ────────────────────────────────────────────────────────
  const newest3 = (arr) => [...arr].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="View your tickets and tasks at a glance"
        actions={<button className="btn-primary" onClick={() => setOpenCreate(true)}>Create Ticket</button>}
      />

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
                <button className="ts-footer-btn" onClick={() => openKpiModal('pending')}>
                  View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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
                <button className="ts-footer-btn" onClick={() => openKpiModal('active')}>
                  View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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
                <button className="ts-footer-btn" onClick={() => openKpiModal('resolved')}>
                  View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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
                <button className="ts-footer-btn" onClick={() => openKpiModal('rejected')}>
                  View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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
                style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, background: 'rgba(2,6,23,0.45)', backdropFilter: 'blur(3px)' }}
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
                    <button onClick={() => { setOpenCreate(false); setCtForm({ title: '', description: '', ticket_type_id: '', assigned_to: '' }); setCtTouched({}); setCtErr(''); }} disabled={ctBusy}
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

                    {/* Ticket Type */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Ticket Type <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={ctForm.ticket_type_id} onChange={e => ctSet('ticket_type_id', e.target.value)} onBlur={() => ctTouch('ticket_type_id')} onFocus={() => setCtFocus('type')} onBlurCapture={() => setCtFocus('')}
                        style={{ ...inputStyle(!!ctFieldErr('ticket_type_id')), boxShadow: ctFocus === 'type' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: ctFocus === 'type' && !ctFieldErr('ticket_type_id') ? '#93c5fd' : ctFieldErr('ticket_type_id') ? '#fca5a5' : '#e5e7eb', cursor: 'pointer' }}
                      >
                        <option value="">— Select a ticket type —</option>
                        {typesList.map(t => <option key={t.id} value={t.id}>{t.title}{t.approval_required ? ' (Requires Approval)' : ''}</option>)}
                      </select>
                      {ctFieldErr('ticket_type_id') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{ctFieldErr('ticket_type_id')}</div>}
                      {selectedType && (
                        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{selectedType.title}</div>
                            <div style={{ color: '#4b5563', fontSize: 12, marginTop: 3 }}>
                              {selectedType.departments?.department && <span style={{ marginRight: 10 }}>Dept: <strong>{selectedType.departments.department}</strong></span>}
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
                      <select value={ctForm.assigned_to} onChange={e => ctSet('assigned_to', e.target.value)} onFocus={() => setCtFocus('assigned_to')} onBlurCapture={() => setCtFocus('')} disabled={officersLoading}
                        style={{ ...inputStyle(false), boxShadow: ctFocus === 'assigned_to' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: ctFocus === 'assigned_to' ? '#93c5fd' : '#e5e7eb', cursor: 'pointer', color: ctForm.assigned_to ? '#111827' : '#9ca3af' }}
                      >
                        <option value="">{officersLoading ? 'Loading officers…' : '— Auto-assign (recommended) —'}</option>
                        {officers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}{u.department ? ` · ${u.department}` : ''}</option>)}
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
                      <button onClick={() => { setOpenCreate(false); setCtForm({ title: '', description: '', ticket_type_id: '', assigned_to: '' }); setCtTouched({}); setCtErr(''); }} disabled={ctBusy}
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
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, background: 'rgba(2,6,23,0.50)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
          >
            <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 72px rgba(2,6,23,0.28)' }}
              onClick={e => e.stopPropagation()}>
              {(() => {
                const m = statusMeta(selected.status);
                const creatorInitials = (selected.created_by?.name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <>
                    {/* Header */}
                    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '22px 28px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <code style={{ background: 'rgba(255,255,255,0.12)', color: '#93c5fd', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{selected.id}</code>
                          <span style={{ background: m.color + '25', color: m.color, borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{m.label}</span>
                        </div>
                        <button onClick={() => setSelected(null)}
                          style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#94a3b8', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>×</button>
                      </div>
                      <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18, lineHeight: 1.35, marginBottom: 6 }}>{selected.title}</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>Created {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                      {/* Description */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Description</div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', fontSize: 14, color: '#374151', lineHeight: 1.7, textIndent: '1em', wordBreak: 'break-word', maxHeight: 160, overflowY: 'auto' }}>
                          {selected.description || 'No description provided.'}
                        </div>
                      </div>

                      {/* Info grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                        {/* Type */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ticket Type</div>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{selected.ticket_type?.title || '—'}</div>
                          {selected.ticket_type?.expected_sla_duration && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dbeafe', color: '#1d4ed8', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, marginTop: 6 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              {selected.ticket_type.expected_sla_duration}h SLA
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                            {selected.ticket_type?.approval_required
                              ? `Requires ${selected.ticket_type.approval_count} approval${selected.ticket_type.approval_count !== 1 ? 's' : ''}`
                              : 'No approval needed'}
                          </div>
                        </div>

                        {/* Status */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Status</div>
                          <span style={{ background: m.color + '1a', color: m.color, borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 700 }}>{m.label}</span>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>{selected.ticket_type?.department || '—'}</div>
                        </div>

                        {/* Created By */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Created By</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{creatorInitials}</div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{selected.created_by?.name || '—'}</div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>{selected.created_by?.email || ''}</div>
                              {selected.created_by?.department && <div style={{ fontSize: 11, color: '#9ca3af' }}>{selected.created_by.department}</div>}
                            </div>
                          </div>
                        </div>

                        {/* Assigned Officer */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Assigned Officer</div>
                          {selected.assignment?.officer ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {`${selected.assignment.officer.first_name?.[0] || ''}${selected.assignment.officer.last_name?.[0] || ''}`.toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{selected.assignment.officer.first_name} {selected.assignment.officer.last_name}</div>
                                <div style={{ fontSize: 11, color: '#6b7280' }}>{selected.assignment.officer.email}</div>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: 13 }}>Not yet assigned</span>
                          )}
                        </div>
                      </div>

                      {/* Close error */}
                      {closeTicketErr && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 8, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#b91c1c' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
                          {closeTicketErr}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: '#fafafa', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
                      {['PENDING_APPROVAL', 'QUEUED'].includes(selected.status) && (
                        <button onClick={() => handleCloseTicket(selected.id)} disabled={closeTicketBusy}
                          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: closeTicketBusy ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: closeTicketBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {closeTicketBusy && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                          {closeTicketBusy ? 'Closing…' : 'Close Ticket'}
                        </button>
                      )}
                      <button onClick={() => setSelected(null)}
                        style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Dismiss</button>
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
          <div className="um-modal-overlay um-blur-overlay" onClick={e => { if (e.target === e.currentTarget) closeKpiModal(); }}>
            <div className="um-modal" style={{ maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
              <h3>{modalDef.label}</h3>
              {kpiModalKey === 'active' && (
                <div style={{ marginBottom: 8 }}>
                  <label className="muted">Filter:&nbsp;
                    <select value={modalFilter} onChange={e => setModalFilter(e.target.value)}>
                      <option value="All">All</option>
                      <option value="QUEUED">In Queue</option>
                      <option value="PROCESSING">In Progress</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="um-table" style={{ marginTop: 12 }}>
                <div className="um-table-head">
                  <div className="um-row head um-kpi-grid">
                    <div className="um-cell">ID</div>
                    <div className="um-cell">Title</div>
                    <div className="um-cell">Type</div>
                    <div className="um-cell">Status</div>
                    <div className="um-cell">View</div>
                  </div>
                </div>
                <div className="um-table-body">
                  {(modalDef.items || [])
                    .filter(t => kpiModalKey !== 'active' || modalFilter === 'All' || t.status === modalFilter)
                    .map(t => {
                      const m = statusMeta(t.status);
                      return (
                        <div className="um-row um-kpi-grid" key={t.id}>
                          <div className="um-cell"><code style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{t.id}</code></div>
                          <div className="um-cell">{t.title}</div>
                          <div className="um-cell">{t.ticket_type?.title || '—'}</div>
                          <div className="um-cell"><span className="status" style={{ background: m.color + '1a', color: m.color, padding: '4px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{m.label}</span></div>
                          <div className="um-cell" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" className="icon-btn" onClick={() => { closeKpiModal(); setCloseTicketErr(''); setSelected(t); }} aria-label={`View ticket ${t.id}`}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2.2 12.1C3.7 7.6 7.5 4.5 12 4.5c4.5 0 8.3 3.1 9.8 7.6.1.3.1.6 0 .9-1.5 4.5-5.3 7.6-9.8 7.6-4.5 0-8.3-3.1-9.8-7.6a1.2 1.2 0 0 1 0-.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.7"/></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {(modalDef.items || []).filter(t => kpiModalKey !== 'active' || modalFilter === 'All' || t.status === modalFilter).length === 0 && (
                    <div className="um-row"><div className="um-cell" style={{ color: '#9ca3af' }}>No items</div></div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn-muted" onClick={closeKpiModal}>Close</button>
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
