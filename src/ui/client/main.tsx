import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App.js";
import { I18nProvider } from "./i18n.js";
import "./styles.css";
import { ToastProvider } from "./toast.js";
import { TooltipLayer } from "./Tooltip.js";

// Data is local and only changes through this app (or a YAML edit): refetch
// when the window regains focus, otherwise trust the cache.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <ToastProvider>
            <App />
            <TooltipLayer />
          </ToastProvider>
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
