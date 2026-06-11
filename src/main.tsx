import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapHome from "./routes/MapHome";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapHome />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
