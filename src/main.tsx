import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";
import { reportWebVitals } from "@/shared/lib";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

reportWebVitals();
