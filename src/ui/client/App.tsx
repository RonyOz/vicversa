import { BookOpen, FileStack, LayoutDashboard, ListChecks, type LucideIcon } from "lucide-react";
import { NavLink, Outlet, Route, Routes } from "react-router";
import { ApplicationDetail } from "./pages/ApplicationDetail.js";
import { Applications } from "./pages/Applications.js";
import { Summary } from "./pages/Summary.js";

const NAV: { to: string; label: string; icon: LucideIcon; soon?: boolean }[] = [
  { to: "/", label: "Resumen", icon: LayoutDashboard },
  { to: "/convocatorias", label: "Convocatorias", icon: ListChecks },
  { to: "/cvs", label: "CVs", icon: FileStack, soon: true },
  { to: "/catalogo", label: "Catálogo", icon: BookOpen, soon: true },
];

function Shell() {
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Principal">
        <div className="brand">
          vicversa <span>panel</span>
        </div>
        {NAV.map(({ to, label, icon: Icon, soon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            viewTransition
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}${soon ? " disabled" : ""}`}
            aria-disabled={soon}
          >
            <Icon size={18} /> {label}
            {soon && <span className="soon">pronto</span>}
          </NavLink>
        ))}
        <div className="foot">Datos: tus YAML locales</div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="card empty">
      <p>Esta página no existe.</p>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Summary />} />
        <Route path="convocatorias" element={<Applications />} />
        <Route path="convocatorias/:name" element={<ApplicationDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
