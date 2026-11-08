import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTauriBridge } from "./lib/tauriBridge";

initTauriBridge();

createRoot(document.getElementById("root")!).render(<App />);
