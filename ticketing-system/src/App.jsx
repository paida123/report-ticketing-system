import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import './App.css'
import './styles/tables.css'

// Auth pages
import SignIn from './auth/login/signIn/signIn'
import SignUp from './auth/login/signUp/SignUP'

// Layouts
import { AuthLayout, AdminLayout, UserLayout, ManagerLayout, ExecutiveLayout } from './components/layout'

// Admin pages
import AdminDashboard from './pages/adminSidePage/adminDashboard/adminDashboard'
import UserManagement from './pages/adminSidePage/userManagement/UserManagement'
import DepartmentConfuguration from './pages/adminSidePage/departmentManagement/DepartmentConfuguration'
import RolesConfiguration from './pages/adminSidePage/roleManagement/RolesConfiguration'
import SlaPage from './pages/adminSidePage/sla/SlaPage'
import TicketsPage from './pages/adminSidePage/tickets/TicketsPage'

// User pages
import UserDashboard from './pages/user/UserDashboard'
import UserTicketsPage from './pages/user/UserTicketPage/UserTicketsPage'
import UserSlaPage from './pages/user/UserSlaPage/UserSlaPage'

// Manager pages
import ManagerDashboard from './pages/manager/ManagerDashboard'
import ManagerTicketsPage from './pages/manager/ManagerTicketsPage'
import ManagerSlaPage from './pages/manager/ManagerSlaPage'
import PendingApprovalPage from './pages/manager/PendingApprovalPage'

// Executive pages
import ExecutiveDashboard from './pages/executive/ExecutiveDashboard'
import ExecutiveTicketsPage from './pages/executive/ExecutiveTicketsPage'
import ExecutiveSlaPage from './pages/executive/ExecutiveSlaPage'
import ExecutivePendingApprovalPage from './pages/executive/ExecutivePendingApprovalPage'

// Auth
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Default route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Public/Auth routes */}
          <Route path="/login" element={
            <PublicRoute>
              <SignIn />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          } />

          {/* Admin routes - nested under AdminLayout */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'administrator']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="departments" element={<DepartmentConfuguration />} />
            <Route path="roles" element={<RolesConfiguration />} />
            <Route path="sla" element={<SlaPage />} />
            <Route path="tickets" element={<TicketsPage />} />
          </Route>

          {/* User routes - nested under UserLayout */}
          <Route path="/user" element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserLayout />
            </ProtectedRoute>
          }>
            <Route index element={<UserDashboard />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="tickets" element={<UserTicketsPage />} />
            <Route path="sla" element={<UserSlaPage />} />
          </Route>

          {/* Manager routes - nested under ManagerLayout */}
          <Route path="/manager" element={
            <ProtectedRoute allowedRoles={['manager', 'officer']}>
              <ManagerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ManagerDashboard />} />
            <Route path="tickets" element={<ManagerTicketsPage />} />
            <Route path="sla" element={<ManagerSlaPage />} />
            <Route path="pending-approval" element={<PendingApprovalPage />} />
          </Route>

          {/* Executive routes - nested under ExecutiveLayout */}
          <Route path="/executive" element={
            <ProtectedRoute allowedRoles={['executive']}>
              <ExecutiveLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ExecutiveDashboard />} />
            <Route path="tickets" element={<ExecutiveTicketsPage />} />
            <Route path="sla" element={<ExecutiveSlaPage />} />
            <Route path="pending-approval" element={<ExecutivePendingApprovalPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
