import React, { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "../../../components/PageHeader/PageHeader";
import TicketService from "../../../services/ticket.service";
import UserService from "../../../services/user.service";
import SlaService from "../../../services/sla.service";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [slaData, setSlaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [modalPage, setModalPage] = useState(1);
  const [modalPageSize, setModalPageSize] = useState(10);
  const [showPerformersModal, setShowPerformersModal] = useState(false);
  const [performersPage, setPerformersPage] = useState(1);
  const [performersPageSize, setPerformersPageSize] = useState(10);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ticketsRes, usersRes, slaRes] = await Promise.all([
        TicketService.getAllTickets({ limit: 1000 }),
        UserService.getAllUsers({ limit: 1000 }),
        SlaService.getAllSla({ limit: 1000 }),
      ]);

      const ticketsData = ticketsRes?.data?.data?.tickets || [];
      const usersData = usersRes?.data?.data?.users || usersRes?.data?.data || [];
      const slaDataArr = slaRes?.data?.data || [];

      setTickets(ticketsData);
      setUsers(usersData);
      setSlaData(slaDataArr);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal || showPerformersModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showPerformersModal]);

  // Calculate KPIs from real data
  const activeUsers = users.filter((u) => u.status === "ACTIVE").length;
  const openTickets = tickets.filter((t) =>
    ["PENDING_APPROVAL", "QUEUED", "PROCESSING"].includes(t.status)
  ).length;
  const closedTickets = tickets.filter((t) =>
    ["CLOSED", "RESOLVED"].includes(t.status)
  ).length;
  const pendingApproval = tickets.filter((t) => t.status === "PENDING_APPROVAL").length;

  const kpis = [
    { label: "Active Users", value: activeUsers, delta: 0, color: "blue", type: "users" },
    { label: "Open Tickets", value: openTickets, delta: 0, color: "amber", type: "open" },
    { label: "Closed Tickets", value: closedTickets, delta: 0, color: "green", type: "closed" },
    { label: "Pending Approval", value: pendingApproval, delta: 0, color: "pink", type: "pending" },
  ];

  // Handle KPI card clicks
  const handleKpiClick = (kpi) => {
    setSelectedKpi(kpi);
    setShowModal(true);
    setModalPage(1); // Reset to first page when opening modal
  };

  // Get filtered data based on selected KPI
  const getModalData = () => {
    if (!selectedKpi) return { title: "", data: [], columns: [] };

    switch (selectedKpi.type) {
      case "users":
        return {
          title: "Active Users",
          columns: ["Name", "Email", "Role", "Department", "Status"],
          data: users.filter((u) => u.status === "ACTIVE").map((u) => {
            // Extract role - handle both object and string formats
            let roleName = "N/A";
            if (u.role) {
              if (typeof u.role === 'string') {
                roleName = u.role;
              } else if (typeof u.role === 'object') {
                roleName = u.role.role_name || u.role.role || u.role.name || "N/A";
              }
            } else if (u.role_name) {
              roleName = u.role_name;
            }

            // Extract department - handle both object and string formats
            let deptName = "N/A";
            if (u.department) {
              if (typeof u.department === 'string') {
                deptName = u.department;
              } else if (typeof u.department === 'object') {
                deptName = u.department.department || u.department.name || u.department.department_name || "N/A";
              }
            } else if (u.department_name) {
              deptName = u.department_name;
            }

            return {
              id: u.id,
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "N/A",
              email: u.email || "N/A",
              role: roleName,
              department: deptName,
              status: u.status,
            };
          }),
        };
      case "open":
        return {
          title: "Open Tickets",
          columns: ["Ticket ID", "Type", "Status", "Department", "Assigned To", "Created"],
          data: tickets.filter((t) =>
            ["PENDING_APPROVAL", "QUEUED", "PROCESSING"].includes(t.status)
          ).map((t) => {
            // Safely extract assigned user name from assignment object
            let assignedName = "Unassigned";
            const officer = t.assignment?.officer;
            if (officer) {
              if (typeof officer === 'string') {
                assignedName = officer;
              } else if (typeof officer === 'object') {
                // Check for name field first, then construct from first/last name
                assignedName = officer.name || `${officer.first_name || ""} ${officer.last_name || ""}`.trim() || officer.email || "Unassigned";
              }
            }

            return {
              id: t.id,
              ticketId: t.id ? t.id.substring(0, 8) : "N/A",
              type: t.ticket_type?.title || "N/A",
              status: t.status || "UNKNOWN",
              department: t.ticket_type?.department?.department || "N/A",
              assignedTo: assignedName,
              created: t.created_at ? new Date(t.created_at).toLocaleDateString() : "N/A",
            };
          }),
        };
      case "closed":
        return {
          title: "Closed Tickets",
          columns: ["Ticket ID", "Type", "Status", "Department", "Resolved By", "Closed Date"],
          data: tickets.filter((t) =>
            ["CLOSED", "RESOLVED"].includes(t.status)
          ).map((t) => {
            // Safely extract resolved by name from assignment object
            let resolvedName = "N/A";
            const officer = t.assignment?.officer;
            if (officer) {
              if (typeof officer === 'string') {
                resolvedName = officer;
              } else if (typeof officer === 'object') {
                // Check for name field first, then construct from first/last name
                resolvedName = officer.name || `${officer.first_name || ""} ${officer.last_name || ""}`.trim() || officer.email || "N/A";
              }
            }

            return {
              id: t.id,
              ticketId: t.id ? t.id.substring(0, 8) : "N/A",
              type: t.ticket_type?.title || "N/A",
              status: t.status || "UNKNOWN",
              department: t.ticket_type?.department?.department || "N/A",
              resolvedBy: resolvedName,
              closedDate: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "N/A",
            };
          }),
        };
      case "pending":
        return {
          title: "Pending Approval Tickets",
          columns: ["Ticket ID", "Type", "Department", "Requester", "Created", "Priority"],
          data: tickets.filter((t) => t.status === "PENDING_APPROVAL").map((t) => {
            // Safely extract requester name from created_by (creator)
            let requesterName = "N/A";
            const creator = t.created_by;
            if (creator) {
              if (typeof creator === 'string') {
                requesterName = creator;
              } else if (typeof creator === 'object') {
                // Check for name field first, then construct from first/last name
                requesterName = creator.name || `${creator.first_name || ""} ${creator.last_name || ""}`.trim() || creator.email || "N/A";
              }
            }

            return {
              id: t.id,
              ticketId: t.id ? t.id.substring(0, 8) : "N/A",
              type: t.ticket_type?.title || "N/A",
              department: t.ticket_type?.department?.department || "N/A",
              requester: requesterName,
              created: t.created_at ? new Date(t.created_at).toLocaleDateString() : "N/A",
              priority: t.priority || "Normal",
            };
          }),
        };
      default:
        return { title: "", data: [], columns: [] };
    }
  };

  const modalData = getModalData();

  // Pagination for modal - ensure at least 1 page exists
  const totalModalPages = modalData.data.length > 0 ? Math.ceil(modalData.data.length / modalPageSize) : 1;
  const startIdx = (modalPage - 1) * modalPageSize;
  const endIdx = startIdx + modalPageSize;
  const paginatedModalData = modalData.data.slice(startIdx, endIdx);

  const handleModalPageChange = (newPage) => {
    setModalPage(newPage);
  };

  // Recent activities from tickets (latest 5)
  const activities = tickets
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
    .map((t) => {
      const timeAgo = getTimeAgo(t.created_at);
      const typeName = t.ticket_type?.type_name || 'Request';
      return {
        id: t.id,
        ticketId: t.id.substring(0, 8),
        description: `${typeName}`,
        status: t.status,
        time: timeAgo,
      };
    });

  // Calculate ticket volume for last 14 days
  const getLast14Days = () => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  };

  const last14Days = getLast14Days();
  const series = last14Days.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const created = tickets.filter((t) => {
      const createdDate = new Date(t.created_at);
      return createdDate >= day && createdDate < nextDay;
    }).length;

    const resolved = tickets.filter((t) => {
      const updatedDate = new Date(t.updated_at);
      return (
        ["CLOSED", "RESOLVED"].includes(t.status) &&
        updatedDate >= day &&
        updatedDate < nextDay
      );
    }).length;

    return { created, resolved };
  });

  // Top performers by highest average expected SLA (higher target = better performer)
  const agentStats = {};
  slaData.forEach((sla) => {
    const name = `${sla.assigned_to?.first_name || ""} ${sla.assigned_to?.last_name || ""}`.trim();
    if (name && sla.expected_sla) {
      if (!agentStats[name]) {
        agentStats[name] = { totalSla: 0, count: 0, excellentCount: 0 };
      }
      agentStats[name].totalSla += parseFloat(sla.expected_sla);
      agentStats[name].count += 1;
      if (sla.grade === "EXCELLENT") {
        agentStats[name].excellentCount += 1;
      }
    }
  });

  const allAgents = Object.entries(agentStats)
    .map(([name, stats]) => ({ 
      name, 
      avgSla: Math.round(stats.totalSla / stats.count),
      tickets: stats.count,
      excellentRate: Math.round((stats.excellentCount / stats.count) * 100)
    }))
    .sort((a, b) => b.avgSla - a.avgSla);

  const topAgents = allAgents.slice(0, 3);

  // Department overview from tickets
  const deptStats = {};
  tickets.forEach((t) => {
    // Extract department name from ticket_type.department
    const dept = t.ticket_type?.department?.department || "Unassigned";
    if (!deptStats[dept]) {
      deptStats[dept] = { open: 0, total: 0 };
    }
    deptStats[dept].total++;
    if (["PENDING_APPROVAL", "QUEUED", "PROCESSING"].includes(t.status)) {
      deptStats[dept].open++;
    }
  });

  const departments = Object.entries(deptStats).map(([dept, stats]) => ({
    name: dept,
    open: stats.open,
    sla: stats.total > 0 ? Math.round(((stats.total - stats.open) / stats.total) * 100) : 100,
  }));

  // Helper function to format time ago
  function getTimeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  const CountUp = ({ end }) => {
    const [val, setVal] = useState(0);
    useEffect(() => {
      let start = 0;
      const step = end / 25;
      const t = setInterval(() => {
        start += step;
        if (start >= end) {
          setVal(end);
          clearInterval(t);
        } else setVal(Math.round(start));
      }, 25);
      return () => clearInterval(t);
    }, [end]);
    return <span>{val}</span>;
  };

  /* Small interactive ticket chart component */
  const TicketChart = ({ series }) => {
    const svgRef = useRef(null);
    const [hover, setHover] = useState({ idx: -1, x: 0, y: 0 });

    const width = 560;
    const height = 140;
    const pad = { left: 36, right: 12, top: 12, bottom: 26 };

    const maxVal = Math.max(...series.map((s) => Math.max(s.created, s.resolved))) + 8;
    const xStep = (width - pad.left - pad.right) / (series.length - 1);

    const toX = (i) => pad.left + i * xStep;
    const toY = (v) => pad.top + ((maxVal - v) / maxVal) * (height - pad.top - pad.bottom);

    const createdPoints = series.map((d, i) => `${toX(i)},${toY(d.created)}`).join(" ");
    const resolvedPoints = series.map((d, i) => `${toX(i)},${toY(d.resolved)}`).join(" ");

    const areaPath = () => {
      const top = series.map((d, i) => `${toX(i)},${toY(d.created)}`).join(" ");
      const baseRight = `${toX(series.length - 1)},${height - pad.bottom}`;
      const baseLeft = `${toX(0)},${height - pad.bottom}`;
      return `${top} ${baseRight} ${baseLeft}`;
    };

    const onMove = (e) => {
      const r = svgRef.current.getBoundingClientRect();
      const x = e.clientX - r.left;
      // compute nearest index
      let idx = Math.round((x - pad.left) / xStep);
      idx = Math.max(0, Math.min(series.length - 1, idx));
      const cx = toX(idx);
      const cy = toY(series[idx].created);
      setHover({ idx, x: cx, y: cy });
    };

    const onLeave = () => setHover({ idx: -1, x: 0, y: 0 });

    return (
      <div className="ticket-chart" style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          preserveAspectRatio="none"
        >
          {/* grid lines */}
          {[0, 1, 2, 3, 4].map((g) => {
            const gy = pad.top + (g / 4) * (height - pad.top - pad.bottom);
            const value = Math.round(maxVal - (g / 4) * maxVal);
            return (
              <g key={g}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={gy}
                  y2={gy}
                  stroke="rgba(2,6,23,0.06)"
                  strokeWidth="1"
                />
                <text
                  className="y-label"
                  x={pad.left - 10}
                  y={gy + 4}
                  fontSize="11"
                  fill="#475569"
                  textAnchor="end"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* area for created */}
          <polyline points={areaPath()} fill="rgba(59,130,246,0.08)" stroke="none" />

          {/* created/resolved lines */}
          <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={createdPoints} />
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="4 4"
            points={resolvedPoints}
          />

          {/* markers */}
          {series.map((d, i) => (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(d.created)} r={3.2} fill="#2563eb" />
              <circle cx={toX(i)} cy={toY(d.resolved)} r={3.2} fill="#10b981" />
            </g>
          ))}

          {/* x-axis labels (light) */}
          {series.map((_, i) => {
            if (i % 3 !== 0) return null;
            return (
              <text key={i} x={toX(i)} y={height - 6} fontSize="10" fill="#6b7280" textAnchor="middle">
                {`D${i + 1}`}
              </text>
            );
          })}
        </svg>

        {/* tooltip */}
        {hover.idx >= 0 && (
          <div
            className="chart-tooltip"
            style={{ left: hover.x + 8, top: hover.y - 36 }}
          >
            <div style={{ fontSize: 12, fontWeight: 700 }}>Day {hover.idx + 1}</div>
            <div style={{ fontSize: 13, color: "#2563eb" }}>Created: {series[hover.idx].created}</div>
            <div style={{ fontSize: 13, color: "#10b981" }}>Resolved: {series[hover.idx].resolved}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Monitor system metrics, ticket volumes, and team performance"
      />

      {error && (
        <div className="dashboard-error">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="10" cy="10" r="8"></circle>
            <line x1="10" y1="6" x2="10" y2="10"></line>
            <line x1="10" y1="13" x2="10.01" y2="13"></line>
          </svg>
          {error}
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <section className="kpi-grid">
            {kpis.map((k) => (
              <div 
                className="card kpi clickable" 
                key={k.label} 
                data-color={k.color}
                onClick={() => handleKpiClick(k)}
                title={`Click to view details`}
              >
                <div className="kpi-top">
                  <span>{k.label}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="kpi-icon">
                    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  </svg>
                </div>
                <div className="kpi-value">
                  <CountUp end={k.value} />
                </div>
              </div>
            ))}
          </section>

          {/* Charts */}
          <section className="dashboard-grid">
            <div className="panel">
              <h3>Ticket Volume Overview (Last 14 Days)</h3>
              <TicketChart series={series} />
              <div className="legend muted">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: "#2563eb" }}></span>
                  Created
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: "#10b981" }}></span>
                  Resolved
                </div>
              </div>
            </div>

            <div className="panel top-performers-card">
              <h3>🏆 Top 3 Performers</h3>
              <p className="panel-subtitle">Officers with highest SLA targets and excellent performance</p>
              {topAgents.length > 0 ? (
                <>
                  <ul className="agent-list">
                    {topAgents.map((a, idx) => (
                      <li key={a.name} className="agent-item">
                        <div className="agent-rank">#{idx + 1}</div>
                        <div className="agent-info">
                          <span className="agent-name">{a.name}</span>
                          <span className="agent-meta">{a.tickets} tickets • {a.excellentRate}% excellent</span>
                        </div>
                        <div className="agent-sla">
                          <strong>{a.avgSla}h</strong>
                          <span>Avg SLA</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {allAgents.length > 3 && (
                    <button 
                      className="view-more-btn"
                      onClick={() => {
                        setShowPerformersModal(true);
                        setPerformersPage(1);
                      }}
                    >
                      View All Performers ({allAgents.length})
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 6l4 4 4-4"></path>
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <p>No performance data available yet</p>
                </div>
              )}
            </div>
          </section>

          {/* Bottom Section */}
          <section className="bottom-grid">
            <div className="panel recent-activity-card">
              <h3>📋 Recent Activity</h3>
              <p className="panel-subtitle">Latest ticket updates and actions</p>
              {activities.length > 0 ? (
                <div className="table-wrap">
                  <table className="activity-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((a) => (
                        <tr key={a.id}>
                          <td className="ticket-id-col"><code>#{a.ticketId}</code></td>
                          <td className="description-col">{a.description}</td>
                          <td>
                            <span className={`status-badge status-${a.status.toLowerCase().replace(/_/g, '-')}`}>
                              {a.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="time-col muted">{a.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No recent activity</p>
                </div>
              )}
            </div>

            <div className="panel department-overview-card">
              <h3>🏢 Department Overview</h3>
              <p className="panel-subtitle">Open tickets and SLA performance by department</p>
              <div className="table-wrap">
                {departments.length > 0 ? (
                  <table className="user-tickets-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Open</th>
                        <th>SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.slice(0, 10).map((dept) => (
                        <tr key={dept.name}>
                          <td>{dept.name}</td>
                          <td>{dept.open}</td>
                          <td>
                            <span
                              className={`sla-badge ${
                                dept.sla >= 90
                                  ? "excellent"
                                  : dept.sla >= 70
                                  ? "good"
                                  : "poor"
                              }`}
                            >
                              {dept.sla}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <p>No department data available</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Modal for performers */}
      {showPerformersModal && (
        <div className="kpi-modal-overlay" onClick={() => setShowPerformersModal(false)}>
          <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kpi-modal-header">
              <h2>🏆 All Performers</h2>
              <button className="modal-close-btn" onClick={() => setShowPerformersModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="kpi-modal-body">
              {allAgents.length > 0 ? (
                <>
                  <div className="modal-stats">
                    <div className="modal-count-section">
                      <span className="modal-count">Total Performers: <strong>{allAgents.length}</strong></span>
                    </div>
                    <div className="modal-page-size">
                      <label>Show:</label>
                      <select 
                        value={performersPageSize} 
                        onChange={(e) => {
                          setPerformersPageSize(Number(e.target.value));
                          setPerformersPage(1);
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-table-wrap">
                    <table className="modal-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Name</th>
                          <th>Tickets</th>
                          <th>Avg SLA (Hours)</th>
                          <th>Excellent Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAgents
                          .slice((performersPage - 1) * performersPageSize, performersPage * performersPageSize)
                          .map((agent, idx) => {
                            const actualRank = (performersPage - 1) * performersPageSize + idx + 1;
                            return (
                              <tr key={agent.name}>
                                <td>
                                  <div className="agent-rank" style={{ display: 'inline-flex', width: '32px', height: '32px' }}>#{actualRank}</div>
                                </td>
                                <td className="name-col">{agent.name}</td>
                                <td><strong>{agent.tickets}</strong></td>
                                <td>
                                  <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-1)' }}>{agent.avgSla}h</span>
                                </td>
                                <td>
                                  <span className={`sla-badge ${
                                    agent.excellentRate >= 80 ? 'excellent' : 
                                    agent.excellentRate >= 60 ? 'good' : 'poor'
                                  }`}>
                                    {agent.excellentRate}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {Math.ceil(allAgents.length / performersPageSize) > 1 && (
                    <div className="modal-pagination">
                      <button 
                        className="pagination-btn"
                        onClick={() => setPerformersPage(1)}
                        disabled={performersPage === 1}
                      >
                        «
                      </button>
                      <button 
                        className="pagination-btn"
                        onClick={() => setPerformersPage(performersPage - 1)}
                        disabled={performersPage === 1}
                      >
                        ‹
                      </button>
                      
                      <div className="pagination-info">
                        Page <strong>{performersPage}</strong> of <strong>{Math.ceil(allAgents.length / performersPageSize)}</strong>
                      </div>
                      
                      <button 
                        className="pagination-btn"
                        onClick={() => setPerformersPage(performersPage + 1)}
                        disabled={performersPage === Math.ceil(allAgents.length / performersPageSize)}
                      >
                        ›
                      </button>
                      <button 
                        className="pagination-btn"
                        onClick={() => setPerformersPage(Math.ceil(allAgents.length / performersPageSize))}
                        disabled={performersPage === Math.ceil(allAgents.length / performersPageSize)}
                      >
                        »
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <p>No performance data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for detailed view */}
      {showModal && (
        <div className="kpi-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kpi-modal-header">
              <h2>{modalData.title}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="kpi-modal-body">
              {modalData.data.length > 0 ? (
                <>
                  <div className="modal-stats">
                    <div className="modal-count-section">
                      <span className="modal-count">Total: <strong>{modalData.data.length}</strong> {selectedKpi?.type === 'users' ? 'users' : 'tickets'}</span>
                    </div>
                    <div className="modal-page-size">
                      <label>Show:</label>
                      <select 
                        value={modalPageSize} 
                        onChange={(e) => {
                          setModalPageSize(Number(e.target.value));
                          setModalPage(1);
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-table-wrap">
                    <table className="modal-table">
                      <thead>
                        <tr>
                          {modalData.columns.map((col, idx) => (
                            <th key={idx}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedModalData.map((row, idx) => {
                          if (selectedKpi?.type === 'users') {
                            return (
                              <tr key={row.id || idx}>
                                <td className="name-col">{row.name}</td>
                                <td className="email-col">{row.email}</td>
                                <td>{row.role}</td>
                                <td>{row.department}</td>
                                <td>
                                  <span className="status-badge status-active">{row.status}</span>
                                </td>
                              </tr>
                            );
                          } else if (selectedKpi?.type === 'open') {
                            return (
                              <tr key={row.id || idx}>
                                <td className="ticket-id-col"><code>#{row.ticketId}</code></td>
                                <td className="type-col">{row.type}</td>
                                <td>
                                  <span className={`status-badge status-${row.status.toLowerCase().replace(/_/g, '-')}`}>
                                    {row.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td>{row.department}</td>
                                <td>{row.assignedTo}</td>
                                <td className="date-col">{row.created}</td>
                              </tr>
                            );
                          } else if (selectedKpi?.type === 'closed') {
                            return (
                              <tr key={row.id || idx}>
                                <td className="ticket-id-col"><code>#{row.ticketId}</code></td>
                                <td className="type-col">{row.type}</td>
                                <td>
                                  <span className={`status-badge status-${row.status.toLowerCase().replace(/_/g, '-')}`}>
                                    {row.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td>{row.department}</td>
                                <td>{row.resolvedBy}</td>
                                <td className="date-col">{row.closedDate}</td>
                              </tr>
                            );
                          } else if (selectedKpi?.type === 'pending') {
                            return (
                              <tr key={row.id || idx}>
                                <td className="ticket-id-col"><code>#{row.ticketId}</code></td>
                                <td className="type-col">{row.type}</td>
                                <td>{row.department}</td>
                                <td>{row.requester}</td>
                                <td className="date-col">{row.created}</td>
                                <td>
                                  <span className={`priority-badge priority-${(row.priority || 'normal').toLowerCase()}`}>
                                    {row.priority || 'Normal'}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                          return null;
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalModalPages > 1 && (
                    <div className="modal-pagination">
                      <button 
                        className="pagination-btn"
                        onClick={() => handleModalPageChange(1)}
                        disabled={modalPage === 1}
                      >
                        «
                      </button>
                      <button 
                        className="pagination-btn"
                        onClick={() => handleModalPageChange(modalPage - 1)}
                        disabled={modalPage === 1}
                      >
                        ‹
                      </button>
                      
                      <div className="pagination-info">
                        Page <strong>{modalPage}</strong> of <strong>{totalModalPages}</strong>
                      </div>
                      
                      <button 
                        className="pagination-btn"
                        onClick={() => handleModalPageChange(modalPage + 1)}
                        disabled={modalPage === totalModalPages}
                      >
                        ›
                      </button>
                      <button 
                        className="pagination-btn"
                        onClick={() => handleModalPageChange(totalModalPages)}
                        disabled={modalPage === totalModalPages}
                      >
                        »
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
