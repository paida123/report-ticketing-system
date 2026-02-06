import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import TopNav from '../../components/topnav/TopNav';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const managerName = localStorage.getItem('currentUserName') || 'Manager';
  const [tickets, setTickets] = useState(() => {
    try { const raw = localStorage.getItem('tickets'); return raw ? JSON.parse(raw) : []; } catch(e){ return []; }
  });

  useEffect(()=>{ localStorage.setItem('tickets', JSON.stringify(tickets)); }, [tickets]);

  const pending = tickets.filter(t => t.status === 'pending' || t.status === 'awaiting_approval');
  const allOpen = tickets.filter(t => t.status === 'open' || t.status === 'in_progress' || t.status === 'approved');

  const approve = (id, assignee) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'approved', assignee: assignee || t.assignee || managerName, history: [...(t.history||[]), { ts: new Date().toISOString(), action: 'approved' }] } : t));
  };

  const decline = (id, reason) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'declined', declineReason: reason, history: [...(t.history||[]), { ts: new Date().toISOString(), action: `declined: ${reason}` }] } : t));
  };

  return (
    <div className="admin-page manager-page">
      <Sidebar />
      <main className="admin-main">
        <TopNav initials={(managerName||'M').slice(0,2).toUpperCase()} userName={managerName} pageTitle="Manager Dashboard" />

        <section className="panel manager-panel">
          <div className="manager-top">
            <h2>Tickets awaiting approval</h2>
          </div>

          <div className="um-table">
            <div className="um-table-head">
              <div className="um-row head">
                <div className="um-cell">ID</div>
                <div className="um-cell">Subject</div>
                <div className="um-cell">Owner</div>
                <div className="um-cell">Type</div>
                <div className="um-cell">Dept</div>
                <div className="um-cell">Actions</div>
              </div>
            </div>
            <div className="um-table-body">
              {pending.map(t => (
                <div className="um-row" key={t.id}>
                  <div className="um-cell">{t.id}</div>
                  <div className="um-cell">{t.subject}</div>
                  <div className="um-cell">{t.owner}</div>
                  <div className="um-cell">{t.ticketType}</div>
                  <div className="um-cell">{t.department}</div>
                  <div className="um-cell">
                    <button className="btn-primary" onClick={() => approve(t.id)}>Approve</button>
                    <button className="btn-danger" onClick={() => {
                      const reason = prompt('Reason for declining this ticket');
                      if (reason != null) decline(t.id, reason);
                    }}>Decline</button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && (<div className="um-row"><div className="um-cell">No tickets to approve</div></div>)}
            </div>
          </div>

          <div style={{marginTop:16}}>
            <h3>Open / Assigned</h3>
            <div className="um-table">
              <div className="um-table-body">
                {allOpen.map(t => (
                  <div className="um-row" key={t.id}>
                    <div className="um-cell">{t.id}</div>
                    <div className="um-cell">{t.subject}</div>
                    <div className="um-cell">{t.owner}</div>
                    <div className="um-cell">{t.assignee || '-'}</div>
                    <div className="um-cell">{t.status}</div>
                    <div className="um-cell"><button className="btn-secondary" onClick={() => { const ass = prompt('Assign to (name)'); if (ass) setTickets(prev => prev.map(x => x.id === t.id ? {...x, assignee: ass} : x)); }}>Assign</button></div>
                  </div>
                ))}
                {allOpen.length === 0 && (<div className="um-row"><div className="um-cell">No open tickets</div></div>)}
              </div>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
};

export default ManagerDashboard;
