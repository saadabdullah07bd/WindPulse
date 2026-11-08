import { createRoot } from "react-dom/client";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import App from "./App";
import "./index.css";
import { initTauriBridge } from "./lib/tauriBridge";

initTauriBridge();

createRoot(document.getElementById("root")!).render(<App />);
