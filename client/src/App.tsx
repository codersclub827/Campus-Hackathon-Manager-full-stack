import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AuthPage } from "./pages/Auth";
import { CertificateVerificationPage } from "./pages/CertificateVerification";
import {
  AdminDashboard,
  AIAssistantPage,
  AnalyticsPage,
  CalendarPage,
  CertificatesPage,
  JudgeDashboard,
  LeaderboardPage,
  MentorDashboard,
  NotificationsPage,
  ProfilePage,
  QRAttendancePage,
  SettingsPage,
  StudentDashboard,
  SubmissionPage,
  TeamChatPage,
  TeamDashboard
} from "./pages/Dashboards";
import { Landing } from "./pages/Landing";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/verify-certificate/:certificateId" element={<CertificateVerificationPage />} />
      <Route element={<AppShell />}>
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/team" element={<TeamDashboard />} />
        <Route path="/mentor" element={<MentorDashboard />} />
        <Route path="/judge" element={<JudgeDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/certificates" element={<CertificatesPage />} />
        <Route path="/submission" element={<SubmissionPage />} />
        <Route path="/chat" element={<TeamChatPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/ai" element={<AIAssistantPage />} />
        <Route path="/qr-attendance" element={<QRAttendancePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
