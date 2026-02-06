import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/sidebar/Sidebar';
import TopNav from '../../../components/topnav/TopNav';
import './UserTicketsPage.css';

const SAMPLE_TICKETS = [
  { id: 1, subject: 'Cannot login', status: 'open', requestedBy: 'Sarah L.', owner: 'Administrator', assignee: 'Alice Mbatha', ticketType: 'Incident', department: 'IT', createdAt: '2026-01-20', notes: 'Login failure on SSO.' },
  { id: 2, subject: 'Invoice request', status: 'pending', requestedBy: 'Carlos M.', owner: 'Carlos M.', assignee: 'Bob Stone', ticketType: 'Request', department: 'Finance', createdAt: '2026-01-19', notes: 'Need invoice for Q4.' },
  { id: 3, subject: 'System outage', status: 'closed', requestedBy: 'External', owner: 'Priya Singh', assignee: 'Maya Patel', ticketType: 'Incident', department: 'IT', createdAt: '2026-01-18', notes: 'Outage resolved.' },
];

const statusDisplay = (s) => {
  if (!s) return { label: 'Unknown', cls: 'unknown' };
  if (s === 'pending') return { label: 'Pending Approval', cls: 'pending-approval' };
  if (s === 'open') return { label: 'In Process', cls: 'in-process' };
  if (s === 'closed') return { label: 'Done', cls: 'done' };
  if (s === 'overdue') return { label: 'Overdue', cls: 'overdue' };
  return { label: s, cls: s };
};

const STATUSES = [
  { value: 'All', label: 'All' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'open', label: 'In Process' },
  { value: 'closed', label: 'Done' },
  { value: 'overdue', label: 'Overdue' },
];

const UserTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', ticketType: '', department: '', assignee: '', notes: '' });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [form, setForm] = useState({ subject: '', ticketType: '', department: '', assignee: '', notes: '' });
  const [createErrors, setCreateErrors] = useState({});

  // dropdown options for department and assignee (try localStorage, else sensible defaults)
  const [departmentOptions, setDepartmentOptions] = useState(['IT', 'Finance', 'HR']);
  const [assigneeOptions, setAssigneeOptions] = useState([]);

  const userName = typeof window !== 'undefined' ? (localStorage.getItem('currentUserName') || '') : '';

  // load persisted tickets or sample
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tickets');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) { setTickets(parsed); return; }
      }
    } catch (e) { /* ignore */ }

    // seed demo content when there's no saved data yet
    setTickets(SAMPLE_TICKETS);
    try { localStorage.setItem('tickets', JSON.stringify(SAMPLE_TICKETS)); } catch (e) {}
  }, []);

  // populate department and assignee dropdown options
  useEffect(() => {
    try {
      const rawDeps = localStorage.getItem('departments');
      if (rawDeps) {
        const parsed = JSON.parse(rawDeps);
        if (Array.isArray(parsed) && parsed.length) setDepartmentOptions(parsed);
      }
    } catch (e) { /* ignore */ }

    // try users from localStorage (admin user management may store users)
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

    // fallback to assignees found in current tickets plus current user
    const namesFromTickets = Array.from(new Set((tickets || []).map(t => t.assignee).filter(Boolean)));
    const fallback = Array.from(new Set([userName, ...namesFromTickets, 'Tom Mvura'].filter(Boolean)));
    setAssigneeOptions(fallback);
  }, [tickets, userName]);

  useEffect(() => {
    try { localStorage.setItem('tickets', JSON.stringify(tickets)); } catch (e) {}
  }, [tickets]);

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

    const payload = {
      id: Date.now(),
      subject: form.subject,
      ticketType: form.ticketType,
      department: form.department,
      assignee: form.assignee,
      requestedBy: userName || form.requestedBy || 'You',
      owner: userName || form.requestedBy || 'You',
      status: 'pending',
      createdAt: new Date().toISOString().slice(0,10),
      notes: form.notes || ''
    };
    setTickets(s => [payload, ...s]);
    setModalOpen(false);
    setForm({ subject: '', ticketType: '', department: '', assignee: '', notes: '' });
    setCreateErrors({});
  };

  const openEdit = (e, tkt) => {
    // don't let the row click open the details modal
    if (e && e.stopPropagation) e.stopPropagation();
    setEditingTicket(tkt);
    setEditForm({ subject: tkt.subject || '', ticketType: tkt.ticketType || '', department: tkt.department || '', assignee: tkt.assignee || '', notes: tkt.notes || '' });
    setEditModalOpen(true);
  };

  const saveEdit = (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!editingTicket) return;
    setTickets(prev => prev.map(t => t.id === editingTicket.id ? { ...t, ...editForm } : t));
    setEditModalOpen(false);
    setEditingTicket(null);
    setEditForm({ subject: '', ticketType: '', department: '', assignee: '', notes: '' });
  };

  // filtered list based on query and status
  const q = (query || '').trim().toLowerCase();
  const filtered = tickets.filter(t => {
    if (statusFilter && statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (!q) return true;
    return (t.subject || '').toLowerCase().includes(q) || (t.assignee || '').toLowerCase().includes(q) || (t.department || '').toLowerCase().includes(q) || (t.ticketType || '').toLowerCase().includes(q);
  });

  return (
    <div className="user-page">
      <Sidebar />
      <main className="user-main">
        <TopNav initials={(userName||'U').slice(0,2).toUpperCase()} userName={userName || 'User'} pageTitle="My Tickets" />

        <section className="panel user-tickets-panel">
          <div className="user-tickets-header">
            <h2>My Tickets</h2>
            <div className="user-tickets-actions">
              <div className="search-wrap">
                <input placeholder="Search subject, assignee or type" value={query} onChange={(e)=>setQuery(e.target.value)} />
              </div>
              <div>
                <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <button className="btn-primary" onClick={()=>setModalOpen(true)}>Create Ticket</button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="user-tickets-table">
              <thead>
                <tr>
                  <th className="id-col">ID</th>
                  <th>Subject</th>
                  <th className="status-col">Status</th>
                  <th className="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const sd = statusDisplay(t.status);
                  return (
                    <tr key={t.id} className="ticket-row">
                      <td className="id-col">#{t.id}</td>
                      <td className="subject-col">{t.subject}</td>
                      <td className="status-col"><span className={`chip ${sd.cls}`}>{sd.label}</span></td>
                      <td className="actions-col">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setSelected(t)}
                          aria-label={`View ticket ${t.id}`}
                          title="View more"
                        >
                          {/* eye icon */}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M2.2 12.1C3.7 7.6 7.5 4.5 12 4.5c4.5 0 8.3 3.1 9.8 7.6.1.3.1.6 0 .9-1.5 4.5-5.3 7.6-9.8 7.6-4.5 0-8.3-3.1-9.8-7.6a1.2 1.2 0 0 1 0-.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.7"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} style={{textAlign:'center'}} className="muted">No tickets found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {modalOpen && (
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
                  <button type="button" className="btn-muted" onClick={()=>{ setModalOpen(false); setCreateErrors({}); setForm({ subject: '', ticketType: '', department: '', assignee: '', notes: '' }); }}>Cancel</button>
                  <button className="btn-primary" type="submit">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editModalOpen && (
          <div className="um-modal-overlay">
            <div className="um-modal small">
              <h3>Edit Ticket</h3>
              <form className="um-form" onSubmit={saveEdit}>
                <div className="row"><label>Subject<input required value={editForm.subject} onChange={(e)=>setEditForm({...editForm,subject:e.target.value})} /></label></div>
                <div className="row"><label>Type<select value={editForm.ticketType} onChange={(e)=>setEditForm({...editForm,ticketType:e.target.value})}><option value="">Select</option><option>Incident</option><option>Request</option><option>Bug</option></select></label></div>
                <div className="row"><label>Department<input value={editForm.department} onChange={(e)=>setEditForm({...editForm,department:e.target.value})} /></label></div>
                <div className="row"><label>Assignee<input value={editForm.assignee} onChange={(e)=>setEditForm({...editForm,assignee:e.target.value})} /></label></div>
                <div className="row"><label>Notes<textarea value={editForm.notes} onChange={(e)=>setEditForm({...editForm,notes:e.target.value})} /></label></div>
                <div className="row actions"><button type="button" className="btn-muted" onClick={()=>{ setEditModalOpen(false); setEditingTicket(null); }}>Cancel</button><button className="btn-primary" type="submit">Save</button></div>
              </form>
            </div>
          </div>
        )}

        {selected && (
          <div className="um-modal-overlay">
            <div className="um-modal">
              <h3>Ticket details</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><strong>Subject</strong><div className="muted">{selected.subject}</div></div>
                <div><strong>Status</strong><div><span className={`chip ${statusDisplay(selected.status).cls}`}>{statusDisplay(selected.status).label}</span></div></div>
                <div><strong>Assignee</strong><div className="muted">{selected.assignee || '-'}</div></div>
                <div><strong>Department</strong><div className="muted">{selected.department || '-'}</div></div>
                <div style={{gridColumn:'1 / -1'}}><strong>Notes</strong><div className="muted" style={{marginTop:6}}>{selected.notes || 'No notes.'}</div></div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
                {selected.status === 'pending' && (
                  <button className="btn-primary" onClick={() => { setSelected(null); openEdit(null, selected); }}>Edit</button>
                )}
                <button className="btn-muted" onClick={()=>setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default UserTicketsPage;
