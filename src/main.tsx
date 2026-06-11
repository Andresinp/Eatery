import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapHome from "./routes/MapHome";
import ListingDetail from "./routes/ListingDetail";
import Checkout from "./routes/Checkout";
import MyOrders from "./routes/MyOrders";
import OrderDetail from "./routes/OrderDetail";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapHome />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/listing/:id/book" element={<Checkout />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
