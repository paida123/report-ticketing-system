import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import TopNav from '../topnav/TopNav';
import './Layout.css';

/**
 * ManagerLayout - Layout for manager pages
 * Includes sidebar and topnav, renders child routes in Outlet
 */
const ManagerLayout = () => (
  <div className="layout manager-page">
    <Sidebar />
    <main className="layout-main manager-main">
      <TopNav />
      <div className="layout-content">
        <Outlet />
      </div>
    </main>
  </div>
);

export default ManagerLayout;
