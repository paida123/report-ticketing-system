import React from 'react';
import ManagerSlaPage from '../manager/ManagerSlaPage';

// Executive: all-organisation SLA view (no department filter) + personal My SLA tab.
const ExecutiveSlaPage = () => {
  return <ManagerSlaPage bypassDeptFilter />;
};

export default ExecutiveSlaPage;
