import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import TopNav from '../../components/topnav/TopNav';
import '../user/UserTicketPage/UserTicketsPage.css';

// Manager view: “My Tickets” = tickets assigned to me (assignee)
const statusDisplay = (s) => {
  if (!s) return { label: 'Unknown', cls: 'unknown' };
  const v = String(s).toLowerCase();
  if (v === 'pending') return { label: 'Pending Approval', cls: 'pending-approval' };
  if (v === 'open') return { label: 'In Process', cls: 'in-process' };
  if (v === 'closed') return { label: 'Done', cls: 'done' };
  if (v === 'overdue') return { label: 'Overdue', cls: 'overdue' };
  return { label: s, cls: v };
};

const STATUSES = [
  { value: 'All', label: 'All' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'open', label: 'In Process' },
  { value: 'closed', label: 'Done' },
  { value: 'overdue', label: 'Overdue' },
];

const ManagerTicketsPage = () => {
  const managerName = typeof window !== 'undefined' ? (localStorage.getItem('currentUserName') || 'Manager') : 'Manager';
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tickets');
      const parsed = raw ? JSON.parse(raw) : [];
      setTickets(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      setTickets([]);
    }
  }, []);

  const myAssigned = useMemo(() => {
    return (tickets || []).filter(t => t && String(t.assignee || '').toLowerCase() === String(managerName).toLowerCase());
  }, [tickets, managerName]);

  const q = (query || '').trim().toLowerCase();
  const filtered = myAssigned.filter(t => {
    const st = String(t.status || '').toLowerCase();
    if (statusFilter && statusFilter !== 'All' && st !== statusFilter) return false;
    if (!q) return true;
    return (
      (t.subject || '').toLowerCase().includes(q) ||
      (t.owner || '').toLowerCase().includes(q) ||
      (t.department || '').toLowerCase().includes(q) ||
      (t.ticketType || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="user-page">
      <Sidebar />
      <main className="user-main">
        <TopNav initials={(managerName || 'M').slice(0, 2).toUpperCase()} userName={managerName} pageTitle="My Tickets" />

        <section className="panel user-tickets-panel">
          <div className="user-tickets-header">
            <h2>My Tickets</h2>
            <div className="user-tickets-actions">
              <div className="search-wrap">
                <input placeholder="Search subject, owner or type" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
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
                  const sd = statusDisplay(String(t.status || '').toLowerCase());
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
                  <tr><td colSpan={4} style={{ textAlign: 'center' }} className="muted">No assigned tickets found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <div className="um-modal-overlay um-blur-overlay">
            <div className="um-modal">
              <h3>Ticket details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><strong>Subject</strong><div className="muted">{selected.subject}</div></div>
                <div><strong>Status</strong><div><span className={`chip ${statusDisplay(selected.status).cls}`}>{statusDisplay(selected.status).label}</span></div></div>
                <div><strong>Owner</strong><div className="muted">{selected.owner || '-'}</div></div>
                <div><strong>Department</strong><div className="muted">{selected.department || '-'}</div></div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Notes</strong><div className="muted" style={{ marginTop: 6 }}>{selected.notes || 'No notes.'}</div></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="btn-muted" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ManagerTicketsPage;
