import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import "./styles/accents.css";
import "./styles/app-styles.css";
import App from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import { ThemeProvider } from "./theme/ThemeProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
