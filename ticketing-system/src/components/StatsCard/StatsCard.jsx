import React from 'react';
import './StatsCard.css';

/**
 * StatsCard - Displays a single statistic with icon and color
 * @param {string} label - Stat label
 * @param {number|string} value - Stat value
 * @param {string} color - Accent color (blue, green, red, amber, cyan)
 * @param {React.ReactNode} icon - Optional icon
 * @param {function} onClick - Optional click handler
 */
const StatsCard = ({ label, value, color = 'blue', icon, onClick, active = false }) => {
  const colorMap = {
    blue: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', accent: '#3b82f6' },
    green: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', accent: '#10b981' },
    red: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', accent: '#ef4444' },
    amber: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', accent: '#f59e0b' },
    cyan: { bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.2)', accent: '#06b6d4' },
    purple: { bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.2)', accent: '#8b5cf6' },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`stats-card ${onClick ? 'clickable' : ''} ${active ? 'active' : ''}`}
      style={{ '--card-bg': colors.bg, '--card-border': colors.border, '--card-accent': colors.accent }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    >
      <div className="stats-card-accent" />
      <div className="stats-card-content">
        <div className="stats-card-value">{value}</div>
        <div className="stats-card-label">{label}</div>
      </div>
      {icon && <div className="stats-card-icon">{icon}</div>}
    </div>
  );
};

/**
 * StatsRow - Container for multiple StatsCard components
 */
export const StatsRow = ({ children }) => {
  return <div className="stats-row">{children}</div>;
};

export default StatsCard;
