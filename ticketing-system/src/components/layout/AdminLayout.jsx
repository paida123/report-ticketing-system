import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import TopNav from '../topnav/TopNav';
import './Layout.css';

/**
 * AdminLayout - Layout for admin pages
 * Includes sidebar and topnav, renders child routes in Outlet
 */
const AdminLayout = () => {
  const stats = {
    processed: 0,
    pending: 0,
    activeUsers: 0,
    pendingNotifications: 0
  };

  return (
    <div className="layout admin-page">
      <Sidebar stats={stats} />
      <main className="layout-main admin-main">
        <TopNav />
        <div className="layout-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
