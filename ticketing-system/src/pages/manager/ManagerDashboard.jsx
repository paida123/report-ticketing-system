import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PageHeader from '../../components/PageHeader/PageHeader';
import StatsCard, { StatsRow } from '../../components/StatsCard/StatsCard';
import TicketService from '../../services/ticket.service';
import TicketTypeService from '../../services/ticketType.service';
import DepartmentService from '../../services/department.service';
import UserService from '../../services/user.service';
import SlaService from '../../services/sla.service';
import TicketApprovalService from '../../services/ticketApproval.service';
import AssignmentService from '../../services/assignment.service';
import { useAuth } from '../../context/AuthContext';
import ApprovalStepper from '../../components/ApprovalStepper/ApprovalStepper';
import '../admin.css';
import '../user/UserDashboard.css';
import './ManagerDashboard.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getMedal = (score) => {
  if (score >= 0.9) return { label: 'Gold',   emoji: '🥇', cls: 'gold',   color: '#f59e0b', desc: 'Excellent' };
  if (score >= 0.7) return { label: 'Silver', emoji: '🥈', cls: 'silver', color: '#94a3b8', desc: 'On target' };
  if (score >= 0.5) return { label: 'Bronze', emoji: '🥉', cls: 'bronze', color: '#c2700a', desc: 'Needs improvement' };
  return               { label: 'Fail',   emoji: '❌', cls: 'fail',   color: '#ef4444', desc: 'Below standard' };
};

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

// ─── Component ────────────────────────────────────────────────────────────────
const ManagerDashboard = () => {
  const { user } = useAuth();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [allTickets, setAllTickets]           = useState([]);
  const [ticketsLoading, setTicketsLoading]   = useState(true);
  const [ticketsError, setTicketsError]       = useState('');
  const [pendingApprovalTickets, setPendingApprovalTickets] = useState([]);
  const [slaData, setSlaData]                 = useState([]);
  const [slaLoading, setSlaLoading]           = useState(true);
  const [managerProfile, setManagerProfile]   = useState(null);
  const [departments, setDepartments]         = useState([]);
  const [typesList, setTypesList]             = useState([]);

  // View-ticket modal
  const [selected, setSelected]               = useState(null);
  const [closeTicketBusy, setCloseTicketBusy] = useState(false);
  const [closeTicketErr, setCloseTicketErr]   = useState('');

  // Approve / decline
  const [approveBusy, setApproveBusy]         = useState(false);
  const [approveErr, setApproveErr]           = useState('');
  const [declineOpen, setDeclineOpen]         = useState(false);
  const [declineReason, setDeclineReason]     = useState('');
  const [declineBusy, setDeclineBusy]         = useState(false);
  const [declineErr, setDeclineErr]           = useState('');

  // Reassign ticket
  const [reassignOpen, setReassignOpen]       = useState(false);
  const [reassignOfficer, setReassignOfficer] = useState('');
  const [reassignBusy, setReassignBusy]       = useState(false);
  const [reassignErr, setReassignErr]         = useState('');
  const [officers, setOfficers]               = useState([]);
  const [officersLoading, setOfficersLoading] = useState(false);

  // KPI modal
  const [kpiModalOpen, setKpiModalOpen]       = useState(false);
  const [kpiModalKey, setKpiModalKey]         = useState(null);
  const [kpiModalFilter, setKpiModalFilter]   = useState('All');

  // Toast / tab
  const [successMsg, setSuccessMsg]           = useState('');
  const [activeTab, setActiveTab]             = useState('department');

  // ── Loaders ─────────────────────────────────────────────────────────────────
  const loadTickets = useCallback(() => {
    setTicketsLoading(true); setTicketsError('');
    Promise.all([
      TicketService.getAllTickets({ limit: 200 }),
      TicketService.getAllTickets({ limit: 200, view: 'pending_my_approval' }),
    ])
      .then(([allRes, pendingRes]) => {
        const d = allRes?.data?.data;
        setAllTickets(Array.isArray(d?.tickets) ? d.tickets : []);
        const p = pendingRes?.data?.data;
        setPendingApprovalTickets(Array.isArray(p?.tickets) ? p.tickets : []);
      })
      .catch(() => setTicketsError('Failed to load tickets. Please refresh.'))
      .finally(() => setTicketsLoading(false));
  }, []);

  const loadSla = useCallback(() => {
    setSlaLoading(true);
    SlaService.getAllSla()
      .then(r => { const d = r?.data; setSlaData(Array.isArray(d?.data) ? d.data : []); })
      .catch(() => {})
      .finally(() => setSlaLoading(false));
  }, []);

  const loadTypes = useCallback(() => {
    TicketTypeService.getAllTicketTypes({ limit: 100 })
      .then(r => { const d = r?.data?.data; setTypesList(Array.isArray(d?.ticket_types) ? d.ticket_types : []); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => { loadSla(); }, [loadSla]);
  useEffect(() => { loadTypes(); }, [loadTypes]);
  useEffect(() => {
    DepartmentService.getAllDepartments()
      .then(r => {
        const d = r?.data?.data;
        setDepartments(Array.isArray(d) ? d : []);
      })
      .catch(() => setDepartments([]));
  }, []);

  // Load manager profile to get full user details including department
  useEffect(() => {
    if (!user?.id) return;
    UserService.getUserById(user.id)
      .then(r => {
        const profile = r?.data?.data || r?.data || null;
        setManagerProfile(profile);
      })
      .catch(() => {});
  }, [user?.id]);

  // ── Scroll lock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const open = kpiModalOpen || !!selected;
    document.body.classList.toggle('modal-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.classList.remove('modal-open'); document.body.style.overflow = ''; };
  }, [kpiModalOpen, selected]);

  // Load officers when a QUEUED ticket is selected for potential reassignment
  useEffect(() => {
    if (!selected || selected.status !== 'QUEUED') {
      return;
    }

    const ticketDeptId = selected.ticket_type?.department_id || selected.department_id;
    if (!ticketDeptId) return;

    let cancelled = false;
    setOfficersLoading(true);

    const normalizeUsers = (response) => {
      const data = response?.data?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.users)) return data.users;
      return [];
    };

    const matchesDepartment = (candidate) => {
      const departmentId = candidate?.department_id || candidate?.departments?.id || candidate?.department?.id;
      return String(departmentId || '') === String(ticketDeptId || '');
    };

    const isOfficer = (candidate) => {
      const roleName = String(candidate?.role?.role || candidate?.role?.role_name || candidate?.role_name || candidate?.role || '').toUpperCase();
      return !roleName || roleName === 'OFFICER';
    };

    const loadOfficers = async () => {
      try {
        const byDepartment = await UserService.getUsersByDepartment(ticketDeptId, { status: 'ACTIVE' });
        let users = normalizeUsers(byDepartment);

        if (!users.length) {
          const allUsers = await UserService.getAllUsers({ limit: 300, status: 'ACTIVE' });
          users = normalizeUsers(allUsers).filter(matchesDepartment);
        }

        const officersOnly = users.filter(isOfficer);
        if (!cancelled) setOfficers(officersOnly.length ? officersOnly : users);
      } catch {
        if (!cancelled) setOfficers([]);
      } finally {
        if (!cancelled) setOfficersLoading(false);
      }
    };

    loadOfficers();
    return () => { cancelled = true; };
  }, [selected]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  // Get department from user JWT token (most reliable) or from profile
  const userDepartmentId = user?.department_id;
  const userDepartmentName = user?.department || managerProfile?.department?.department || null;

  // Officers see all tickets in department tab, managers see only their department
  const isOfficer = user?.role?.toLowerCase() === 'officer';
  const deptTickets = isOfficer 
    ? allTickets
    : allTickets.filter(t => {
        if (!userDepartmentId) return false;
        
        // Check ticket's department via ticket_type (primary method)
        const ticketDeptId = t.ticket_type?.department_id;
        if (ticketDeptId && String(ticketDeptId) === String(userDepartmentId)) {
          return true;
        }
        
        // Fallback: check creator's department
        const creatorDeptId = t.created_by?.department_id;
        if (creatorDeptId && String(creatorDeptId) === String(userDepartmentId)) {
          return true;
        }
        
        return false;
      });

  const myTickets = allTickets.filter(t => {
    if (!user) return false;
    const officer = t.assignment?.officer;
    if (!officer) return false;
    // Match by officer id first, then fall back to email
    if (user.id && String(officer.id || '') === String(user.id)) return true;
    if (user.email && String(officer.email || '').toLowerCase() === String(user.email).toLowerCase()) return true;
    return false;
  });

  const viewTickets = activeTab === 'department' ? deptTickets : myTickets;
  const byStatus    = (...ss) => viewTickets.filter(t => ss.includes(t.status));
  // Use cross-department pending approval tickets from the dedicated endpoint
  const pending     = activeTab === 'department' ? pendingApprovalTickets : byStatus('PENDING_APPROVAL');
  const active      = byStatus('QUEUED', 'PROCESSING');
  const resolved    = byStatus('RESOLVED', 'CLOSED');
  const rejected    = byStatus('REJECTED');

  const KPI_DEFS = [
    { key: 'pending',  label: 'Pending',  color: 'amber', items: pending  },
    { key: 'active',   label: 'Active',   color: 'blue',  items: active   },
    { key: 'resolved', label: 'Resolved', color: 'green', items: resolved },
    { key: 'rejected', label: 'Rejected', color: 'red',   items: rejected },
  ];

  const openKpiModal  = (key) => { setKpiModalFilter('All'); setKpiModalKey(key); setKpiModalOpen(true); };
  const closeKpiModal = ()    => { setKpiModalOpen(false); setKpiModalKey(null); };
  const modalDef = KPI_DEFS.find(k => k.key === kpiModalKey) || { label: 'Details', items: [] };


  // ── Close ticket ──────────────────────────────────────────────────────────────
  const handleCloseTicket = async (ticketId) => {
    setCloseTicketBusy(true); setCloseTicketErr('');
    try {
      await TicketService.closeTicket(ticketId);
      setSelected(null);
      setSuccessMsg('Ticket closed.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadTickets();
    } catch (e) { setCloseTicketErr(e?.response?.data?.message || 'Failed to close ticket.'); }
    finally { setCloseTicketBusy(false); }
  };

  // ── Approve ticket ────────────────────────────────────────────────────────────
  const handleApprove = async (ticketId) => {
    setApproveBusy(true); setApproveErr('');
    try {
      await TicketApprovalService.createTicketApproval({ ticket_id: ticketId, status: 'APPROVED' });
      setSelected(null);
      setSuccessMsg('Ticket approved.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadTickets();
    } catch (e) { setApproveErr(e?.response?.data?.message || 'Failed to approve ticket.'); }
    finally { setApproveBusy(false); }
  };

  // ── Decline ticket ────────────────────────────────────────────────────────────
  const handleDeclineConfirm = async (ticketId) => {
    const reason = declineReason.trim();
    if (!reason) { setDeclineErr('Please provide a reason.'); return; }
    setDeclineBusy(true); setDeclineErr('');
    try {
      await TicketApprovalService.createTicketApproval({ ticket_id: ticketId, status: 'REJECTED', comment: reason });
      setDeclineOpen(false); setDeclineReason(''); setSelected(null);
      setSuccessMsg('Ticket declined.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadTickets();
    } catch (e) { setDeclineErr(e?.response?.data?.message || 'Failed to decline ticket.'); }
    finally { setDeclineBusy(false); }
  };

  // ── Reassign ticket ──────────────────────────────────────────────────────────
  const handleReassignConfirm = async (ticketId) => {
    if (!reassignOfficer) { setReassignErr('Please select an officer.'); return; }
    setReassignBusy(true); setReassignErr('');
    try {
      await AssignmentService.reassignTicket(ticketId, reassignOfficer);
      setReassignOpen(false); setReassignOfficer(''); setSelected(null);
      setSuccessMsg('Ticket reassigned successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadTickets();
    } catch (e) { setReassignErr(e?.response?.data?.message || 'Failed to reassign ticket.'); }
    finally { setReassignBusy(false); }
  };

  // ── Shared sub-components ─────────────────────────────────────────────────────
  const TicketRow = ({ t }) => {
    const m = statusMeta(t.status);
    return (
      <div className="ts-card" role="button" tabIndex={0}
        onClick={() => { setCloseTicketErr(''); setApproveErr(''); setDeclineErr(''); setDeclineOpen(false); setSelected(t); }}
        onKeyDown={e => { if (e.key === 'Enter') { setCloseTicketErr(''); setApproveErr(''); setSelected(t); } }}
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

  const EmptyState = ({ msg }) => (
    <div className="ts-empty">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="#cbd5e1" strokeWidth="1.5"/><path d="M3 9h18" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round"/></svg>
      {msg}
    </div>
  );

  const SkeletonRows = () => <>{[1, 2, 3].map(i => <div key={i} className="ts-skeleton" />)}</>;

  // ── SLA calcs ─────────────────────────────────────────────────────────────────
  const slaTotal    = slaData.length;
  const slaMet      = slaData.filter(r => r.actual_sla != null && r.expected_sla != null && r.actual_sla <= r.expected_sla).length;
  const slaBreached = slaTotal - slaMet;
  const slaScore    = slaTotal > 0 ? slaMet / slaTotal : 1;
  const slaMedal    = getMedal(slaScore);
  const slaPct      = Math.round(slaScore * 100);
  const topFiveSla  = slaData.slice(0, 5);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Manager Dashboard"
        subtitle={`${activeTab === 'department' ? (isOfficer ? 'All' : (userDepartmentName ? `${userDepartmentName} Department` : 'Department')) : 'My'} tickets at a glance`}
      />

      {/* Toast */}
      {successMsg && createPortal(
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: '#10b981', color: '#fff', borderRadius: 12, padding: '13px 22px', fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {successMsg}
        </div>, document.body
      )}

      {/* View toggle */}
      <div className="mgr-tabs">
        <button className={`mgr-tab ${activeTab === 'department' ? 'active' : ''}`} onClick={() => setActiveTab('department')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>
          {isOfficer ? 'All Tickets' : 'Department View'}
          {!isOfficer && userDepartmentName && <span className="mgr-tab-badge">{userDepartmentName}</span>}
        </button>
        <button className={`mgr-tab ${activeTab === 'mine' ? 'active' : ''}`} onClick={() => setActiveTab('mine')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          My Tickets
        </button>
      </div>

      {/* KPI Stats */}
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

          {/* Pending Approval */}
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
              {ticketsLoading ? <SkeletonRows /> : pending.length ? pending.slice(0, 4).map(t => <TicketRow key={t.id} t={t} />) : <EmptyState msg="No pending tickets" />}
            </div>
            {!ticketsLoading && pending.length > 4 && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => openKpiModal('pending')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View all ({pending.length})
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            )}
          </div>

          {/* Active */}
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
              {ticketsLoading ? <SkeletonRows /> : active.length ? active.slice(0, 4).map(t => <TicketRow key={t.id} t={t} />) : <EmptyState msg="No active tickets" />}
            </div>
            {!ticketsLoading && active.length > 4 && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => openKpiModal('active')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View all ({active.length})
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            )}
          </div>

          {/* Resolved */}
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
              {ticketsLoading ? <SkeletonRows /> : resolved.length ? resolved.slice(0, 4).map(t => <TicketRow key={t.id} t={t} />) : <EmptyState msg="No resolved tickets" />}
            </div>
            {!ticketsLoading && resolved.length > 4 && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => openKpiModal('resolved')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View all ({resolved.length})
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            )}
          </div>

          {/* Rejected */}
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
              {ticketsLoading ? <SkeletonRows /> : rejected.length ? rejected.slice(0, 4).map(t => <TicketRow key={t.id} t={t} />) : <EmptyState msg="No rejected tickets" />}
            </div>
            {!ticketsLoading && rejected.length > 4 && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => openKpiModal('rejected')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View all ({rejected.length})
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            )}
          </div>

          {/* SLA — full width */}
          <div className="table-section ts-sla">
            <div className="ts-header">
              <div className="ts-title-wrap">
                <div className="ts-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#6366f1" strokeWidth="1.8"/><path d="M8 8l-3 9 7-3 7 3-3-9" stroke="#6366f1" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                </div>
                <span className="ts-title">Overall SLA Performance</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }} title={slaMedal.label}>{slaMedal.emoji}</span>
                <span className="ts-badge" style={{ background: slaMedal.color + '1a', color: slaMedal.color }}>{slaLoading ? '…' : `${slaPct}%`}</span>
              </div>
            </div>
            <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 7, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: slaLoading ? '0%' : `${slaPct}%`, background: `linear-gradient(90deg,${slaMedal.color},${slaMedal.color}bb)`, transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 13, color: slaMedal.color, minWidth: 38, textAlign: 'right' }}>{slaLoading ? '…' : `${slaPct}%`}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                <span>Total: <strong style={{ color: '#111827' }}>{slaLoading ? '…' : slaTotal}</strong></span>
                <span>Met: <strong style={{ color: '#10b981' }}>{slaLoading ? '…' : slaMet}</strong></span>
                <span>Breached: <strong style={{ color: '#ef4444' }}>{slaLoading ? '…' : slaBreached}</strong></span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: slaMedal.color }}>{slaMedal.emoji} {slaMedal.label} — {slaMedal.desc}</span>
              </div>
            </div>
            <div className="ts-col-head ts-head-sla"><span>ID</span><span>Officer</span><span>Status · Grade</span></div>
            <div className="ts-body">
              {slaLoading ? <SkeletonRows />
                : topFiveSla.length ? topFiveSla.map((r, i) => {
                    const isMet = r.actual_sla != null && r.expected_sla != null && r.actual_sla <= r.expected_sla;
                    const gc = r.grade
                      ? (r.grade.toUpperCase() === 'A' ? '#10b981' : r.grade.toUpperCase() === 'B' ? '#3b82f6' : r.grade.toUpperCase() === 'C' ? '#f59e0b' : '#ef4444')
                      : '#94a3b8';
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

        </div>
      </section>

      {/* KPI Modal */}
      {kpiModalOpen && createPortal(
        <div role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, background: 'rgba(2,6,23,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeKpiModal(); }}
        >
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 64px rgba(2,6,23,0.22)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>{modalDef.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select value={kpiModalFilter} onChange={e => setKpiModalFilter(e.target.value)}
                  style={{ fontSize: 13, borderRadius: 8, border: '1.5px solid #e5e7eb', padding: '6px 10px', outline: 'none', color: '#374151' }}>
                  <option value="All">All types</option>
                  {[...new Set((modalDef.items || []).map(t => t.ticket_type?.title).filter(Boolean))].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button onClick={closeKpiModal} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 24px' }}>
              {(kpiModalFilter === 'All' ? modalDef.items : modalDef.items.filter(t => t.ticket_type?.title === kpiModalFilter)).map(t => {
                const m = statusMeta(t.status);
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', minWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.id}</span>
                    <span style={{ flex: 1, fontSize: 14, color: '#111827', fontWeight: 500 }}>{t.title}</span>
                    <span style={{ background: m.color + '18', color: m.color, borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{m.label}</span>
                  </div>
                );
              })}
              {modalDef.items.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 14 }}>No tickets in this category.</div>}
            </div>
          </div>
        </div>, document.body
      )}

      {/* View Ticket Modal */}
      {selected && createPortal(
        <div role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, background: 'rgba(2,6,23,0.50)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setSelected(null); setDeclineOpen(false); setDeclineReason(''); } }}
        >
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 72px rgba(2,6,23,0.28)' }}
            onClick={e => e.stopPropagation()}>
            {(() => {
              const m = statusMeta(selected.status);
              const creatorInitials = (selected.created_by?.name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
              const isPending = selected.status === 'PENDING_APPROVAL';
              const canReassign = selected.status === 'QUEUED' && !selected.locked;
              
              // Check if current user can approve based on role_id and department_id
              const isMineToApprove = isPending && (selected.approval_steps || []).some(step => {
                if (step.status !== 'PENDING') return false;
                const roleMatches = String(step.role_id || '') === String(user?.role_id || '');
                const deptMatches = !step.department_id || String(step.department_id || '') === String(user?.department_id || '');
                return roleMatches && deptMatches;
              });
              
              return (
                <>
                  <div style={{ background: `linear-gradient(135deg,${m.color}18 0%,${m.color}08 100%)`, borderBottom: `2px solid ${m.color}25`, padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: m.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                      {m.cls === 'pending-approval' ? '⏳' : m.cls === 'in-process' ? '⚡' : m.cls === 'done' ? '✅' : '❌'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', lineHeight: 1.3, marginBottom: 4, wordBreak: 'break-word' }}>{selected.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', background: '#f1f5f9', borderRadius: 5, padding: '2px 7px' }}>{selected.id}</span>
                        <span style={{ background: m.color + '18', color: m.color, borderRadius: 8, padding: '2px 9px', fontWeight: 700, fontSize: 12 }}>{m.label}</span>
                      </div>
                    </div>
                    <button onClick={() => { setSelected(null); setDeclineOpen(false); setDeclineReason(''); }}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      aria-label="Close">×</button>
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{creatorInitials}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{selected.created_by?.name || '—'}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {selected.created_by?.email || ''} · {typeof selected.created_by?.department === 'string' ? selected.created_by?.department : selected.created_by?.department?.department || '—'}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Created</div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}</div>
                      </div>
                    </div>

                    <div style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</div>
                      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selected.description || '—'}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                      {[
                        { label: 'Ticket Type', val: selected.ticket_type?.title || '—' },
                        { label: 'SLA', val: selected.ticket_type?.expected_sla_duration ? `${selected.ticket_type.expected_sla_duration}h` : '—' },
                        { label: 'Approval Required', val: selected.ticket_type?.approval_required ? `Yes (${selected.ticket_type.approval_count} step${selected.ticket_type.approval_count !== 1 ? 's' : ''})` : 'No' },
                        { label: 'Assigned Officer', val: selected.assignment?.officer?.name || 'Unassigned' },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                          <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Approval Progress Stepper */}
                    {selected.ticket_type?.approval_required && (
                      <div style={{ marginTop: 16 }}>
                        <ApprovalStepper ticketId={selected.id} />
                      </div>
                    )}

                    {(approveErr || closeTicketErr || declineErr || reassignErr) && (
                      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#b91c1c', fontSize: 13, marginTop: 14 }}>
                        {approveErr || closeTicketErr || declineErr || reassignErr}
                      </div>
                    )}

                    {declineOpen && (
                      <div style={{ marginTop: 14 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Reason for declining <span style={{ color: '#ef4444' }}>*</span></label>
                        <textarea
                          value={declineReason}
                          onChange={e => { setDeclineReason(e.target.value); setDeclineErr(''); }}
                          rows={3}
                          placeholder="Provide a reason for declining this ticket…"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${!declineReason.trim() && declineErr ? '#fca5a5' : '#e5e7eb'}`, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                          autoFocus
                        />
                        {declineErr && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{declineErr}</div>}
                      </div>
                    )}

                    {canReassign && reassignOpen && (
                      <div style={{ marginTop: 14 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Reassign to <span style={{ color: '#ef4444' }}>*</span></label>
                        <select
                          value={reassignOfficer}
                          onChange={e => { setReassignOfficer(e.target.value); setReassignErr(''); }}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', cursor: 'pointer' }}
                          autoFocus
                        >
                          <option value="">Select an officer...</option>
                          {officers.filter(o => String(o.id) !== String(selected.assignment?.officer?.id)).map(o => (
                            <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                          ))}
                        </select>
                        {reassignErr && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{reassignErr}</div>}
                        {officers.length === 0 && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>No other officers available in this department</div>}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '14px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: '#fafafa', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
                    {canReassign && !reassignOpen && (
                      <button
                        onClick={() => { setReassignOpen(true); setReassignErr(''); setReassignOfficer(''); }}
                        style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 11V9a4 4 0 0 1 4-4h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 13v2a4 4 0 0 1-4 4H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Reassign
                      </button>
                    )}
                    {canReassign && reassignOpen && (
                      <>
                        <button
                          onClick={() => { setReassignOpen(false); setReassignOfficer(''); setReassignErr(''); }}
                          disabled={reassignBusy}
                          style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReassignConfirm(selected.id)}
                          disabled={reassignBusy || !reassignOfficer}
                          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: (reassignBusy || !reassignOfficer) ? '#93c5fd' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: (reassignBusy || !reassignOfficer) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {reassignBusy && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                          {reassignBusy ? 'Reassigning…' : 'Confirm Reassign'}
                        </button>
                      </>
                    )}
                    {isMineToApprove && !declineOpen && !reassignOpen && (
                      <>
                        <button onClick={() => { setDeclineOpen(true); setDeclineErr(''); setDeclineReason(''); }} disabled={approveBusy}
                          style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                          Decline
                        </button>
                        <button onClick={() => handleApprove(selected.id)} disabled={approveBusy}
                          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: approveBusy ? '#6ee7b7' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: approveBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {approveBusy ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          {approveBusy ? 'Approving…' : 'Approve'}
                        </button>
                      </>
                    )}
                    {isMineToApprove && declineOpen && !reassignOpen && (
                      <>
                        <button onClick={() => { setDeclineOpen(false); setDeclineReason(''); setDeclineErr(''); }} disabled={declineBusy}
                          style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <button onClick={() => handleDeclineConfirm(selected.id)} disabled={declineBusy || !declineReason.trim()}
                          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: (declineBusy || !declineReason.trim()) ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: (declineBusy || !declineReason.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {declineBusy && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                          {declineBusy ? 'Declining…' : 'Confirm Decline'}
                        </button>
                      </>
                    )}
                    {['QUEUED', 'PROCESSING'].includes(selected.status) && selected.assignment?.officer?.id === user?.id && !reassignOpen && (
                      <button onClick={() => handleCloseTicket(selected.id)} disabled={closeTicketBusy}
                        style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: closeTicketBusy ? '#6ee7b7' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: closeTicketBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {closeTicketBusy ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/></svg>}
                        {closeTicketBusy ? 'Closing…' : 'Close Ticket'}
                      </button>
                    )}
                    <button onClick={() => { setSelected(null); setDeclineOpen(false); setDeclineReason(''); setReassignOpen(false); setReassignOfficer(''); }}
                      style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Dismiss
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>, document.body
      )}
    </>
  );
};

export default ManagerDashboard;
