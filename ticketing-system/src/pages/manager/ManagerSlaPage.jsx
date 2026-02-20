import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PageHeader from '../../components/PageHeader/PageHeader';
import SlaService from '../../services/sla.service';
import TicketService from '../../services/ticket.service';
import UserService from '../../services/user.service';
import { useAuth } from '../../context/AuthContext';
import '../admin.css';
import '../user/UserSlaPage/UserSlaPage.css';
import './ManagerDashboard.css';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const getMedal = (score) => {
  if (score >= 0.9) return { label: 'Gold',   cls: 'gold',   color: '#f59e0b', desc: 'Excellent performance' };
  if (score >= 0.7) return { label: 'Silver', cls: 'silver', color: '#94a3b8', desc: 'On target' };
  if (score >= 0.5) return { label: 'Bronze', cls: 'bronze', color: '#c2700a', desc: 'Needs improvement' };
  return               { label: 'Fail',   cls: 'fail',   color: '#ef4444', desc: 'Below standard' };
};

const gradeColor = (g) => {
  switch ((g || '').toUpperCase()) {
    case 'A': return '#10b981';
    case 'B': return '#3b82f6';
    case 'C': return '#f59e0b';
    default:  return '#ef4444';
  }
};

const officerKey = (r) => {
  const a = r?.assigned_to;
  if (!a) return null;
  return a.id ? String(a.id) : `${a.first_name}_${a.last_name}`.toLowerCase();
};

const officerLabel = (r) => {
  const a = r?.assigned_to;
  if (!a) return '—';
  return `${a.first_name || ''} ${a.last_name || ''}`.trim() || '—';
};

/* ── Component ───────────────────────────────────────────────────────────── */
const ManagerSlaPage = ({ bypassDeptFilter = false }) => {
  const { user } = useAuth();

  /* Tab */
  const [activeTab, setActiveTab] = useState('department');

  /* Data */
  const [slaData,     setSlaData]     = useState([]);
  const [allTickets,  setAllTickets]  = useState([]);
  const [slaLoading,  setSlaLoading]  = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [loadErr,     setLoadErr]     = useState('');
  const [managerDept, setManagerDept] = useState('');
  const [deptLoading, setDeptLoading] = useState(!bypassDeptFilter);

  /* Filter / modal */
  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState(null);

  /* ── Loaders ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (bypassDeptFilter || !user?.id) { setDeptLoading(false); return; }
    setDeptLoading(true);
    UserService.getUserById(user.id)
      .then(r => {
        const d = r?.data?.data || r?.data || {};
        const dept = d?.departments?.department || d?.department || '';
        setManagerDept(String(dept).trim().toUpperCase());
      })
      .catch(() => {})
      .finally(() => setDeptLoading(false));
  }, [user?.id, bypassDeptFilter]);

  const loadSla = useCallback(() => {
    setSlaLoading(true);
    setLoadErr('');
    SlaService.getAllSla()
      .then(r => {
        const d = r?.data;
        setSlaData(Array.isArray(d?.data) ? d.data : []);
      })
      .catch(() => setLoadErr('Failed to load SLA data. Please try again.'))
      .finally(() => setSlaLoading(false));
  }, []);

  const loadTickets = useCallback(() => {
    setTicketsLoading(true);
    TicketService.getAllTickets({ limit: 200 })
      .then(r => {
        const all = r?.data?.data?.tickets || [];
        setAllTickets(Array.isArray(all) ? all : []);
      })
      .catch(() => {})
      .finally(() => setTicketsLoading(false));
  }, []);

  useEffect(() => { loadSla(); loadTickets(); }, [loadSla, loadTickets]);

  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

  const isLoading = slaLoading || ticketsLoading || deptLoading;

  /* ── Filtered SLA sets ────────────────────────────────────────────────── */
  // Use ticket_department from the backend response (avoids mismatches from
  // a separate allTickets fetch with pagination limits).
  const deptSlaRecords = useMemo(() =>
    bypassDeptFilter
      ? slaData
      : managerDept
        ? slaData.filter(r =>
            String(r.ticket_department || '').toUpperCase() === managerDept
          )
        : slaData,
    [slaData, managerDept, bypassDeptFilter]
  );

  /* Build the set of ticket IDs where the logged-in manager is the assigned officer.
     Ticket objects include assignment.officer.id / .email which the SLA endpoint does NOT return. */
  const myTicketIds = useMemo(() => {
    const ids = new Set();
    allTickets.forEach(t => {
      const officer = t.assignment?.officer;
      if (!officer) return;
      if (user?.id    && String(officer.id    || '') === String(user.id))                                ids.add(t.id);
      else if (user?.email && String(officer.email || '').toLowerCase() === String(user.email).toLowerCase()) ids.add(t.id);
    });
    return ids;
  }, [allTickets, user]);

  const mySlaRecords = useMemo(() =>
    slaData.filter(r => myTicketIds.has(r.ticket_id)),
    [slaData, myTicketIds]
  );

  const viewRecords = activeTab === 'department' ? deptSlaRecords : mySlaRecords;

  /* ── Per-officer overall SLA map (used for department tab extra column) ─ */
  const officerSlaMap = useMemo(() => {
    const map = {}; // key → { met, total }
    deptSlaRecords.forEach(r => {
      const k = officerKey(r);
      if (!k) return;
      if (!map[k]) map[k] = { met: 0, total: 0 };
      map[k].total++;
      if (r.actual_sla != null && r.expected_sla != null && r.actual_sla <= r.expected_sla) map[k].met++;
    });
    return map;
  }, [deptSlaRecords]);

  /* ── Derived stats for performance card ─────────────────────────────── */
  const stats = useMemo(() => {
    if (!viewRecords.length) return { total: 0, met: 0, breached: 0, score: 1 };
    const total    = viewRecords.length;
    const met      = viewRecords.filter(r => r.actual_sla != null && r.expected_sla != null && r.actual_sla <= r.expected_sla).length;
    const breached = total - met;
    const score    = total > 0 ? met / total : 1;
    return { total, met, breached, score };
  }, [viewRecords]);

  const medal = getMedal(stats.score);
  const pct   = Math.round(stats.score * 100);

  /* ── Search filter ───────────────────────────────────────────────────── */
  const q        = query.trim().toLowerCase();
  const filtered = viewRecords.filter(r => {
    if (!q) return true;
    return (
      (r.ticket_id || '').toLowerCase().includes(q) ||
      officerLabel(r).toLowerCase().includes(q) ||
      (r.type  || '').toLowerCase().includes(q) ||
      (r.grade || '').toLowerCase().includes(q)
    );
  });

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="user-sla-page">
      <PageHeader
        title="SLA"
        subtitle={
          activeTab === 'department'
            ? bypassDeptFilter
              ? 'Organisation-wide SLA compliance overview'
              : (managerDept ? `Department: ${managerDept} — SLA compliance overview` : 'All department SLA records')
            : 'Your personal SLA compliance and performance rating'
        }
      />

      {/* ── Tab toggle ─────────────────────────────────────────────────── */}
      <div className="mgr-tabs" style={{ marginBottom: 4 }}>
        <button
          className={`mgr-tab${activeTab === 'department' ? ' active' : ''}`}
          onClick={() => { setActiveTab('department'); setQuery(''); setSelected(null); }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {bypassDeptFilter ? 'All Records' : 'Department View'}
          {!bypassDeptFilter && !deptLoading && managerDept && (
            <span className="mgr-tab-badge">{managerDept}</span>
          )}
          <span style={{ marginLeft: 6, background: activeTab === 'department' ? '#3b82f6' : '#e5e7eb', color: activeTab === 'department' ? '#fff' : '#64748b', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
            {deptSlaRecords.length}
          </span>
        </button>
        <button
          className={`mgr-tab${activeTab === 'mine' ? ' active' : ''}`}
          onClick={() => { setActiveTab('mine'); setQuery(''); setSelected(null); }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          My SLA
          <span style={{ marginLeft: 6, background: activeTab === 'mine' ? '#3b82f6' : '#e5e7eb', color: activeTab === 'mine' ? '#fff' : '#64748b', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
            {mySlaRecords.length}
          </span>
        </button>
      </div>

      <section className="panel user-panel">

        {/* ── Performance Card ─────────────────────────────────────────── */}
        <div className="sla-perf-card">
          <div className="sla-perf-header">
            <div className="sla-perf-left">
              <span className="sla-perf-section-label">
                {activeTab === 'department' ? (bypassDeptFilter ? 'Overall Performance' : 'Department Performance') : 'My Performance'}
              </span>
              <span className={`sla-badge ${medal.cls}`}>
                <span className={`sla-medal ${medal.cls}`} aria-hidden="true" />
                {medal.label}
                <span className="sla-badge-desc">{medal.desc}</span>
              </span>
            </div>
            <div className="sla-perf-right">
              <span className="sla-perf-score" style={{ color: medal.color }}>{pct}%</span>
              <span className="sla-perf-score-label">compliance rate</span>
            </div>
          </div>

          <div className="sla-perf-body">
            <div className="sla-progress-wrap">
              <div className="sla-progress-track">
                <div
                  className="sla-progress-fill"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${medal.color}88, ${medal.color})` }}
                />
              </div>
              <div className="sla-progress-ticks">
                <span className="sla-progress-tick">0%</span>
                <span className="sla-progress-tick">50%  Fail</span>
                <span className="sla-progress-tick">70%  Bronze</span>
                <span className="sla-progress-tick">90%  Gold</span>
              </div>
            </div>

            <div className="sla-mini-stats">
              <div className="sla-mini-stat">
                <span className="sla-mini-stat-label">Total</span>
                <span className="sla-mini-stat-value c-blue">{isLoading ? '' : stats.total}</span>
              </div>
              <div className="sla-mini-stat">
                <span className="sla-mini-stat-label">SLA Met</span>
                <span className="sla-mini-stat-value c-green">{isLoading ? '' : stats.met}</span>
              </div>
              <div className="sla-mini-stat">
                <span className="sla-mini-stat-label">Breached</span>
                <span className="sla-mini-stat-value c-red">{isLoading ? '' : stats.breached}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Error bar ────────────────────────────────────────────────── */}
        {loadErr && (
          <div className="sla-error-bar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {loadErr}
            <button onClick={() => { loadSla(); loadTickets(); }}>Retry</button>
          </div>
        )}

        {/* Department warning */}
        {activeTab === 'department' && !bypassDeptFilter && !deptLoading && !managerDept && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 18px', color: '#92400e', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="#d97706" strokeWidth="1.8"/></svg>
            Could not determine your department. Showing all SLA records.
          </div>
        )}

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="sla-toolbar">
          <div className="sla-search-wrap">
            <span className="sla-search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#94a3b8" strokeWidth="1.8"/>
                <path d="M16.5 16.5l3.5 3.5" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </span>
            <input
              className="sla-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={activeTab === 'department' ? 'Search by ID, officer, type or grade…' : 'Search by ID, officer or type…'}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, lineHeight: 1 }}
                aria-label="Clear search"
              >&times;</button>
            )}
          </div>
          {!isLoading && (
            <span className="sla-record-count">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="um-sla-table-wrap">
          <div className="sla-table-outer">
            <div className="sla-table-scroll">
              <table className="sla-table">
                <thead>
                  <tr>
                    <th className="id-col">Ticket ID</th>
                    <th>Assigned Officer</th>
                    <th className="type-col">Type</th>
                    <th className="sla-col">Expected</th>
                    <th className="sla-col">Actual</th>
                    <th className="sla-col">Status</th>
                    <th className="actions-col">Grade</th>
                    {activeTab === 'department' && (
                      <th className="sla-col" style={{ minWidth: 110, whiteSpace: 'nowrap' }}>
                        Overall SLA
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && [1,2,3,4,5].map(i => (
                    <tr key={i} className="sla-skeleton-row">
                      <td colSpan={activeTab === 'department' ? 8 : 7}><div /></td>
                    </tr>
                  ))}

                  {!isLoading && filtered.map((r, i) => {
                    const met    = r.actual_sla != null && r.expected_sla != null && r.actual_sla <= r.expected_sla;
                    const gColor = gradeColor(r.grade);

                    /* Overall SLA for this record's officer across department */
                    let officerOverall = null;
                    if (activeTab === 'department') {
                      const k   = officerKey(r);
                      const ost = k ? officerSlaMap[k] : null;
                      if (ost && ost.total > 0) {
                        const oScore = ost.met / ost.total;
                        const oMedal = getMedal(oScore);
                        officerOverall = { pct: Math.round(oScore * 100), met: ost.met, total: ost.total, medal: oMedal };
                      }
                    }

                    return (
                      <tr key={r.ticket_id || i} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                        <td className="id-col">
                          <span className="sla-id-chip" title={r.ticket_id}>{(r.ticket_id || '').slice(0, 12)}</span>
                        </td>
                        <td>{officerLabel(r)}</td>
                        <td className="type-col">{r.type || ''}</td>
                        <td className="sla-col">{r.expected_sla != null ? `${r.expected_sla}h` : '—'}</td>
                        <td className="sla-col">{r.actual_sla    != null ? `${r.actual_sla}h`    : '—'}</td>
                        <td className="sla-col">
                          <span className={`sla-chip ${met ? 'met' : 'breached'}`}>
                            {met ? 'Met' : 'Breached'}
                          </span>
                        </td>
                        <td className="actions-col">
                          {r.grade
                            ? <span className="sla-grade-chip" style={{ background: gColor + '18', color: gColor }}>{r.grade}</span>
                            : '—'}
                        </td>
                        {activeTab === 'department' && (
                          <td className="sla-col">
                            {officerOverall ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', minWidth: 40 }}>
                                  <div style={{ height: '100%', width: `${officerOverall.pct}%`, background: officerOverall.medal.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: officerOverall.medal.color, minWidth: 36, textAlign: 'right' }}>
                                  {officerOverall.pct}%
                                </span>
                              </div>
                            ) : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={activeTab === 'department' ? 8 : 7}>
                        <div className="sla-empty">
                          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="5" width="18" height="14" rx="3" stroke="#cbd5e1" strokeWidth="1.4"/>
                            <path d="M3 9h18" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                          <p className="sla-empty-text">
                            {q
                              ? 'No SLA records match your search.'
                              : activeTab === 'department'
                                ? bypassDeptFilter
                                  ? 'No SLA records found.'
                                  : (managerDept ? `No SLA records found for ${managerDept} department.` : 'No department SLA records found.')
                                : 'No personal SLA records found.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      {selected && createPortal(
        <div className="sla-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="sla-modal">
            {(() => {
              const met    = selected.actual_sla != null && selected.expected_sla != null && selected.actual_sla <= selected.expected_sla;
              const gColor = gradeColor(selected.grade);

              /* Officer overall SLA for department tab */
              let officerOverall = null;
              if (activeTab === 'department') {
                const k   = officerKey(selected);
                const ost = k ? officerSlaMap[k] : null;
                if (ost && ost.total > 0) {
                  const oScore = ost.met / ost.total;
                  const oMedal = getMedal(oScore);
                  officerOverall = { pct: Math.round(oScore * 100), met: ost.met, total: ost.total, medal: oMedal };
                }
              }

              return (
                <>
                  {/* Header */}
                  <div className="sla-modal-header">
                    <div className="sla-modal-header-top">
                      <span className="sla-modal-id">{selected.ticket_id}</span>
                      <button className="sla-modal-close" onClick={() => setSelected(null)} />
                    </div>
                    <div className="sla-modal-chips">
                      <span className={`sla-chip ${met ? 'met' : 'breached'}`}>
                        {met ? 'SLA Met' : 'SLA Breached'}
                      </span>
                      {selected.grade && (
                        <span className="sla-grade-chip" style={{ background: gColor + '18', color: gColor }}>
                          Grade: {selected.grade}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="sla-modal-body">
                    <div className="sla-modal-field">
                      <span className="sla-modal-field-label">Assigned Officer</span>
                      <span className="sla-modal-field-value">{officerLabel(selected)}</span>
                    </div>
                    <div className="sla-modal-field">
                      <span className="sla-modal-field-label">Type</span>
                      <span className="sla-modal-field-value">{selected.type || '—'}</span>
                    </div>
                    <div className="sla-modal-field">
                      <span className="sla-modal-field-label">Expected SLA</span>
                      <span className="sla-modal-field-value large" style={{ color: '#3b82f6' }}>
                        {selected.expected_sla != null ? `${selected.expected_sla}h` : '—'}
                      </span>
                    </div>
                    <div className="sla-modal-field">
                      <span className="sla-modal-field-label">Actual SLA</span>
                      <span className="sla-modal-field-value large" style={{ color: met ? '#10b981' : '#ef4444' }}>
                        {selected.actual_sla != null ? `${selected.actual_sla}h` : '—'}
                      </span>
                    </div>

                    {/* Officer overall SLA block (department tab only) */}
                    {officerOverall && (
                      <div style={{ marginTop: 14, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                          Officer Overall SLA ({managerDept})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${officerOverall.pct}%`, background: officerOverall.medal.color, borderRadius: 6 }} />
                          </div>
                          <span style={{ fontSize: 18, fontWeight: 800, color: officerOverall.medal.color, minWidth: 44, textAlign: 'right' }}>
                            {officerOverall.pct}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            <strong style={{ color: '#10b981' }}>{officerOverall.met}</strong> met
                            &nbsp;/&nbsp;
                            <strong style={{ color: '#374151' }}>{officerOverall.total}</strong> total
                          </span>
                          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: officerOverall.medal.color }}>
                            {officerOverall.medal.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="sla-modal-footer">
                    <button className="sla-modal-close-btn" onClick={() => setSelected(null)}>Close</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManagerSlaPage;
