import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import JobApplication from "./JobApplication";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <JobApplication />
  </StrictMode>
);