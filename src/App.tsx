import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import TenantRoute from "@/components/TenantRoute";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import UpdatePassword from "./pages/auth/UpdatePassword"; // <-- NUEVA IMPORTACIÓN
import Index from "./pages/Index";
import Courts from "./pages/Courts";
import BookingCalendar from "./pages/BookingCalendar";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCourts from "./pages/admin/Courts";
import AdminSchedule from "./pages/admin/Schedule";
import AdminCash from "./pages/admin/Cash";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import AdminExpenses from "./pages/admin/Expenses";
import AdminPlayers from "./pages/admin/Players";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing & Auth */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/update-password" element={<UpdatePassword />} /> {/* <-- NUEVA RUTA */}

            {/* Public tenant pages */}
            <Route path="/predio/:slug" element={<TenantRoute />}>
              <Route index element={<Index />} />
              <Route path="courts/:sportId" element={<Courts />} />
              <Route path="booking/:courtId" element={<BookingCalendar />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="confirmation" element={<Confirmation />} />
            </Route>

            {/* Protected admin pages */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/courts" element={<AdminCourts />} />
              <Route path="/admin/schedule" element={<AdminSchedule />} />
              <Route path="/admin/cash" element={<AdminCash />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/expenses" element={<AdminExpenses />} />
              <Route path="/admin/players" element={<AdminPlayers />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;