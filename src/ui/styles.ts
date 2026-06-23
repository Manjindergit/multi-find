/** Styles injected into the UI shadow root. Isolated from page CSS. */
export const UI_STYLES = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }

.mf-root {
  position: fixed;
  z-index: 2147483645;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  color: #1f2329;
  background: #ffffff;
  border: 1px solid #d0d4da;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mf-root[data-view="panel"] {
  top: 16px;
  right: 16px;
  width: 340px;
  max-height: 80vh;
}

.mf-root[data-view="overview"] {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 560px;
  max-width: 92vw;
  max-height: 86vh;
}

@media (prefers-color-scheme: dark) {
  .mf-root { background: #1f2329; color: #e6e8eb; border-color: #3a4048; }
  .mf-input, .mf-num { background: #2a2f36; color: #e6e8eb; border-color: #444b54; }
  .mf-btn { background: #2a2f36; color: #e6e8eb; border-color: #444b54; }
  .mf-btn:hover { background: #343b44; }
  .mf-term { border-color: #343b44; }
  .mf-snippet { border-color: #343b44; }
}

.mf-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid #e6e8eb;
}
.mf-title { font-weight: 700; font-size: 13px; flex: 1; }
.mf-header .mf-icon-btn { font-size: 14px; }

.mf-body { padding: 10px 12px; overflow-y: auto; }

.mf-add-row { display: flex; gap: 6px; margin-bottom: 10px; }
.mf-input {
  flex: 1; min-width: 0; padding: 6px 8px; font: inherit;
  border: 1px solid #c7ccd3; border-radius: 6px; background: #fff; color: inherit;
}
.mf-input:focus-visible, .mf-num:focus-visible { outline: 2px solid #1a73e8; outline-offset: 0; }

.mf-terms { display: flex; flex-direction: column; gap: 6px; }
.mf-term {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: "swatch query actions" "opts opts count";
  gap: 6px 8px; align-items: center;
  padding: 6px; border: 1px solid #e6e8eb; border-radius: 8px;
}
.mf-term[data-disabled="true"] { opacity: 0.5; }
.mf-swatch {
  grid-area: swatch; width: 22px; height: 22px; padding: 0;
  border: 1px solid rgba(0,0,0,.2); border-radius: 5px; cursor: pointer;
  -webkit-appearance: none; appearance: none; background: none;
}
.mf-swatch::-webkit-color-swatch-wrapper { padding: 0; }
.mf-swatch::-webkit-color-swatch { border: none; border-radius: 4px; }
.mf-term .mf-query { grid-area: query; }
.mf-term-actions { grid-area: actions; display: flex; gap: 2px; align-items: center; }
.mf-opts { grid-area: opts; display: flex; gap: 4px; }
.mf-count { grid-area: count; font-variant-numeric: tabular-nums; color: #5a6470; font-size: 12px; text-align: right; white-space: nowrap; }
.mf-error { grid-area: opts; color: #d93025; font-size: 11px; }

.mf-opt {
  font: 600 11px/1 system-ui, sans-serif; min-width: 24px; height: 22px;
  border: 1px solid #c7ccd3; border-radius: 5px; background: #fff; color: #5a6470;
  cursor: pointer; padding: 0 6px;
}
.mf-opt[aria-pressed="true"] { background: #1a73e8; color: #fff; border-color: #1a73e8; }

.mf-icon-btn {
  border: none; background: transparent; cursor: pointer; color: inherit;
  width: 24px; height: 24px; border-radius: 5px; font-size: 13px; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
}
.mf-icon-btn:hover { background: rgba(0,0,0,.08); }
.mf-icon-btn:focus-visible { outline: 2px solid #1a73e8; }

.mf-footer {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  padding: 8px 12px; border-top: 1px solid #e6e8eb;
}
.mf-pos { font-variant-numeric: tabular-nums; color: #5a6470; margin-right: auto; }
.mf-btn {
  font: 600 12px/1 system-ui, sans-serif; padding: 6px 10px;
  border: 1px solid #c7ccd3; border-radius: 6px; background: #fff; color: inherit; cursor: pointer;
}
.mf-btn:hover { background: #f1f3f5; }
.mf-btn:disabled { opacity: .5; cursor: default; }
.mf-btn:focus-visible { outline: 2px solid #1a73e8; }
.mf-btn-primary { background: #1a73e8; color: #fff; border-color: #1a73e8; }
.mf-btn-primary:hover { background: #1666d0; }

.mf-note { font-size: 11px; color: #8a929c; padding: 4px 0; }
.mf-warn { color: #b06000; font-size: 11px; padding: 4px 0; }
.mf-danger { color: #d93025; }

.mf-section { margin-top: 10px; border-top: 1px solid #e6e8eb; padding-top: 10px; }
.mf-section h3 { font-size: 12px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #5a6470; }
.mf-list { display: flex; flex-direction: column; gap: 4px; }
.mf-list-item { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border: 1px solid #e6e8eb; border-radius: 6px; }
.mf-list-item .mf-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mf-snippets { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.mf-snippet {
  text-align: left; width: 100%; padding: 6px 8px; border: 1px solid #e6e8eb;
  border-radius: 6px; background: transparent; color: inherit; cursor: pointer; font: inherit;
}
.mf-snippet:hover { background: #f1f3f5; }
.mf-snippet[aria-current="true"] { border-color: #1a73e8; background: rgba(26,115,232,.08); }
.mf-snippet mark { padding: 0 1px; border-radius: 2px; }
.mf-snippet .mf-dim { color: #8a929c; }

.mf-minimap {
  position: fixed; top: 0; right: 0; width: 12px; height: 100vh;
  z-index: 2147483644; background: rgba(127,127,127,.08); cursor: pointer;
}
.mf-minimap-mark { position: absolute; right: 1px; width: 10px; height: 2px; border-radius: 1px; }
.mf-minimap-cursor { position: absolute; right: 0; width: 12px; height: 3px; background: #1a73e8; }

.mf-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
.mf-num { width: 84px; padding: 5px 7px; font: inherit; border: 1px solid #c7ccd3; border-radius: 6px; background: #fff; color: inherit; }
.mf-label { font-size: 12px; color: #5a6470; }
.mf-check { display: inline-flex; gap: 4px; align-items: center; font-size: 12px; }

@media (prefers-reduced-motion: no-preference) {
  .mf-root { transition: box-shadow .15s ease; }
}
`;
