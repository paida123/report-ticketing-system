import React, { useMemo, useState, useEffect } from 'react';
import Sidebar from '../../../components/sidebar/Sidebar';
import TopNav from '../../../components/topnav/TopNav';
import './TicketsPage.css';

const EyeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 5c5.5 0 10 4.5 11 7-1 2.5-5.5 7-11 7S2 14.5 1 12c1-2.5 5.5-7 11-7z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const normalizeRoleName = (v) => String(v || '').trim();

// Modal for adding a new ticket type (mirrors Roles add modal style)
const AddTypeModal = ({ open, onClose, onAdd, roles = [] }) => {
  const emptyForm = { name: '', sla: '', approvalCount: '', chain: [] };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [open]);

  const setCount = (nextCount) => {
    const c = Math.max(0, Math.min(10, Number(nextCount) || 0));
    setForm(prev => {
      const prevChain = Array.isArray(prev.chain) ? prev.chain : [];
      const nextChain = Array.from({ length: c }, (_, i) => prevChain[i] ?? '');
      return { ...prev, approvalCount: c, chain: nextChain };
    });
  };

  const updateChainRole = (idx, value) => {
    const v = normalizeRoleName(value);
    setForm(prev => {
      const next = [...(prev.chain || [])];
      next[idx] = v;
      return { ...prev, chain: next };
    });
  };

  const validate = () => {
    const e = {};
    const name = (form.name || '').trim();
    const cnt = Number(form.approvalCount) || 0;
    if (!name || name.length < 1) e.name = 'Type name is required';
    if (cnt < 0) e.approvalCount = 'Approval count must be 0 or more';
    if (cnt > 0) {
      const chain = (form.chain || []).map(normalizeRoleName).slice(0, cnt);
      if (chain.some(r => !r)) e.chain = 'Please select all approver roles in the chain';
    }
    return e;
  };

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      const cnt = Number(form.approvalCount) || 0;
      const chain = (form.chain || []).map(normalizeRoleName).slice(0, cnt);
      onAdd((form.name || '').trim(), Number(form.sla) || 0, chain);
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
            <label>Approval count
              <input
                type="number"
                min={0}
                max={10}
                value={form.approvalCount}
                onChange={(e) => setCount(e.target.value)}
              />
            </label>
          </div>

          {Number(form.approvalCount) > 0 ? (
            <div className="row" style={{flexDirection:'column', gap:8}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10}}>
                <label style={{margin:0}}>Approval chain (first → last)</label>
                <div className="muted" style={{fontSize:12}}>
                  {`Configure ${form.approvalCount} approver role${Number(form.approvalCount) === 1 ? '' : 's'}`}
                </div>
              </div>

              <div className="approval-chain">
                {Array.from({ length: Number(form.approvalCount) || 0 }).map((_, idx) => (
                  <div className="approval-step" key={idx}>
                    <div className="approval-step-badge">{idx + 1}</div>
                    <div className="approval-step-select">
                      <select value={form.chain?.[idx] || ''} onChange={(e) => updateChainRole(idx, e.target.value)}>
                        <option value="">Select role</option>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
  const [approvalSteps, setApprovalSteps] = useState({
    Incident: ['Line Manager', 'IT Manager'],
    Request: ['Line Manager'],
    Bug: [],
  });

  // roles list used for selecting approvers in a chain
  const [roles, setRoles] = useState(['Admin', 'Agent', 'Manager', 'Executive']);

  useEffect(() => {
    // try to reuse roles from any persisted roles list; fall back to small defaults
    try {
      const raw = localStorage.getItem('roles');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const names = parsed
          .map(r => (typeof r === 'string' ? r : r?.name))
          .map(normalizeRoleName)
          .filter(Boolean);
        if (names.length) setRoles(Array.from(new Set(names)));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // load persisted configuration from localStorage on mount
  useEffect(() => {
    try {
      const rawTypes = localStorage.getItem('ticketTypes');
      const rawSla = localStorage.getItem('slaSettings');
      const rawDeps = localStorage.getItem('departments');
      const rawSteps = localStorage.getItem('ticketTypeApprovalSteps');
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
      if (rawSteps) {
        const parsed = JSON.parse(rawSteps);
        if (parsed && typeof parsed === 'object') setApprovalSteps(parsed);
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
      localStorage.setItem('ticketTypeApprovalSteps', JSON.stringify(approvalSteps));
    } catch (e) {
      // storage may be unavailable; ignore
    }
  }, [ ticketTypes, slaSettings, departments, approvalSteps]);

  // Exposed filter options for users (friendly labels)
  const statuses = ['All', 'pending approval', 'in process', 'done', 'overdue'];
  const [viewMode, setViewMode] = useState('tickets'); // 'tickets' | 'types'

  // Ticket Types filter
  const [typeQuery, setTypeQuery] = useState('');

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

  const filteredTypes = ticketTypes.filter(t => {
    const q = String(typeQuery || '').trim().toLowerCase();
    if (!q) return true;
    return String(t || '').toLowerCase().includes(q);
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

  const selectedTicketTypeChain = useMemo(() => {
    const type = form.ticketType;
    if (!type) return [];
    const chain = approvalSteps?.[type];
    return Array.isArray(chain) ? chain : [];
  }, [form.ticketType, approvalSteps]);

  const selectedTicketTypeApprovalCount = selectedTicketTypeChain.length;

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
  const [editModalCount, setEditModalCount] = useState(0);
  const [editModalChain, setEditModalChain] = useState([]);

  // view chain modal
  const [viewChainOpen, setViewChainOpen] = useState(false);
  const [viewChainType, setViewChainType] = useState(null);

  const openChainViewer = (typeName) => {
    setViewChainType(typeName);
    setViewChainOpen(true);
  };

    const handleAddType = (name, hours, chain = []) => {
      const t = (name || '').trim();
      if (!t) return;
      if (!ticketTypes.includes(t)) setTicketTypes(s => [...s, t]);
      setSlaSettings(s => ({ ...s, [t]: Number(hours) || 0 }));
    setApprovalSteps(prev => ({ ...prev, [t]: Array.isArray(chain) ? chain : [] }));
      setAddModalOpen(false);
    };

  const removeTicketType = (name) => {
    setTicketTypes(s => s.filter(t => t !== name));
    setSlaSettings(s => {
      const copy = { ...s }; delete copy[name]; return copy;
    });
    setApprovalSteps(s => {
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
    const chain = Array.isArray(approvalSteps?.[name]) ? approvalSteps[name] : [];
    setEditModalCount(chain.length);
    setEditModalChain(chain);
    setEditModalOpen(true);
  };

  const setEditCount = (nextCount) => {
    const c = Math.max(0, Math.min(10, Number(nextCount) || 0));
    setEditModalCount(c);
    setEditModalChain(prev => {
      const prevChain = Array.isArray(prev) ? prev : [];
      return Array.from({ length: c }, (_, i) => prevChain[i] ?? '');
    });
  };

  const updateEditChain = (idx, value) => {
    const v = normalizeRoleName(value);
    setEditModalChain(prev => {
      const next = [...(Array.isArray(prev) ? prev : [])];
      next[idx] = v;
      return next;
    });
  };

  const saveEditModal = () => {
    const oldName = editModalOldName;
    const newName = editModalName.trim();
    const hours = Number(editModalSla) || 0;
    const cnt = Number(editModalCount) || 0;
    const chain = (editModalChain || []).map(normalizeRoleName).slice(0, cnt);
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
    setApprovalSteps(prev => {
      const copy = { ...prev };
      delete copy[oldName];
      copy[newName] = chain;
      return copy;
    });
    setEditModalOpen(false);
    setEditModalOldName(null);
    setEditModalName('');
    setEditModalSla('24');
    setEditModalCount(0);
    setEditModalChain([]);
  };

  const cancelEditModal = () => {
    setEditModalOpen(false);
    setEditModalOldName(null);
    setEditModalName('');
    setEditModalSla('24');
    setEditModalCount(0);
    setEditModalChain([]);
  };

  return (
    <div className="admin-page">
      <Sidebar />

      <main className="admin-main">
        <TopNav initials="AD" userName="Administrator" pageTitle="Tickets" />

        <div className="external-actions">
            <button className={`external-btn ${viewMode==='tickets'?'active':''}`} onClick={()=>setViewMode('tickets')}>Tickets Created</button>
          <button className={`external-btn ${viewMode==='types'?'active':''}`} onClick={()=>setViewMode('types')}>Ticket Types</button>
        
        </div>

        <section className="panel tickets-panel">
          {viewMode === 'types' ? (
            <div className="types-list-panel">
              <div className="types-header">
                <h3>Configured Ticket Types</h3>
                <div className="types-header-actions">
                  <div className="types-filter">
                    <input
                      value={typeQuery}
                      onChange={(e) => setTypeQuery(e.target.value)}
                      placeholder="Search ticket type"
                      aria-label="Search ticket types"
                    />
                    <button
                      type="button"
                      className="btn-primary types-filter-btn"
                      onClick={() => { /* real-time search; no-op */ }}
                    >
                      Search
                    </button>
                    {typeQuery ? (
                      <button
                        type="button"
                        className="btn-muted"
                        onClick={() => { setTypeQuery(''); }}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <button className="btn-primary" onClick={()=>setAddModalOpen(true)}>+ Add Type</button>
                </div>
              </div>
              <div className="types-table-wrap">
                <div className="table-wrap">
                  <table className="user-tickets-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>SLA (hours)</th>
                        <th>Approval count</th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTypes.map(t => (
                        <tr key={t}>
                          <td>{t}</td>
                          <td>{slaSettings[t] ?? '-'}</td>
                          <td>
                            <div className="approval-count-cell">
                              <button
                                type="button"
                                className="approval-count-btn"
                                onClick={() => openChainViewer(t)}
                                title={`View approval chain for ${t}`}
                                aria-label={`View approval chain for ${t}`}
                              >
                                <span className="approval-count-badge">{(approvalSteps?.[t] || []).length}</span>
                              </button>
                              <span className="muted">approver{(approvalSteps?.[t] || []).length === 1 ? '' : 's'}</span>
                            </div>
                          </td>
                          <td className="actions-col">
                            <button className="icon-btn" onClick={()=>startEdit(t)} title={`Edit ${t}`}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredTypes.length === 0 && (
                        <tr><td colSpan={4} className="muted" style={{textAlign:'center'}}>No ticket types configured.</td></tr>
                      )}
                    </tbody>
                  </table>
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
                  <div className="tickets-search">
                    <input
                      placeholder="Search subject, owner or assignee"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="button" className="btn-primary" onClick={() => { /* real-time search; no-op */ }}>Search</button>
                    {query ? (
                      <button type="button" className="btn-muted" onClick={() => { setQuery(''); }}>Clear</button>
                    ) : null}
                  </div>
                </div>

                <div className="tickets-actions">
                  <button className="btn-primary" onClick={() => setModalOpen(true)}>Create Ticket</button>
                </div>
              </div>

              <div className="table-wrap tickets-table-wrap">
                <table className="user-tickets-table">
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Subject</th>
                      <th>Requested By</th>
                      <th>Assignee</th>
                      <th>Department</th>
                      <th className="status-col">Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => {
                      const sd = statusDisplay(t.status);
                      return (
                        <tr key={t.id} className="ticket-row" onClick={() => setSelectedTicket(t)}>
                          <td>{t.owner}</td>
                          <td className="subject-col">{t.subject}</td>
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

                  {/* approval context for selected ticket type */}
                  <div className="row" style={{flexDirection:'column', gap:8}}>
                    <div className="approval-summary">
                      <div className="approval-summary-left">
                        <div className="approval-summary-title">Approval count</div>
                        <div className="approval-summary-value">
                          <span className="approval-count-badge">{form.ticketType ? selectedTicketTypeApprovalCount : '—'}</span>
                          <span className="muted">{form.ticketType ? 'approvers before assignment' : 'Select a ticket type to see approvals'}</span>
                        </div>
                      </div>
                      {form.ticketType && (
                        <button type="button" className="icon-btn" onClick={() => openChainViewer(form.ticketType)} title="View approval chain">
                          <EyeIcon />
                        </button>
                      )}
                    </div>

                    {form.ticketType && selectedTicketTypeChain.length > 0 && (
                      <div className="approval-chain-preview">
                        {selectedTicketTypeChain.map((role, idx) => (
                          <div className="approval-step-pill" key={idx}>
                            <span className="approval-step-pill-index">{idx + 1}</span>
                            <span className="approval-step-pill-role">{role}</span>
                          </div>
                        ))}
                      </div>
                    )}
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

          {editModalOpen && (
            <div className="um-modal-overlay" role="dialog" aria-modal="true">
              <div className="um-modal">
                <h3>Edit ticket type</h3>
                <div className="um-form">
                  <div className="row">
                    <label>Type name
                      <input value={editModalName} onChange={(e) => setEditModalName(e.target.value)} />
                    </label>
                  </div>
                  <div className="row">
                    <label>SLA (hours)
                      <input value={editModalSla} onChange={(e) => setEditModalSla(e.target.value)} />
                    </label>
                  </div>
                  <div className="row">
                    <label>Approval count
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={editModalCount}
                        onChange={(e)=>setEditCount(e.target.value)}
                      />
                    </label>
                  </div>

                  {Number(editModalCount) > 0 ? (
                    <div className="row" style={{flexDirection:'column', gap:8}}>
                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10}}>
                        <label style={{margin:0}}>Approval chain (first → last)</label>
                        <div className="muted" style={{fontSize:12}}>
                          {`Configure ${editModalCount} approver role${Number(editModalCount) === 1 ? '' : 's'}`}
                        </div>
                      </div>

                      <div className="approval-chain">
                        {Array.from({ length: Number(editModalCount) || 0 }).map((_, idx) => (
                          <div className="approval-step" key={idx}>
                            <div className="approval-step-badge">{idx + 1}</div>
                            <div className="approval-step-select">
                              <select value={editModalChain?.[idx] || ''} onChange={(e)=>updateEditChain(idx, e.target.value)}>
                                <option value="">Select role</option>
                                {roles.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="row actions">
                    <button type="button" className="btn-danger" onClick={() => { setConfirmTarget(editModalOldName); setConfirmOpen(true); }}>Delete</button>
                    <div style={{display:'flex', gap:8}}>
                      <button type="button" className="btn-muted" onClick={cancelEditModal}>Cancel</button>
                      <button type="button" className="btn-primary" onClick={saveEditModal}>Save</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <AddTypeModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAddType} roles={roles} />

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

        {viewChainOpen && (
          <div className="um-modal-overlay" role="dialog" aria-modal="true">
            <div className="um-modal" style={{minWidth: 560, maxWidth: 760}}>
              <div className="approval-chain-header">
                <div>
                  <h3 className="approval-chain-title">Approval chain</h3>
                  <div className="approval-chain-subtitle">
                    {viewChainType ? <><strong>{viewChainType}</strong> • from first approver to last approver</> : 'Ticket type'}
                  </div>
                </div>
                <button className="btn-muted" onClick={() => setViewChainOpen(false)}>Close</button>
              </div>

              <div className="approval-chain-stepper">
                {viewChainType && (approvalSteps?.[viewChainType] || []).length ? (
                  <div className="approval-chain" style={{marginTop:4}}>
                    {(approvalSteps?.[viewChainType] || []).map((role, idx, arr) => (
                      <div className="approval-step" key={idx}>
                        <div className="approval-step-badge">{idx + 1}</div>
                        <div className="approval-step-content">
                          <div className="approval-step-role">{role || '—'}</div>
                          <div className="approval-step-meta">
                            <span className="approval-step-tag">Approver role</span>
                            <span className="approval-step-tag secondary">{idx === 0 ? 'First approver' : (idx === arr.length - 1 ? 'Final approver' : 'Next approver')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="approval-chain-empty">No approval chain configured for this ticket type.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TicketsPage;
