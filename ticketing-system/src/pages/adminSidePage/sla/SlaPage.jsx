import React, { useEffect, useState } from 'react';
import './SlaPage.css';

const DEFAULT_SLA_SETTINGS = { Incident: 24, Request: 48, Bug: 72 };

const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = (rng, list) => list[Math.floor(rng() * list.length)];

const generateSampleTickets = (count = 48) => {
  const rng = mulberry32(20260216);

  const departments = ['IT', 'Finance', 'HR', 'Operations', 'Procurement'];
  const owners = ['Maya Patel', 'Jonathan Kim', 'Alice Mbatha', 'Priya Singh', 'Sam Lee', 'Alex Doe'];
  const assignees = ['Alice Mbatha', 'Bob Stone', 'Charlie', 'Maya Patel', 'Jonathan Kim'];
  const requestedBy = ['Sarah L.', 'Carlos M.', 'QA Team', 'External', 'Finance Bot', 'Amir K.', 'Nadia P.'];
  const ticketTypes = ['Incident', 'Request', 'Bug'];
  const subjects = {
    Incident: ['Cannot login', 'System outage', 'VPN not connecting', 'Email down', 'Account locked'],
    Request: ['Invoice request', 'New laptop request', 'Access request', 'Payroll update', 'Software install'],
    Bug: ['UI bug on dashboard', 'Export CSV not working', 'Sorting issue', 'Broken link', 'Form validation bug'],
  };

  const tickets = [];
  for (let i = 0; i < count; i += 1) {
    const ticketType = pick(rng, ticketTypes);
    const slaHours = DEFAULT_SLA_SETTINGS[ticketType] ?? 24;

    // Bias elapsed time so reports show a healthy mix of met / at-risk / breached.
    // - 15% overdue
    // - 15% breached (elapsed > SLA)
    // - 20% at-risk (remaining within 25% of SLA)
    // - rest comfortably within SLA
    const roll = rng();
    let status = pick(rng, ['open', 'pending', 'open', 'pending', 'closed']);
    let elapsedHours;

    if (roll < 0.15) {
      status = 'overdue';
      elapsedHours = slaHours * (1.1 + rng() * 1.2);
    } else if (roll < 0.30) {
      status = pick(rng, ['open', 'pending']);
      elapsedHours = slaHours * (1.05 + rng() * 0.8);
    } else if (roll < 0.50) {
      status = pick(rng, ['open', 'pending']);
      elapsedHours = Math.max(1, slaHours * (0.78 + rng() * 0.20));
    } else {
      elapsedHours = Math.max(1, slaHours * (0.10 + rng() * 0.60));
    }

    if (status === 'closed') {
      // closed tickets should usually be within SLA
      elapsedHours = Math.max(1, slaHours * (0.10 + rng() * 0.70));
    }

    const createdAt = new Date(Date.now() - elapsedHours * 60 * 60 * 1000).toISOString();
    const id = `TKT-${String(1000 + i)}`;

    tickets.push({
      id,
      subject: pick(rng, subjects[ticketType] || subjects.Incident),
      status,
      owner: pick(rng, owners),
      requestedBy: pick(rng, requestedBy),
      assignee: pick(rng, assignees),
      ticketType,
      department: pick(rng, departments),
      createdAt,
    });
  }

  return tickets;
};

const SlaPage = () => {
  // sample users (replace with real data source when available)
  // added `avgResolutionHours` so we can compute SLA status per user
  const users = [
    { id: 1, name: 'Maya Patel', department: 'IT', ticketType: 'Incident', avgResolutionHours: 18, requestedBy: 'Sarah L.' },
    { id: 2, name: 'Jonathan Kim', department: 'Finance', ticketType: 'Request', avgResolutionHours: 52, requestedBy: 'Carlos M.' },
    { id: 3, name: 'Alice Mbatha', department: 'HR', ticketType: 'Incident', avgResolutionHours: 20, requestedBy: 'Nadia P.' },
    { id: 4, name: 'John Doe', department: 'IT', ticketType: 'Bug', avgResolutionHours: 80, requestedBy: 'External' },
    { id: 5, name: 'Priya Singh', department: 'Finance', ticketType: 'Incident', avgResolutionHours: 26, requestedBy: 'Amir K.' },
  ];

  const [deptFilter, setDeptFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [slaSettings, setSlaSettings] = useState(DEFAULT_SLA_SETTINGS);
  const [slaModalInitial, setSlaModalInitial] = useState({ type: '', hours: 24 });
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'report'

  // pagination
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(10);

  // tickets source: try localStorage, fallback to demo
  const [tickets, setTickets] = useState(() => {
    try {
      const raw = localStorage.getItem('tickets');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return generateSampleTickets(56);
  });

  const departments = ['All', ...Array.from(new Set(tickets.map((t) => t.department).filter(Boolean)))];

  const filteredUsers = users.filter((u) => {
    const matchesDept = deptFilter === 'All' || u.department === deptFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || u.name.toLowerCase().includes(q) || u.ticketType.toLowerCase().includes(q);
    return matchesDept && matchesQuery;
  });


  const SLAConfigModal = ({ open, onClose, initialType = '', initialHours = 24 }) => {
    const types = Object.keys(slaSettings);
    const [type, setType] = useState(initialType || types[0] || '');
    const [hours, setHours] = useState(initialHours || 24);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
      // when modal opens or initial values change, set the inputs
      if (open) {
        setType(initialType || types[0] || '');
        setHours(initialHours || slaSettings[initialType] || 24);
      }
    }, [open, initialType]);

    useEffect(() => {
      if (type && slaSettings[type] != null) setHours(slaSettings[type]);
    }, [type]);

    const save = () => {
      if (!type || !type.trim()) return;
      setSlaSettings((prev) => ({ ...prev, [type.trim()]: Number(hours) }));
      onClose();
    };

    if (!open) return null;

    return (
      <div className="um-modal-overlay" role="dialog" aria-modal="true">
        <div className="um-modal">
          <div className="um-modal-header">
            <h3>Configure SLA</h3>
            <button className="close-btn" aria-label="Close configuration" onClick={onClose}>×</button>
          </div>

          <div className="um-modal-body">
            <div className="sla-form-row">
              <label>Ticket type</label>
              {/* allow typing new ticket types but offer existing ones as suggestions */}
              <input
                list="ticket-types"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Type or select ticket type"
              />
              <datalist id="ticket-types">
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </datalist>
            </div>

            <div className="sla-form-row">
              <label>SLA (hours)</label>
              <input type="number" min={1} value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>

            <div className="sla-form-actions">
              <button className="btn-primary" onClick={save}>Save</button>
              <button className="btn-muted" onClick={onClose}>Cancel</button>
              <button
                className="btn-danger"
                onClick={() => setConfirmDelete(true)}
                title="Delete this ticket type SLA"
              >
                Delete
              </button>
            </div>

            {confirmDelete && (
              <div className="confirm-delete">
                <div>Are you sure you want to delete the SLA for <strong>{type}</strong>? This will remove the setting for that ticket type.</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button className="btn-muted" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  <button className="btn-danger" onClick={() => {
                    // remove the selected type from settings
                    setSlaSettings(prev => {
                      const copy = { ...prev };
                      delete copy[type];
                      return copy;
                    });
                    setConfirmDelete(false);
                    onClose();
                  }}>Yes, delete</button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <strong>Current settings</strong>
              <ul className="sla-current-list">
                {Object.entries(slaSettings).map(([t, h]) => (
                  <li key={t}>{t}: {h} hours</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // helper to compute hours since created
  const hrsSince = (iso) => {
    try { const then = new Date(iso); return (Date.now() - then.getTime()) / (1000 * 60 * 60); } catch (e) { return 0; }
  };

  // compute report data from tickets and slaSettings
  const enriched = tickets.map(t => {
    const sla = slaSettings[t.ticketType] ?? 24;
    const elapsed = Math.round(hrsSince(t.createdAt) * 10) / 10;
    const remaining = Math.round((sla - elapsed) * 10) / 10;
    const breached = (elapsed > sla) || t.status === 'overdue';
    const atRisk = !breached && remaining <= Math.max(1, sla * 0.25) && t.status !== 'closed';
    return { ...t, sla, elapsed, remaining, breached, atRisk };
  });

  const byDept = enriched.reduce((acc, t) => { acc[t.department] = (acc[t.department] || 0) + 1; return acc; }, {});
  const total = enriched.length;
  const breachedCount = enriched.filter(t => t.breached).length;
  const atRiskCount = enriched.filter(t => t.atRisk).length;

  const visibleTickets = deptFilter === 'All' ? enriched : enriched.filter(t => t.department === deptFilter);

  // filter tickets by department + search query for the SLA table view
  const filteredTickets = visibleTickets.filter((t) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q ||
      (t.subject && t.subject.toLowerCase().includes(q)) ||
      (t.owner && t.owner.toLowerCase().includes(q)) ||
      (t.ticketType && t.ticketType.toLowerCase().includes(q)) ||
      (t.assignee && t.assignee.toLowerCase().includes(q));
    return matchesQuery;
  });

  // reset pagination when filters/view change
  useEffect(() => {
    setTablePage(1);
    setReportPage(1);
  }, [deptFilter, query, viewMode]);

  const paginate = (rows, page, pageSize) => {
    const safeSize = Math.max(1, Number(pageSize) || 10);
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / safeSize));
    const safePage = Math.min(Math.max(1, Number(page) || 1), pages);
    const start = (safePage - 1) * safeSize;
    const end = start + safeSize;
    return {
      page: safePage,
      pageSize: safeSize,
      total,
      pages,
      start,
      end: Math.min(end, total),
      slice: rows.slice(start, end),
    };
  };

  const reportTickets = [...visibleTickets]
    .filter((t) => t.breached || t.atRisk)
    .sort((a, b) => (b.breached ? 1 : 0) - (a.breached ? 1 : 0) || (b.atRisk ? 1 : 0) - (a.atRisk ? 1 : 0));

  const tablePager = paginate(filteredTickets, tablePage, tablePageSize);
  const reportPager = paginate(reportTickets, reportPage, reportPageSize);

  // keep state pages clamped to computed page counts
  useEffect(() => {
    if (tablePage !== tablePager.page) setTablePage(tablePager.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablePager.page]);

  useEffect(() => {
    if (reportPage !== reportPager.page) setReportPage(reportPager.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportPager.page]);

  const exportCsv = (rows = visibleTickets) => {
    const exportRows = rows.map(t => ({ id: t.id, subject: t.subject, owner: t.owner, assignee: t.assignee, department: t.department, status: t.status, ticketType: t.ticketType, sla: t.sla, createdAt: t.createdAt }));
    if (exportRows.length === 0) return;
    const hdr = Object.keys(exportRows[0]).join(',') + '\n';
    const body = exportRows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const csv = hdr + body;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sla-report.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
        <section className="panel sla-panel">
          <div className="reports-actions">
            <button className={`btn-primary ${viewMode==='report' ? 'active':''}`} onClick={() => setViewMode('report')}>Report</button>
            <button className={`btn-muted ${viewMode==='table' ? 'active':''}`} onClick={() => setViewMode('table')}>SLA Table</button>
            <button className="btn-primary" onClick={() => exportCsv()}>Export CSV</button>
          </div>
          <div className="reports-top">
            {/* KPI circles moved below the controls for a cleaner header */}
          </div>
          <div className="kpi-circles" style={{marginTop:8}}>
            <button className="kpi-circle" onClick={() => { setDeptFilter('All'); setViewMode('report'); }}>
              <div className="kpi-number">{total}</div>
              <div className="kpi-label">Total tickets</div>
            </button>
            <button className="kpi-circle warn" onClick={() => { setDeptFilter('All'); setViewMode('report'); }}>
              <div className="kpi-number">{atRiskCount}</div>
              <div className="kpi-label">At risk</div>
            </button>
            <button className="kpi-circle danger" onClick={() => { setDeptFilter('All'); setViewMode('report'); }}>
              <div className="kpi-number">{breachedCount}</div>
              <div className="kpi-label">Breached</div>
            </button>
            <button className="kpi-circle" onClick={() => { setDeptFilter('All'); setViewMode('report'); }}>
              <div className="kpi-number">{Math.round((Object.values(slaSettings).reduce((a,b)=>a+b,0) / Object.keys(slaSettings).length) || 0)}</div>
              <div className="kpi-label">Avg SLA (hrs)</div>
            </button>
          </div>

          <div className="sla-controls">
            <div>
              <label><strong>Department</strong></label>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label><strong>Search</strong></label>
              <input placeholder="Search users or ticket type" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            {viewMode === 'table' && (
              <div className="sla-actions">
                <button className="btn-primary" onClick={() => {
                  const first = Object.keys(slaSettings)[0] || '';
                  setSlaModalInitial({ type: first, hours: slaSettings[first] ?? 24 });
                  setSlaModalOpen(true);
                }}>Configure SLA</button>
                <button className="btn-primary add-new" onClick={() => {
                  setSlaModalInitial({ type: '', hours: 24 });
                  setSlaModalOpen(true);
                }}>＋ Add New</button>
              </div>
            )}
          </div>

          {viewMode === 'table' ? (
            <div className="table-wrap sla-table-wrap">
              <table className="user-tickets-table">
                <thead>
                  <tr>
                    <th className="id-col">ID</th>
                    <th>Owner</th>
                    <th>Department</th>
                    <th>Ticket Type</th>
                    <th>Requested By</th>
                    <th>SLA (hours)</th>
                    <th>SLA Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tablePager.slice.map((t) => {
                    const slaMet = !t.breached;
                    return (
                      <tr key={t.id} className={t.breached? 'row-breached': t.atRisk? 'row-atrisk':''}>
                        <td>{t.id}</td>
                        <td>{t.owner}</td>
                        <td>{t.department}</td>
                        <td>{t.ticketType}</td>
                        <td>{t.requestedBy ?? '-'}</td>
                        <td>{t.sla ?? '-'}</td>
                        <td className="sla-status" aria-label={slaMet ? 'SLA met' : 'SLA breached'}>
                          <span className={`sla-dot ${slaMet ? 'ok' : 'breach'}`} aria-hidden="true" />
                          <span className="sla-text">{slaMet ? 'Met' : 'Breached'}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center' }}>No tickets match the filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {filteredTickets.length > 0 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Showing {tablePager.start + 1}–{tablePager.end} of {tablePager.total}
                  </div>

                  <div className="pagination-controls">
                    <label className="pagination-size">
                      Rows
                      <select value={tablePageSize} onChange={(e) => setTablePageSize(Number(e.target.value) || 10)}>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      className="btn-muted"
                      disabled={tablePager.page <= 1}
                      onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <div className="pagination-page">Page {tablePager.page} of {tablePager.pages}</div>
                    <button
                      type="button"
                      className="btn-muted"
                      disabled={tablePager.page >= tablePager.pages}
                      onClick={() => setTablePage((p) => Math.min(tablePager.pages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="reports-table card">
              <h3 style={{marginTop:12}}>Tickets At Risk & Breached</h3>
              <div style={{display:'flex', justifyContent:'flex-end', marginBottom:8}}>
                <button className="btn-primary small" onClick={() => exportCsv()}>Export CSV</button>
              </div>
              <div className="table-wrap">
                <table className="user-tickets-table">
                <thead>
                  <tr>
                    <th className="id-col">ID</th>
                    <th>Owner</th>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Dept</th>
                    <th>SLA hrs</th>
                    <th>Elapsed</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportPager.slice.map(t => (
                      <tr key={t.id} className={t.breached? 'row-breached': t.atRisk? 'row-atrisk':''}>
                        <td>{t.id}</td>
                        <td>{t.owner}</td>
                        <td>{t.subject}</td>
                        <td>{t.ticketType}</td>
                        <td>{t.department}</td>
                        <td>{t.sla}</td>
                        <td>{t.elapsed}</td>
                        <td>{t.remaining < 0 ? 0 : t.remaining}</td>
                        <td><span className={`status ${t.breached? 'breached': t.atRisk? 'atrisk': t.status}`}>{t.breached? 'breached' : t.atRisk? 'at-risk' : t.status}</span></td>
                      </tr>
                  ))}

                  {reportTickets.length > 0 ? null : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center' }}>No at-risk or breached tickets for the current filters.</td>
                    </tr>
                  )}
                </tbody>
                </table>
              </div>

              {reportTickets.length > 0 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Showing {reportPager.start + 1}–{reportPager.end} of {reportPager.total}
                  </div>

                  <div className="pagination-controls">
                    <label className="pagination-size">
                      Rows
                      <select value={reportPageSize} onChange={(e) => setReportPageSize(Number(e.target.value) || 10)}>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      className="btn-muted"
                      disabled={reportPager.page <= 1}
                      onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <div className="pagination-page">Page {reportPager.page} of {reportPager.pages}</div>
                    <button
                      type="button"
                      className="btn-muted"
                      disabled={reportPager.page >= reportPager.pages}
                      onClick={() => setReportPage((p) => Math.min(reportPager.pages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <SLAConfigModal
            open={slaModalOpen}
            onClose={() => setSlaModalOpen(false)}
            initialType={slaModalInitial.type}
            initialHours={slaModalInitial.hours}
          />
        </section>
    </>
  );
};

export default SlaPage;
