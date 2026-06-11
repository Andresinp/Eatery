import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapHome from "./routes/MapHome";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { children: _jsx(Routes, { children: _jsx(Route, { path: "/", element: _jsx(MapHome, {}) }) }) }) }));
