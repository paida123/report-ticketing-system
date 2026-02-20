import React from 'react';
import './PageHeader.css';

/**
 * PageHeader - Consistent header component for all pages
 * @param {string} title - Main page title
 * @param {string} subtitle - Optional description/subtitle
 * @param {React.ReactNode} actions - Optional action buttons (e.g., Create Ticket)
 */
const PageHeader = ({ title, subtitle, actions }) => {
  // title and subtitle are now shown in TopNav; only render actions here
  if (!actions) return null;
  return (
    <div className="page-header">
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
};

export default PageHeader;
