import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import TopNav from '../topnav/TopNav';
import './Layout.css';

/**
 * ExecutiveLayout - Layout for executive pages
 * Includes sidebar and topnav, renders child routes in Outlet
 */
const ExecutiveLayout = () => {
  const [stats, setStats] = useState({
    myTickets: 0,
    forApproval: 0,
    totalTickets: 0
  });

  // Load ticket stats from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tickets');
      if (raw) {
        const tickets = JSON.parse(raw);
        const currentUser = localStorage.getItem('currentUserName') || '';
        const userTickets = tickets.filter(t => t.owner === currentUser || t.createdBy === currentUser);
        const pendingApproval = tickets.filter(t => t.status === 'awaiting_approval' || t.status === 'pending_approval');
        setStats({
          myTickets: userTickets.length,
          forApproval: pendingApproval.length,
          totalTickets: tickets.length
        });
      }
    } catch (e) { /* ignore */ }
  }, []);

  return (
    <div className="layout executive-page">
      <Sidebar stats={stats} />
      <main className="layout-main executive-main">
        <TopNav />
        <div className="layout-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ExecutiveLayout;
