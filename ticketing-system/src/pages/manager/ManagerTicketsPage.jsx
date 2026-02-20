import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PageHeader from '../../components/PageHeader/PageHeader';
import TicketService from '../../services/ticket.service';
import TicketTypeService from '../../services/ticketType.service';
import UserService from '../../services/user.service';
import TicketApprovalService from '../../services/ticketApproval.service';
import { useAuth } from '../../context/AuthContext';
import '../admin.css';
import '../user/UserTicketPage/UserTicketsPage.css';
import './ManagerDashboard.css';

// Status helpers
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

const FILTER_OPTIONS = [
  { value: 'All',              label: 'All Statuses' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'QUEUED',           label: 'In Queue' },
  { value: 'PROCESSING',       label: 'In Progress' },
  { value: 'RESOLVED',         label: 'Resolved' },
  { value: 'CLOSED',           label: 'Closed' },
  { value: 'REJECTED',         label: 'Rejected' },
];

const STATUS_ICONS = {
  'pending-approval': '|T|',
  'in-process': '|>|',
  'done': '|v|',
  'overdue': '|!|',
};

const inputStyle = (hasErr) => ({
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: `1.5px solid ${hasErr ? '#fca5a5' : '#e5e7eb'}`,
  fontSize: 14, outline: 'none', background: hasErr ? '#fff7f7' : '#fff',
  boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827',
});

const ManagerTicketsPage = ({ bypassDeptFilter = false }) => {
  const { user } = useAuth();

  // Tab: 'department' | 'mine'
  const [activeTab, setActiveTab]           = useState('department');

  // Data
  const [allTickets, setAllTickets]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [loadErr, setLoadErr]               = useState('');
  const [managerDept, setManagerDept]       = useState('');
  const [deptLoading, setDeptLoading]       = useState(!bypassDeptFilter);
  const [successMsg, setSuccessMsg]         = useState('');

  // Filters
  const [query, setQuery]                   = useState('');
  const [statusFilter, setStatusFilter]     = useState('All');

  // Ticket modal
  const [selected, setSelected]             = useState(null);
  const [closeTicketBusy, setCloseTicketBusy] = useState(false);
  const [closeTicketErr, setCloseTicketErr]   = useState('');
  const [approveBusy, setApproveBusy]       = useState(false);
  const [approveErr, setApproveErr]         = useState('');
  const [declineOpen, setDeclineOpen]       = useState(false);
  const [declineReason, setDeclineReason]   = useState('');
  const [declineBusy, setDeclineBusy]       = useState(false);
  const [declineErr, setDeclineErr]         = useState('');

  // Create ticket
  const [modalOpen, setModalOpen]           = useState(false);
  const [ctForm, setCtForm]                 = useState({ title: '', description: '', ticket_type_id: '', assigned_to: '' });
  const [ctTouched, setCtTouched]           = useState({});
  const [ctBusy, setCtBusy]                 = useState(false);
  const [ctErr, setCtErr]                   = useState('');
  const [ctFocus, setCtFocus]               = useState('');
  const [typesList, setTypesList]           = useState([]);
  const [officers, setOfficers]             = useState([]);
  const [officersLoading, setOfficersLoading] = useState(true);

  // Load manager department - use departments alias (plural) matching the backend fix
  useEffect(() => {
    if (bypassDeptFilter || !user?.id) { setDeptLoading(false); return; }
    setDeptLoading(true);
    UserService.getUserById(user.id)
      .then(r => {
        const d = r?.data?.data || r?.data || {};
        // Backend returns alias 'departments' (plural) after our fix
        const dept = d?.departments?.department || d?.department || '';
        setManagerDept(String(dept).trim().toUpperCase());
      })
      .catch(() => {})
      .finally(() => setDeptLoading(false));
  }, [user?.id, bypassDeptFilter]);

  // Load all tickets
  const loadTickets = useCallback(() => {
    setLoading(true); setLoadErr('');
    TicketService.getAllTickets({ limit: 200 })
      .then(r => {
        const all = r?.data?.data?.tickets || [];
        setAllTickets(Array.isArray(all) ? all : []);
      })
      .catch(() => setLoadErr('Failed to load tickets. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  useEffect(() => {
    TicketTypeService.getAllTicketTypes({ limit: 100 })
      .then(r => { const d = r?.data?.data; setTypesList(Array.isArray(d?.ticket_types) ? d.ticket_types : []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    UserService.getAllUsers({ limit: 200 })
      .then(r => { const u = r?.data?.data?.users || r?.data?.data || []; setOfficers(Array.isArray(u) ? u : []); })
      .catch(() => setOfficers([]))
      .finally(() => setOfficersLoading(false));
  }, []);

  // Scroll lock
  useEffect(() => {
    const open = modalOpen || !!selected;
    document.body.classList.toggle('modal-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.classList.remove('modal-open'); document.body.style.overflow = ''; };
  }, [modalOpen, selected]);

  // Derived: split by tab
  const deptTickets = bypassDeptFilter
    ? allTickets
    : allTickets.filter(t =>
        managerDept &&
        String(t.created_by?.department || '').toUpperCase() === managerDept
      );

  // Tickets assigned to the manager as an officer
  const myTickets = allTickets.filter(t => {
    if (!user) return false;
    const officer = t.assignment?.officer;
    if (!officer) return false;
    // Match by officer id first, then fall back to email
    if (user.id   && String(officer.id    || '') === String(user.id)) return true;
    if (user.email && String(officer.email || '').toLowerCase() === String(user.email).toLowerCase()) return true;
    return false;
  });

  const viewTickets = activeTab === 'department' ? deptTickets : myTickets;

  const q = query.trim().toLowerCase();
  const filtered = viewTickets.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (!q) return true;
    return (
      (t.title               || '').toLowerCase().includes(q) ||
      (t.id                  || '').toLowerCase().includes(q) ||
      (t.ticket_type?.title  || '').toLowerCase().includes(q) ||
      (t.created_by?.name    || '').toLowerCase().includes(q) ||
      (t.created_by?.department || '').toLowerCase().includes(q)
    );
  });

  // Create ticket helpers
  const ctSet   = (k, v) => { setCtForm(f => ({ ...f, [k]: v })); setCtTouched(t => ({ ...t, [k]: true })); };
  const ctTouch = (k)    => setCtTouched(t => ({ ...t, [k]: true }));
  const ctFieldErr = (k) => {
    if (!ctTouched[k]) return '';
    if (k === 'title'          && !ctForm.title.trim())       return 'Title is required.';
    if (k === 'description'    && !ctForm.description.trim()) return 'Description is required.';
    if (k === 'ticket_type_id' && !ctForm.ticket_type_id)     return 'Please select a ticket type.';
    return '';
  };
  const resetCreate = () => { setCtForm({ title: '', description: '', ticket_type_id: '', assigned_to: '' }); setCtTouched({}); setCtErr(''); };

  const submitCreateTicket = async () => {
    setCtTouched({ title: true, description: true, ticket_type_id: true });
    if (!ctForm.title.trim() || !ctForm.description.trim() || !ctForm.ticket_type_id) { setCtErr('Please fill in all required fields.'); return; }
    setCtBusy(true); setCtErr('');
    try {
      const payload = { title: ctForm.title.trim(), description: ctForm.description.trim(), ticket_type_id: Number(ctForm.ticket_type_id) };
      if (ctForm.assigned_to) payload.assigned_to = Number(ctForm.assigned_to);
      await TicketService.createTicket(payload);
      resetCreate(); setModalOpen(false);
      setSuccessMsg('Ticket created successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadTickets();
    } catch (e) { setCtErr(e?.response?.data?.message || 'Failed to create ticket.'); }
    finally { setCtBusy(false); }
  };

  // Actions
  const closeModal = () => { setSelected(null); setDeclineOpen(false); setDeclineReason(''); setCloseTicketErr(''); setApproveErr(''); setDeclineErr(''); };

  const handleCloseTicket = async (id) => {
    setCloseTicketBusy(true); setCloseTicketErr('');
    try {
      await TicketService.closeTicket(id);
      closeModal(); setSuccessMsg('Ticket closed.');
      setTimeout(() => setSuccessMsg(''), 4000); loadTickets();
    } catch (e) { setCloseTicketErr(e?.response?.data?.message || 'Failed to close ticket.'); }
    finally { setCloseTicketBusy(false); }
  };

  const handleApprove = async (id) => {
    setApproveBusy(true); setApproveErr('');
    try {
      await TicketApprovalService.createTicketApproval({ ticket_id: id, status: 'APPROVED' });
      closeModal(); setSuccessMsg('Ticket approved.');
      setTimeout(() => setSuccessMsg(''), 4000); loadTickets();
    } catch (e) { setApproveErr(e?.response?.data?.message || 'Failed to approve ticket.'); }
    finally { setApproveBusy(false); }
  };

  const handleDeclineConfirm = async (id) => {
    const reason = declineReason.trim();
    if (!reason) { setDeclineErr('Please provide a reason.'); return; }
    setDeclineBusy(true); setDeclineErr('');
    try {
      await TicketApprovalService.createTicketApproval({ ticket_id: id, status: 'REJECTED', comment: reason });
      closeModal(); setSuccessMsg('Ticket declined.');
      setTimeout(() => setSuccessMsg(''), 4000); loadTickets();
    } catch (e) { setDeclineErr(e?.response?.data?.message || 'Failed to decline ticket.'); }
    finally { setDeclineBusy(false); }
  };

  const isDataLoading = loading || deptLoading;

  return (
    <>
      <PageHeader
        title="Tickets"
        subtitle={activeTab === 'department'
          ? bypassDeptFilter
            ? 'Organisation-wide view — all tickets'
            : (managerDept ? `Department: ${managerDept}` : 'All department tickets')
          : 'Tickets assigned to you as officer'}
        actions={
          <button className="btn-primary" onClick={() => { resetCreate(); setModalOpen(true); }}>
            + Create Ticket
          </button>
        }
      />

      {/* Toast */}
      {successMsg && createPortal(
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: '#10b981', color: '#fff', borderRadius: 12, padding: '13px 22px', fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeInUp 0.3s ease' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {successMsg}
        </div>, document.body
      )}

      {/* Tab toggle */}
      <div className="mgr-tabs" style={{ marginBottom: 4 }}>
        <button
          className={`mgr-tab${activeTab === 'department' ? ' active' : ''}`}
          onClick={() => { setActiveTab('department'); setQuery(''); setStatusFilter('All'); }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {bypassDeptFilter ? 'All Tickets' : 'Department View'}
          {!bypassDeptFilter && !deptLoading && managerDept && (
            <span className="mgr-tab-badge">{managerDept}</span>
          )}
          <span style={{ marginLeft: 6, background: activeTab === 'department' ? '#3b82f6' : '#e5e7eb', color: activeTab === 'department' ? '#fff' : '#64748b', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
            {deptTickets.length}
          </span>
        </button>
        <button
          className={`mgr-tab${activeTab === 'mine' ? ' active' : ''}`}
          onClick={() => { setActiveTab('mine'); setQuery(''); setStatusFilter('All'); }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Assigned to Me
          <span style={{ marginLeft: 6, background: activeTab === 'mine' ? '#3b82f6' : '#e5e7eb', color: activeTab === 'mine' ? '#fff' : '#64748b', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
            {myTickets.length}
          </span>
        </button>
      </div>

      <section className="panel utp-panel">
        {/* Controls */}
        <div className="utp-toolbar">
          <div className="utp-search">
            <svg className="utp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <input
              className="utp-search-input"
              placeholder={activeTab === 'department' ? 'Search title, ID, type, requester...' : 'Search title, ID, type or requester...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <button className="utp-search-clear" onClick={() => setQuery('')} aria-label="Clear search">&times;</button>}
          </div>
          <select className="utp-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {!isDataLoading && <span className="utp-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>}
        </div>

        {loadErr && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 18px', color: '#b91c1c', fontSize: 14, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            {loadErr}
            <button onClick={loadTickets} style={{ marginLeft: 'auto', fontSize: 13, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
          </div>
        )}

        {/* Department warning */}
        {activeTab === 'department' && !bypassDeptFilter && !deptLoading && !managerDept && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 18px', color: '#92400e', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="#d97706" strokeWidth="1.8"/></svg>
            Could not determine your department. Showing all tickets.
          </div>
        )}

        {/* Table */}
        <div className="utp-table-wrap">
          <table className="utp-table">
            <thead>
              <tr>
                <th className="col-id">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2"/><path d="M8 12h8M8 8h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Ticket ID
                  </span>
                </th>
                <th className="col-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h12M4 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Title
                  </span>
                </th>
                {activeTab === 'department' && (
                  <th className="col-type">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Requester
                    </span>
                  </th>
                )}
                <th className="col-type">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
                    Type
                  </span>
                </th>
                <th className="col-status">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Status
                  </span>
                </th>
                <th className="col-date">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Created
                  </span>
                </th>
                <th className="col-actions" />
              </tr>
            </thead>
            <tbody>
              {isDataLoading && [1,2,3,4,5].map(i => (
                <tr key={i} className="utp-row utp-skeleton-row">
                  <td colSpan={activeTab === 'department' ? 7 : 6}><div className="utp-skeleton" /></td>
                </tr>
              ))}
              {!isDataLoading && filtered.map(t => {
                const m = statusMeta(t.status);
                return (
                  <tr
                    key={t.id}
                    className="utp-row"
                    onClick={() => { setCloseTicketErr(''); setApproveErr(''); setDeclineErr(''); setDeclineOpen(false); setDeclineReason(''); setSelected(t); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="col-id">
                      <span className="ticket-id-pill">{(t.id || '').slice(0, 12)}</span>
                    </td>
                    <td className="col-title">
                      <span className="ticket-title-text">{t.title}</span>
                    </td>
                    {activeTab === 'department' && (
                      <td className="col-type">
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{t.created_by?.name || '-'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{t.created_by?.department || ''}</div>
                      </td>
                    )}
                    <td className="col-type">
                      <span className="ticket-type-pill">{t.ticket_type?.title || '-'}</span>
                    </td>
                    <td className="col-status">
                      <span className={`chip ${m.cls}`}>{m.label}</span>
                    </td>
                    <td className="col-date">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                    <td className="col-actions">
                      <button
                        className="icon-btn"
                        onClick={e => { e.stopPropagation(); setCloseTicketErr(''); setApproveErr(''); setDeclineErr(''); setDeclineOpen(false); setDeclineReason(''); setSelected(t); }}
                        aria-label="View ticket"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2.2 12.1C3.7 7.6 7.5 4.5 12 4.5c4.5 0 8.3 3.1 9.8 7.6a1.2 1.2 0 0 1 0 .9c-1.5 4.5-5.3 7.6-9.8 7.6-4.5 0-8.3-3.1-9.8-7.6a1.2 1.2 0 0 1 0-.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.7"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!isDataLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'department' ? 7 : 6}>
                    <div className="utp-empty" style={{ fontSize: 14 }}>
                      {query || statusFilter !== 'All'
                        ? 'No tickets match your filter.'
                        : activeTab === 'department'
                          ? bypassDeptFilter
                            ? 'No tickets found.'
                            : (managerDept ? `No tickets found for ${managerDept} department.` : 'No department tickets found.')
                          : 'You have no submitted tickets yet.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* View Ticket Modal */}
      {selected && createPortal(
        <div
          role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, background: 'rgba(2,6,23,0.52)', backdropFilter: 'blur(5px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 80px rgba(2,6,23,0.32)' }}
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const m = statusMeta(selected.status);
              const initials = (selected.created_by?.name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
              const isPending   = selected.status === 'PENDING_APPROVAL';
              const isActive    = ['QUEUED', 'PROCESSING'].includes(selected.status);
              const isMyTab     = activeTab === 'mine';

              // In department view: only show approve/decline if the current manager
              // is the assigned approver for the current pending step.
              const isMineToApprove = isPending && (
                isMyTab ||
                (selected.approval_steps || []).some(step =>
                  step.status === 'PENDING' && (
                    String(step.approver?.email  || '').toLowerCase() === String(user?.email || '').toLowerCase() ||
                    String(step.approver?.id     || '') === String(user?.id || '') ||
                    String(step.approver_id      || '') === String(user?.id || '')
                  )
                )
              );

              // Close Ticket is only available on the manager's own tickets (My Tickets tab)
              const canClose = isMyTab && isActive;
              return (
                <>
                  {/* Modal header */}
                  <div style={{ background: `linear-gradient(135deg,${m.color}22,${m.color}0a)`, borderBottom: `2px solid ${m.color}28`, padding: '22px 26px', display: 'flex', alignItems: 'flex-start', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 13, background: m.color + '20', border: `2px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
                      {m.cls === 'pending-approval' ? '|T|' : m.cls === 'in-process' ? '|>|' : m.cls === 'done' ? '|v|' : '|!|'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', lineHeight: 1.35, marginBottom: 6, wordBreak: 'break-word' }}>{selected.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <code style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', borderRadius: 5, padding: '2px 8px', fontFamily: 'monospace' }}>{selected.id}</code>
                        <span style={{ background: m.color + '1a', color: m.color, borderRadius: 8, padding: '2px 10px', fontWeight: 700, fontSize: 12, border: `1px solid ${m.color}30` }}>{m.label}</span>
                      </div>
                    </div>
                    <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>x</button>
                  </div>

                  {/* Modal body */}
                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px 26px' }}>

                    {/* Requester */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{selected.created_by?.name || '-'}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {selected.created_by?.email || ''}
                          {selected.created_by?.department && <span style={{ marginLeft: 8, background: '#f1f5f9', borderRadius: 6, padding: '1px 7px', fontWeight: 600, color: '#475569', fontSize: 11 }}>{selected.created_by.department}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Submitted</div>
                        <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '-'}</div>
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Description</div>
                      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selected.description || '-'}</div>
                    </div>

                    {/* Details grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                      {[
                        { label: 'Type',         val: selected.ticket_type?.title || '-' },
                        { label: 'SLA',          val: selected.ticket_type?.expected_sla_duration ? `${selected.ticket_type.expected_sla_duration}h` : '-' },
                        { label: 'Approval',     val: selected.ticket_type?.approval_required ? `Yes (${selected.ticket_type.approval_count} step${selected.ticket_type.approval_count !== 1 ? 's' : ''})` : 'Not required' },
                        { label: 'Officer',      val: selected.assignment?.officer ? `${selected.assignment.officer.first_name} ${selected.assignment.officer.last_name}` : 'Unassigned' },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ background: '#f8fafc', borderRadius: 11, padding: '11px 15px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
                          <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Rejection reason */}
                    {selected.status === 'REJECTED' && selected.rejection_reason && (
                      <div style={{ marginTop: 14, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 11, padding: '13px 15px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Reason for Rejection</div>
                        <div style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selected.rejection_reason}</div>
                      </div>
                    )}

                    {/* Error banners */}
                    {(approveErr || closeTicketErr || declineErr) && (
                      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 11, padding: '11px 15px', color: '#b91c1c', fontSize: 13, marginTop: 16 }}>
                        {approveErr || closeTicketErr || declineErr}
                      </div>
                    )}

                    {/* Decline textarea */}
                    {isMineToApprove && declineOpen && (
                      <div style={{ marginTop: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 7 }}>
                          Reason for declining <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                          value={declineReason}
                          onChange={e => { setDeclineReason(e.target.value); setDeclineErr(''); }}
                          rows={3}
                          placeholder="Provide a clear reason for declining this ticket..."
                          style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
                          autoFocus
                        />
                        {declineErr && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5, fontWeight: 600 }}>{declineErr}</div>}
                      </div>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div style={{ padding: '15px 26px', borderTop: '1.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: '#fafafa', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
                    {isMineToApprove && !declineOpen && (
                      <>
                        <button
                          onClick={() => { setDeclineOpen(true); setDeclineErr(''); setDeclineReason(''); }}
                          disabled={approveBusy}
                          style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleApprove(selected.id)}
                          disabled={approveBusy}
                          style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: approveBusy ? '#6ee7b7' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: approveBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {approveBusy && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                          {approveBusy ? 'Approving...' : 'Approve'}
                        </button>
                      </>
                    )}
                    {isMineToApprove && declineOpen && (
                      <>
                        <button
                          onClick={() => { setDeclineOpen(false); setDeclineReason(''); setDeclineErr(''); }}
                          disabled={declineBusy}
                          style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeclineConfirm(selected.id)}
                          disabled={declineBusy || !declineReason.trim()}
                          style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: (declineBusy || !declineReason.trim()) ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: (declineBusy || !declineReason.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {declineBusy && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                          {declineBusy ? 'Declining...' : 'Confirm Decline'}
                        </button>
                      </>
                    )}
                    {canClose && (
                      <button
                        onClick={() => handleCloseTicket(selected.id)}
                        disabled={closeTicketBusy}
                        style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: closeTicketBusy ? '#6ee7b7' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: closeTicketBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        {closeTicketBusy && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                        {closeTicketBusy ? 'Closing...' : 'Close Ticket'}
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>, document.body
      )}

      {/* Create Ticket Modal */}
      {modalOpen && createPortal(
        (() => {
          const selectedType = typesList.find(t => String(t.id) === String(ctForm.ticket_type_id)) || null;
          const descMax = 1000;
          return (
            <div
              role="dialog" aria-modal="true"
              style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, background: 'rgba(2,6,23,0.48)', backdropFilter: 'blur(4px)' }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitCreateTicket(); }}
            >
              <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, boxShadow: '0 32px 72px rgba(2,6,23,0.26)', display: 'flex', flexDirection: 'column', maxHeight: '93vh', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="1.8"/><path d="M3 9h18" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 13h5M7 16h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>New Ticket</div>
                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>Submit a new support request</div>
                  </div>
                  <button onClick={() => { setModalOpen(false); resetCreate(); }} disabled={ctBusy} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>x</button>
                </div>
                <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                  {ctErr && <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '11px 14px', marginBottom: 20, fontSize: 13, color: '#b91c1c' }}>{ctErr}</div>}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                      <span>Title <span style={{ color: '#ef4444' }}>*</span></span>
                      {ctForm.title && <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>{ctForm.title.length} chars</span>}
                    </label>
                    <input value={ctForm.title} onChange={e => ctSet('title', e.target.value)} onBlur={() => ctTouch('title')} onFocus={() => setCtFocus('title')} onBlurCapture={() => setCtFocus('')}
                      placeholder="Brief, descriptive title" maxLength={200}
                      style={{ ...inputStyle(!!ctFieldErr('title')), boxShadow: ctFocus === 'title' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none' }} />
                    {ctFieldErr('title') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{ctFieldErr('title')}</div>}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                      <span>Description <span style={{ color: '#ef4444' }}>*</span></span>
                      <span style={{ fontWeight: 400, color: ctForm.description.length > descMax * 0.9 ? '#f59e0b' : '#9ca3af', fontSize: 12 }}>{ctForm.description.length} / {descMax}</span>
                    </label>
                    <textarea value={ctForm.description} onChange={e => ctSet('description', e.target.value)} onBlur={() => ctTouch('description')} onFocus={() => setCtFocus('description')} onBlurCapture={() => setCtFocus('')}
                      rows={5} maxLength={descMax} placeholder="Describe the issue in detail..."
                      style={{ ...inputStyle(!!ctFieldErr('description')), resize: 'vertical', lineHeight: 1.65 }} />
                    {ctFieldErr('description') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{ctFieldErr('description')}</div>}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Ticket Type <span style={{ color: '#ef4444' }}>*</span></label>
                    <select value={ctForm.ticket_type_id} onChange={e => ctSet('ticket_type_id', e.target.value)} onBlur={() => ctTouch('ticket_type_id')} style={{ ...inputStyle(!!ctFieldErr('ticket_type_id')), cursor: 'pointer' }}>
                      <option value="">- Select a ticket type -</option>
                      {typesList.map(t => <option key={t.id} value={t.id}>{t.title}{t.approval_required ? ' (Requires Approval)' : ''}</option>)}
                    </select>
                    {ctFieldErr('ticket_type_id') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{ctFieldErr('ticket_type_id')}</div>}
                    {selectedType && (
                      <div style={{ marginTop: 10, padding: '11px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{selectedType.title}</div>
                          <div style={{ color: '#4b5563', fontSize: 12, marginTop: 3 }}>
                            {selectedType.approval_required
                              ? <span style={{ color: '#92400e' }}>Requires <strong>{selectedType.approval_count}</strong> approval{selectedType.approval_count !== 1 ? 's' : ''}</span>
                              : <span style={{ color: '#065f46' }}>No approval needed</span>}
                          </div>
                        </div>
                        {selectedType.expected_sla_duration && (
                          <div style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                            {selectedType.expected_sla_duration}h SLA
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span>Assign To <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(optional)</span></span>
                      {ctForm.assigned_to && <button type="button" onClick={() => ctSet('assigned_to', '')} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>}
                    </label>
                    <select value={ctForm.assigned_to} onChange={e => ctSet('assigned_to', e.target.value)} disabled={officersLoading}
                      style={{ ...inputStyle(false), cursor: 'pointer', color: ctForm.assigned_to ? '#111827' : '#9ca3af' }}>
                      <option value="">{officersLoading ? 'Loading officers...' : '- Auto-assign (recommended) -'}</option>
                      {officers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fafafa', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>Ctrl+Enter to submit</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setModalOpen(false); resetCreate(); }} disabled={ctBusy} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: ctBusy ? 'not-allowed' : 'pointer', opacity: ctBusy ? 0.7 : 1 }}>Cancel</button>
                    <button onClick={submitCreateTicket} disabled={ctBusy} style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: ctBusy ? '#93c5fd' : 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: ctBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {ctBusy && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                      {ctBusy ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })(), document.body
      )}
    </>
  );
};

export default ManagerTicketsPage;
