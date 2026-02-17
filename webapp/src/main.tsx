import { createRoot } from "react-dom/client";
import React from 'react';
import App from "./App.js";
import { ThirdwebProvider } from "thirdweb/react";
import "./index.css";
createRoot(document.getElementById("root")!).render(
    <ThirdwebProvider>
        <App />
    </ThirdwebProvider>
);
