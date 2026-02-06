import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/sidebar/Sidebar';
import TopNav from '../../../components/topnav/TopNav';
import './Reports.css';

const defaultSla = { Incident: 24, Request: 48, Bug: 72 };

const sampleTickets = [
  { id: 1, subject: 'Cannot login', status: 'open', owner: 'Maya Patel', requestedBy: 'Sarah L.', assignee: 'Alice Mbatha', ticketType: 'Incident', department: 'IT', createdAt: '2026-01-20' },
  { id: 2, subject: 'Invoice request', status: 'pending', owner: 'Jonathan Kim', requestedBy: 'Carlos M.', assignee: 'Bob Stone', ticketType: 'Request', department: 'Finance', createdAt: '2026-01-19' },
  { id: 3, subject: 'System outage', status: 'overdue', owner: 'Priya Singh', requestedBy: 'External', assignee: 'Maya Patel', ticketType: 'Incident', department: 'IT', createdAt: '2026-01-18' },
  { id: 4, subject: 'UI bug on dashboard', status: 'open', owner: 'Alex Doe', requestedBy: 'QA Team', assignee: 'Charlie', ticketType: 'Bug', department: 'IT', createdAt: '2026-01-21' },
  { id: 5, subject: 'Payroll update', status: 'pending', owner: 'Sam Lee', requestedBy: 'Finance Bot', assignee: 'Bob Stone', ticketType: 'Request', department: 'Finance', createdAt: '2026-01-15' },
];

const hrsSince = (iso) => {
  try {
    const then = new Date(iso);
    const diff = Date.now() - then.getTime();
    return diff / (1000 * 60 * 60);
  } catch (e) { return 0; }
};

const Reports = () => {
  const [tickets, setTickets] = useState(sampleTickets);
  const [slaSettings, setSlaSettings] = useState(defaultSla);
  const [departmentFilter, setDepartmentFilter] = useState('All');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('slaSettings');
      if (raw) setSlaSettings(JSON.parse(raw));
    } catch (e) {}
  }, []);

  const enriched = tickets.map(t => {
    const sla = slaSettings[t.ticketType] ?? defaultSla[t.ticketType] ?? 24;
    const elapsed = hrsSince(t.createdAt);
    const remaining = sla - elapsed;
    const breached = (elapsed > sla) || t.status === 'overdue';
    const atRisk = !breached && remaining <= Math.max(1, sla * 0.25) && t.status !== 'closed';
    return { ...t, sla, elapsed: Math.round(elapsed * 10) / 10, remaining: Math.round(remaining * 10) / 10, breached, atRisk };
  });

  const byDept = enriched.reduce((acc, t) => { acc[t.department] = (acc[t.department] || 0) + 1; return acc; }, {});
  const total = enriched.length;
  const breachedCount = enriched.filter(t => t.breached).length;
  const atRiskCount = enriched.filter(t => t.atRisk).length;

  const visible = departmentFilter === 'All' ? enriched : enriched.filter(t => t.department === departmentFilter);

  const exportCsv = () => {
    const rows = visible.map(t => ({ id: t.id, subject: t.subject, owner: t.owner, assignee: t.assignee, department: t.department, status: t.status, ticketType: t.ticketType, sla: t.sla, createdAt: t.createdAt }));
    const hdr = Object.keys(rows[0] || {}).join(',') + '\n';
    const body = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const csv = hdr + body;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tickets-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page">
      <Sidebar stats={{ pendingNotifications: atRiskCount }} />
      <main className="admin-main">
        <TopNav initials="AD" userName="Administrator" pageTitle="Reports" />

        <section className="reports-top">
          <div className="kpis">
            <div className="kpi-card">
              <div className="kpi-title">Total tickets</div>
              <div className="kpi-value">{total}</div>
            </div>
            <div className="kpi-card warn">
              <div className="kpi-title">At risk</div>
              <div className="kpi-value">{atRiskCount}</div>
            </div>
            <div className="kpi-card danger">
              <div className="kpi-title">Breached</div>
              <div className="kpi-value">{breachedCount}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Avg SLA (hrs)</div>
              <div className="kpi-value">{Math.round((Object.values(slaSettings).reduce((a,b)=>a+b,0) / Object.keys(slaSettings).length) || 0)}</div>
            </div>
          </div>

          <div className="dept-distribution card">
            <div className="dept-header">
              <strong>Department distribution</strong>
              <div>
                <select value={departmentFilter} onChange={(e)=>setDepartmentFilter(e.target.value)}>
                  <option>All</option>
                  {Object.keys(byDept).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button className="btn-primary small" onClick={exportCsv} style={{marginLeft:8}}>Export CSV</button>
              </div>
            </div>
            <div className="dept-bars">
              {Object.entries(byDept).map(([d,count]) => (
                <div className="dept-row" key={d}>
                  <div className="dept-name">{d}</div>
                  <div className="dept-bar-wrap"><div className="dept-bar" style={{width: `${Math.round((count/total)*100)}%`}} /></div>
                  <div className="dept-count">{count}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="reports-table card">
          <h3>Tickets At Risk & Breached</h3>
          <table className="reports-table-inner">
            <thead>
              <tr><th>Owner</th><th>Subject</th><th>Type</th><th>Dept</th><th>SLA hrs</th><th>Elapsed</th><th>Remaining</th><th>Status</th></tr>
            </thead>
            <tbody>
              {visible.sort((a,b)=> (b.breached?1:0) - (a.breached?1:0) || (b.atRisk?1:0)-(a.atRisk?1:0)).map(t => (
                <tr key={t.id} className={t.breached? 'row-breached': t.atRisk? 'row-atrisk':''}>
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
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default Reports;
