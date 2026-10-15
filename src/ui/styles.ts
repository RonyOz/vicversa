/**
 * Panel styles. Colors are tokens by role (dataviz reference palette), with
 * dark mode as its own selected steps, not an automatic flip. Rejection is
 * orange, never red: this panel exists to lower anxiety, not to alarm.
 */
export const styles = /* css */ `
:root {
  color-scheme: light;
  --page: #f9f9f7;
  --surface: #fcfcfb;
  --ink: #0b0b0b;
  --ink-2: #52514e;
  --muted: #898781;
  --grid: #e1e0d9;
  --axis: #c3c2b7;
  --ring: rgba(11, 11, 11, 0.10);
  --waiting: #2a78d6;
  --silent: #b9b7ae;
  --withdrawn: #6250d6;
  --rejected: #eb6834;
  --advanced: #1baf7a;
  --cal-1: #86b6ef;
  --cal-2: #3987e5;
  --cal-3: #1c5cab;
  --cal-4: #0d366b;
  --cal-ink-light: #0b0b0b;
  --cal-ink-dark: #ffffff;
  --ok-bg: #e7f4e7;
  --ok-ink: #006300;
  --err-bg: #fdecea;
  --err-ink: #a12b2b;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) {
    color-scheme: dark;
    --page: #0d0d0d;
    --surface: #1a1a19;
    --ink: #f0efec;
    --ink-2: #c3c2b7;
    --muted: #898781;
    --grid: #2c2c2a;
    --axis: #383835;
    --ring: rgba(255, 255, 255, 0.10);
    --waiting: #3987e5;
    --silent: #5d5c57;
    --withdrawn: #9085e9;
    --rejected: #d95926;
    --advanced: #199e70;
    --cal-1: #184f95;
    --cal-2: #256abf;
    --cal-3: #3987e5;
    --cal-4: #86b6ef;
    --cal-ink-light: #f0efec;
    --cal-ink-dark: #0b0b0b;
    --ok-bg: #12301a;
    --ok-ink: #7fd07f;
    --err-bg: #3a1716;
    --err-ink: #f2a3a0;
  }
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--page);
  color: var(--ink);
  font: 15px/1.5 Montserrat, system-ui, sans-serif;
}
.num { font-family: "JetBrains Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; }
main { max-width: 1120px; margin: 0 auto; padding: 32px 16px 64px; }

header.top { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
header.top h1 { font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
header.top h1 span { color: var(--muted); font-weight: 500; }
header.top .today { color: var(--ink-2); font-size: 13px; }

.flash { margin: 16px 0 0; padding: 10px 14px; border-radius: 8px; font-size: 14px; }
.flash.ok { background: var(--ok-bg); color: var(--ok-ink); }
.flash.error { background: var(--err-bg); color: var(--err-ink); }

section.card {
  background: var(--surface);
  border-radius: 12px;
  box-shadow: 0 0 0 1px var(--ring);
  padding: 20px 20px 22px;
  margin-top: 20px;
}
section.card h2 { font-size: 15px; font-weight: 700; margin: 0; }
section.card .lede { color: var(--ink-2); font-size: 13px; margin: 2px 0 16px; }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-top: 20px; }
.kpi { background: var(--surface); border-radius: 12px; box-shadow: 0 0 0 1px var(--ring); padding: 14px 16px; }
.kpi .label { font-size: 12px; color: var(--ink-2); display: flex; align-items: center; gap: 6px; }
.kpi .value { font-size: 30px; font-weight: 600; line-height: 1.2; margin-top: 4px; }
.kpi .value small { font-size: 15px; color: var(--muted); font-weight: 500; }
.kpi .hint { font-size: 12px; color: var(--muted); }

.swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex: none; }
.s-waiting { background: var(--waiting); }
.s-silent { background: var(--silent); }
.s-withdrawn { background: var(--withdrawn); }
.s-rejected { background: var(--rejected); }
.s-advanced { background: var(--advanced); }

.funnel-bar { display: flex; gap: 2px; height: 28px; }
.funnel-bar > div { height: 100%; min-width: 4px; }
.funnel-bar > div:first-child { border-radius: 4px 0 0 4px; }
.funnel-bar > div:last-child { border-radius: 0 4px 4px 0; }
.funnel-bar > div:only-child { border-radius: 4px; }
.funnel-legend { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 12px; font-size: 13px; }
.funnel-legend .item { display: flex; align-items: center; gap: 8px; color: var(--ink-2); }
.funnel-legend .item b { color: var(--ink); font-weight: 600; }
.funnel-note { margin-top: 12px; font-size: 13px; color: var(--ink-2); }

.cal-wrap { overflow-x: auto; direction: rtl; } /* starts scrolled at the newest weeks */
.cal { direction: ltr; }
.cal tr > th:first-child { position: sticky; left: 0; z-index: 1; background: var(--surface); }
.cal { border-collapse: separate; border-spacing: 4px; margin: 0 -4px; width: calc(100% + 8px); table-layout: fixed; min-width: 420px; }
.cal col.days { width: 44px; }
.cal th { font-weight: 500; font-size: 11px; color: var(--muted); text-align: center; padding: 0 2px; white-space: nowrap; }
.cal tbody th, .cal tfoot th { text-align: right; padding-right: 8px; }
.cal-months th { color: var(--ink); font-weight: 600; font-size: 12px; text-align: left; text-transform: capitalize; }
.cal td { padding: 0; text-align: center; }
.cal tfoot td { font-size: 12px; color: var(--ink-2); font-weight: 600; padding-top: 4px; border-top: 1px solid var(--axis); }
.cell {
  display: inline-flex; align-items: center; justify-content: center;
  width: 100%; height: 30px; border-radius: 5px; vertical-align: middle;
  font: 600 11px/1 "JetBrains Mono", ui-monospace, monospace;
}
.cell.l0 { background: var(--grid); }
.cell.l1 { background: var(--cal-1); color: var(--cal-ink-light); }
.cell.l2 { background: var(--cal-2); color: var(--cal-ink-dark); }
.cell.l3 { background: var(--cal-3); color: var(--cal-ink-dark); }
.cell.l4 { background: var(--cal-4); color: var(--cal-ink-dark); }
.cell.future { background: transparent; box-shadow: inset 0 0 0 1px var(--grid); }
.cell.today { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink); }
.cal-legend { display: flex; align-items: center; gap: 4px; margin-top: 12px; font-size: 12px; color: var(--muted); }
.cal-legend .cell { width: 14px; height: 14px; border-radius: 3px; }
.cal-legend .cell.today { margin: 0 4px 0 6px; }
.cal-legend .sep { margin: 0 6px; }

.tl-axis, .tl-row { display: grid; grid-template-columns: minmax(180px, 280px) 1fr 176px; gap: 16px; align-items: center; }
.tl-axis { font-size: 11px; color: var(--muted); }
.tl-axis .track { position: relative; height: 16px; }
.tl-axis .tick { position: absolute; transform: translateX(-50%); }
.tl-group { margin-top: 18px; }
.tl-group h3 { font-size: 12px; font-weight: 600; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px; }
.tl-row { padding: 6px 0; border-top: 1px solid var(--grid); position: relative; }
.tl-row:target, .tl-row:has(details[open]) { background: color-mix(in srgb, var(--waiting) 6%, transparent); }
.tl-row .who { min-width: 0; }
.tl-row .who .company { font-weight: 600; font-size: 14px; }
.tl-row .who .role { font-size: 12px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tl-row .track { position: relative; height: 22px; }
.tl-row .gridline { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--grid); }
.tl-row .span { position: absolute; top: 10px; height: 2px; background: var(--ink-2); border-radius: 1px; }
.tl-row .wait { position: absolute; top: 10px; height: 0; border-top: 2px dotted var(--muted); }
.mark { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
.tl-row .mark {
  position: absolute; top: 5px; margin-left: -6px;
  box-shadow: 0 0 0 2px var(--surface); cursor: default;
}
.mark.applied { background: var(--surface); border: 2px solid var(--ink-2); }
.mark.assessment, .mark.interview, .mark.offer, .mark.hired { background: var(--advanced); }
.tl-row .mark.offer, .tl-row .mark.hired { width: 14px; height: 14px; top: 4px; margin-left: -7px; }
.mark.rejected { background: var(--rejected); }
.mark.withdrawn { background: var(--withdrawn); }
.tl-row .meta { font-size: 12px; color: var(--ink-2); text-align: right; white-space: nowrap; }
.tl-row .meta .days { color: var(--ink); }
.tl-row .meta .sent { color: var(--ink); font-weight: 500; }

details.track-form { display: inline; }
details.track-form summary { display: inline; font-size: 12px; color: var(--muted); cursor: pointer; list-style: none; margin-left: 8px; text-decoration: underline dotted; text-underline-offset: 3px; }
details.track-form summary::-webkit-details-marker { display: none; }
details.track-form summary:hover { color: var(--ink); }
details.track-form[open] summary { color: var(--ink); }
details.track-form form {
  position: absolute; left: 0; right: 0; top: calc(100% - 2px); z-index: 2;
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center; text-align: left;
  padding: 10px 12px; background: var(--surface); border-radius: 10px;
  box-shadow: 0 0 0 1px var(--ring), 0 8px 24px rgba(0, 0, 0, 0.12);
}
details.track-form select, details.track-form input, details.track-form button {
  font: inherit; font-size: 13px; padding: 6px 10px; border-radius: 8px;
  border: 1px solid var(--axis); background: var(--page); color: var(--ink);
}
details.track-form input[name="note"] { flex: 1; min-width: 160px; }
details.track-form button { background: var(--ink); color: var(--page); border-color: var(--ink); cursor: pointer; font-weight: 600; }

.legend-marks { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12px; color: var(--ink-2); margin-top: 4px; }
.legend-marks span { display: inline-flex; align-items: center; gap: 6px; }
.legend-marks .mark { width: 10px; height: 10px; }

@media (max-width: 720px) {
  .tl-axis { display: none; }
  .tl-row { grid-template-columns: 1fr auto; }
  .tl-row .track { grid-column: 1 / -1; grid-row: 2; }
}
`;
