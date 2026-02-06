import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../../components/sidebar/Sidebar';
import TopNav from '../../../components/topnav/TopNav';
import '../UserDashboard.css';
import './UserSlaPage.css';

const DEFAULT_SLA = { Incident: 24, Request: 48, Bug: 72 };

const buildMockTicketsFor = (owner) => {
  const now = Date.now();
  const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000).toISOString();
  return [
    {
      id: 1001,
      owner,
      subject: 'VPN not connecting from home network',
      ticketType: 'Incident',
      department: 'IT Support',
      assignee: 'T. Moyo',
      status: 'open',
      notes: 'User reports error 720. Tested on hotspot works; likely router NAT.',
      createdAt: hoursAgo(2),
    },
    {
      id: 1002,
      owner,
      subject: 'Request: new laptop charger (Lenovo USB-C)',
      ticketType: 'Request',
      department: 'Procurement',
      assignee: 'R. Dube',
      status: 'pending',
      notes: 'Need approval for replacement accessory under policy.',
      createdAt: hoursAgo(12),
    },
    {
      id: 1003,
      owner,
      subject: 'Bug: report export CSV missing headers',
      ticketType: 'Bug',
      department: 'Engineering',
      assignee: 'K. Ndlovu',
      status: 'open',
      notes: 'CSV downloads but first row contains data (no header row).',
      createdAt: hoursAgo(90),
    },
    {
      id: 1004,
      owner,
      subject: 'Email password reset not received',
      ticketType: 'Incident',
      department: 'IT Support',
      assignee: 'S. Chirwa',
      status: 'closed',
      notes: 'Resolved: mail was quarantined; whitelist user domain and retry.',
      createdAt: hoursAgo(30),
    },
  ];
};

const UserSlaPage = () => {
  const currentUser = typeof window !== 'undefined'
    ? (localStorage.getItem('currentUserName') || 'Guest User')
    : 'Guest User';

  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);

  const slaSettings = useMemo(() => {
    try {
      const raw = localStorage.getItem('slaSettings');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? { ...DEFAULT_SLA, ...parsed } : DEFAULT_SLA;
    } catch (e) {
      return DEFAULT_SLA;
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tickets');
      const parsed = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(parsed) ? parsed : [];

      // If there's no data yet, seed a few mock tickets so the SLA table preview looks real.
      if (arr.length === 0) {
        const seeded = buildMockTicketsFor(currentUser);
        localStorage.setItem('tickets', JSON.stringify(seeded));
        setTickets(seeded);
        return;
      }

      // If there are tickets but none for this user yet, add a few demo tickets for them
      // (helps when demo data exists for other users/roles).
      const hasMineAlready = arr.some(t => t && t.owner === currentUser);
      if (!hasMineAlready) {
        const seeded = [...arr, ...buildMockTicketsFor(currentUser)];
        localStorage.setItem('tickets', JSON.stringify(seeded));
        setTickets(seeded);
        return;
      }

      setTickets(arr);
    } catch (e) {
      setTickets([]);
    }
  }, []);

  const myTickets = useMemo(() => {
    return (tickets || []).filter(t => t && t.owner === currentUser);
  }, [tickets, currentUser]);

  const computeSla = (t) => {
    const type = t?.ticketType || 'Request';
    const limitHrs = Number(slaSettings?.[type] ?? DEFAULT_SLA[type] ?? 48);
    const created = t?.createdAt ? new Date(t.createdAt).getTime() : NaN;
    if (!Number.isFinite(created)) return { label: 'Unknown', cls: 'unknown', limitHrs, remainingHrs: null, breached: false };

    // treat Done/Closed as OK (we’re not tracking resolution time yet)
    const closed = ['closed', 'done'].includes(String(t?.status || '').toLowerCase());
    if (closed) return { label: 'Met', cls: 'done', limitHrs, remainingHrs: null, breached: false };

    const elapsedHrs = (Date.now() - created) / (1000 * 60 * 60);
    const remainingHrs = limitHrs - elapsedHrs;
    const breached = remainingHrs < 0;

    if (breached) return { label: `Breached (${Math.ceil(Math.abs(remainingHrs))}h over)`, cls: 'overdue', limitHrs, remainingHrs, breached: true };
    return { label: `On track (${Math.floor(remainingHrs)}h left)`, cls: 'in-process', limitHrs, remainingHrs, breached: false };
  };

  const slaSummary = useMemo(() => {
    const rows = myTickets.map(t => ({ t, sla: computeSla(t) }));
    const tracked = rows.filter(r => r.sla && r.sla.label !== 'Unknown');
    const total = tracked.length;
    const breached = tracked.filter(r => r.sla.breached).length;

    // Closed tickets count as met and should not be considered breaches.
    const met = tracked.filter(r => String(r.t?.status || '').toLowerCase() === 'closed' || String(r.t?.status || '').toLowerCase() === 'done').length;
    const onTrack = Math.max(0, total - breached);
    const score = total > 0 ? (onTrack / total) : 1;

    // Rating rules:
    // - Excellent: 90%+ tickets on track
    // - On Target: 70% - 89%
    // - Poor: < 70%
    let rating = 'Excellent';
    let cls = 'excellent';
    if (score < 0.7) { rating = 'Poor'; cls = 'poor'; }
    else if (score < 0.9) { rating = 'On Target'; cls = 'on-target'; }

    return { total, breached, met, onTrack, score, rating, cls };
  }, [myTickets, slaSettings]);

  return (
    <div className="admin-page user-page user-sla-page">
      <Sidebar />
      <main className="admin-main">
        <TopNav
          initials={currentUser.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          userName={currentUser}
          pageTitle="My SLA"
        />

        <section className="panel user-panel">
          <div className="user-tickets-header" style={{ alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>My SLA</h2>
            <div className="muted" style={{ fontWeight: 700 }}>Tickets: {myTickets.length}</div>
          </div>

          <div className="sla-rating-row">
            <div className="sla-rating-card">
              <div className="sla-rating-top">
                <div>
                  <div className="sla-rating-label">SLA rating</div>
                  <div className="sla-rating-value">
                    <span className={`sla-p ${slaSummary.cls}`}>
                      <span className={`sla-medal ${slaSummary.cls}`} aria-hidden="true" />
                      <span>{slaSummary.rating}</span>
                      <span className="sr-only">medal</span>
                    </span>
                  </div>
                </div>
                <div className="sla-rating-score">
                  {Math.round(slaSummary.score * 100)}%
                </div>
              </div>

              <div className="sla-rating-meta">
                <div><span className="muted">On track</span><strong>{slaSummary.onTrack}</strong></div>
                <div><span className="muted">Breached</span><strong>{slaSummary.breached}</strong></div>
                <div><span className="muted">Met</span><strong>{slaSummary.met}</strong></div>
              </div>
            </div>
          </div>

          <div className="um-sla-table-wrap">
            <div className="table-wrap sla-table-wrap">
              <table className="user-tickets-table sla-table">
                <thead>
                  <tr>
                    <th className="id-col">ID</th>
                    <th>Subject</th>
                    <th className="type-col">Type</th>
                    <th className="sla-col">SLA</th>
                    <th className="actions-col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myTickets.map(t => {
                    const sla = computeSla(t);
                    return (
                      <tr
                        key={t.id}
                        className="ticket-row"
                      >
                        <td className="id-col">#{t.id}</td>
                        <td className="subject-col">{t.subject || '-'}</td>
                        <td className="type-col">{t.ticketType || '-'}</td>
                        <td className="sla-col">
                          <span className={`chip ${sla.cls}`}>{sla.label}</span>
                        </td>
                        <td className="actions-col">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setSelected(t)}
                            aria-label={`View ticket ${t.id}`}
                            title="View all"
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

                  {myTickets.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center' }} className="muted">No tickets found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {selected && (
          <div className="um-modal-overlay um-blur-overlay">
            <div className="um-modal">
              <h3>Ticket details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><strong>ID</strong><div className="muted">#{selected.id}</div></div>
                <div><strong>Status</strong><div className="muted">{selected.status || '-'}</div></div>
                <div><strong>Subject</strong><div className="muted">{selected.subject || '-'}</div></div>
                <div><strong>Type</strong><div className="muted">{selected.ticketType || '-'}</div></div>
                <div><strong>Department</strong><div className="muted">{selected.department || '-'}</div></div>
                <div><strong>Assignee</strong><div className="muted">{selected.assignee || '-'}</div></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Notes</strong>
                  <div className="muted" style={{ marginTop: 6 }}>{selected.notes || 'No notes.'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Created</strong>
                  <div className="muted" style={{ marginTop: 6 }}>{selected.createdAt || '-'}</div>
                </div>
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

export default UserSlaPage;
