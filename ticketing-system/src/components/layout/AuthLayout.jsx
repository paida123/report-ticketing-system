import React from 'react';
import { Outlet } from 'react-router-dom';
import './Layout.css';

/**
 * AuthLayout - Layout for authentication pages (login, signup, forgot password)
 * No sidebar or topnav, just centered content
 */
const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-layout-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
