import React from 'react';
import ManagerTicketsPage from '../manager/ManagerTicketsPage';

// Executive: all-organisation tickets view (no department filter) + personal assigned-to-me tab.
const ExecutiveTicketsPage = () => {
  return <ManagerTicketsPage bypassDeptFilter />;
};

export default ExecutiveTicketsPage;
