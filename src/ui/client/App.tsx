import {
  BookOpen, FileStack, FolderGit2, Languages, LayoutDashboard, ListChecks, PanelLeftClose, PanelLeftOpen, type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, Route, Routes } from "react-router";
import { useInfo } from "./api.js";
import { useI18n, type MessageKey } from "./i18n.js";
import { ApplicationDetail } from "./pages/ApplicationDetail.js";
import { Applications } from "./pages/Applications.js";
import { Catalog } from "./pages/Catalog.js";
import { CvGallery } from "./pages/CvGallery.js";
import { CvView } from "./pages/CvView.js";
import { Piece } from "./pages/Piece.js";
import { Summary } from "./pages/Summary.js";
import { Wordmark } from "./Wordmark.js";

const NAV: { to: string; label: MessageKey; icon: LucideIcon }[] = [
  { to: "/", label: "nav.summary", icon: LayoutDashboard },
  { to: "/applications", label: "nav.applications", icon: ListChecks },
  { to: "/cvs", label: "nav.cvs", icon: FileStack },
  { to: "/catalog", label: "nav.catalog", icon: BookOpen },
];

const COLLAPSED_KEY = "vicversa.sidebar.collapsed";

/** Collapsed or not, remembered per browser; "[" toggles it, as in most tools with a sidebar. */
function useCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = useCallback(() => {
    setCollapsed((was) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, was ? "0" : "1");
      } catch {
        // the choice just won't survive a reload
      }
      return !was;
    });
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key === "[" && !typing && !event.metaKey && !event.ctrlKey) toggle();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);
  return [collapsed, toggle];
}

function Shell() {
  const { t, lang, setLang } = useI18n();
  const info = useInfo();
  const [collapsed, toggle] = useCollapsed();
  const toggleLabel = collapsed ? t("nav.expand") : t("nav.collapse");
  return (
    <div className={`shell${collapsed ? " collapsed" : ""}`}>
      <nav className="sidebar" aria-label="vicversa">
        <div className="brand">
          {collapsed ? <span className="monogram" aria-label="vicversa"><em>CV</em></span> : <Wordmark />}
          <button
            type="button"
            className="collapse-toggle"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={toggleLabel}
            data-tip={`${toggleLabel}\n[`}
            data-tip-side="right"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            viewTransition
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            data-tip={collapsed ? t(label) : undefined}
            data-tip-side="right"
            aria-label={t(label)}
          >
            <Icon size={18} /> <span className="nav-label">{t(label)}</span>
          </NavLink>
        ))}
        <div className="foot">
          {info.data && (
            <div className="source" data-tip-side="right" data-tip={`${t("nav.data")}\n${info.data.dataRoot}\n${info.data.template.name}`}>
              <FolderGit2 size={14} />
              <span className="source-text">
                <span className="num">{info.data.demo ? "examples/demo" : info.data.dataRoot}</span>
                <span className="template">{info.data.template.name}</span>
              </span>
            </div>
          )}
          <button
            type="button"
            className="lang-switch"
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            data-tip={collapsed ? t("nav.language") : undefined}
            data-tip-side="right"
            aria-label={t("nav.language")}
          >
            <Languages size={14} /> <span className="nav-label">{t("nav.language")}</span>
          </button>
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="card empty">
      <p>{t("common.notFound")}</p>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Summary />} />
        <Route path="applications" element={<Applications />} />
        <Route path="applications/:name" element={<ApplicationDetail />} />
        <Route path="cvs" element={<CvGallery />} />
        <Route path="cvs/:name" element={<CvView />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="catalog/:kind/:id" element={<Piece />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
