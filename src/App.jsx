import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute, { AdminRoute } from './auth/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Activities from './pages/Activities.jsx'
import Run from './pages/Run.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Profile from './pages/Profile.jsx'
import Plan from './pages/Plan.jsx'
import Calendar from './pages/Calendar.jsx'
import Account from './pages/Account.jsx'
import Status from './pages/Status.jsx'
import SummaryReport from './pages/SummaryReport.jsx'
import ReportProblem from './pages/ReportProblem.jsx'
import MyReports from './pages/MyReports.jsx'
import SupportConsole from './pages/SupportConsole.jsx'
import DownloadPage from './pages/DownloadPage.jsx'
import {
  LandingPage,
  PrivacyPage,
  TermsPage,
} from './pages/PublicPages.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/run" element={<Run />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/account" element={<Account />} />
          <Route path="/summary" element={<SummaryReport />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/support/report" element={<ReportProblem />} />
          <Route path="/support/reports" element={<MyReports />} />

          <Route element={<AdminRoute />}>
            <Route path="/status" element={<Status />} />
            <Route path="/support" element={<SupportConsole />} />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={<ComingSoon title="Page not found" />}
      />
    </Routes>
  )
}