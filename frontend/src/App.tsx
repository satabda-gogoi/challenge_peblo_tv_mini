import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Shows from "./pages/Shows";
import ShowDetails from "./pages/ShowDetails";
import EpisodeEditor from "./pages/EpisodeEditor";
import Publishing from "./pages/Publishing";
import Catalogue from "./pages/Catalogue";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public normal catalogue for viewers */}
        <Route path="/catalogue" element={<Catalogue />} />

        {/* CMS login for admin and editor */}
        <Route path="/login" element={<Login />} />

        {/* Protected CMS management with Admin Sidebar */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/shows" element={<Shows />} />
            <Route path="/shows/:id" element={<ShowDetails />} />
            <Route path="/episodes/:id" element={<EpisodeEditor />} />
            <Route path="/publishing" element={<Publishing />} />
          </Route>
        </Route>

        {/* Fallback routes: viewers default to public catalogue */}
        <Route path="/" element={<Navigate to="/catalogue" replace />} />
        <Route path="*" element={<Navigate to="/catalogue" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
