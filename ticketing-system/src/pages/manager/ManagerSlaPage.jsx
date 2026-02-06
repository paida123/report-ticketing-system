import React from 'react';
import UserSlaPage from '../user/UserSlaPage/UserSlaPage';

// Reuse the same SLA page UI/logic for manager context.
// Sidebar routing will ensure links go to /manager/*.
const ManagerSlaPage = () => {
  return <UserSlaPage />;
};

export default ManagerSlaPage;
