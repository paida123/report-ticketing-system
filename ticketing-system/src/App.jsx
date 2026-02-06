import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import SignIn from './auth/login/signIn/signIn'
import SignUp from './auth/login/signUp/SignUP'
import AdminDashboard from './pages/adminSidePage/adminDashboard/adminDashboard'
import UserManagement from './pages/adminSidePage/userManagement/UserManagement'
import DepartmentConfuguration from './pages/adminSidePage/departmentManagement/DepartmentConfuguration'
import RolesConfiguration from './pages/adminSidePage/roleManagement/RolesConfiguration'
import SlaPage from './pages/adminSidePage/sla/SlaPage'
import TicketsPage from './pages/adminSidePage/tickets/TicketsPage'
import UserDashboard from './pages/user/UserDashboard'
import UserTicketsPage from './pages/user/UserTicketPage/UserTicketsPage'
import ManagerDashboard from './pages/manager/ManagerDashboard'
import UserSlaPage from './pages/user/UserSlaPage/UserSlaPage'
import ManagerTicketsPage from './pages/manager/ManagerTicketsPage'
import ManagerSlaPage from './pages/manager/ManagerSlaPage'
import PendingApprovalPage from './pages/manager/PendingApprovalPage'
import ExecutiveDashboard from './pages/executive/ExecutiveDashboard'
import ExecutiveTicketsPage from './pages/executive/ExecutiveTicketsPage'
import ExecutiveSlaPage from './pages/executive/ExecutiveSlaPage'
import ExecutivePendingApprovalPage from './pages/executive/ExecutivePendingApprovalPage'


function App() {
  return (
    <BrowserRouter>
      <Routes>
       
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
  <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<UserManagement />} />
      <Route path="/admin/departments" element={<DepartmentConfuguration />} />
      <Route path="/admin/roles" element={<RolesConfiguration />} />
  <Route path="/admin/sla" element={<SlaPage />} />
    <Route path="/admin/tickets" element={<TicketsPage />} />
    <Route path="/user" element={<UserDashboard />} />
    <Route path="/user/dashboard" element={<UserDashboard />} />
  <Route path="/user/tickets" element={<UserTicketsPage />} />
    <Route path="/user/sla" element={<UserSlaPage />} />
   
    <Route path="/manager" element={<ManagerDashboard />} />
    <Route path="/manager/tickets" element={<ManagerTicketsPage />} />
    <Route path="/manager/sla" element={<ManagerSlaPage />} />
    <Route path="/manager/pending-approval" element={<PendingApprovalPage />} />

    <Route path="/executive" element={<ExecutiveDashboard />} />
    <Route path="/executive/tickets" element={<ExecutiveTicketsPage />} />
    <Route path="/executive/sla" element={<ExecutiveSlaPage />} />
    <Route path="/executive/pending-approval" element={<ExecutivePendingApprovalPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
