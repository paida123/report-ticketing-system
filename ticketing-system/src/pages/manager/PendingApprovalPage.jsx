import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import TopNav from '../../components/topnav/TopNav';
import '../user/UserTicketPage/UserTicketsPage.css';

// A simple approval workflow model stored in localStorage under `approvalTasks`.
// Each task: { id, title, ticketId, createdAt, requestedBy, requesterDepartment, subject, taskLabel, approvers: [{ name, status: 'approved'|'pending', approvedAt? }] }

const seedApprovalTasks = (managerName) => {
  const now = Date.now();
  const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000).toISOString();
  return [
    {
      id: 'appr-1001',
      title: 'Approve access request: Finance shared drive',
      ticketId: 1002,
      createdAt: hoursAgo(5),
      requestedBy: 'Carlos M.',
      requesterDepartment: 'Finance',
      subject: 'Shared drive access for Finance Q4 audits',
      taskLabel: 'Access Request Approval',
      approvers: [
        { name: 'Team Lead', status: 'approved', approvedAt: hoursAgo(4) },
        { name: managerName, status: 'pending' },
        { name: 'Executive', status: 'pending' },
      ],
    },
    {
      id: 'appr-1002',
      title: 'Approve incident follow-up: VPN hardware replacement',
      ticketId: 1001,
      createdAt: hoursAgo(16),
      requestedBy: 'Sarah L.',
      requesterDepartment: 'IT',
      subject: 'VPN instability from home network',
      taskLabel: 'Procurement Approval',
      approvers: [
        { name: managerName, status: 'pending' },
        { name: 'Executive', status: 'pending' },
      ],
    },
  ];
};

const PendingApprovalPage = () => {
  const managerName = typeof window !== 'undefined' ? (localStorage.getItem('currentUserName') || 'Manager') : 'Manager';
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTask, setDetailsTask] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineTask, setDeclineTask] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('approvalTasks');
      const parsed = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      if (arr.length === 0) {
        const seeded = seedApprovalTasks(managerName);
        localStorage.setItem('approvalTasks', JSON.stringify(seeded));
        setTasks(seeded);
        return;
      }
      setTasks(arr);
    } catch (e) {
      setTasks([]);
    }
  }, [managerName]);

  useEffect(() => {
    try { localStorage.setItem('approvalTasks', JSON.stringify(tasks)); } catch (e) {}
  }, [tasks]);

  const myQueue = useMemo(() => {
    const me = String(managerName).toLowerCase();
    return (tasks || []).filter(t => (t.approvers || []).some(a => String(a.name || '').toLowerCase() === me && a.status === 'pending'));
  }, [tasks, managerName]);

  const getSteps = (task) => {
    const approvers = (task?.approvers || []).map(a => ({
      name: a?.name || 'Approver',
      status: a?.status === 'approved' ? 'approved' : 'pending',
      approvedAt: a?.approvedAt,
    }));

    // Current step is the first pending approver.
    const currentIndex = Math.max(0, approvers.findIndex(a => a.status !== 'approved'));

    return approvers.map((a, idx) => {
      let state = 'pending';
      if (a.status === 'approved') state = 'done';
      else if (idx === currentIndex) state = 'current';
      return { ...a, state, idx };
    });
  };

  const approve = (taskId) => {
    const ts = new Date().toISOString();
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const approvers = (t.approvers || []).map(a => {
        if (String(a.name || '').toLowerCase() !== String(managerName).toLowerCase()) return a;
        if (a.status === 'approved') return a;
        return { ...a, status: 'approved', approvedAt: ts };
      });
      return { ...t, approvers };
    }));
  };

  const decline = (taskId, reason) => {
    const ts = new Date().toISOString();
    const r = String(reason || '').trim();
    if (!r) return;
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const approvers = (t.approvers || []).map(a => {
        if (String(a.name || '').toLowerCase() !== String(managerName).toLowerCase()) return a;
        if (a.status === 'approved' || a.status === 'declined') return a;
        return { ...a, status: 'declined', approvedAt: ts, reason: r };
      });
      return { ...t, approvers, declinedReason: r, declinedAt: ts };
    }));
  };

  const openDetails = (task) => {
    setDetailsTask(task);
    setDeclineReason('');
    setDetailsOpen(true);
  };

  const openDecline = (task) => {
    setDeclineTask(task);
    setDeclineReason('');
    setDeclineOpen(true);
  };

  return (
    <div className="user-page">
      <Sidebar />
      <main className="user-main">
        <TopNav initials={(managerName || 'M').slice(0, 2).toUpperCase()} userName={managerName} pageTitle="Pending Approval" />

        <section className="panel user-tickets-panel">
          <div className="user-tickets-header">
            <h2>Pending Approval</h2>
            <div className="muted" style={{ fontWeight: 700 }}>My queue: {myQueue.length}</div>
          </div>

          <div className="table-wrap">
            <table className="user-tickets-table">
              <thead>
                <tr>
                  <th className="id-col">ID</th>
                  <th>Task</th>
                  <th className="status-col">Workflow</th>
                  <th className="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {myQueue.map(t => {
                  const total = (t.approvers || []).length;
                  const approved = (t.approvers || []).filter(a => a.status === 'approved').length;
                  const allApproved = total > 0 && approved === total;
                  return (
                    <tr key={t.id} className="ticket-row">
                      <td className="id-col">{t.id}</td>
                      <td className="subject-col">{t.title}</td>
                      <td
                        className="status-col"
                        onClick={() => setSelected(t)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(t); } }}
                        title="View workflow"
                        style={{ cursor: 'pointer' }}
                      >
                        <span className={`chip ${allApproved ? 'done' : 'in-process'}`}>{approved}/{total} approved</span>
                      </td>
                      <td className="actions-col" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openDetails(t)}
                          aria-label={`Edit ${t.id}`}
                          title="Edit"
                        >
                          {/* pencil/edit icon */}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M12 20h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {myQueue.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center' }} className="muted">No tasks awaiting your approval.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <div className="um-modal-overlay um-blur-overlay">
            <div className="um-modal">
              <h3>Approval workflow</h3>
              <div className="muted" style={{ marginTop: 4 }}><strong>Task:</strong> {selected.title}</div>
              <div className="muted" style={{ marginTop: 4 }}><strong>Ticket:</strong> #{selected.ticketId}</div>

              <div className="approval-stepper" style={{ marginTop: 14 }} aria-label="Approval stepper">
                {getSteps(selected).map((s, i) => (
                  <div className={`approval-step ${s.state}`} key={`${s.name}-${i}`}>
                    <div className="approval-track" aria-hidden="true">
                      <div className="approval-connector left" />
                      <div className="approval-dot" />
                      <div className="approval-connector right" />
                    </div>
                    <div className="approval-step-label">
                      <div className="approval-step-name">{s.name}</div>
                      <div className="approval-step-sub muted">{s.state === 'done' ? 'Approved' : (s.state === 'current' ? 'Current' : 'Pending')}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }} className="table-wrap">
                <table className="user-tickets-table">
                  <thead>
                    <tr>
                      <th>Approver</th>
                      <th className="status-col">Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.approvers || []).map((a, idx) => (
                      <tr key={idx} className="ticket-row">
                        <td>{a.name}</td>
                        <td className="status-col"><span className={`chip ${a.status === 'approved' ? 'done' : 'pending-approval'}`}>{a.status}</span></td>
                        <td className="muted">{a.approvedAt || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="btn-muted" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {detailsOpen && detailsTask && (
          <div className="um-modal-overlay um-blur-overlay">
            <div className="um-modal">
              <h3>Task details</h3>

              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="user-tickets-table">
                  <thead>
                    <tr>
                      <th style={{ width: 220 }}>Field</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="ticket-row"><td><strong>ID</strong></td><td className="muted">{detailsTask.id}</td></tr>
                    <tr className="ticket-row"><td><strong>Requester</strong></td><td className="muted">{detailsTask.requestedBy || '-'}</td></tr>
                    <tr className="ticket-row"><td><strong>Department</strong></td><td className="muted">{detailsTask.requesterDepartment || detailsTask.department || '-'}</td></tr>
                    <tr className="ticket-row"><td><strong>Subject</strong></td><td className="muted">{detailsTask.subject || '-'}</td></tr>
                    <tr className="ticket-row"><td><strong>Task</strong></td><td className="muted">{detailsTask.taskLabel || detailsTask.title || '-'}</td></tr>
                    <tr className="ticket-row"><td><strong>Time of request</strong></td><td className="muted">{detailsTask.createdAt || '-'}</td></tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button
                  className="btn-danger"
                  type="button"
                  onClick={() => {
                    openDecline(detailsTask);
                  }}
                  title="Decline"
                >
                  Decline
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => {
                    approve(detailsTask.id);
                    setDetailsOpen(false);
                    setDetailsTask(null);
                  }}
                  title="Approve"
                >
                  Approve
                </button>
                <button
                  className="btn-muted"
                  type="button"
                  onClick={() => { setDetailsOpen(false); setDetailsTask(null); }}
                  title="Close"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {declineOpen && declineTask && (
          <div className="um-modal-overlay um-blur-overlay">
            <div className="um-modal">
              <h3>Decline task</h3>
              <div className="muted" style={{ marginTop: 4 }}><strong>ID:</strong> {declineTask.id}</div>

              <div className="table-wrap decline-form-wrap" style={{ marginTop: 12 }}>
                <table className="user-tickets-table">
                  <thead>
                    <tr>
                      <th style={{ width: 220 }}>Field</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="ticket-row"><td><strong>Requester</strong></td><td className="muted">{declineTask.requestedBy || '-'}</td></tr>
                    <tr className="ticket-row"><td><strong>Department</strong></td><td className="muted">{declineTask.requesterDepartment || declineTask.department || '-'}</td></tr>
                    <tr className="ticket-row"><td><strong>Subject</strong></td><td className="muted">{declineTask.subject || '-'}</td></tr>
                    <tr className="ticket-row"><td><strong>Task</strong></td><td className="muted">{declineTask.taskLabel || declineTask.title || '-'}</td></tr>
                    <tr className="ticket-row">
                      <td><strong>Reason</strong></td>
                      <td>
                        <textarea
                          className="decline-reason"
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          placeholder="Type a reason for declining..."
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="btn-muted" type="button" onClick={() => { setDeclineOpen(false); setDeclineTask(null); }}>Cancel</button>
                <button
                  className="btn-danger"
                  type="button"
                  onClick={() => {
                    const rr = String(declineReason || '').trim();
                    if (!rr) return;
                    decline(declineTask.id, rr);
                    setDeclineOpen(false);
                    setDeclineTask(null);
                    setDetailsOpen(false);
                    setDetailsTask(null);
                  }}
                >
                  Confirm decline
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PendingApprovalPage;
