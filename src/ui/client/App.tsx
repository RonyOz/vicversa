import { BookOpen, FileStack, FolderGit2, Languages, LayoutDashboard, ListChecks, type LucideIcon } from "lucide-react";
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

function Shell() {
  const { t, lang, setLang } = useI18n();
  const info = useInfo();
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="vicversa">
        <div className="brand">
          <Wordmark />
        </div>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} viewTransition className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <Icon size={18} /> {t(label)}
          </NavLink>
        ))}
        <div className="foot">
          {info.data && (
            <div className="source" data-tip={`${t("nav.data")}\n${info.data.dataRoot}`}>
              <FolderGit2 size={14} />
              <span>
                <span className="num">{info.data.demo ? "examples/demo" : info.data.dataRoot}</span>
                <span className="template">{info.data.template.name}</span>
              </span>
            </div>
          )}
          <button type="button" className="lang-switch" onClick={() => setLang(lang === "en" ? "es" : "en")}>
            <Languages size={14} /> {t("nav.language")}
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
