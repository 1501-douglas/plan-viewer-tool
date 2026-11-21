// 1501 Douglas 3D Design Studio: presentation layer (11/20/2026)
// Opening screen, guided tour, shareable view links and plan-viewer handoff.
// Presentation only: it moves the camera and applies existing finish picks through window.__studio.
// It adds no geometry and changes no records.
const V = '2026-11-21d';   // studio files version
const VIEWER = '../1501-Douglas-Sheet-Viewer.html?v=2026-11-20';
const K_SEEN = 'douglas.studio.intro.seen', K_PICK = 'douglas.studio.pick.v3';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

while (!window.__studio) await sleep(50);
const ST = window.__studio;
const [PL, TOUR, DS] = await Promise.all(['data/places.json', 'data/tour.json', 'data/design.json'].map(u => fetch(u + '?v=' + V).then(r => r.json())));
const PLACES = PL.places, shotName = s => s.name.replace(/^\d+[a-z]?\.\s*/, '');
const narrow = () => ST.narrow();

// ---------- styles ----------
document.head.insertAdjacentHTML('beforeend', `<style>
#bTour, #bHelp { pointer-events: auto; }
#pIntro { position: fixed; inset: 0; z-index: 20; background: rgba(20,28,36,.55); display: none; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }
#pIntro .card { background: #fff; border-radius: 14px; max-width: 520px; width: 100%; max-height: calc(100vh - 32px); overflow: auto; padding: 20px 20px 16px; box-sizing: border-box; box-shadow: 0 10px 40px rgba(0,0,0,.25); font-size: 14px; line-height: 1.45; color: #1b2a38; }
#pIntro h1 { font-size: 20px; margin: 0 0 2px; } #pIntro .kick { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: #8a5a00; font-weight: 700; margin: 0 0 10px; }
#pIntro p { margin: 0 0 12px; } #pIntro .fine { color: #5a6168; font-size: 12px; margin: 10px 0 0; }
.pAct { display: block; width: 100%; text-align: left; border: 1px solid #c9d3dc; background: #fff; border-radius: 10px; padding: 10px 12px; margin: 0 0 8px; font: inherit; color: #1b2a38; cursor: pointer; }
.pAct b { display: block; font-size: 15px; } .pAct span { color: #5a6168; font-size: 12.5px; }
.pAct.primary { background: #1f4e79; border-color: #1f4e79; color: #fff; } .pAct.primary span { color: #d6e4f0; }
.pAct:hover { border-color: #1f4e79; } .pAct:focus-visible, .pBtn:focus-visible { outline: 3px solid #9bbbd9; outline-offset: 2px; }
.pLinks { font-size: 13px; text-align: center; margin: 4px 0 0; } .pLinks button { border: 0; background: none; color: #1f4e79; text-decoration: underline; font: inherit; padding: 4px 6px; cursor: pointer; }
#pTour { position: fixed; left: 50%; transform: translateX(-50%); bottom: 14px; width: min(520px, calc(100vw - 20px)); z-index: 12; background: rgba(255,255,255,.97); border: 1px solid #b9c6d2; border-radius: 12px; padding: 10px 12px; box-sizing: border-box; display: none; font-size: 13.5px; line-height: 1.4; color: #1b2a38; box-shadow: 0 4px 18px rgba(0,0,0,.18); }
#pTour .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 3px; }
#pTour .tag { display: inline-block; font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 8px; background: #eef3f8; color: #1f4e79; }
#pTour .tag.open { background: #fbe9e7; color: #a33a2a; } #pTour .tag.concept { background: #efe9f7; color: #5b3f8f; }
#pTour h3 { margin: 2px 0 3px; font-size: 15px; } #pTour p { margin: 0 0 8px; }
#pTour .row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.pBtn { border: 1px solid #bbb; background: #fff; border-radius: 16px; padding: 6px 12px; font: inherit; font-size: 13px; color: #222; cursor: pointer; }
.pBtn.primary { background: #1f4e79; border-color: #1f4e79; color: #fff; } .pBtn:disabled { opacity: .45; }
#pTour .plan { margin-left: auto; font-size: 12.5px; color: #1f4e79; }
#pTour .x, #pLink .x { border: 0; background: none; font-size: 18px; line-height: 1; color: #666; padding: 0 2px; cursor: pointer; }
#pLink { position: fixed; left: 50%; transform: translateX(-50%); top: 56px; width: min(560px, calc(100vw - 20px)); z-index: 11; background: #fbf6e6; border: 1px solid #c9b27c; border-radius: 10px; padding: 8px 11px; box-sizing: border-box; display: none; font-size: 13px; line-height: 1.4; color: #3a2e10; }
#pLink .row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; align-items: center; }
#pShare { margin-top: 8px; } #pShare input { width: 100%; box-sizing: border-box; font-size: 12px; padding: 5px; border: 1px solid #bbb; border-radius: 6px; margin-top: 4px; }
@media (max-width: 700px), (max-height: 500px) {
  #pIntro { align-items: flex-end; padding: 0; } #pIntro .card { border-radius: 16px 16px 0 0; max-width: none; padding: 16px 16px calc(14px + env(safe-area-inset-bottom)); }
  #pIntro h1 { font-size: 18px; } #pIntro .long { display: none; }
  #pTour { bottom: calc(8px + env(safe-area-inset-bottom)); padding: 8px 10px; font-size: 13px; } #pTour p { margin-bottom: 6px; }
  #pLink { top: 48px; font-size: 12.5px; }
}
@media (min-width: 701px) and (min-height: 501px) { #pIntro .short { display: none; } }
</style>`);

// ---------- toolbar: Tour and ? (help) next to the Hub button ----------
const bar = $('bar'), hub = $('bHub');
hub.insertAdjacentHTML('afterend', '<button id="bTour" title="Guided tour of the model">Tour</button><button id="bHelp" title="What this is and how to use it" aria-label="Help">?</button>');

// ---------- shared helpers ----------
function hideStudioChrome() { if (ST.walkPrompt) ST.walkPrompt(false); for (const id of ['dpanel', 'spanel', 'rpanel', 'lpanel']) $(id).style.display = 'none'; for (const b of ['bDes', 'bShots', 'bReg']) $(b).classList.remove('on'); $('pick').style.display = 'none'; }
function goPlace(id) {
  const p = PLACES[id]; if (!p) return false;
  const s = p.shot && ST.shotById(p.shot);
  if (s) ST.goShot(s); else ST.focusRoom(p.level, p.at[0], p.at[1]);
  return true;
}
const viewerLink = id => VIEWER + '#room=' + encodeURIComponent(id);
function setLayers(keys) { for (const cb of document.querySelectorAll('#lpanel input')) { const want = keys.includes(cb.dataset.l); if (cb.checked !== want) { cb.checked = want; cb.dispatchEvent(new Event('change')); } } }

// ---------- 1. opening screen ----------
const intro = document.createElement('div'); intro.id = 'pIntro'; intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true'); intro.setAttribute('aria-labelledby', 'pIntroH');
intro.innerHTML = `<div class="card">
  <div class="kick">Owner design and reference model</div>
  <h1 id="pIntroH">1501 Douglas St NE in 3D</h1>
  <p class="long">A walk-through model of the owner's design for the renovation and the lower-level apartment, kept in step with the owner sheets (11/20). Use it to understand the layout, the house systems and the finish concept.</p>
  <p class="short">The owner's design for the house and the lower-level apartment, as of 11/20.</p>
  <p style="font-size:12.5px;color:#5a4a20;background:#fbf6e6;border-radius:8px;padding:7px 9px">Not an approved construction document and not to dimension. Walls are within about 4 in; the architect's drawings govern.</p>
  <button class="pAct primary" data-act="tour"><b>Take the tour</b><span>8 stops, about 2 minutes</span></button>
  <button class="pAct long" data-act="adu"><b>Walk the apartment</b><span>Start at the apartment door and look around</span></button>
  <button class="pAct long" data-act="systems"><b>See the house systems</b><span>Ducts and fire separation on the lower level, as layers</span></button>
  <button class="pAct" data-act="explore"><b>Explore on my own</b><span>Every control stays available</span></button>
  <div class="pLinks short"><button data-act="adu">Walk the apartment</button> · <button data-act="systems">See the systems</button></div>
  <p class="fine">This welcome shows once. Tap <b>?</b> at the top to see it again, or <b>Tour</b> to restart the tour. <a href="${VIEWER}">Open the plan viewer</a>.</p>
</div>`;
document.body.appendChild(intro);
let introFocus = null;
function openIntro() { hideStudioChrome(); stopTour(); introFocus = document.activeElement; intro.style.display = 'flex'; $('note').style.display = 'none'; setTimeout(() => intro.querySelector('.pAct.primary').focus(), 0); }
function closeIntro() { intro.style.display = 'none'; ls.set(K_SEEN, '1'); if (introFocus && introFocus.focus) introFocus.focus(); }
intro.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b && e.target !== intro) return;
  closeIntro(); const a = b ? b.dataset.act : 'explore';
  if (a === 'tour') startTour(0);
  else if (a === 'adu') { const s = ST.shotById('adu-entry'); if (s) { ST.goShot(s); if (ST.walkPrompt) ST.walkPrompt(true); } }   // an explicit walk: show the controls (the mouse is taken only by Start walking)
  else if (a === 'systems') { ST.setView({ mode: 'doll', level: 'lower' }); setLayers(['hvac', 'rated']); }
});
intro.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeIntro(); } e.stopPropagation(); });
$('bHelp').onclick = openIntro;

// ---------- 2. guided tour ----------
const STOPS = TOUR.stops.filter(t => t.cam || ST.shotById(t.shot));
const tourEl = document.createElement('div'); tourEl.id = 'pTour'; tourEl.setAttribute('role', 'region'); tourEl.setAttribute('aria-label', 'Guided tour'); tourEl.setAttribute('aria-live', 'polite');
document.body.appendChild(tourEl);
let tourAt = -1;
const tagClass = t => /open/i.test(t) && !/decision/i.test(t) ? ' open' : /concept/i.test(t) ? ' concept' : '';
function renderTour() {
  if (tourAt < 0) { tourEl.style.display = 'none'; return; }
  if (tourAt >= STOPS.length) {
    tourEl.innerHTML = `<div class="top"><b>That's the tour</b><button class="x" data-t="exit" aria-label="Close the tour">×</button></div>
      <p>From here: <b>Layers</b> shows wiring, ducts, plumbing and fire separation. <b>Design</b> compares finish schemes and arranges furniture. <b>Show assumptions</b> colors every object by how sure it is, and a tap says why.</p>
      <div class="row"><button class="pBtn" data-t="back">Back</button><button class="pBtn" data-t="restart">Start over</button><button class="pBtn primary" data-t="exit">Done</button></div>`;
  } else {
    const t = STOPS[tourAt];
    tourEl.innerHTML = `<div class="top"><span><span class="tag${tagClass(t.tag)}">${esc(t.tag)}</span> <span class="muted" style="font-size:12px;color:#5a6168">Stop ${tourAt + 1} of ${STOPS.length}</span></span><button class="x" data-t="exit" aria-label="Exit the tour">×</button></div>
      <h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>${tourAt === 0 ? `<p style="font-size:12px;color:#5a6168">${matchMedia('(pointer: coarse)').matches ? 'Drag on the right half of the screen to look around; slide your thumb on the left half to walk.' : 'Click the view, then use the mouse to look and W A S D to walk.'}</p>` : ''}
      <div class="row"><button class="pBtn" data-t="back"${tourAt === 0 ? ' disabled' : ''}>Back</button><button class="pBtn primary" data-t="next">${tourAt === STOPS.length - 1 ? 'Finish' : 'Next'}</button>
      <a class="plan" href="${viewerLink(t.place)}">See it on the plan</a></div>`;
  }
  tourEl.style.display = 'block';
}
function showStop(i) {
  tourAt = Math.max(0, Math.min(STOPS.length, i));
  const t = STOPS[tourAt];
  if (t) ST.goShot(t.cam ? { id: 'tour-' + tourAt, level: ST.shotById(t.shot)?.level || 'lower', ...t.cam } : ST.shotById(t.shot));
  ST.highlight(t && t.highlight ? t.highlight : null);
  renderTour(); $('note').style.display = 'none'; $('elegend').style.display = 'none';
}
function startTour(i = 0) { hideStudioChrome(); closeLink(false); showStop(i); }
function stopTour() { tourAt = -1; ST.highlight(null); renderTour(); }
tourEl.addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const a = b.dataset.t;
  if (a === 'next') showStop(tourAt + 1); else if (a === 'back') showStop(tourAt - 1); else if (a === 'restart') showStop(0); else stopTour();
});
tourEl.addEventListener('keydown', e => e.stopPropagation());
addEventListener('keydown', e => { if (tourAt < 0 || intro.style.display === 'flex' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
  if (e.key === 'Escape') stopTour(); if (e.key === ']' || e.key === 'PageDown') showStop(tourAt + 1); if (e.key === '[' || e.key === 'PageUp') showStop(tourAt - 1); });
$('bTour').onclick = () => (tourAt >= 0 ? stopTour() : startTour(0));
addEventListener('studio:walkexit', () => { if (tourAt >= 0) stopTour(); });   // Exit walk also ends the tour
// the tour steps aside when another panel opens
for (const id of ['bDes', 'bShots', 'bReg', 'bEl']) $(id).addEventListener('click', () => { if (tourAt >= 0) stopTour(); });

// ---------- 3. shareable links ----------
// #shot=<id> | #room=<place id> | #m=walk&lv=first&x=..&y=..&yaw=..&pitch=.. | #m=doll|top&lv=..&c=x,y,z&t=x,y,z
// finishes: &finish=<scheme id> plus any of the non-finish options that differ (tvwall, famuse, brick, staging, foyer), or &p=<every option, in order>
const r2 = n => Math.round(n * 100) / 100, r3 = n => Math.round(n * 1000) / 1000;
function finishParams() {
  const p = ST.pick(), F = ST.finishCats, out = new URLSearchParams();
  const s = ST.schemes.find(s => F.every(k => s.pick[k] === p[k]));
  if (s) { out.set('finish', s.id); for (const k of ST.cats) if (!F.includes(k) && p[k] !== s.pick[k]) out.set(k, p[k]); }
  else out.set('p', ST.cats.map(k => p[k]).join('.'));
  return out;
}
function linkFor() {
  const v = ST.view(), q = new URLSearchParams();
  if (v.shot && v.mode === 'walk' && ST.shotById(v.shot)) q.set('shot', v.shot);
  else { q.set('m', v.mode); q.set('lv', v.level);
    if (v.mode === 'walk') { q.set('x', r2(v.w.x)); q.set('y', r2(v.w.y)); q.set('yaw', r3(v.w.yaw)); q.set('pitch', r3(v.w.pitch)); }
    else { q.set('c', v.c.map(r3).join(',')); q.set('t', v.t.map(r3).join(',')); } }
  for (const [k, val] of finishParams()) q.set(k, val);
  return location.href.split('#')[0].split('?')[0] + '#' + q.toString();
}
function readLink() {
  const h = location.hash.slice(1); if (!h) return null;
  const q = new URLSearchParams(h); if (![...q.keys()].some(k => ['shot', 'room', 'm', 'finish', 'p'].includes(k))) return null;
  return q;
}
const linkEl = document.createElement('div'); linkEl.id = 'pLink'; linkEl.setAttribute('role', 'status'); document.body.appendChild(linkEl);
let linkPrev = null;
function closeLink(restore) {
  if (linkEl.style.display !== 'block') return;
  linkEl.style.display = 'none'; history.replaceState(null, '', location.pathname + location.search);
  if (restore && linkPrev) { ST.setPick(linkPrev.pick); ls.set(K_PICK, linkPrev.raw); ST.setView({ mode: 'doll', level: 'first' }); }
}
function applyLink(q) {
  const notes = [], prevRaw = ls.get(K_PICK); linkPrev = { pick: ST.pick(), raw: prevRaw };
  // finishes first (setting finishes switches to the lower level; the view below sets the level it needs)
  let fin = null;
  if (q.get('finish') && ST.schemes.find(s => s.id === q.get('finish'))) {
    const s = ST.schemes.find(s => s.id === q.get('finish')), extra = {};
    for (const k of ST.cats) if (!ST.finishCats.includes(k)) extra[k] = q.has(k) && DS.options[k].items[q.get(k)] ? q.get(k) : s.pick[k];
    fin = { ...s.pick, ...extra };
  } else if (q.get('p')) {
    const vals = q.get('p').split('.');
    if (vals.length === ST.cats.length && ST.cats.every((k, i) => DS.options[k].items[vals[i]])) fin = Object.fromEntries(ST.cats.map((k, i) => [k, vals[i]]));
    else notes.push('The finishes in this link name options this version does not have, so your own finishes are shown.');
  }
  if (fin) { ST.setPick(fin); ls.set(K_PICK, prevRaw); }   // shown now, but the visitor's own saved finishes are kept
  // then the view
  let what = '';
  const num = k => { const n = parseFloat(q.get(k)); return Number.isFinite(n) ? n : null; };
  const vec = k => { const a = (q.get(k) || '').split(',').map(Number); return a.length === 3 && a.every(Number.isFinite) ? a : null; };
  if (q.get('shot') && ST.shotById(q.get('shot'))) { const s = ST.shotById(q.get('shot')); ST.goShot(s); what = shotName(s); }
  else if (q.get('room') && PLACES[q.get('room')]) { goPlace(q.get('room')); what = PLACES[q.get('room')].label; }
  else if (q.get('m')) {
    const lv = q.get('lv') === 'lower' ? 'lower' : 'first', m = q.get('m');
    if (m === 'walk' && num('x') !== null && num('y') !== null) { ST.setView({ mode: 'walk', level: lv, w: { x: num('x'), y: num('y'), yaw: num('yaw') || 0, pitch: num('pitch') || 0 } }); what = 'an eye-level view, ' + (lv === 'lower' ? 'lower level' : 'first floor'); }
    else if (m === 'doll' || m === 'top') { ST.setView({ mode: m, level: lv, c: vec('c'), t: vec('t') }); what = (m === 'top' ? 'the top view' : 'the dollhouse view') + ', ' + (lv === 'lower' ? 'lower level' : 'first floor'); }
  }
  if (!what && (q.get('shot') || q.get('room') || q.get('m'))) notes.push('The view in this link was not recognized.');
  linkEl.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px"><span><b>Opened from a link.</b> ${what ? 'View: ' + esc(what) + '. ' : ''}${fin ? 'Finishes: ' + esc(ST.pickName()) + '.' : ''}</span><button class="x" aria-label="Dismiss">×</button></div>
    <div style="font-size:12px;color:#5a4a20;margin-top:2px">Owner design and reference model, not an approved construction document.${fin ? ' Your own saved finishes are kept.' : ''} ${notes.map(esc).join(' ')}</div>
    <div class="row">${fin ? '<button class="pBtn" data-l="back">Return to my own view</button>' : ''}${q.get('room') ? `<a class="pBtn" style="text-decoration:none" href="${viewerLink(q.get('room'))}">See it on the plan</a>` : ''}<button class="pBtn" data-l="ok">OK</button></div>`;
  linkEl.style.display = 'block'; $('note').style.display = 'none';
  linkEl.querySelector('.x').onclick = () => closeLink(false);
  linkEl.querySelector('[data-l="ok"]').onclick = () => closeLink(false);
  const bk = linkEl.querySelector('[data-l="back"]'); if (bk) bk.onclick = () => closeLink(true);
}
// "Copy link to this view" in the Shots panel (re-added each time the panel redraws)
const sp = $('spanel');
function addShare() {
  if (sp.querySelector('#pShare')) return;
  sp.insertAdjacentHTML('beforeend', `<div id="pShare"><h4>Link to this view</h4><button class="opt" id="pCopy">Copy link to this view</button>
    <div class="muted">The link opens this camera view with the finishes now showing. It is a convenience for the owner: sharing it is the owner's call, and the model stays an owner design and reference model, not a construction document.</div><input id="pLinkTxt" readonly hidden aria-label="Link to this view"></div>`);
  $('pCopy').onclick = async () => {
    const url = linkFor(), box = $('pLinkTxt'); box.hidden = false; box.value = url; box.select();
    let ok = false; try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {}
    $('pCopy').textContent = ok ? 'Copied' : 'Select and copy the link below'; setTimeout(() => { const c = $('pCopy'); if (c) c.textContent = 'Copy link to this view'; }, 2500);
  };
}
new MutationObserver(addShare).observe(sp, { childList: true }); addShare();

// ---------- start ----------
const q = readLink();
if (q) applyLink(q);
else if (!ls.get(K_SEEN)) openIntro();
addEventListener('hashchange', () => { const q2 = readLink(); if (q2) { stopTour(); applyLink(q2); } });
window.__present = { startTour, stopTour, showStop, openIntro, closeIntro, linkFor, applyLink: h => applyLink(new URLSearchParams(h)), tourAt: () => tourAt, stops: STOPS.length, goPlace };
