import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PageHeader from '../../components/PageHeader/PageHeader';
import StatsCard, { StatsRow } from '../../components/StatsCard/StatsCard';
import TicketService from '../../services/ticket.service';
import TicketApprovalService from '../../services/ticketApproval.service';
import UserService from '../../services/user.service';
import { useAuth } from '../../context/AuthContext';
import '../admin.css';
import '../user/UserTicketPage/UserTicketsPage.css';
import './ManagerDashboard.css';

const buildSteps = (ticket, allApprovals) => {
  const totalSteps = ticket.ticket_type?.approval_count || 1;
  const ticketApprovals = (allApprovals || []).filter(a => (a.ticket_id || a.ticket?.id) === ticket.id);
  return Array.from({ length: totalSteps }, (_, i) => {
    const match = ticketApprovals[i];
    if (!match) return { label: `Step ${i + 1}`, status: 'pending', approver: null, timestamp: null };
    return {
      label: `Step ${i + 1}`,
      status: match.status === 'APPROVED' ? 'done' : match.status === 'REJECTED' ? 'rejected' : 'pending',
      approver: match.approved_by ? `${match.approved_by.first_name || ''} ${match.approved_by.last_name || ''}`.trim() : null,
      timestamp: match.created_at || match.updated_at || null,
    };
  });
};

const PendingApprovalPage = () => {
  const { user } = useAuth();

  const [tickets, setTickets]             = useState([]);
  const [allApprovals, setAllApprovals]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [loadErr, setLoadErr]             = useState('');
  const [successMsg, setSuccessMsg]       = useState('');
  const [managerDept, setManagerDept]     = useState('');

  const [selected, setSelected]           = useState(null);

  const [approveBusy, setApproveBusy]     = useState(false);
  const [approveErr, setApproveErr]       = useState('');

  const [declineId, setDeclineId]         = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineBusy, setDeclineBusy]     = useState(false);
  const [declineErr, setDeclineErr]       = useState('');

  const [query, setQuery]                 = useState('');

  useEffect(() => {
    if (!user?.id) return;
    UserService.getUserById(user.id)
      .then(r => {
        const d = r?.data?.data;
        const dept = d?.departments?.department || d?.department || '';
        setManagerDept(String(dept).trim().toUpperCase());
      })
      .catch(() => {});
  }, [user?.id]);

  const loadData = useCallback(() => {
    setLoading(true); setLoadErr('');
    Promise.all([
      TicketService.getAllTickets({ limit: 200 }),
      TicketApprovalService.getAllApprovals().catch(() => ({ data: [] })),
    ])
      .then(([trRes, approvalRes]) => {
        const all = trRes?.data?.data?.tickets || [];
        const pending = all.filter(t => {
          if (t.status !== 'PENDING_APPROVAL') return false;
          if (!managerDept) return true;
          const tDept = String(t.created_by?.department || '').toUpperCase();
          return tDept === managerDept;
        });
        setTickets(pending);
        const approvals = approvalRes?.data?.data || approvalRes?.data || [];
        setAllApprovals(Array.isArray(approvals) ? approvals : []);
      })
      .catch(() => setLoadErr('Failed to load approval tasks. Please refresh.'))
      .finally(() => setLoading(false));
  }, [managerDept]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

  const q = query.trim().toLowerCase();
  const filtered = tickets.filter(t => {
    if (!q) return true;
    return (
      (t.title || '').toLowerCase().includes(q) ||
      (t.id || '').toLowerCase().includes(q) ||
      (t.ticket_type?.title || '').toLowerCase().includes(q) ||
      (t.created_by?.name || '').toLowerCase().includes(q) ||
      (t.created_by?.department || '').toLowerCase().includes(q)
    );
  });

  const closeModal = () => {
    setSelected(null);
    setDeclineId(null); setDeclineReason(''); setDeclineErr('');
    setApproveErr('');
  };

  const handleApprove = async (ticketId) => {
    setApproveBusy(true); setApproveErr('');
    try {
      await TicketApprovalService.createTicketApproval({ ticket_id: ticketId, status: 'APPROVED' });
      closeModal();
      setSuccessMsg('Ticket approved successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (e) {
      setApproveErr(e?.response?.data?.message || 'Failed to approve ticket.');
    } finally {
      setApproveBusy(false);
    }
  };

  const handleDeclineConfirm = async (ticketId) => {
    const reason = declineReason.trim();
    if (!reason) { setDeclineErr('Please provide a reason.'); return; }
    setDeclineBusy(true); setDeclineErr('');
    try {
      await TicketApprovalService.createTicketApproval({ ticket_id: ticketId, status: 'REJECTED', comment: reason });
      closeModal();
      setSuccessMsg('Ticket declined.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (e) {
      setDeclineErr(e?.response?.data?.message || 'Failed to decline ticket.');
    } finally {
      setDeclineBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Pending Approvals"
        subtitle={managerDept ? `Department: ${managerDept}` : 'Tickets awaiting your approval'}
      />

      {successMsg && createPortal(
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: '#10b981', color: '#fff', borderRadius: 12, padding: '13px 22px', fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {successMsg}
        </div>, document.body
      )}

      <StatsRow>
        <StatsCard label="Awaiting Approval" value={loading ? '...' : tickets.length} color="amber" />
        <StatsCard label="Department"         value={managerDept || '-'}               color="blue"  />
      </StatsRow>

      <section className="panel utp-panel">
        <div className="utp-controls">
          <div className="utp-search-wrap">
            <svg className="utp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <input className="utp-search" placeholder="Search title, ID, requester or department..." value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button className="utp-search-clear" onClick={() => setQuery('')} aria-label="Clear search">x</button>}
          </div>
        </div>

        {loadErr && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 18px', color: '#b91c1c', fontSize: 14, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            {loadErr}
            <button onClick={loadData} style={{ marginLeft: 'auto', fontSize: 13, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
          </div>
        )}

        <div className="utp-table-wrap">
          <table className="utp-table">
            <thead>
              <tr>
                <th className="utp-col-id">Ticket ID</th>
                <th className="utp-col-title">Title</th>
                <th className="utp-col-type">Requester</th>
                <th className="utp-col-type">Type</th>
                <th className="utp-col-status">Workflow</th>
                <th className="utp-col-date">Requested</th>
                <th className="utp-col-actions" />
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3,4].map(i => (
                <tr key={i} className="utp-row utp-row-skeleton">
                  <td colSpan={7}><div className="utp-skeleton-bar" /></td>
                </tr>
              ))}
              {!loading && filtered.map(t => {
                const totalSteps = t.ticket_type?.approval_count || 1;
                const ticketApprovals = allApprovals.filter(a => (a.ticket_id || a.ticket?.id) === t.id);
                const approvedCount = ticketApprovals.filter(a => a.status === 'APPROVED').length;
                return (
                  <tr key={t.id} className="utp-row" onClick={() => { setSelected(t); setDeclineId(null); setApproveErr(''); }} style={{ cursor: 'pointer' }}>
                    <td className="utp-col-id"><span className="utp-id-badge">{(t.id || '').slice(0, 12)}</span></td>
                    <td className="utp-col-title">{t.title}</td>
                    <td className="utp-col-type">
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{t.created_by?.name || '-'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{t.created_by?.department || ''}</div>
                    </td>
                    <td className="utp-col-type">{t.ticket_type?.title || '-'}</td>
                    <td className="utp-col-status">
                      <span className="utp-status-chip" style={{ background: '#f59e0b18', color: '#f59e0b', borderColor: '#f59e0b30' }}>
                        {approvedCount}/{totalSteps} approved
                      </span>
                    </td>
                    <td className="utp-col-date">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                    <td className="utp-col-actions">
                      <button className="utp-view-btn" onClick={e => { e.stopPropagation(); setSelected(t); setDeclineId(null); setApproveErr(''); }} aria-label="View">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2.2 12.1C3.7 7.6 7.5 4.5 12 4.5c4.5 0 8.3 3.1 9.8 7.6a1.2 1.2 0 0 1 0 .9c-1.5 4.5-5.3 7.6-9.8 7.6-4.5 0-8.3-3.1-9.8-7.6a1.2 1.2 0 0 1 0-.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.7"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
                  {query ? 'No tickets match your search.' : `No pending approval tickets${managerDept ? ` for ${managerDept}` : ''}.`}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && createPortal(
        <div role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, background: 'rgba(2,6,23,0.50)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 72px rgba(2,6,23,0.28)' }}
            onClick={e => e.stopPropagation()}>
            {(() => {
              const steps = buildSteps(selected, allApprovals);
              const approvedCount = steps.filter(s => s.status === 'done').length;
              const totalSteps = steps.length;
              const initials = (selected.created_by?.name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
              return (
                <>
                  <div style={{ background: 'linear-gradient(135deg,#f59e0b18,#f59e0b08)', borderBottom: '2px solid #f59e0b25', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 14, flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f59e0b22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>|{'>'}|</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', lineHeight: 1.3, marginBottom: 4, wordBreak: 'break-word' }}>{selected.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', background: '#f1f5f9', borderRadius: 5, padding: '2px 7px' }}>{selected.id}</span>
                        <span style={{ background: '#f59e0b18', color: '#f59e0b', borderRadius: 8, padding: '2px 9px', fontWeight: 700, fontSize: 12 }}>Pending Approval</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{approvedCount}/{totalSteps} steps</span>
                      </div>
                    </div>
                    <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>x</button>
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{initials}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{selected.created_by?.name || '-'}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selected.created_by?.email || ''} . {selected.created_by?.department || '-'}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Requested</div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '-'}</div>
                      </div>
                    </div>

                    <div style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</div>
                      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selected.description || '-'}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                      {[
                        { label: 'Ticket Type',   val: selected.ticket_type?.title || '-' },
                        { label: 'SLA',            val: selected.ticket_type?.expected_sla_duration ? `${selected.ticket_type.expected_sla_duration}h` : '-' },
                        { label: 'Approval Steps', val: `${totalSteps} step${totalSteps !== 1 ? 's' : ''} required` },
                        { label: 'Progress',       val: `${approvedCount} of ${totalSteps} approved` },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                          <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ padding: '14px 0', borderBottom: declineId === selected.id ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Approval Workflow</div>
                      <div className="approval-stepper" aria-label="Approval stepper">
                        {steps.map((s, i) => {
                          const firstPending = steps.findIndex(x => x.status === 'pending');
                          const stepClass = s.status === 'done' ? 'done' : s.status === 'rejected' ? 'declined' : i === firstPending ? 'current' : 'pending';
                          return (
                            <div className={`approval-step ${stepClass}`} key={i}>
                              <div className="approval-track" aria-hidden="true">
                                <div className="approval-connector left" />
                                <div className="approval-dot" />
                                <div className="approval-connector right" />
                              </div>
                              <div className="approval-step-label">
                                <div className="approval-step-name">{s.label}{s.approver ? ` - ${s.approver}` : ''}</div>
                                <div className="approval-step-sub muted">
                                  {s.status === 'done' ? `Approved${s.timestamp ? ' . ' + new Date(s.timestamp).toLocaleDateString() : ''}` :
                                    s.status === 'rejected' ? 'Rejected' : 'Pending'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {declineId === selected.id && (
                      <div style={{ paddingTop: 14 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>
                          Reason for declining <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea value={declineReason} onChange={e => { setDeclineReason(e.target.value); setDeclineErr(''); }} rows={3}
                          placeholder="Provide a reason for declining..."
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                          autoFocus />
                        {declineErr && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{declineErr}</div>}
                      </div>
                    )}

                    {approveErr && (
                      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#b91c1c', fontSize: 13, marginTop: 14 }}>{approveErr}</div>
                    )}
                  </div>

                  <div style={{ padding: '14px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: '#fafafa', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
                    {declineId === selected.id ? (
                      <>
                        <button onClick={() => { setDeclineId(null); setDeclineReason(''); setDeclineErr(''); }} disabled={declineBusy}
                          style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <button onClick={() => handleDeclineConfirm(selected.id)} disabled={declineBusy || !declineReason.trim()}
                          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: (declineBusy || !declineReason.trim()) ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: (declineBusy || !declineReason.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {declineBusy ? 'Declining...' : 'Confirm Decline'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setDeclineId(selected.id); setDeclineReason(''); setDeclineErr(''); setApproveErr(''); }} disabled={approveBusy}
                          style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                          Decline
                        </button>
                        <button onClick={() => handleApprove(selected.id)} disabled={approveBusy}
                          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: approveBusy ? '#6ee7b7' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: approveBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {approveBusy ? 'Approving...' : 'Approve'}
                        </button>
                      </>
                    )}
                    <button onClick={closeModal}
                      style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                      Close
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

export default PendingApprovalPage;
