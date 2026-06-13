import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapHome from "./routes/MapHome";
import ListingDetail from "./routes/ListingDetail";
import Checkout from "./routes/Checkout";
import MyOrders from "./routes/MyOrders";
import OrderDetail from "./routes/OrderDetail";
import HostDashboard from "./routes/HostDashboard";
import HostNew from "./routes/HostNew";
import HostManageListing from "./routes/HostManageListing";
import HostEarnings from "./routes/HostEarnings";
import Profile from "./routes/Profile";
import PublicProfile from "./routes/PublicProfile";
import Notifications from "./routes/Notifications";
import Chat from "./routes/Chat";
import Onboarding from "./routes/Onboarding";
import Settings from "./routes/Settings";
import Login from "./routes/auth/Login";
import Register from "./routes/auth/Register";
import Verify from "./routes/auth/Verify";
import OnboardingGate from "./OnboardingGate";
import InstallPrompt from "./components/InstallPrompt";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <OnboardingGate />
      <InstallPrompt />
      <Routes>
        <Route path="/" element={<MapHome />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<PublicProfile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/chat/:order_id" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/verify" element={<Verify />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/listing/:id/book" element={<Checkout />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/host/new" element={<HostNew />} />
        <Route path="/host/listing/:id" element={<HostManageListing />} />
        <Route path="/host/earnings" element={<HostEarnings />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
