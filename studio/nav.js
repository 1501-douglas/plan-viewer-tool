// 1501 Douglas 3D studio: room navigation panel (navigation redesign, Stage 1, build 2026-11-22f).
// Presentation only. It reads data/nav.json (group headings and id references), data/places.json (rooms) and the
// shots in design.json through window.__studio, and moves the camera with the studio's own goShot / focusRoom / setView.
// It stores no room, shot or tour data of its own and changes no design pick. The existing toolbar is left as it is.
const V = '2026-11-22g';
const sleep = ms => new Promise(r => setTimeout(r, ms));
while (!window.__studio) await sleep(50);
const ST = window.__studio, $ = id => document.getElementById(id);
const [NAV, PL] = await Promise.all(['data/nav.json', 'data/places.json'].map(u => fetch(u + '?v=' + V).then(r => r.json())));
const PLACES = PL.places;

// ---------- integrity check (hard requirements): fail closed, show no panel if the data disagree ----------
function check() {
  const errs = [], seenP = new Set(), seenS = new Set(), allShots = new Set();
  for (const id in PLACES) { if (PLACES[id].shot) allShots.add(PLACES[id].shot); }
  const FORBID = ['label', 'name', 'x', 'y', 'yaw', 'pitch', 'fov', 'at', 'eye', 'shot', 'text'];
  for (const F of NAV.floors) for (const Z of F.zones) for (const it of Z.items) {
    for (const k of Object.keys(it)) if (FORBID.includes(k)) errs.push(`nav.json item holds "${k}"`);
    if (it.place) {
      const p = PLACES[it.place];
      if (!p) errs.push(`unknown place ${it.place}`);
      else {
        if (seenP.has(it.place)) errs.push(`place ${it.place} listed twice`);
        if (p.level !== F.level) errs.push(`place ${it.place} is on ${p.level}, listed under ${F.level}`);
        if (p.shot && it.views[0] !== p.shot) errs.push(`place ${it.place}: first view must be its own shot ${p.shot}`);
        if (!p.shot && it.views.length) errs.push(`place ${it.place} has no shot but lists views`);
      }
      seenP.add(it.place);
    } else if (!it.views || !it.views.length) errs.push('item with neither a place nor a view');
    for (const v of it.views || []) {
      const s = ST.shotById(v);
      if (!s) errs.push(`unknown shot ${v}`); else if (s.level !== F.level) errs.push(`shot ${v} is on ${s.level}, listed under ${F.level}`);
      if (seenS.has(v)) errs.push(`shot ${v} listed twice`); seenS.add(v);
    }
  }
  for (const id in PLACES) if (!seenP.has(id)) errs.push(`place ${id} missing from nav.json`);
  return { ok: !errs.length, errs, places: seenP.size, shots: seenS.size };
}
const CHK = check();
window.__nav = { check: () => CHK };
if (!CHK.ok) { console.error('nav.json does not match the studio data; room panel not shown:', CHK.errs); throw new Error('nav check failed'); }

// ---------- labels: rooms from places.json; views from the shot names, with the numbering and floor prefix trimmed ----------
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
function viewLabel(id, room) {
  let t = ST.shotById(id).name.replace(/^\d+[a-z]?\.\s*/, '').replace(/^(First floor|Lower level):\s*/i, '');
  if (room) { const r = room.replace(/\s*\/.*$/, ''); if (t.toLowerCase().startsWith(r.toLowerCase() + ':')) t = t.slice(r.length + 1).trim(); }
  return cap(t);
}

// ---------- styles ----------
document.head.insertAdjacentHTML('beforeend', `<style>
#navPanel { position: fixed; left: 10px; top: 58px; bottom: 10px; width: 280px; z-index: 5; display: none; flex-direction: column; background: rgba(255,255,255,.97); border: 1px solid #bbb; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,.12); font-size: 13px; color: #222; box-sizing: border-box; }
#navPanel.open { display: flex; }
#navPanel .nh { display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 4px 12px; }
#navPanel .nh b { font-size: 14px; }
#navPanel .nx { border: 0; background: none; font-size: 18px; line-height: 1; color: #555; padding: 4px 8px; cursor: pointer; }
#navSearch { margin: 2px 10px 6px; padding: 6px 8px; font-size: 13px; border: 1px solid #bbb; border-radius: 6px; }
#navBody { flex: 1; overflow: auto; padding: 0 6px 6px; }
#navBody .fl { font-weight: 700; font-size: 12px; letter-spacing: .02em; color: #1f4e79; text-transform: uppercase; margin: 10px 6px 2px; }
#navBody .zh { display: flex; width: 100%; align-items: center; gap: 6px; border: 0; background: none; padding: 5px 6px; font-weight: 600; font-size: 13px; color: #333; cursor: pointer; text-align: left; }
#navBody .zh i { font-style: normal; width: 10px; color: #777; }
#navBody .rm, #navBody .vw { display: flex; width: 100%; align-items: center; gap: 6px; border: 0; background: none; text-align: left; cursor: pointer; border-radius: 6px; color: #222; }
#navBody .rm { padding: 6px 8px 6px 22px; font-size: 13px; }
#navBody .vw { padding: 4px 8px 4px 36px; font-size: 12px; color: #4a5560; }
#navBody .rm:hover, #navBody .vw:hover { background: #eef3f8; }
#navBody .on { background: #1f4e79 !important; color: #fff !important; }
#navBody .on .nb { color: #dfe8f1; border-color: #dfe8f1; }
#navBody .nb { margin-left: auto; font-size: 10.5px; color: #6b7680; border: 1px solid #c9d0d6; border-radius: 8px; padding: 0 5px; white-space: nowrap; }
#navBody .zone.shut .items { display: none; }
#navBody .none { color: #777; padding: 8px 10px; }
#navFoot { border-top: 1px solid #e3e6e9; padding: 6px 10px 8px; font-size: 12px; }
#navFoot button { border: 1px solid #bbb; background: #fff; border-radius: 14px; padding: 4px 10px; font-size: 12px; margin: 2px 4px 2px 0; cursor: pointer; color: #222; }
#navFoot button.on { background: #1f4e79; border-color: #1f4e79; color: #fff; }
#navFoot button:disabled { opacity: .45; cursor: default; }
#navFoot .lay { margin-top: 4px; color: #5a6168; }
#navTab { position: fixed; left: 10px; top: 58px; z-index: 5; display: none; border: 1px solid #bbb; background: rgba(255,255,255,.95); border-radius: 18px; padding: 7px 13px; font-size: 14px; color: #1f4e79; cursor: pointer; }
#navTab.show { display: block; }
body.navOpen #note { left: 300px; }
body.navOpen #legend, body.navOpen #elegend { left: 300px !important; }
body.navOpen #legend { top: var(--navTop, 58px) !important; }
body.navOpen #cmpL { margin-left: 290px; }
@media (max-width: 700px), (max-height: 500px) {
  #navPanel { left: 0 !important; right: 0; top: auto !important; bottom: 0; width: 100%; max-height: 48vh; border-radius: 14px 14px 0 0; border-width: 1px 0 0 0; box-shadow: 0 -4px 16px rgba(0,0,0,.15); padding-bottom: env(safe-area-inset-bottom); z-index: 6; }
  #navPanel.open { height: 48vh; }
  #navBody .rm { padding-top: 11px; padding-bottom: 11px; font-size: 14px; }
  #navBody .vw { padding-top: 9px; padding-bottom: 9px; font-size: 13px; }
  #navFoot .lay { display: none; }
  #navTab { font-size: 13px; padding: 6px 11px; }
  body.navOpen #note, body.navOpen #legend, body.navOpen #elegend { left: 8px !important; }
  body.navOpen #cmpL { margin-left: 0; }
}
</style>`);

// ---------- DOM ----------
const panel = document.createElement('nav'); panel.id = 'navPanel'; panel.setAttribute('aria-label', 'Rooms and views');
panel.innerHTML = `<div class="nh"><b>Rooms</b><button class="nx" id="navClose" title="Hide the room list" aria-label="Hide the room list">&lsaquo;</button></div>
<input id="navSearch" type="search" placeholder="Search rooms and views" aria-label="Search rooms and views" autocomplete="off">
<div id="navBody"></div>
<div id="navFoot"><button id="navBack" disabled title="Return to the view before your last jump">&larr; Previous view</button>
<div class="lay">Panel: <button id="navLayO" title="The list sits over the left edge of the model">Overlay</button><button id="navLayF" title="The model is re-centred in the space beside the list">Re-centre model</button></div></div>`;
const tab = document.createElement('button'); tab.id = 'navTab'; tab.textContent = 'Rooms ›'; tab.title = 'Show the room list';
document.body.append(panel, tab);
const body = $('navBody'), search = $('navSearch');
const NOSHOT = '<span class="nb" title="No saved view: framed from above">from above</span>';
const KZ = 'studio.navZones', KP = 'studio.navPanel', KL = 'studio.navLayout';
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
let shut = {}; try { shut = JSON.parse(ls.get(KZ) || '{}') || {}; } catch (e) { shut = {}; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function render() {
  let h = '';
  for (const F of NAV.floors) {
    h += `<div class="fl" data-floor="${F.level}">${esc(F.heading)}</div>`;
    for (const Z of F.zones) {
      h += `<div class="zone${shut[Z.id] ? ' shut' : ''}" data-zone="${Z.id}"><button class="zh" data-z="${Z.id}" aria-expanded="${!shut[Z.id]}"><i>${shut[Z.id] ? '▸' : '▾'}</i>${esc(Z.heading)}</button><div class="items">`;
      for (const it of Z.items) {
        const room = it.place ? PLACES[it.place].label : null;
        if (it.place) h += `<button class="rm" data-place="${it.place}" data-text="${esc(room.toLowerCase())}">${esc(room)}${PLACES[it.place].shot ? '' : NOSHOT}</button>`;
        for (const v of it.views) {
          if (it.place && it.views.length === 1) continue;     // a room whose only view is its own shot: the room button is that view
          const t = viewLabel(v, room);
          h += `<button class="vw" data-shot="${v}" data-place="${it.place || ''}" data-text="${esc((t + ' ' + (room || '')).toLowerCase())}">${esc(t)}</button>`;
        }
      }
      h += '</div></div>';
    }
  }
  body.innerHTML = h;
  highlight(true);
}

// ---------- moving the camera ----------
let prev = null, focused = null;   // focused: a room with no shot, framed from above (highlighted while the camera stays there)
function remember() { prev = ST.view(); $('navBack').disabled = false; }
function goPlace(id) {
  const p = PLACES[id]; remember();
  if (p.shot) { focused = null; ST.goShot(ST.shotById(p.shot)); }
  else { ST.focusRoom(p.level, p.at[0], p.at[1]); focused = { id, t: ST.view().t }; }
  afterJump();
}
function goView(id) { remember(); focused = null; ST.goShot(ST.shotById(id)); afterJump(); }
function goBack() { if (!prev) return; const v = prev; prev = null; $('navBack').disabled = true; ST.setView(v); afterJump(); }
function afterJump() { if (phone()) setOpen(false); highlight(true); }

let lastKey = '';
function highlight(force) {
  const v = ST.view();
  if (focused && (v.shot || v.mode === 'walk' || Math.hypot(v.t[0] - focused.t[0], v.t[1] - focused.t[1], v.t[2] - focused.t[2]) > 0.05)) focused = null;   // a small tolerance: orbit damping can nudge the target
  const key = v.shot || (focused ? 'p:' + focused.id : '');
  if (!force && key === lastKey) return; lastKey = key;
  for (const b of body.querySelectorAll('.on')) b.classList.remove('on');
  if (focused) { const rb = body.querySelector(`.rm[data-place="${focused.id}"]`); if (rb) rb.classList.add('on'); return; }
  if (!v.shot) return;
  const vb = body.querySelector(`.vw[data-shot="${v.shot}"]`);
  if (vb) vb.classList.add('on');
  else for (const id in PLACES) if (PLACES[id].shot === v.shot) { const rb = body.querySelector(`.rm[data-place="${id}"]`); if (rb) rb.classList.add('on'); }
}
setInterval(() => highlight(false), 400);

body.addEventListener('click', e => {
  const z = e.target.closest('.zh'), r = e.target.closest('.rm'), w = e.target.closest('.vw');
  if (z) { const id = z.dataset.z; shut[id] = !shut[id]; ls.set(KZ, JSON.stringify(shut)); render(); filter(); }
  else if (r) goPlace(r.dataset.place);
  else if (w) goView(w.dataset.shot);
});

// ---------- search ----------
function filter() {
  const q = search.value.trim().toLowerCase();
  for (const zone of body.querySelectorAll('.zone')) {
    let n = 0;
    for (const b of zone.querySelectorAll('.rm, .vw')) { const hit = !q || b.dataset.text.includes(q); b.style.display = hit ? '' : 'none'; if (hit) n++; }
    zone.style.display = n ? '' : 'none';
    if (q) zone.classList.remove('shut'); else zone.classList.toggle('shut', !!shut[zone.dataset.zone]);
  }
  for (const fl of body.querySelectorAll('.fl')) {
    let el = fl.nextElementSibling, any = false;
    while (el && !el.classList.contains('fl')) { if (el.style.display !== 'none') any = true; el = el.nextElementSibling; }
    fl.style.display = any ? '' : 'none';
  }
  let none = body.querySelector('.none');
  const shown = [...body.querySelectorAll('.zone')].some(z => z.style.display !== 'none');
  if (!shown && !none) body.insertAdjacentHTML('beforeend', '<div class="none">No room or view matches.</div>');
  if (shown && none) none.remove();
}
search.addEventListener('input', filter);
// typing in the search box must not walk the camera (the studio listens for W, A, S, D and arrows on the window)
for (const ev of ['keydown', 'keyup']) search.addEventListener(ev, e => { if (e.key === 'Escape' && ev === 'keydown') { search.value = ''; filter(); search.blur(); } e.stopPropagation(); });

// ---------- open, close, layout ----------
const phone = () => matchMedia('(max-width: 700px), (max-height: 500px)').matches;
let open = false, layout = ls.get(KL) === 'offset' ? 'offset' : 'overlay';
function place() {
  if (phone()) { panel.style.top = ''; tab.style.top = ''; }
  const bar = $('bar'), b = bar ? bar.getBoundingClientRect().bottom : 48;
  const top = Math.round(b + 8) + 'px';
  document.documentElement.style.setProperty('--navTop', top);   // the assumptions legend moves beside the panel, below the toolbar
  if (!phone()) panel.style.top = top;
  tab.style.top = tabTop(b) + 'px';
  applyOffset();
}
// the Rooms tab sits under the toolbar, and under the walk bar when that bar reaches across it (phones while walking)
function tabTop(barBottom) {
  let t = barBottom + 8; const hud = $('walkHud');
  if (hud && getComputedStyle(hud).display !== 'none') { const r = hud.getBoundingClientRect(); if (r.left < 10 + (tab.offsetWidth || 100) + 8) t = Math.max(t, r.bottom + 8); }
  return Math.round(t);
}
setInterval(() => { const bar = $('bar'); const t = tabTop(bar ? bar.getBoundingClientRect().bottom : 48) + 'px'; if (tab.style.top !== t) tab.style.top = t; }, 400);
function applyOffset() {
  const dx = open && !phone() && layout === 'offset' ? Math.round((panel.getBoundingClientRect().right + 10) / 2) : 0;
  if (ST.navOffset) ST.navOffset(dx);
}
function setOpen(v) {
  open = v; panel.classList.toggle('open', v); tab.classList.toggle('show', !v);
  document.body.classList.toggle('navOpen', v && !phone());
  if (!phone()) ls.set(KP, v ? 'open' : 'closed');
  if (v && phone()) {   // one sheet at a time on a phone
    for (const id of ['dpanel', 'spanel', 'rpanel', 'lpanel']) { const el = $(id); if (el) el.style.display = 'none'; }
    for (const id of ['bDes', 'bShots', 'bReg']) { const el = $(id); if (el) el.classList.remove('on'); }
    const note = $('note'); if (note) note.style.display = 'none';   // as the other sheets do (openPanel)
  }
  applyOffset();
}
function setLayout(m) { layout = m; ls.set(KL, m); $('navLayO').classList.toggle('on', m === 'overlay'); $('navLayF').classList.toggle('on', m === 'offset'); applyOffset(); }
$('navClose').onclick = () => setOpen(false);
tab.onclick = () => setOpen(true);
$('navBack').onclick = goBack;
$('navLayO').onclick = () => setLayout('overlay');
$('navLayF').onclick = () => setLayout('offset');
// on a phone, opening another panel from the toolbar closes the room sheet
for (const id of ['bDes', 'bShots', 'bReg', 'bEl']) { const el = $(id); if (el) el.addEventListener('click', () => { if (phone() && open) setOpen(false); }); }
addEventListener('resize', () => { document.body.classList.toggle('navOpen', open && !phone()); place(); });

render(); setLayout(layout);
setOpen(!phone() && ls.get(KP) !== 'closed');
place();
Object.assign(window.__nav, { open: () => setOpen(true), close: () => setOpen(false), isOpen: () => open, layout: () => layout, setLayout, goPlace, goView, goBack, filter: q => { search.value = q; filter(); }, V });
