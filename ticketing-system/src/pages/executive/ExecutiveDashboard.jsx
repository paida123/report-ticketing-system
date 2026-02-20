import React from 'react';
import '../manager/ManagerDashboard.css';

const ExecutiveDashboard = () => {
  const name = typeof window !== 'undefined' ? (localStorage.getItem('currentUserName') || 'Executive') : 'Executive';

  return (
    <>
        <section className="panel manager-panel">
          <div className="manager-top">
            <h2>Executive overview</h2>
            <div className="muted">Use the sidebar to view your tickets, SLA rating, and approvals.</div>
          </div>
        </section>
    </>
  );
};

export default ExecutiveDashboard;
