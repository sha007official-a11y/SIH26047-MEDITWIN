import React, { useEffect } from "react";
import WebTools from "./components/WebTools";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { Provider, useApp } from "./lib/context";
import { Loading, Empty, Button } from "./components/ui";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Layout from "./components/Layout";
import { PatientDashboard, TimelinePage, ProfilePage } from "./pages/Patient";
import Assessment from "./pages/Assessment";
import {
  RecordsPage,
  MedicationsPage,
  AyushPage,
  AppointmentsPage,
} from "./pages/Records";
import { DoctorDashboard, DoctorCase, DoctorSettings } from "./pages/Doctor";
function Protected({ role }) {
  const { user, ready } = useApp();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to={`/login/${role}`} replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <Outlet />;
}
class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <Empty
        title="This page needs a fresh start"
        action={
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        }
      >
        Your saved information is still available.
      </Empty>
    ) : (
      this.props.children
    );
  }
}
function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <ErrorBoundary>
      <Provider>
        <WebTools />
        <ScrollTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login/:role" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route element={<Protected role="patient" />}>
            <Route element={<Layout />}>
              <Route path="/patient" element={<PatientDashboard />} />
              <Route path="/patient/assessment/:id" element={<Assessment />} />
              <Route path="/patient/records" element={<RecordsPage />} />
              <Route path="/patient/timeline" element={<TimelinePage />} />
              <Route
                path="/patient/medications"
                element={<MedicationsPage />}
              />
              <Route path="/patient/ayush" element={<AyushPage />} />
              <Route
                path="/patient/appointments"
                element={<AppointmentsPage />}
              />
              <Route path="/patient/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route element={<Protected role="doctor" />}>
            <Route element={<Layout />}>
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route
                path="/doctor/queue"
                element={<DoctorDashboard view="queue" />}
              />
              <Route
                path="/doctor/search"
                element={<DoctorDashboard view="search" />}
              />
              <Route
                path="/doctor/reports"
                element={<DoctorDashboard view="reports" />}
              />
              <Route
                path="/doctor/appointments"
                element={<AppointmentsPage doctor />}
              />
              <Route path="/doctor/case/:id" element={<DoctorCase />} />
              <Route path="/doctor/settings" element={<DoctorSettings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Provider>
    </ErrorBoundary>
  );
}
