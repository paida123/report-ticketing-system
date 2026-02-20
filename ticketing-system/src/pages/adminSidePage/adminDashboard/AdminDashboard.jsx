import React, { useEffect, useRef, useState } from "react";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const stats = {
    processed: 1234,
    pending: 27,
    activeUsers: 42,
    pendingNotifications: 3,
  };

  const kpis = [
    { label: "Active Users", value: stats.activeUsers, delta: +1 },
    { label: "Open Tickets", value: 128, delta: +8 },
    { label: "Closed Tickets", value: stats.processed, delta: +4 },
    { label: "Pending Assignment", value: stats.pending, delta: -2 },
  ];

  const activities = [
    { id: 1, time: "2m ago", text: "Ticket #4521 assigned to Maya" },
    { id: 2, time: "30m ago", text: "New user registered: John Doe" },
    { id: 3, time: "1h ago", text: "SLA breach: Ticket #4412" },
    { id: 4, time: "3h ago", text: "Department HR updated" },
  ];

  const series = Array.from({ length: 14 }).map((_, i) => {
    const created = Math.max(8, Math.round(25 + Math.sin(i / 2) * 10));
    const resolved = Math.round(created * 0.7);
    return { created, resolved };
  });

  const agents = [
    { name: "Maya Patel", resolved: 120 },
    { name: "Jonathan Kim", resolved: 97 },
    { name: "Alice Mbatha", resolved: 63 },
  ];

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
        {/* KPI Cards */}
        <section className="kpi-grid">
          {kpis.map((k) => (
            <div className="card kpi" key={k.label}>
              <div className="kpi-top">
                <span>{k.label}</span>
                <span
                  className={`delta ${k.delta >= 0 ? "up" : "down"}`}
                >
                  {k.delta > 0 ? `+${k.delta}%` : `${k.delta}%`}
                </span>
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
            <h3>Ticket Volume Overview</h3>
            <TicketChart series={series} />
            <div className="legend muted">Created vs Resolved</div>
          </div>

          <div className="panel">
            <h3>Top Agents</h3>
            <ul className="agent-list">
              {agents.map((a) => (
                <li key={a.name}>
                  <span>{a.name}</span>
                  <strong>{a.resolved}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Bottom Section */}
        <section className="bottom-grid">
          <div className="panel">
            <h3>Recent Activity</h3>
            {activities.map((a) => (
              <div key={a.id} className="activity-item">
                <span>{a.text}</span>
                <span className="muted">{a.time}</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>Department Overview</h3>
            <div className="table-wrap">
              <table className="user-tickets-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Open</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>IT</td>
                  <td>34</td>
                  <td>89%</td>
                </tr>
                <tr>
                  <td>Finance</td>
                  <td>12</td>
                  <td>96%</td>
                </tr>
                <tr>
                  <td>HR</td>
                  <td>7</td>
                  <td>94%</td>
                </tr>
              </tbody>
              </table>
            </div>
          </div>
        </section>
    </>
  );
};

export default AdminDashboard;
