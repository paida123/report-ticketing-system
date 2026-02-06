import React from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import TopNav from '../../components/topnav/TopNav';
import '../manager/ManagerDashboard.css';

const ExecutiveDashboard = () => {
  const name = typeof window !== 'undefined' ? (localStorage.getItem('currentUserName') || 'Executive') : 'Executive';

  return (
    <div className="admin-page manager-page">
      <Sidebar />
      <main className="admin-main">
        <TopNav initials={(name || 'E').slice(0, 2).toUpperCase()} userName={name} pageTitle="Executive Dashboard" />
        <section className="panel manager-panel">
          <div className="manager-top">
            <h2>Executive overview</h2>
            <div className="muted">Use the sidebar to view your tickets, SLA rating, and approvals.</div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ExecutiveDashboard;
