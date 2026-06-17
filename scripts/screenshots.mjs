/**
 * Render high-fidelity screenshots of every Bout screen.
 *
 * These are pixel-accurate renders of the app's screens built from the SAME design tokens the
 * React Native components use (colours, type scale, spacing, radii) and populated with REAL
 * data from the shared core engine — real generated puzzles, a real server-scored breakdown,
 * and a real ranked ladder. (A device/emulator can't run in this headless environment, so the
 * screens are reproduced in HTML at iPhone resolution rather than captured from a simulator.)
 *
 * Requires a headless browser (kept out of package.json so CI installs stay lean):
 *   npm i -D puppeteer && node scripts/screenshots.mjs
 */
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';
import {
  createUniqueStream,
  scoreAttempt,
  rankStandings,
} from '../supabase/functions/_shared/core.mjs';

const OUT = 'assets/screenshots';
mkdirSync(OUT, { recursive: true });

// ---- Real data from the core ----
const numberPuzzle = createUniqueStream({ type: 'number', difficulty: 'medium', salt: 's1' }).next();
const wordPuzzle = createUniqueStream({ type: 'word', difficulty: 'medium', salt: 's2' }).next();
const visualPuzzle = createUniqueStream({ type: 'visual', difficulty: 'hard', salt: 's3' }).next();
const weekendPuzzle = createUniqueStream({ type: 'weekend', difficulty: 'hard', salt: 's4' }).next();

const breakdown = scoreAttempt({
  completed: true,
  accuracy: 0.92,
  timeMs: 41_000,
  streakDays: 7,
  rollingAverage: 180,
});

const ladderSeed = [
  ['southpaw', 2040, 12, 6], ['the_jab', 1985, 12, 6], ['cross_counter', 1870, 11, 3],
  ['bell_ringer', 1755, 12, 9], ['glass_jaw', 1690, 10, 1], ['rope_a_dope', 1605, 12, 4],
  ['haymaker', 1540, 9, 2], ['feather_fox', 1402, 11, 5], ['counterpunch', 1377, 12, 8],
  ['slip_n_slide', 1290, 8, 1],
].map(([h, p, played, streak]) => ({
  userId: h, weightClass: 'welterweight', totalPoints: p, playedCount: played, currentStreak: streak, bestStreak: streak,
}));
const ladder = rankStandings(ladderSeed).sort((a, b) => a.rank - b.rank);

// ---- Tiny HTML DSL ----
const C = {
  bg: '#000000', surface: '#0A0A0A', raised: '#141414', border: '#1F1F1F', borderStrong: '#2A2A2A',
  text: '#FFFFFF', sec: '#A1A1A1', ter: '#6B6B6B', accent: '#00E676', danger: '#FF4D4D',
};
const ICONS = {
  today: '<path d="M12 3 4 8v8l8 5 8-5V8z"/>',
  ladder: '<line x1="6" y1="3" x2="6" y2="21"/><line x1="18" y1="3" x2="18" y2="21"/><line x1="6" y1="7" x2="18" y2="7"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="6" y1="17" x2="18" y2="17"/>',
  season: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  crew: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5.2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
};
const icon = (name, color) =>
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

function tabbar(active) {
  const tabs = ['today', 'ladder', 'season', 'crew', 'settings'];
  const labels = { today: 'Today', ladder: 'Ladder', season: 'Season', crew: 'Crew', settings: 'Settings' };
  return `<div class="tabbar">${tabs
    .map((t) => `<div class="tab ${t === active ? 'active' : ''}">${icon(t, t === active ? C.text : C.ter)}<span>${labels[t]}</span></div>`)
    .join('')}</div>`;
}
const statusbar = () =>
  `<div class="statusbar"><span>9:41</span><span class="bars">●●● ▮ 100</span></div>`;

const dot = `<span class="dot"></span>`;

// ---- Screen bodies ----
function welcome() {
  return `${statusbar()}
  <div class="content" style="display:flex;flex-direction:column;justify-content:space-between;height:740px;padding-bottom:48px;">
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
      <div class="label" style="color:${C.accent}">DAILY BRAIN GAME · YOUR CREW</div>
      <div class="display" style="margin-top:12px;">BOUT</div>
      <div class="body secondary" style="margin-top:10px;max-width:300px;">One puzzle a day. Same bout for everyone. Your result feeds a season-long crew ladder. Step into the ring.</div>
    </div>
    <div>
      <div class="btn primary">Get started</div>
      <div class="btn secondary" style="margin-top:12px;">I have an account</div>
    </div>
  </div>`;
}

function today() {
  return `${statusbar()}
  <div class="content">
    <div class="rowbetween">
      <div><div class="label">WEDNESDAY</div><div class="title" style="margin-top:4px;">Today's bout</div></div>
      <div class="streak"><span class="data accent">7</span><span class="label">DAYS</span></div>
    </div>
    <div class="card raised" style="margin-top:24px;">
      <div class="rowbetween"><div class="label" style="color:${C.sec}">NUMBER · MEDIUM</div>${dot}</div>
      <div class="heading" style="margin-top:12px;">One puzzle. One to three minutes.</div>
      <div class="body secondary" style="margin-top:8px;">Solve it on your own schedule. Your result feeds the Sunday Sloggers ladder.</div>
      <div class="btn primary" style="margin-top:16px;">Enter the ring</div>
    </div>
    <div class="card" style="margin-top:24px;">
      <div class="label">PICK'EM · +15 IF YOU CALL IT</div>
      <div class="heading" style="margin-top:8px;">Who tops the crew today?</div>
      <div class="hr"></div>
      <div class="chips">
        <div class="chip on">the_jab</div><div class="chip">cross_counter</div><div class="chip">bell_ringer</div><div class="chip">haymaker</div>
      </div>
    </div>
    <div class="card" style="margin-top:16px;"><div class="rowbetween"><span class="body" style="font-weight:700;">See the live ladder</span><span class="tertiary">›</span></div></div>
    <div class="card" style="margin-top:12px;"><div class="rowbetween"><span style="display:flex;align-items:center;gap:8px;">${dot}<span class="body" style="font-weight:700;">Live race (optional)</span></span><span class="tertiary">›</span></div></div>
  </div>${tabbar('today')}`;
}

function playNumber() {
  const p = numberPuzzle.payload;
  const terms = p.terms
    .map((t, i) => {
      const op = t.op ? `<span class="dlarge mono secondary"> ${t.op} </span>` : '';
      const cell = i === p.blankIndex
        ? `<span class="blank mono">?</span>`
        : `<span class="dlarge mono">${t.value}</span>`;
      return op + cell;
    })
    .join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', '⌫'];
  return `${statusbar()}
  <div class="content">
    <div class="rowbetween"><span class="body tertiary">Close</span><span class="data mono tertiary">00:38</span></div>
    <div class="label" style="margin-top:8px;">NUMBER</div>
    <div class="label" style="margin-top:24px;">SOLVE</div>
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;margin-top:16px;">
      ${terms}<span class="dlarge mono secondary"> = </span><span class="dlarge mono">${p.result}</span>
    </div>
    <div class="pad" style="margin-top:40px;">
      ${keys.map((k) => `<div class="key mono">${k}</div>`).join('')}
    </div>
    <div class="btn primary" style="margin-top:40px;">Submit</div>
  </div>`;
}

function playWord() {
  const p = wordPuzzle.payload;
  const tiles = p.scrambled.toUpperCase().split('');
  return `${statusbar()}
  <div class="content">
    <div class="rowbetween"><span class="body tertiary">Close</span><span class="data mono tertiary">00:22</span></div>
    <div class="label" style="margin-top:8px;">WORD</div>
    <div class="label" style="margin-top:24px;">HINT</div>
    <div class="heading" style="margin-top:8px;">${p.hint}</div>
    <div class="slots" style="margin-top:24px;">
      ${Array.from({ length: p.length }).map((_, i) => `<div class="slot mono">${i < 3 ? tiles[i] : ''}</div>`).join('')}
    </div>
    <div class="bank" style="margin-top:24px;">
      ${tiles.map((t, i) => `<div class="tile mono ${i < 3 ? 'used' : ''}">${t}</div>`).join('')}
    </div>
    <div class="body secondary" style="margin-top:16px;">Clear</div>
    <div class="btn primary" style="margin-top:40px;">Finish the puzzle</div>
  </div>`;
}

function playWeekend() {
  const g = weekendPuzzle.payload.grid;
  const cells = g
    .map((row, r) =>
      `<div class="srow">${row
        .map((v, c) => {
          const given = v !== 0;
          const boxL = c === 2 ? 'boxL' : '';
          const boxT = r === 2 ? 'boxT' : '';
          const sel = r === 0 && c === 1 ? 'sel' : '';
          const val = given ? v : (r === 0 && c === 1 ? '<span class="accent">3</span>' : '');
          return `<div class="scell ${boxL} ${boxT} ${sel} mono ${given ? '' : 'usercell'}">${val}</div>`;
        })
        .join('')}</div>`,
    )
    .join('');
  return `${statusbar()}
  <div class="content" style="text-align:center;">
    <div class="rowbetween" style="text-align:left;"><span class="body tertiary">Close</span><span class="data mono tertiary">01:12</span></div>
    <div class="label" style="margin-top:8px;text-align:left;">WEEKEND FEATURE</div>
    <div class="label" style="margin-top:24px;">FILL SO EVERY ROW, COLUMN & BOX HAS 1–4</div>
    <div class="board" style="margin:24px auto 0;">${cells}</div>
    <div class="pad4" style="margin-top:24px;">${[1, 2, 3, 4].map((n) => `<div class="key mono">${n}</div>`).join('')}</div>
    <div class="btn primary" style="margin-top:36px;">Finish the puzzle</div>
  </div>`;
}

function gridMini(grid, cell, sel) {
  return `<div class="vgrid ${sel ? 'vsel' : ''}">${grid
    .map((row) => `<div class="srow">${row.map((v) => `<div class="vc" style="width:${cell}px;height:${cell}px;background:${v ? C.text : C.raised}"></div>`).join('')}</div>`)
    .join('')}</div>`;
}
function playVisual() {
  const p = visualPuzzle.payload;
  const correctIndex = visualPuzzle.solution.index;
  const transformLabel = { 'flip-h': 'MIRRORED LEFT ↔ RIGHT', 'flip-v': 'MIRRORED TOP ↕ BOTTOM', 'rotate-180': 'ROTATED 180°' }[p.transform];
  return `${statusbar()}
  <div class="content" style="text-align:center;">
    <div class="rowbetween" style="text-align:left;"><span class="body tertiary">Close</span><span class="data mono tertiary">00:15</span></div>
    <div class="label" style="margin-top:24px;">WHICH IS THE PATTERN, ${transformLabel}?</div>
    <div style="display:flex;justify-content:center;margin-top:20px;"><div class="vsource">${gridMini(p.grid, 26, false)}</div></div>
    <div class="voptions" style="margin-top:28px;">
      ${p.options.map((o, i) => gridMini(o, 18, i === correctIndex)).join('')}
    </div>
    <div class="btn primary" style="margin-top:40px;">Submit</div>
  </div>`;
}

function result() {
  const b = breakdown;
  const row = (l, v, cls = '') => `<div class="brow"><span class="body secondary">${l}</span><span class="data mono ${cls}">${v}</span></div>`;
  return `${statusbar()}
  <div class="content">
    <div class="label" style="color:${C.accent}">RESULT</div>
    <div class="display mono" style="margin-top:12px;">${b.finalScore}</div>
    <div class="body secondary">Today's score on the ladder.</div>
    <div class="card" style="margin-top:24px;">
      <div class="label">BREAKDOWN</div>
      <div style="margin-top:12px;">
        ${row('Completion', '+' + b.completion)}
        ${row('Accuracy', '+' + b.accuracy)}
        ${row('Speed', '+' + b.speed)}
        ${b.improvement ? row('Improvement bonus', '+' + b.improvement, 'accent') : ''}
        <div class="hr"></div>
        ${row('Pre-multiplier', b.preMultiplier)}
        ${row('Streak ×' + b.streakMultiplier.toFixed(2), b.streakDays + ' days')}
        <div class="hr"></div>
        <div class="brow"><span class="body" style="font-weight:700;">Final score</span><span class="data mono" style="font-size:22px;">${b.finalScore}</span></div>
      </div>
    </div>
    <div style="display:flex;justify-content:center;margin-top:24px;">${shareCardInner()}</div>
    <div class="btn primary" style="margin-top:20px;">Share result</div>
  </div>`;
}

function shareCardInner() {
  return `<div class="sharecard">
    <div class="rowbetween"><span class="label" style="color:${C.accent}">BOUT</span><span class="label">JUN 17</span></div>
    <div style="padding:18px 0;">
      <div class="label">NUMBER · @SOUTHPAW</div>
      <div class="mono" style="font-size:84px;line-height:0.95;font-weight:800;letter-spacing:-3px;margin-top:6px;">${breakdown.finalScore}</div>
      <div class="label">TODAY'S SCORE</div>
    </div>
    <div class="sharefoot">
      <div class="ss"><span class="data mono">7</span><span class="label">STREAK</span></div>
      <div class="ss"><span class="data mono">#3</span><span class="label">RANK</span></div>
      <div class="ss"><span class="data mono">WEL</span><span class="label">CLASS</span></div>
    </div>
  </div>`;
}

function ladderScreen() {
  const rows = ladder
    .map((r) => {
      const me = r.userId === 'cross_counter';
      return `<div class="lrow ${me ? 'me' : ''}">
        <span class="data mono" style="width:30px;color:${r.rank <= 3 ? C.text : C.sec}">${r.rank}</span>
        <span class="body" style="flex:1;font-weight:700;color:${me ? C.accent : C.text}">${r.userId}${me ? '  (you)' : ''}</span>
        <span class="data mono tertiary" style="width:50px;text-align:right;">${r.playedCount}</span>
        <span class="data mono" style="width:64px;text-align:right;">${r.totalPoints}</span>
      </div>`;
    })
    .join('');
  return `${statusbar()}
  <div class="content">
    <div class="rowbetween">
      <div><div class="label">THE SUNDAY SLOGGERS</div><div class="title" style="margin-top:4px;">Ladder</div></div>
      <div style="display:flex;align-items:center;gap:6px;">${dot}<span class="label" style="color:${C.accent}">SEASON 2 · FINALS</span></div>
    </div>
    <div class="chips" style="margin-top:16px;">
      <div class="cchip">FLYWEIGHT</div><div class="cchip on">WELTERWEIGHT</div><div class="cchip">HEAVYWEIGHT</div>
    </div>
    <div class="lhead" style="margin-top:20px;"><span style="width:30px;">#</span><span style="flex:1;">FIGHTER</span><span style="width:50px;text-align:right;">PLAYED</span><span style="width:64px;text-align:right;">POINTS</span></div>
    <div class="hr"></div>
    ${rows}
    <div class="body tertiary" style="text-align:center;margin-top:20px;font-size:13px;">Finals week — every score doubles.</div>
  </div>${tabbar('ladder')}`;
}

function season() {
  const step = (l, d, on) => `<div class="trow"><span class="tdot ${on ? 'on' : ''}"></span><span class="body" style="color:${on ? C.text : C.ter}">${l}</span><span class="data mono tertiary" style="margin-left:auto;">${d}</span></div>`;
  return `${statusbar()}
  <div class="content">
    <div class="label">THE SUNDAY SLOGGERS</div>
    <div class="title" style="margin-top:4px;">Season 2</div>
    <div class="card raised" style="margin-top:16px;">
      <div style="display:flex;align-items:center;gap:8px;"><span class="label" style="color:${C.accent}">FINALS WEEK</span>${dot}</div>
      <div style="margin-top:12px;">
        ${step('Opens', '2026-05-04', true)}
        ${step('Finals', '2026-06-01', true)}
        ${step('Closes', '2026-06-07', false)}
      </div>
    </div>
    <div class="card" style="margin-top:24px;">
      <div class="label">DIVISIONS</div>
      <div class="body secondary" style="margin-top:8px;">At season's end the top 3 of each weight class promote and the bottom 3 relegate. Your streak carries into the next season — loyalty is never punished.</div>
      <div class="hr"></div>
      <div class="rowbetween"><span class="body secondary">Your current standing</span><span class="data mono accent">#3</span></div>
    </div>
    <div class="label" style="margin-top:24px;">RECAP CARD</div>
    <div style="display:flex;justify-content:center;margin-top:12px;">${recapCardInner()}</div>
  </div>${tabbar('season')}`;
}
function recapCardInner() {
  return `<div class="sharecard">
    <div class="rowbetween"><span class="label" style="color:${C.accent}">BOUT</span><span class="label">SEASON 2</span></div>
    <div style="padding:14px 0;">
      <div class="label">THE SUNDAY SLOGGERS</div>
      <div class="title" style="margin-top:8px;">You finished #3</div>
      <div class="body secondary" style="margin-top:8px;">southpaw leads the gym</div>
    </div>
    <div class="sharefoot">
      <div class="ss"><span class="data mono">7</span><span class="label">STREAK</span></div>
      <div class="ss"><span class="data mono">#3</span><span class="label">RANK</span></div>
      <div class="ss"><span class="data mono">WEL</span><span class="label">CLASS</span></div>
    </div>
  </div>`;
}

function crew() {
  const members = [['southpaw', 'WEL'], ['cross_counter', 'WEL'], ['the_jab', 'MID'], ['bell_ringer', 'WEL'], ['haymaker', 'LIG'], ['glass_jaw', 'FLY']];
  return `${statusbar()}
  <div class="content">
    <div class="label">YOUR GYM</div>
    <div class="title" style="margin-top:4px;">The Sunday Sloggers</div>
    <div class="card raised" style="margin-top:24px;">
      <div class="label">INVITE CODE</div>
      <div class="display mono" style="margin-top:8px;">K7P2QX</div>
      <div class="body tertiary" style="font-size:13px;">Tap the code to copy</div>
      <div class="btn primary" style="margin-top:16px;">Share invite link</div>
    </div>
    <div class="label" style="margin-top:24px;">MEMBERS · 6</div>
    <div class="hr"></div>
    ${members.map(([h, w], i) => `<div class="mrow"><span class="body" style="font-weight:700;color:${i === 1 ? C.accent : C.text}">${h}${i === 1 ? '  (you)' : ''}</span><span class="badge">${w}</span></div>`).join('')}
  </div>${tabbar('crew')}`;
}

function settings() {
  const row = (l, v) => `<div class="brow"><span class="body secondary">${l}</span><span class="data mono">${v}</span></div>`;
  return `${statusbar()}
  <div class="content">
    <div class="title">Settings</div>
    <div class="card" style="margin-top:24px;">
      <div class="label">PROFILE</div>
      ${row('Handle', 'cross_counter')}<div class="hr"></div>${row('Current streak', '7 days')}<div class="hr"></div>${row('Best streak', '23 days')}
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="label">NOTIFICATIONS</div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
        <div style="flex:1;"><div class="body">Daily drop</div><div class="body tertiary" style="font-size:13px;">A morning nudge when today's bout is live. Windowed, never a fixed alarm.</div></div>
        <div class="switch on"><span></span></div>
      </div>
    </div>
    <div class="card raised" style="margin-top:16px;">
      <div class="label" style="color:${C.accent}">SEASON PASS</div>
      <div class="heading" style="margin-top:8px;">Go deeper</div>
      <div class="body secondary" style="margin-top:8px;">Deeper stats, advanced puzzles, larger custom leagues, and the ability to create your crew's own bouts. Never pay-to-win.</div>
      <div class="btn primary" style="margin-top:16px;">Get the season pass</div>
    </div>
  </div>${tabbar('settings')}`;
}

function race() {
  return `${statusbar()}
  <div class="content">
    <div class="rowbetween"><span class="body tertiary">Close</span><span style="display:flex;align-items:center;gap:6px;">${dot}<span class="label" style="color:${C.accent}">LIVE RACE</span></span></div>
    <div class="title" style="margin-top:16px;">Head-to-head</div>
    <div class="body secondary" style="margin-top:8px;">Same puzzle, same moment, fastest accurate solve wins. Optional and just for fun — it never touches the ladder.</div>
    <div class="btn primary" style="margin-top:24px;">Start a race</div>
    <div class="label" style="margin-top:24px;">OPEN RACES</div>
    <div class="hr"></div>
    <div class="card" style="margin-top:16px;"><div class="rowbetween"><div><div class="body" style="font-weight:700;">Race · lobby</div><div class="body tertiary" style="font-size:13px;">9:41:03 AM</div></div><span class="accent">Join ›</span></div></div>
    <div class="card" style="margin-top:12px;"><div class="rowbetween"><div><div class="body" style="font-weight:700;">Race · racing</div><div class="body tertiary" style="font-size:13px;">9:38:50 AM</div></div><span class="accent">Join ›</span></div></div>
  </div>`;
}

const CSS = `
  *{box-sizing:border-box;}
  body{margin:0;background:${C.bg};}
  .phone{width:390px;height:844px;background:${C.bg};color:${C.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;position:relative;overflow:hidden;}
  .statusbar{height:50px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 26px 6px;font-size:14px;font-weight:600;}
  .statusbar .bars{font-size:11px;letter-spacing:1px;color:${C.text};}
  .content{padding:6px 24px 24px;}
  .display{font-size:56px;line-height:1.02;font-weight:800;letter-spacing:-1.5px;}
  .title{font-size:30px;font-weight:800;letter-spacing:-0.5px;}
  .heading{font-size:22px;font-weight:700;letter-spacing:-0.3px;line-height:1.2;}
  .body{font-size:16px;font-weight:500;line-height:1.4;}
  .secondary{color:${C.sec};} .tertiary{color:${C.ter};} .accent{color:${C.accent};}
  .label{font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${C.ter};}
  .mono{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;}
  .data{font-size:18px;font-weight:600;}
  .dlarge{font-size:40px;font-weight:700;}
  .card{background:${C.surface};border:1px solid ${C.border};border-radius:18px;padding:16px;}
  .card.raised{background:${C.raised};}
  .btn{height:54px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;}
  .btn.primary{background:${C.accent};color:#000;}
  .btn.secondary{background:${C.raised};border:1px solid ${C.borderStrong};color:${C.text};}
  .rowbetween{display:flex;justify-content:space-between;align-items:flex-start;}
  .hr{height:1px;background:${C.border};margin:12px 0;}
  .dot{width:8px;height:8px;border-radius:4px;background:${C.accent};display:inline-block;}
  .streak{display:flex;align-items:baseline;gap:6px;padding:8px 12px;border:1px solid ${C.border};border-radius:14px;background:${C.surface};}
  .chips{display:flex;flex-wrap:wrap;gap:8px;}
  .chip{padding:12px 16px;border-radius:14px;border:1px solid ${C.border};background:${C.surface};font-weight:700;font-size:15px;}
  .chip.on{background:${C.accent};color:#000;border-color:${C.accent};}
  .cchip{padding:8px 12px;border-radius:10px;border:1px solid ${C.border};background:${C.surface};font-size:11px;font-weight:700;letter-spacing:1.4px;color:${C.ter};}
  .cchip.on{border-color:${C.borderStrong};background:${C.raised};color:${C.text};}
  .slots{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;}
  .slot{width:44px;height:52px;border-radius:10px;border:1px solid ${C.borderStrong};background:${C.surface};display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;}
  .bank{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;}
  .tile{width:52px;height:56px;border-radius:10px;border:1px solid ${C.borderStrong};background:${C.raised};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;}
  .tile.used{background:${C.surface};color:${C.ter};}
  .blank{min-width:52px;padding:0 8px;border-bottom:2px solid ${C.accent};font-size:40px;font-weight:700;color:${C.accent};text-align:center;}
  .pad{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;}
  .pad .key{width:30%;height:60px;}
  .pad4{display:flex;gap:12px;justify-content:center;}
  .pad4 .key{width:60px;height:60px;}
  .key{border-radius:14px;background:${C.raised};border:1px solid ${C.border};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;}
  .board{border:2px solid ${C.borderStrong};border-radius:10px;overflow:hidden;width:max-content;}
  .srow{display:flex;}
  .scell{width:56px;height:56px;border:0.5px solid ${C.border};background:${C.surface};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;}
  .scell.usercell{color:${C.ter};}
  .scell.boxL{border-left:2px solid ${C.borderStrong};} .scell.boxT{border-top:2px solid ${C.borderStrong};}
  .scell.sel{background:${C.raised};border-color:${C.accent};}
  .vsource{padding:16px;background:${C.surface};border:1px solid ${C.border};border-radius:18px;}
  .voptions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;}
  .vgrid{padding:12px;border:1px solid ${C.border};border-radius:14px;background:${C.surface};}
  .vgrid.vsel{border:2px solid ${C.accent};}
  .vc{margin:1px;border-radius:3px;}
  .brow{display:flex;justify-content:space-between;align-items:center;padding:6px 0;}
  .lhead{display:flex;align-items:center;font-size:11px;font-weight:700;letter-spacing:1.4px;color:${C.ter};}
  .lrow{display:flex;align-items:center;padding:13px 0;border-bottom:1px solid ${C.border};}
  .lrow.me{background:${C.surface};border-radius:10px;padding-left:8px;padding-right:8px;margin:0 -8px;}
  .mrow{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid ${C.border};}
  .badge{border:1px solid ${C.borderStrong};border-radius:8px;padding:4px 8px;font-size:11px;font-weight:700;letter-spacing:1.4px;color:${C.sec};}
  .trow{display:flex;align-items:center;gap:12px;padding:6px 0;}
  .tdot{width:10px;height:10px;border-radius:5px;border:1px solid ${C.borderStrong};background:${C.surface};}
  .tdot.on{background:${C.accent};border-color:${C.accent};}
  .switch{width:50px;height:30px;border-radius:15px;background:${C.accent};position:relative;}
  .switch span{position:absolute;width:26px;height:26px;border-radius:13px;background:#fff;top:2px;right:2px;}
  .sharecard{width:300px;background:${C.bg};border:1px solid ${C.borderStrong};border-radius:22px;padding:22px;}
  .sharefoot{display:flex;justify-content:space-around;border-top:1px solid ${C.border};padding-top:16px;}
  .ss{display:flex;flex-direction:column;align-items:center;gap:2px;}
  .tabbar{position:absolute;bottom:0;left:0;right:0;height:84px;border-top:1px solid ${C.border};display:flex;justify-content:space-around;padding-top:10px;background:${C.bg};}
  .tab{display:flex;flex-direction:column;align-items:center;gap:5px;font-size:11px;font-weight:600;color:${C.ter};}
  .tab.active{color:${C.text};}
`;

const SCREENS = {
  '01-welcome': welcome(),
  '02-today': today(),
  '03-play-number': playNumber(),
  '04-play-word': playWord(),
  '05-play-weekend': playWeekend(),
  '06-play-visual': playVisual(),
  '07-result': result(),
  '08-ladder': ladderScreen(),
  '09-season': season(),
  '10-crew': crew(),
  '11-settings': settings(),
  '12-live-race': race(),
};

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="phone">${body}</div></body></html>`;

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});
const p = await browser.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

for (const [name, body] of Object.entries(SCREENS)) {
  await p.setContent(page(body), { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 120)); // let fonts settle
  await p.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${name}.png`);
}
await browser.close();
console.log(`\nDone → ${OUT}/ (${Object.keys(SCREENS).length} screens)`);
