import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/sidebar/Sidebar';

const AdminLayout = () => {
  const stats = { processed: 1234, pending: 27, activeUsers: 42, pendingNotifications: 3 };
  return (
    <div className="admin-page">
      <Sidebar stats={stats} />
      <Outlet />
    </div>
  );
};

export default AdminLayout;
