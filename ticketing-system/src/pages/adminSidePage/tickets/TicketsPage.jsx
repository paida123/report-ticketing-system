import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/sidebar/Sidebar';
import TopNav from '../../../components/topnav/TopNav';
import './TicketsPage.css';

// Modal for adding a new ticket type (mirrors Roles add modal style)
const AddTypeModal = ({ open, onClose, onAdd }) => {
  const [form, setForm] = useState({ name: '', sla: '24' });
  const [errors, setErrors] = useState({});

  React.useEffect(() => { if (open) setForm({ name: '', sla: '24' }); }, [open]);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 1) e.name = 'Type name is required';
    return e;
  };

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      onAdd((form.name || '').trim(), Number(form.sla) || 0);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal">
        <h3>Add ticket type</h3>
        <form onSubmit={submit} className="um-form">
          <div className="row">
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          </div>
          <div className="row">
            <label>SLA (hours)<input value={form.sla} onChange={(e) => setForm({ ...form, sla: e.target.value })} /></label>
          </div>
          <div className="row actions">
            <button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
        <div className="um-errors">{Object.keys(errors).map(k => <div key={k} className="err">{k}: {errors[k]}</div>)}</div>
      </div>
    </div>
  );
};

const TicketsPage = () => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [tickets, setTickets] = useState([
    { id: 1, subject: 'Cannot login', status: 'open', owner: 'Administrator', requestedBy: 'Sarah L.', assignee: 'Alice Mbatha', ticketType: 'Incident', department: 'IT', createdAt: '2026-01-20' },
    { id: 2, subject: 'Invoice request', status: 'pending', owner: 'Carlos M.', requestedBy: 'Carlos M.', assignee: 'Bob Stone', ticketType: 'Request', department: 'Finance', createdAt: '2026-01-19' },
    { id: 3, subject: 'System outage', status: 'closed', owner: 'Priya Singh', requestedBy: 'External', assignee: 'Maya Patel', ticketType: 'Incident', department: 'IT', createdAt: '2026-01-18' },
  ]);

  const [form, setForm] = useState({ subject: '', owner: '', requestedBy: '', assignee: '', ticketType: '', department: '', status: 'open' });

  // detect current user (for user-specific My Tickets view)
  const currentUserName = typeof window !== 'undefined' ? (localStorage.getItem('currentUserName') || '') : '';
  const isUserRoute = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().startsWith('/user') : false;

  // configurable lists (departments are fixed by default but persisted)
  const [ticketTypes, setTicketTypes] = useState(['Incident', 'Request', 'Bug']);
  const [departments, setDepartments] = useState(['IT', 'Finance', 'HR']);
  const [slaSettings, setSlaSettings] = useState({ Incident: 24, Request: 48, Bug: 72 });

  // load persisted configuration from localStorage on mount
  useEffect(() => {
    try {
      const rawTypes = localStorage.getItem('ticketTypes');
      const rawSla = localStorage.getItem('slaSettings');
      const rawDeps = localStorage.getItem('departments');
      if (rawTypes) {
        const parsed = JSON.parse(rawTypes);
        if (Array.isArray(parsed) && parsed.length >= 0) setTicketTypes(parsed);
      }
      if (rawSla) {
        const parsed = JSON.parse(rawSla);
        if (parsed && typeof parsed === 'object') setSlaSettings(parsed);
      }
      if (rawDeps) {
        const parsed = JSON.parse(rawDeps);
        if (Array.isArray(parsed) && parsed.length >= 0) setDepartments(parsed);
      }
    } catch (e) {
      // ignore parse errors and keep defaults
      // console.warn('Failed to load persisted ticket config', e);
    }
  }, []);

  // persist configuration whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('ticketTypes', JSON.stringify(ticketTypes));
      localStorage.setItem('slaSettings', JSON.stringify(slaSettings));
      localStorage.setItem('departments', JSON.stringify(departments));
    } catch (e) {
      // storage may be unavailable; ignore
    }
  }, [ slaSettings, departments]);

  // Exposed filter options for users (friendly labels)
  const statuses = ['All', 'pending approval', 'in process', 'done', 'overdue'];
  const [viewMode, setViewMode] = useState('tickets'); // 'tickets' | 'types'

  const mapFilterToInternal = (f) => {
    if (!f || f === 'All') return null;
    if (f === 'pending approval') return 'pending';
    if (f === 'in process') return 'open';
    if (f === 'done') return 'closed';
    if (f === 'overdue') return 'overdue';
    return f;
  };

  const filtered = tickets.filter(t => {
    // if on /user routes, only show tickets requested by current user
    if (isUserRoute && currentUserName) {
      const found = String(t.requestedBy || t.owner || '').toLowerCase() === String(currentUserName).toLowerCase();
      if (!found) return false;
    }
    const internalFilter = mapFilterToInternal(statusFilter);
    const matchStatus = !internalFilter || t.status === internalFilter;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || (t.subject || '').toLowerCase().includes(q) || (t.owner || '').toLowerCase().includes(q) || (t.assignee || '').toLowerCase().includes(q) || ((t.department || '')).toLowerCase().includes(q) || ((t.requestedBy || '')).toLowerCase().includes(q) || ((t.ticketType || '')).toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const createTicket = (ev) => {
    ev.preventDefault();
    const payload = { ...form };
    // If user is creating from the user portal, force requestedBy to current user
    if (isUserRoute && currentUserName) payload.requestedBy = currentUserName;
    const next = { id: Date.now(), ...payload, createdAt: new Date().toISOString().slice(0,10) };
    setTickets(s => [next, ...s]);
    setModalOpen(false);
    setForm({ subject: '', owner: '', requestedBy: '', assignee: '', ticketType: '', department: '', status: 'open' });
  };

  // helper to render friendly status label and chip class
  const statusDisplay = (s) => {
    if (!s) return { label: 'Unknown', cls: 'unknown' };
    if (s === 'pending') return { label: 'Pending Approval', cls: 'pending-approval' };
    if (s === 'open') return { label: 'In Process', cls: 'in-process' };
    if (s === 'closed') return { label: 'Done', cls: 'done' };
    if (s === 'overdue') return { label: 'Overdue', cls: 'overdue' };
    return { label: s, cls: s };
  };

  const [selectedTicket, setSelectedTicket] = useState(null);

  // local state for adding ticket types and edit modal
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalOldName, setEditModalOldName] = useState(null);
  const [editModalName, setEditModalName] = useState('');
  const [editModalSla, setEditModalSla] = useState('24');

    const handleAddType = (name, hours) => {
      const t = (name || '').trim();
      if (!t) return;
      if (!ticketTypes.includes(t)) setTicketTypes(s => [...s, t]);
      setSlaSettings(s => ({ ...s, [t]: Number(hours) || 0 }));
      setAddModalOpen(false);
    };

  const removeTicketType = (name) => {
    setTicketTypes(s => s.filter(t => t !== name));
    setSlaSettings(s => {
      const copy = { ...s }; delete copy[name]; return copy;
    });
  };

  // delete confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const handleDeleteRequest = (name) => {
    setConfirmTarget(name);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!confirmTarget) return;
    removeTicketType(confirmTarget);
    setConfirmOpen(false);
    // if edit modal open for same type, close it
    if (editModalOpen && editModalOldName === confirmTarget) {
      setEditModalOpen(false);
      setEditModalOldName(null);
      setEditModalName('');
      setEditModalSla('24');
    }
    setConfirmTarget(null);
  };

  const startEdit = (name) => {
    setEditModalOldName(name);
    setEditModalName(name);
    setEditModalSla(String(slaSettings[name] ?? '24'));
    setEditModalOpen(true);
  };

  const saveEditModal = () => {
    const oldName = editModalOldName;
    const newName = editModalName.trim();
    const hours = Number(editModalSla) || 0;
    if (!newName) return;
    setTicketTypes(prev => {
      if (oldName === newName) return prev;
      if (prev.includes(newName)) return prev;
      return prev.map(p => p === oldName ? newName : p);
    });
    setSlaSettings(prev => {
      const copy = { ...prev };
      delete copy[oldName];
      copy[newName] = hours;
      return copy;
    });
    setEditModalOpen(false);
    setEditModalOldName(null);
    setEditModalName('');
    setEditModalSla('24');
  };

  const cancelEditModal = () => {
    setEditModalOpen(false);
    setEditModalOldName(null);
    setEditModalName('');
    setEditModalSla('24');
  };

  return (
    <div className="admin-page">
      <Sidebar />

      <main className="admin-main">
        <TopNav initials="AD" userName="Administrator" pageTitle="Tickets" />

        <div className="external-actions">
          <button className={`external-btn ${viewMode==='types'?'active':''}`} onClick={()=>setViewMode('types')}>Ticket Types</button>
          <button className={`external-btn ${viewMode==='tickets'?'active':''}`} onClick={()=>setViewMode('tickets')}>Tickets Created</button>
        </div>

        <section className="panel tickets-panel">
          {viewMode === 'types' ? (
            <div className="types-list-panel">
              <div className="types-header">
                <h3>Configured Ticket Types</h3>
                <div className="types-header-actions">
                  <button className="btn-primary" onClick={()=>setAddModalOpen(true)}>+ Add Type</button>
                </div>
              </div>
              <div className="types-table-wrap">
                <div className="um-table">
                  <div className="um-table-head">
                    <div className="um-row head">
                      <div className="um-cell name-col">Type</div>
                      <div className="um-cell email-col">SLA (hours)</div>
                      <div className="um-cell action-col">Actions</div>
                    </div>
                  </div>
                  <div className="um-table-body">
                    {ticketTypes.map(t => (
                      <div className="um-row" key={t}>
                        <div className="um-cell name-col">{t}</div>
                        <div className="um-cell email-col">{slaSettings[t] ?? '-'}</div>
                        <div className="um-cell action-col">
                          <button className="icon-btn" onClick={()=>startEdit(t)} title={`Edit ${t}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {ticketTypes.length === 0 && (
                      <div className="um-row"><div className="um-cell muted">No ticket types configured.</div></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="tickets-controls">
                <div>
                  <label><strong>Status</strong></label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label><strong>Search</strong></label>
                  <input placeholder="Search subject, owner or assignee" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>

                <div className="tickets-actions">
                  <button className="btn-primary" onClick={() => setModalOpen(true)}>Create Ticket</button>
                </div>
              </div>

              <div className="tickets-table-wrap">
                <table className="tickets-table">
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Subject</th>
                      <th>Requested By</th>
                      <th>Assignee</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => {
                      const sd = statusDisplay(t.status);
                      return (
                        <tr key={t.id} className="ticket-row" onClick={() => setSelectedTicket(t)}>
                          <td>{t.owner}</td>
                          <td className="ticket-subject">{t.subject}</td>
                          <td>{t.requestedBy ?? '-'}</td>
                          <td>{t.assignee}</td>
                          <td>{t.department ?? '-'}</td>
                          <td><span className={`chip ${sd.cls}`}>{sd.label}</span></td>
                          <td>{t.createdAt}</td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} style={{textAlign:'center'}}>No tickets found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {modalOpen && (
            <div className="um-modal-overlay" role="dialog" aria-modal="true">
              <div className="um-modal">
                <h3>Create Ticket</h3>
                <form onSubmit={createTicket} className="um-form">
                  <div className="row">
                    <label>Subject<input required value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})} /></label>
                  </div>
                  <div className="row">
                    <label>Owner<input required value={form.owner} onChange={(e)=>setForm({...form,owner:e.target.value})} /></label>
                    <label>Assignee<input value={form.assignee} onChange={(e)=>setForm({...form,assignee:e.target.value})} /></label>
                  </div>
                  <div className="row">
                    <label>Department
                      <select value={form.department} onChange={(e)=>setForm({...form,department:e.target.value})}>
                        <option value="">Select department</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>
                  </div>
                
                  <div className="row">
                    <label>Requested By<input value={form.requestedBy} onChange={(e)=>setForm({...form,requestedBy:e.target.value})} placeholder="Name or source" /></label>
                  </div>
                  <div className="row">
                    <label>Ticket type
                      <select value={form.ticketType} onChange={(e)=>setForm({...form,ticketType:e.target.value})}>
                        <option value="">Select type</option>
                        {ticketTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="row">
                    <label>Status
                      <select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}>
                        <option value="open">open</option>
                        <option value="pending">pending</option>
                        <option value="closed">closed</option>
                        <option value="overdue">overdue</option>
                      </select>
                    </label>
                  </div>
                  <div className="row actions">
                    <button type="button" className="btn-muted" onClick={()=>setModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn-primary">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}

            {/* configure modal removed; types are managed inline in the types panel */}

        </section>
        {selectedTicket && (
          <div className="um-modal-overlay" role="dialog" aria-modal="true">
            <div className="um-modal">
              <h3>Ticket details</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><strong>Subject</strong><div className="muted">{selectedTicket.subject}</div></div>
                <div><strong>Status</strong><div><span className={`chip ${statusDisplay(selectedTicket.status).cls}`}>{statusDisplay(selectedTicket.status).label}</span></div></div>
                <div><strong>Requested By</strong><div className="muted">{selectedTicket.requestedBy}</div></div>
                <div><strong>Assignee</strong><div className="muted">{selectedTicket.assignee}</div></div>
                <div><strong>Department</strong><div className="muted">{selectedTicket.department}</div></div>
                <div><strong>Type</strong><div className="muted">{selectedTicket.ticketType}</div></div>
                <div style={{gridColumn:'1 / -1'}}>
                  <strong>Notes</strong>
                  <div className="muted" style={{marginTop:6}}>{selectedTicket.notes || 'No additional notes.'}</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
                <button className="btn-muted" onClick={()=>setSelectedTicket(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
        {editModalOpen && (
          <div className="um-modal-overlay" role="dialog" aria-modal="true">
            <div className="um-modal">
              <h3>Edit Ticket Type</h3>
              <div className="um-form">
                <div className="row">
                  <label>Type name
                    <input value={editModalName} onChange={(e)=>setEditModalName(e.target.value)} />
                  </label>
                </div>
                <div className="row">
                  <label>SLA (hours)
                    <input value={editModalSla} onChange={(e)=>setEditModalSla(e.target.value)} />
                  </label>
                </div>
                <div className="row actions" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <button type="button" className="btn-danger" onClick={() => { setConfirmTarget(editModalOldName); setConfirmOpen(true); }}>Delete</button>
                  </div>
                  <div>
                    <button className="btn-muted" onClick={cancelEditModal}>Cancel</button>
                    <button className="btn-primary" onClick={saveEditModal} style={{marginLeft:8}}>Save</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <AddTypeModal open={addModalOpen} onClose={()=>setAddModalOpen(false)} onAdd={handleAddType} />
        {confirmOpen && (
          <div className="um-modal-overlay" role="dialog" aria-modal="true">
            <div className="um-modal">
              <h3>Delete</h3>
              <p className="muted">Are you sure you want to delete the ticket type <strong>{confirmTarget}</strong>? This action cannot be undone.</p>
              <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
                <button className="btn-muted" onClick={()=>setConfirmOpen(false)}>Cancel</button>
                <button className="btn-danger" onClick={handleConfirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TicketsPage;
