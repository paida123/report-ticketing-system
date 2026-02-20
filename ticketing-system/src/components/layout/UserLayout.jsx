import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import TopNav from '../topnav/TopNav';
import './Layout.css';

/**
 * UserLayout - Layout for user pages
 * Includes sidebar and topnav, renders child routes in Outlet
 */
const UserLayout = () => {
  const [stats, setStats] = useState({
    myTickets: 0,
    openTickets: 0,
    closedTickets: 0
  });

  // Load ticket stats from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tickets');
      if (raw) {
        const tickets = JSON.parse(raw);
        const currentUser = localStorage.getItem('currentUserName') || '';
        const userTickets = tickets.filter(t => t.owner === currentUser || t.createdBy === currentUser);
        setStats({
          myTickets: userTickets.length,
          openTickets: userTickets.filter(t => !['closed', 'resolved'].includes(t.status)).length,
          closedTickets: userTickets.filter(t => ['closed', 'resolved'].includes(t.status)).length
        });
      }
    } catch (e) { /* ignore */ }
  }, []);

  return (
    <div className="layout user-page">
      <Sidebar stats={stats} />
      <main className="layout-main user-main">
        <TopNav />
        <div className="layout-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default UserLayout;
