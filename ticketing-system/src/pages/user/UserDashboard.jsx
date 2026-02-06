import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import TopNav from '../../components/topnav/TopNav';
import './UserDashboard.css';

const SAMPLE_TICKETS = [
  { id: 1001, subject: 'Unable to access VPN', ticketType: 'Incident', department: 'IT', status: 'pending', owner: '', assignee: 'Alice Mbatha', createdAt: '2026-01-28', history: [] },
  { id: 1002, subject: 'Request new monitor', ticketType: 'Request', department: 'Operations', status: 'awaiting_approval', owner: '', assignee: null, createdAt: '2026-01-27', history: [] },
  { id: 1003, subject: 'Monthly invoice issue', ticketType: 'Request', department: 'Finance', status: 'closed', owner: '', assignee: 'Bob Stone', createdAt: '2026-01-20', history: [] },
  { id: 1004, subject: 'Dashboard bug on reports', ticketType: 'Bug', department: 'IT', status: 'in_progress', owner: '', assignee: 'Maya Patel', createdAt: '2026-01-22', history: [] },
  { id: 1005, subject: 'Change account details', ticketType: 'Request', department: 'HR', status: 'declined', owner: '', assignee: null, createdAt: '2026-01-15', declineReason: 'Insufficient details', history: [] },
];

const UserDashboard = () => {
  const currentUser = localStorage.getItem('currentUserName') || 'Guest User';

  const [tickets, setTickets] = useState(() => {
    try {
      const raw = localStorage.getItem('tickets');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  // create ticket modal (match My Tickets create modal)
  const [form, setForm] = useState({ subject: '', ticketType: '', department: '', assignee: '', notes: '' });
  const [createErrors, setCreateErrors] = useState({});

  // dropdown options for department and assignee (try localStorage, else sensible defaults)
  const [departmentOptions, setDepartmentOptions] = useState(['IT', 'Finance', 'HR']);
  const [assigneeOptions, setAssigneeOptions] = useState([]);

  const slaSettings = (() => {
    try { const raw = localStorage.getItem('slaSettings'); return raw ? JSON.parse(raw) : { Incident:24, Request:48, Bug:72 }; } catch(e){ return { Incident:24, Request:48, Bug:72 }; }
  })();

  useEffect(() => {
    localStorage.setItem('tickets', JSON.stringify(tickets));
  }, [tickets]);

  // populate department and assignee dropdown options (same approach as My Tickets)
  useEffect(() => {
    try {
      const rawDeps = localStorage.getItem('departments');
      if (rawDeps) {
        const parsed = JSON.parse(rawDeps);
        if (Array.isArray(parsed) && parsed.length) setDepartmentOptions(parsed);
      }
    } catch (e) { /* ignore */ }

    try {
      const rawUsers = localStorage.getItem('users');
      if (rawUsers) {
        const parsed = JSON.parse(rawUsers);
        if (Array.isArray(parsed) && parsed.length) {
          const names = parsed.map(u => {
            if (!u) return '';
            if (typeof u === 'string') return u;
            if (u.name && u.surname) return `${u.name} ${u.surname}`;
            if (u.name) return u.name;
            if (u.fullName) return u.fullName;
            return '';
          }).filter(Boolean);
          if (names.length) { setAssigneeOptions(names); return; }
        }
      }
    } catch (e) { /* ignore */ }

    const namesFromTickets = Array.from(new Set((tickets || []).map(t => t.assignee).filter(Boolean)));
    const fallback = Array.from(new Set([currentUser, ...namesFromTickets, 'Tom Mvura'].filter(Boolean)));
    setAssigneeOptions(fallback);
  }, [tickets, currentUser]);

  // seed demo tickets for the current user if storage is empty
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tickets');
      if (!raw || (Array.isArray(JSON.parse(raw)) && JSON.parse(raw).length === 0)) {
        // attach current user as owner for demo rows
        const seeded = SAMPLE_TICKETS.map(t => ({ ...t, owner: currentUser }));
        setTickets(seeded);
      }
    } catch (e) { /* ignore */ }
  }, []);

  const myTickets = tickets.filter(t => t.owner === currentUser);
  // normalized ticket collections for KPI cards
  const ticketsByStatus = (statusPred) => myTickets.filter(statusPred);

  const pending = ticketsByStatus(t => ['pending', 'awaiting_approval'].includes(t.status));
  const open = ticketsByStatus(t => t.status === 'open');
  const inProgress = ticketsByStatus(t => t.status === 'in_progress' || t.status === 'in-process');
  const approved = ticketsByStatus(t => ['approved', 'closed', 'done'].includes(t.status));
  const declined = ticketsByStatus(t => ['declined', 'rejected'].includes(t.status));
  const overdue = ticketsByStatus(t => t.status === 'overdue');

  // tasks assigned to the current user (by assignee)
  const assignedTasks = (tickets || []).filter(t => {
    if (!t) return false;
    const a = String(t.assignee || '').trim().toLowerCase();
    const me = String(currentUser || '').trim().toLowerCase();
    return a && me && a === me;
  });

  // SLA-breached tickets: not-closed tickets where hours since createdAt exceed slaSettings for the ticketType
  const slaBreached = myTickets.filter(t => {
    try {
      if (!t.createdAt) return false;
      // ignore already-closed/done tickets for breach calculation (no resolution time available)
      if (['closed', 'done'].includes(t.status)) return false;
      const created = new Date(t.createdAt).getTime();
      if (Number.isNaN(created)) return false;
      const hours = (Date.now() - created) / (1000 * 60 * 60);
      const limit = (slaSettings && slaSettings[t.ticketType]) ? Number(slaSettings[t.ticketType]) : 48;
      return hours > limit;
    } catch (e) { return false; }
  });

  // KPI definitions
  // Keep a smaller, focused set of KPI cards. 'Open' will show pending + in-progress when clicked.
  const KPI_DEFS = [
    { key: 'open', label: 'Open', color: 'var(--blue)', items: open },
    { key: 'approved', label: 'Approved', color: 'var(--green)', items: approved },
    { key: 'declined', label: 'Declined', color: 'var(--red)', items: declined },
    { key: 'overdue', label: 'Overdue', color: 'var(--danger)', items: overdue },
  ];

  // SLA summary for current user (simple metric: percent of closed tickets)
  // (SLA card removed per request)

  const createTicket = (e) => {
    e && e.preventDefault && e.preventDefault();
    // per-field validation: all fields must be filled
    const errs = {};
    if (!form.subject || !String(form.subject).trim()) errs.subject = true;
    if (!form.ticketType || !String(form.ticketType).trim()) errs.ticketType = true;
    if (!form.department || !String(form.department).trim()) errs.department = true;
    if (!form.assignee || !String(form.assignee).trim()) errs.assignee = true;
    if (!form.notes || !String(form.notes).trim()) errs.notes = true;
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    const id = Date.now();
    const newT = {
      id,
      subject: form.subject,
      ticketType: form.ticketType,
      department: form.department,
      owner: currentUser,
      assignee: form.assignee,
      status: 'pending',
      createdAt: new Date().toISOString(),
      notes: form.notes || '',
      history: [{ ts: new Date().toISOString(), action: 'created' }]
    };
    setTickets(prev => [newT, ...prev]);
    setForm({ subject: '', ticketType: '', department: '', assignee: '', notes: '' });
    setCreateErrors({});
    setOpenCreate(false);
  };

  // state for KPI details modal
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [kpiModalKey, setKpiModalKey] = useState(null);
  const openKpiModal = (key) => { setKpiModalKey(key); setKpiModalOpen(true); };
  const closeKpiModal = () => { setKpiModalOpen(false); setKpiModalKey(null); };

  // compute modal definition for the currently selected KPI key
  const modalDef = (() => {
    const base = KPI_DEFS.find(k => k.key === kpiModalKey) || { label: 'Details', items: [] };
    if (kpiModalKey === 'open') {
      return { ...base, items: [...pending, ...inProgress] };
    }
    return base;
  })();

  // modal filter (used when viewing 'open' KPI — to toggle Pending vs In Progress)
  const [modalFilter, setModalFilter] = useState('All');

  // ensure filter resets when opening modal
  const _openKpiModal = (key) => { setModalFilter('All'); openKpiModal(key); };

  // friendly status label
  const statusLabel = (s) => {
    if (!s) return 'Unknown';
    if (s === 'pending' || s === 'awaiting_approval') return 'Pending Approval';
    if (s === 'open') return 'Open';
    if (s === 'in_progress' || s === 'in-process') return 'In Progress';
    if (s === 'closed' || s === 'done') return 'Done';
    if (s === 'declined' || s === 'rejected') return 'Declined';
    if (s === 'overdue') return 'Overdue';
    return s;
  };

  const statusColor = (s) => {
    switch (s) {
      case 'approved': return 'var(--green)';
      case 'open': return 'var(--blue)';
      case 'in_progress': return 'var(--cyan)';
      case 'pending': return 'var(--amber)';
      case 'declined': return 'var(--red)';
      case 'overdue': return 'var(--danger)';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="admin-page user-page">
      <Sidebar />
      <main className="admin-main">
        <TopNav initials={currentUser.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()} userName={currentUser} pageTitle="Dashboard" />

        <section className="panel user-panel">
          <div className="user-top">
            <div className="kpis">
              {KPI_DEFS.map(k => (
                <div
                  key={k.key}
                  className={`kpi ${k.key}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => _openKpiModal(k.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter') _openKpiModal(k.key); }}
                  style={{ cursor: 'pointer' }}
                  aria-label={`${k.label} (${k.items.length})`}
                >
                  <div className="kpi-num">{k.items.length}</div>
                  <div className="kpi-label" style={{ color: k.color }}><strong>{k.label}</strong></div>
                </div>
              ))}

              {/* SLA card removed */}
            </div>

            <div className="user-actions">
              <button className="btn-primary" onClick={() => setOpenCreate(true)}>Create Ticket</button>
            </div>
          </div>

          <div className="user-tables">
            <div className="table-section">
              <h3>Assigned Task</h3>
              <div className="um-table">
                <div className="um-card-head" aria-hidden="true">
                  <div className="h-id">ID</div>
                  <div className="h-subject">Subject</div>
                  <div className="h-type">Type</div>
                </div>
                <div className="um-table-body">
                  {assignedTasks.map(t => (
                    <div
                      className="um-ticket-card"
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelected(t); }}
                      aria-label={`View ticket ${t.id}`}
                    >
                      <div className="ticket-id">#{t.id}</div>
                      <div className="ticket-subject">{t.subject}</div>
                      <div className="ticket-type">{t.ticketType}</div>
                    </div>
                  ))}
                  {assignedTasks.length === 0 && (
                    <div className="um-row"><div className="um-cell">No assigned tasks</div></div>
                  )}
                </div>
              </div>
            </div>

            <div className="table-section">
              <h3>Pending / Awaiting</h3>
              <div className="um-table">
                <div className="um-card-head" aria-hidden="true">
                  <div className="h-id">ID</div>
                  <div className="h-subject">Subject</div>
                  <div className="h-type">Type</div>
                </div>
                <div className="um-table-body">
                  {pending.map(t => (
                    <div
                      className="um-ticket-card"
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelected(t); }}
                      aria-label={`View ticket ${t.id}`}
                    >
                      <div className="ticket-id">#{t.id}</div>
                      <div className="ticket-subject">{t.subject}</div>
                      <div className="ticket-type">{t.ticketType}</div>
                    </div>
                  ))}
                  {pending.length === 0 && (<div className="um-row"><div className="um-cell">No pending tickets</div></div>)}
                </div>
              </div>
            </div>

            <div className="table-section">
              <h3>Approved</h3>
              <div className="um-table">
                <div className="um-card-head" aria-hidden="true">
                  <div className="h-id">ID</div>
                  <div className="h-subject">Subject</div>
                  <div className="h-type">Type</div>
                </div>
                <div className="um-table-body">
                  {approved.map(t => (
                    <div
                      className="um-ticket-card"
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelected(t); }}
                      aria-label={`View ticket ${t.id}`}
                    >
                      <div className="ticket-id">#{t.id}</div>
                      <div className="ticket-subject">{t.subject}</div>
                      <div className="ticket-type">{t.ticketType}</div>
                    </div>
                  ))}
                  {approved.length === 0 && (<div className="um-row"><div className="um-cell">No approved tickets</div></div>)}
                </div>
              </div>
            </div>

            <div className="table-section">
              <h3>Declined</h3>
              <div className="um-table">
                <div className="um-card-head" aria-hidden="true">
                  <div className="h-id">ID</div>
                  <div className="h-subject">Subject</div>
                  <div className="h-type">Type</div>
                </div>
                <div className="um-table-body">
                  {declined.map(t => (
                    <div
                      className="um-ticket-card"
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelected(t); }}
                      aria-label={`View ticket ${t.id}`}
                    >
                      <div className="ticket-id">#{t.id}</div>
                      <div className="ticket-subject">{t.subject}</div>
                      <div className="ticket-type">{t.ticketType}</div>
                    </div>
                  ))}
                  {declined.length === 0 && (<div className="um-row"><div className="um-cell">No declined tickets</div></div>)}
                </div>
              </div>
            </div>

            <div className="table-section">
              <h3>SLA</h3>
              <div className="um-table">
                <div className="um-card-head" aria-hidden="true">
                  <div className="h-id">ID</div>
                  <div className="h-subject">Subject</div>
                  <div className="h-type">Type</div>
                </div>
                <div className="um-table-body">
                  {slaBreached.map(t => (
                    <div
                      className="um-ticket-card"
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelected(t); }}
                      aria-label={`View ticket ${t.id}`}
                    >
                      <div className="ticket-id">#{t.id}</div>
                      <div className="ticket-subject">{t.subject}</div>
                      <div className="ticket-type">{t.ticketType}</div>
                    </div>
                  ))}
                  {slaBreached.length === 0 && (<div className="um-row"><div className="um-cell">No SLA-breached tickets</div></div>)}
                </div>
              </div>
            </div>
          </div>

          {openCreate && (
            <div className="um-modal-overlay">
              <div className="um-modal small">
                <h3>Create Ticket</h3>
                <form className="um-form" onSubmit={createTicket}>
                  <div className="row">
                    <label>Subject
                      <input
                        className={createErrors.subject ? 'input-error' : ''}
                        value={form.subject}
                        onChange={(e)=>{ setForm({...form,subject:e.target.value}); if (createErrors.subject) { const c={...createErrors}; delete c.subject; setCreateErrors(c); } }}
                      />
                    </label>
                  </div>

                  <div className="row">
                    <label>Type
                      <select
                        className={createErrors.ticketType ? 'input-error' : ''}
                        value={form.ticketType}
                        onChange={(e)=>{ setForm({...form,ticketType:e.target.value}); if (createErrors.ticketType) { const c={...createErrors}; delete c.ticketType; setCreateErrors(c); } }}
                      >
                        <option value="">Select</option>
                        <option>Incident</option>
                        <option>Request</option>
                        <option>Bug</option>
                      </select>
                    </label>
                  </div>

                  <div className="row">
                    <label>Department
                      <select
                        className={createErrors.department ? 'input-error' : ''}
                        value={form.department}
                        onChange={(e)=>{ setForm({...form,department:e.target.value}); if (createErrors.department) { const c={...createErrors}; delete c.department; setCreateErrors(c); } }}
                      >
                        <option value="">Select</option>
                        {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="row">
                    <label>Assignee
                      <select
                        className={createErrors.assignee ? 'input-error' : ''}
                        value={form.assignee}
                        onChange={(e)=>{ setForm({...form,assignee:e.target.value}); if (createErrors.assignee) { const c={...createErrors}; delete c.assignee; setCreateErrors(c); } }}
                      >
                        <option value="">Select</option>
                        {assigneeOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="row">
                    <label>Notes
                      <textarea
                        className={createErrors.notes ? 'input-error' : ''}
                        value={form.notes}
                        onChange={(e)=>{ setForm({...form,notes:e.target.value}); if (createErrors.notes) { const c={...createErrors}; delete c.notes; setCreateErrors(c); } }}
                      />
                    </label>
                  </div>

                  <div className="row actions">
                    <button
                      type="button"
                      className="btn-muted"
                      onClick={()=>{ setOpenCreate(false); setCreateErrors({}); setForm({ subject: '', ticketType: '', department: '', assignee: '', notes: '' }); }}
                    >
                      Cancel
                    </button>
                    <button className="btn-primary" type="submit">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* KPI / SLA details modal */}
          {kpiModalOpen && (
            <div className="um-modal-overlay um-blur-overlay">
              <div className="um-modal" style={{maxWidth: '90%'}}>
                <div>
                  <h3>{modalDef.label}</h3>
                  {kpiModalKey === 'open' && (
                    <div style={{marginBottom:8}}>
                      <label className="muted">Filter:&nbsp;
                        <select value={modalFilter} onChange={(e)=>setModalFilter(e.target.value)}>
                          <option value="All">All</option>
                          <option value="pending">Pending Approval</option>
                          <option value="in_progress">In Progress</option>
                        </select>
                      </label>
                    </div>
                  )}

                  <div className="um-table" style={{marginTop:12}}>
                    <div className="um-table-head">
                      <div className="um-row head um-kpi-grid">
                        <div className="um-cell">ID</div>
                        <div className="um-cell">Subject</div>
                        <div className="um-cell">Type</div>
                        <div className="um-cell">Status</div>
                        <div className="um-cell">View More</div>
                      </div>
                    </div>
                    <div className="um-table-body">
                      {((modalDef.items || []).filter(t => {
                        if (kpiModalKey !== 'open' || modalFilter === 'All') return true;
                        if (modalFilter === 'pending') return ['pending','awaiting_approval'].includes(t.status);
                        if (modalFilter === 'in_progress') return ['in_progress','in-process'].includes(t.status);
                        return true;
                      })).map(t => (
                        <div className="um-row um-kpi-grid" key={t.id}>
                          <div className="um-cell">{t.id}</div>
                          <div className="um-cell">{t.subject}</div>
                          <div className="um-cell">{t.ticketType}</div>
                          <div className="um-cell"><span className="status" style={{background: statusColor(t.status), color:'#fff', padding:'6px 8px', borderRadius:8, fontWeight:700}}>{statusLabel(t.status)}</span></div>
                          <div className="um-cell" style={{display:'flex', justifyContent:'flex-end'}}>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setSelected(t)}
                              aria-label={`View ticket ${t.id}`}
                              title="View more"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M2.2 12.1C3.7 7.6 7.5 4.5 12 4.5c4.5 0 8.3 3.1 9.8 7.6.1.3.1.6 0 .9-1.5 4.5-5.3 7.6-9.8 7.6-4.5 0-8.3-3.1-9.8-7.6a1.2 1.2 0 0 1 0-.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.7"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      {((modalDef.items || []).filter(t => {
                        if (kpiModalKey !== 'open' || modalFilter === 'All') return true;
                        if (modalFilter === 'pending') return ['pending','awaiting_approval'].includes(t.status);
                        if (modalFilter === 'in_progress') return ['in_progress','in-process'].includes(t.status);
                        return true;
                      })).length === 0 && (<div className="um-row"><div className="um-cell">No items</div></div>)}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
                  <button className="btn-muted" onClick={closeKpiModal}>Close</button>
                </div>
              </div>
            </div>
          )}

          {selected && (
            <div className="um-modal-overlay">
              <div className="um-modal">
                <h3>Ticket #{selected.id}</h3>
                <div><strong>Subject:</strong> {selected.subject}</div>
                <div><strong>Status:</strong> {selected.status}</div>
                <div><strong>Assigned to:</strong> {selected.assignee || '-'}</div>
                <div style={{marginTop:8}}><strong>History</strong>
                  <ul>
                    {(selected.history||[]).map((h,i)=>(<li key={i}>{h.ts}: {h.action}</li>))}
                  </ul>
                </div>
                <div style={{marginTop:12}} className="actions"><button className="btn-muted" onClick={()=>setSelected(null)}>Close</button></div>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
};

export default UserDashboard;
