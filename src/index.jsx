import { createRoot } from "react-dom/client";
import App from "./App";
import { registerSW } from "./utils/swRegistration";

// Service Worker 등록
registerSW();

const root = createRoot(document.getElementById("root"));
root.render(<App />);
