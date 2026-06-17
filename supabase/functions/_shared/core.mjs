// src/core/config.ts
var SCORING = {
  /** Flat points for finishing the bout at all. */
  completionBase: 100,
  /** Max accuracy points for a flawless solve. */
  accuracyMax: 100,
  /** Speed is a *minor* edge only — capped low on purpose (rule #3: no speed leaderboard). */
  speedMax: 25,
  /** Flat bonus when today's pre-multiplier score beats the rolling N-day average. */
  improvementBonus: 25,
  /** Rolling window (days) used for the improvement bonus comparison. */
  improvementWindowDays: 7,
  /** Streak multiplier: +`streakStep` per consecutive day, capped. */
  streak: {
    /** Multiplier added per consecutive day played. 0.02 == +2%. */
    step: 0.02,
    /** Base multiplier with no streak. */
    base: 1,
    /** Hard cap on the multiplier (1.30 == +30%). */
    max: 1.3
  },
  /** Finals week doubles every final_score. */
  finalsMultiplier: 2
};
var SPEED = {
  /**
   * Per-type "reasonable range" for solve time in milliseconds. Solving at/under
   * `fastMs` earns the full speed bonus; solving at/over `slowMs` earns zero.
   * Linear in between. Tuned so the spread is small (rule #3).
   */
  defaultFastMs: 2e4,
  defaultSlowMs: 12e4
};
var SEASON = {
  regularSeasonWeeks: 4,
  finalsWeeks: 1,
  offSeasonDays: 2,
  /** Promotion/relegation counts between adjacent weight classes at season end. */
  promoteTopN: 3,
  relegateBottomN: 3
};
var PICKEM = {
  /** Points awarded for a correct "who tops your crew today" prediction. */
  correctReward: 15
};
var PUSH = {
  /** Daily-drop notification window (local hours, 24h). Not a fixed-second alarm. */
  dropWindowStartHour: 8,
  dropWindowEndHour: 10
};
var WEIGHT_CLASSES = [
  "flyweight",
  "lightweight",
  "welterweight",
  "middleweight",
  "heavyweight"
];
var SEED_WEIGHT_CLASS = "welterweight";
var Config = {
  SCORING,
  SPEED,
  SEASON,
  PICKEM,
  PUSH,
  WEIGHT_CLASSES,
  SEED_WEIGHT_CLASS
};

// src/core/scoring.ts
var clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
function speedPoints(timeMs, window) {
  const fastMs = window?.fastMs ?? SPEED.defaultFastMs;
  const slowMs = window?.slowMs ?? SPEED.defaultSlowMs;
  if (slowMs <= fastMs) return SCORING.speedMax;
  if (timeMs <= fastMs) return SCORING.speedMax;
  if (timeMs >= slowMs) return 0;
  const ratio = (slowMs - timeMs) / (slowMs - fastMs);
  return Math.round(clamp(ratio, 0, 1) * SCORING.speedMax);
}
function accuracyPoints(accuracy) {
  return Math.round(clamp(accuracy, 0, 1) * SCORING.accuracyMax);
}
function streakMultiplier(streakDays) {
  const extraDays = Math.max(0, Math.floor(streakDays) - 1);
  const raw = SCORING.streak.base + extraDays * SCORING.streak.step;
  return clamp(raw, SCORING.streak.base, SCORING.streak.max);
}
function improvementPoints(preMultiplierToday, rollingAverage2) {
  if (rollingAverage2 === null) return 0;
  return preMultiplierToday > rollingAverage2 ? SCORING.improvementBonus : 0;
}
function scoreAttempt(inputs) {
  if (!inputs.completed) {
    return {
      completion: 0,
      accuracy: 0,
      speed: 0,
      improvement: 0,
      preMultiplier: 0,
      streakMultiplier: streakMultiplier(inputs.streakDays),
      streakDays: inputs.streakDays,
      finalsApplied: false,
      finalScore: 0
    };
  }
  const completion = SCORING.completionBase;
  const accuracy = accuracyPoints(inputs.accuracy);
  const speed = speedPoints(inputs.timeMs, inputs.speedWindow);
  const coreBeforeImprovement = completion + accuracy + speed;
  const improvement = improvementPoints(coreBeforeImprovement, inputs.rollingAverage);
  const preMultiplier = coreBeforeImprovement + improvement;
  const mult = streakMultiplier(inputs.streakDays);
  let finalScore = Math.round(preMultiplier * mult);
  const finalsApplied = inputs.isFinals === true;
  if (finalsApplied) finalScore *= SCORING.finalsMultiplier;
  return {
    completion,
    accuracy,
    speed,
    improvement,
    preMultiplier,
    streakMultiplier: mult,
    streakDays: inputs.streakDays,
    finalsApplied,
    finalScore
  };
}

// src/core/streaks.ts
var MS_PER_DAY = 864e5;
function toDayNumber(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}
function nextStreak(args) {
  const { previousStreak, lastPlayedDate, today } = args;
  if (!lastPlayedDate) return 1;
  const gap = toDayNumber(today) - toDayNumber(lastPlayedDate);
  if (gap <= 0) return Math.max(1, previousStreak);
  if (gap === 1) return previousStreak + 1;
  return 1;
}
function streakIsAlive(lastPlayedDate, today) {
  if (!lastPlayedDate) return false;
  const gap = toDayNumber(today) - toDayNumber(lastPlayedDate);
  return gap <= 1;
}
function rollingAverage(recentPreMultiplierScores, windowDays) {
  if (recentPreMultiplierScores.length === 0) return null;
  const window = recentPreMultiplierScores.slice(-windowDays);
  const sum = window.reduce((a, b) => a + b, 0);
  return sum / window.length;
}

// src/core/season.ts
var MS_PER_DAY2 = 864e5;
function dayNum(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY2);
}
function addDays(iso, days) {
  const next = new Date(dayNum(iso) * MS_PER_DAY2 + days * MS_PER_DAY2);
  return next.toISOString().slice(0, 10);
}
function buildSeasonWindow(startsOn) {
  const regularDays = SEASON.regularSeasonWeeks * 7;
  const finalsStartsOn = addDays(startsOn, regularDays);
  const endsOn = addDays(finalsStartsOn, SEASON.finalsWeeks * 7 - 1);
  return { startsOn, finalsStartsOn, endsOn };
}
function nextSeasonStart(window) {
  return addDays(window.endsOn, SEASON.offSeasonDays + 1);
}
function seasonStatusOn(window, today) {
  const t = dayNum(today);
  if (t < dayNum(window.startsOn)) return "upcoming";
  if (t > dayNum(window.endsOn)) return "complete";
  if (t >= dayNum(window.finalsStartsOn)) return "finals";
  return "active";
}
function isFinalsDay(window, today) {
  return seasonStatusOn(window, today) === "finals";
}
function rankStandings(rows) {
  const byClass = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const list = byClass.get(row.weightClass) ?? [];
    list.push(row);
    byClass.set(row.weightClass, list);
  }
  const out = [];
  for (const [, list] of byClass) {
    const sorted = [...list].sort(
      (a, b) => b.totalPoints - a.totalPoints || b.playedCount - a.playedCount || b.currentStreak - a.currentStreak || a.userId.localeCompare(b.userId)
    );
    sorted.forEach((row, i) => out.push({ ...row, rank: i + 1 }));
  }
  return out;
}
function classIndex(wc) {
  return WEIGHT_CLASSES.indexOf(wc);
}
function higherClass(wc) {
  const i = classIndex(wc);
  return WEIGHT_CLASSES[Math.min(WEIGHT_CLASSES.length - 1, i + 1)];
}
function lowerClass(wc) {
  const i = classIndex(wc);
  return WEIGHT_CLASSES[Math.max(0, i - 1)];
}
function computeDivisionChanges(finalRanked) {
  const byClass = /* @__PURE__ */ new Map();
  for (const r of finalRanked) {
    const list = byClass.get(r.weightClass) ?? [];
    list.push(r);
    byClass.set(r.weightClass, list);
  }
  const changes = [];
  for (const [wc, list] of byClass) {
    const sorted = [...list].sort((a, b) => a.rank - b.rank);
    const size = sorted.length;
    sorted.forEach((row, i) => {
      const isTop = i < SEASON.promoteTopN;
      const isBottom = i >= size - SEASON.relegateBottomN;
      let to = wc;
      let direction = "stay";
      if (isTop && wc !== WEIGHT_CLASSES[WEIGHT_CLASSES.length - 1]) {
        to = higherClass(wc);
        direction = "promoted";
      } else if (isBottom && wc !== WEIGHT_CLASSES[0]) {
        to = lowerClass(wc);
        direction = "relegated";
      }
      changes.push({ userId: row.userId, from: wc, to, direction });
    });
  }
  return changes;
}
function resetForNewSeason(ranked, changes) {
  const newClass = new Map(changes.map((c) => [c.userId, c.to]));
  return ranked.map((r) => ({
    userId: r.userId,
    weightClass: newClass.get(r.userId) ?? r.weightClass,
    totalPoints: 0,
    playedCount: 0,
    currentStreak: r.currentStreak,
    // carried across the reset
    bestStreak: r.bestStreak
  }));
}
function seedStandings(userIds) {
  return userIds.map((userId) => ({
    userId,
    weightClass: SEED_WEIGHT_CLASS,
    totalPoints: 0,
    playedCount: 0,
    currentStreak: 0,
    bestStreak: 0
  }));
}

// src/core/pickem.ts
function actualDayWinner(results) {
  const played = results.filter((r) => r.dayScore > 0);
  if (played.length === 0) return null;
  return played.sort((a, b) => b.dayScore - a.dayScore || a.userId.localeCompare(b.userId))[0].userId;
}
function resolvePredictions(predictions, results) {
  const winner = actualDayWinner(results);
  return predictions.map((p) => {
    const correct = winner !== null && p.predictedTopUserId === winner;
    return {
      userId: p.userId,
      predictedTopUserId: p.predictedTopUserId,
      actualTopUserId: winner,
      correct,
      pointsAwarded: correct ? PICKEM.correctReward : 0
    };
  });
}

// src/core/leagues.ts
var CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var CODE_LENGTH = 6;
function generateInviteCode(rand = Math.random) {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return out;
}
function isValidInviteCode(code) {
  if (code.length !== CODE_LENGTH) return false;
  return code.split("").every((ch) => CODE_ALPHABET.includes(ch));
}
function inviteLink(code, base = "https://bout.app") {
  return `${base}/join/${code}`;
}
function matchHouseLeague(candidates, userWeightClass = SEED_WEIGHT_CLASS) {
  const withRoom = candidates.filter((c) => c.memberCount < c.capacity);
  if (withRoom.length === 0) return null;
  const sameTier = withRoom.filter((c) => c.weightClass === userWeightClass).sort((a, b) => b.memberCount - a.memberCount);
  if (sameTier.length > 0) return sameTier[0].leagueId;
  return withRoom.sort((a, b) => a.memberCount - b.memberCount)[0].leagueId;
}

// src/core/puzzles/rng.ts
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  const seedFn = xmur3(seed);
  const rand = mulberry32(seedFn());
  const next = () => rand();
  const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = (arr) => {
    if (arr.length === 0) throw new Error("pick from empty array");
    return arr[int(0, arr.length - 1)];
  };
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return { next, int, pick, shuffle };
}
function dailySeed(playDate, salt = "bout-global") {
  return `${salt}:${playDate}`;
}

// src/core/puzzles/rotation.ts
function typeForDayOfWeek(dayOfWeek) {
  switch (dayOfWeek) {
    case 1:
      return "word";
    // Monday — ease in
    case 2:
      return "logic";
    case 3:
      return "number";
    case 4:
      return "visual";
    case 5:
      return "memory";
    case 6:
      return "weekend";
    // Saturday — the harder feature bout
    case 0:
    default:
      return "trivia";
  }
}
function difficultyForDayOfWeek(dayOfWeek) {
  if (dayOfWeek === 6) return "hard";
  if (dayOfWeek === 1) return "easy";
  return "medium";
}
function scheduleForDate(playDate) {
  const [y, m, d] = playDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { type: typeForDayOfWeek(dow), difficulty: difficultyForDayOfWeek(dow) };
}

// src/core/puzzles/word.ts
var WORDS = {
  easy: [
    { word: "plant", hint: "It grows in soil" },
    { word: "river", hint: "Water flows along it" },
    { word: "stone", hint: "A small rock" },
    { word: "light", hint: "Opposite of dark" },
    { word: "cloud", hint: "It drifts across the sky" },
    { word: "bread", hint: "You slice it for toast" },
    { word: "chair", hint: "You sit on it" },
    { word: "green", hint: "Colour of grass" },
    { word: "beach", hint: "Sand meets the sea" },
    { word: "clock", hint: "It tells the time" },
    { word: "mouse", hint: "A small rodent" },
    { word: "piano", hint: "It has black and white keys" },
    { word: "apple", hint: "Keeps the doctor away" },
    { word: "storm", hint: "Wild weather" },
    { word: "brush", hint: "You paint with it" },
    { word: "candle", hint: "A wax light" },
    { word: "grape", hint: "Wine is made from it" },
    { word: "house", hint: "You live in it" },
    { word: "sugar", hint: "It makes things sweet" },
    { word: "tiger", hint: "A big striped cat" },
    { word: "water", hint: "You drink it" },
    { word: "glass", hint: "A window is made of it" },
    { word: "snake", hint: "A legless reptile" },
    { word: "train", hint: "It runs on rails" },
    { word: "ocean", hint: "A vast body of water" },
    { word: "lemon", hint: "A sour yellow fruit" },
    { word: "horse", hint: "You can ride it" },
    { word: "bench", hint: "A seat in the park" },
    { word: "flame", hint: "Part of a fire" },
    { word: "crown", hint: "A king wears it" }
  ],
  medium: [
    { word: "planet", hint: "Earth is one" },
    { word: "garden", hint: "Where flowers are grown" },
    { word: "bridge", hint: "It spans a river" },
    { word: "silver", hint: "A precious metal" },
    { word: "window", hint: "You look through it" },
    { word: "forest", hint: "Many trees together" },
    { word: "rocket", hint: "It launches into space" },
    { word: "pencil", hint: "You write with it" },
    { word: "candle", hint: "A wax light source" },
    { word: "orange", hint: "A citrus fruit and a colour" },
    { word: "castle", hint: "A fortified home for royalty" },
    { word: "guitar", hint: "A six-string instrument" },
    { word: "island", hint: "Land surrounded by water" },
    { word: "market", hint: "Where goods are sold" },
    { word: "tunnel", hint: "A passage through a hill" },
    { word: "jacket", hint: "You wear it when cold" },
    { word: "shadow", hint: "Cast when light is blocked" },
    { word: "frozen", hint: "Turned to ice" },
    { word: "butter", hint: "You spread it on toast" },
    { word: "desert", hint: "A vast dry land" },
    { word: "engine", hint: "It powers a car" },
    { word: "hammer", hint: "It drives nails" },
    { word: "ladder", hint: "You climb its rungs" },
    { word: "magnet", hint: "It attracts iron" },
    { word: "pillow", hint: "You rest your head on it" },
    { word: "ribbon", hint: "It ties a bow" },
    { word: "saddle", hint: "A seat on a horse" },
    { word: "temple", hint: "A place of worship" },
    { word: "violin", hint: "A bowed string instrument" },
    { word: "winter", hint: "The coldest season" }
  ],
  hard: [
    { word: "compass", hint: "It points north" },
    { word: "diamond", hint: "A hard gemstone" },
    { word: "gravity", hint: "It pulls things down" },
    { word: "journey", hint: "A long trip" },
    { word: "lantern", hint: "A portable light" },
    { word: "thunder", hint: "It follows lightning" },
    { word: "kitchen", hint: "Where meals are cooked" },
    { word: "harvest", hint: "Gathering the crops" },
    { word: "mineral", hint: "A natural solid like quartz" },
    { word: "orchard", hint: "Where fruit trees grow" },
    { word: "painter", hint: "An artist with a brush" },
    { word: "quarter", hint: "One of four equal parts" },
    { word: "soldier", hint: "Serves in an army" },
    { word: "teacher", hint: "Leads a classroom" },
    { word: "volcano", hint: "It can erupt with lava" },
    { word: "whisper", hint: "To speak very softly" },
    { word: "biscuit", hint: "A crunchy baked treat" },
    { word: "captain", hint: "Leads a ship or team" },
    { word: "crystal", hint: "A clear, faceted solid" },
    { word: "freedom", hint: "The state of being free" },
    { word: "gateway", hint: "An entrance or portal" },
    { word: "machine", hint: "A mechanical device" },
    { word: "pyramid", hint: "A four-sided monument" },
    { word: "rainbow", hint: "Arc of colour after rain" }
  ]
};
function scramble(rng, word) {
  let s = word;
  let attempts = 0;
  while (s === word && attempts < 20) {
    s = rng.shuffle(word.split("")).join("");
    attempts++;
  }
  if (s === word) {
    s = word.slice(1) + word[0];
  }
  return s;
}
var wordType = {
  id: "word",
  label: "Word",
  generate(rng, difficulty) {
    const entry = rng.pick(WORDS[difficulty]);
    const scrambled = scramble(rng, entry.word);
    return {
      type: "word",
      difficulty,
      payload: { scrambled, length: entry.word.length, hint: entry.hint },
      solution: { answer: entry.word },
      speedWindow: { fastMs: 8e3, slowMs: 9e4 }
    };
  },
  validate(submission, solution, payload) {
    const sub = submission ?? {};
    const answer = (sub.answer ?? "").trim().toLowerCase();
    const completed = answer.length === payload.length;
    if (answer !== solution.answer.toLowerCase()) {
      return { completed, accuracy: 0, detail: completed ? "Not the word" : "Incomplete" };
    }
    const wasted = Math.max(0, Math.floor(sub.wastedGuesses ?? 0));
    const accuracy = Math.max(0, 1 - wasted * 0.15);
    return { completed: true, accuracy, detail: wasted === 0 ? "Flawless" : `${wasted} wasted guess(es)` };
  },
  selfCheck(puzzle) {
    const { payload, solution } = puzzle;
    if (solution.answer.length !== payload.length) return { ok: false, reason: "length mismatch" };
    if (payload.scrambled.toLowerCase() === solution.answer.toLowerCase())
      return { ok: false, reason: "scramble equals answer (no puzzle)" };
    const a = payload.scrambled.toLowerCase().split("").sort().join("");
    const b = solution.answer.toLowerCase().split("").sort().join("");
    if (a !== b) return { ok: false, reason: "scramble is not an anagram of the answer" };
    if (!payload.hint || payload.hint.toLowerCase().includes(solution.answer.toLowerCase()))
      return { ok: false, reason: "hint missing or leaks the answer" };
    return { ok: true };
  }
};

// src/core/puzzles/logic.ts
var CASTS = [
  { items: ["Ash", "Bo", "Cy", "Di", "Ed"], prompt: "Order them tallest to shortest" },
  { items: ["Rex", "Sky", "Tay", "Uma", "Val"], prompt: "Order them by finish, first to last" },
  { items: ["Mo", "Nia", "Ola", "Pia", "Quy"], prompt: "Order them oldest to youngest" },
  { items: ["Fox", "Gus", "Hal", "Ivy", "Jin"], prompt: "Order them by score, highest first" },
  { items: ["Kit", "Lou", "Mae", "Ned", "Oz"], prompt: "Order them heaviest to lightest" },
  { items: ["Pax", "Quin", "Rae", "Sol", "Tex"], prompt: "Order them fastest to slowest" },
  { items: ["Ada", "Ben", "Cleo", "Dot", "Eli"], prompt: "Order them by rank, top first" },
  { items: ["Wren", "Xan", "Yu", "Zed", "Ada"], prompt: "Order them by finish, first to last" }
];
function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}
function satisfies(order, clues) {
  const pos = new Map(order.map((x, i) => [x, i]));
  return clues.every((c) => (pos.get(c.before) ?? -1) < (pos.get(c.after) ?? -1));
}
function countSolutions(items, clues) {
  let count = 0;
  let first;
  for (const p of permutations(items)) {
    if (satisfies(p, clues)) {
      count++;
      if (!first) first = p;
      if (count > 1) break;
    }
  }
  return { count, first };
}
var logicType = {
  id: "logic",
  label: "Logic",
  generate(rng, difficulty) {
    const n = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 5;
    const cast = rng.pick(CASTS);
    const items = cast.items.slice(0, n);
    const truth = rng.shuffle(items);
    const allAdjacent = [];
    for (let i = 0; i < truth.length - 1; i++) {
      allAdjacent.push({ before: truth[i], after: truth[i + 1] });
    }
    const extras = [];
    if (truth.length >= 4) extras.push({ before: truth[0], after: truth[truth.length - 1] });
    let clues = rng.shuffle([...allAdjacent, ...extras]);
    for (const c of [...clues]) {
      const without = clues.filter((x) => x !== c);
      if (countSolutions(items, without).count === 1) clues = without;
    }
    return {
      type: "logic",
      difficulty,
      payload: { items: rng.shuffle(items), clues, prompt: cast.prompt },
      solution: { order: truth },
      speedWindow: { fastMs: 15e3, slowMs: 12e4 }
    };
  },
  validate(submission, solution, payload) {
    const sub = submission ?? {};
    const order = Array.isArray(sub.order) ? sub.order : [];
    const completed = order.length === payload.items.length && new Set(order).size === order.length;
    if (!completed) return { completed: false, accuracy: 0, detail: "Incomplete ordering" };
    let correct = 0;
    for (let i = 0; i < solution.order.length; i++) if (order[i] === solution.order[i]) correct++;
    const accuracy = correct / solution.order.length;
    return { completed: true, accuracy, detail: `${correct}/${solution.order.length} in place` };
  },
  selfCheck(puzzle) {
    const { payload, solution } = puzzle;
    if (new Set(payload.items).size !== payload.items.length)
      return { ok: false, reason: "duplicate items" };
    if (!satisfies(solution.order, payload.clues))
      return { ok: false, reason: "stated solution violates its own clues" };
    const { count } = countSolutions(payload.items, payload.clues);
    if (count !== 1) return { ok: false, reason: `expected exactly 1 solution, found ${count}` };
    return { ok: true };
  }
};

// src/core/puzzles/number.ts
function applyOp(acc, op, v) {
  switch (op) {
    case "+":
      return acc + v;
    case "-":
      return acc - v;
    case "\xD7":
      return acc * v;
  }
}
function evaluate(values, ops) {
  let acc = values[0];
  for (let i = 1; i < values.length; i++) acc = applyOp(acc, ops[i], values[i]);
  return acc;
}
function uniquenessCount(values, ops, blankIndex, result) {
  let matches = 0;
  for (let candidate = -200; candidate <= 200; candidate++) {
    const filled = values.map((v, i) => i === blankIndex ? candidate : v);
    if (evaluate(filled, ops) === result) matches++;
  }
  return matches;
}
var numberType = {
  id: "number",
  label: "Number",
  generate(rng, difficulty) {
    const count = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
    const opsPool = difficulty === "easy" ? ["+", "-"] : ["+", "-", "\xD7"];
    const values = [rng.int(2, 9)];
    const ops = [null];
    for (let i = 1; i < count; i++) {
      ops.push(rng.pick(opsPool));
      values.push(rng.int(2, 9));
    }
    const result = evaluate(values, ops);
    const candidates = rng.shuffle(Array.from({ length: count }, (_, i) => i));
    let blankIndex = 0;
    for (const idx of candidates) {
      if (uniquenessCount(values, ops, idx, result) === 1) {
        blankIndex = idx;
        break;
      }
    }
    const answer = values[blankIndex];
    const terms = values.map((v, i) => ({
      op: ops[i] ?? null,
      value: i === blankIndex ? null : v
    }));
    return {
      type: "number",
      difficulty,
      payload: { terms, result, blankIndex },
      solution: { value: answer },
      speedWindow: { fastMs: 12e3, slowMs: 9e4 }
    };
  },
  validate(submission, solution) {
    const sub = submission ?? {};
    if (typeof sub.value !== "number" || !Number.isFinite(sub.value))
      return { completed: false, accuracy: 0, detail: "No answer" };
    const correct = sub.value === solution.value;
    return { completed: true, accuracy: correct ? 1 : 0, detail: correct ? "Correct" : "Wrong value" };
  },
  selfCheck(puzzle) {
    const { payload, solution } = puzzle;
    if (payload.blankIndex < 0 || payload.blankIndex >= payload.terms.length)
      return { ok: false, reason: "blank index out of range" };
    const values = payload.terms.map((t) => t.value);
    const ops = payload.terms.map((t) => t.op);
    const matches = uniquenessCount(values, ops, payload.blankIndex, payload.result);
    if (matches !== 1) return { ok: false, reason: `expected unique answer, found ${matches}` };
    const filledTruth = values.map((v, i) => i === payload.blankIndex ? solution.value : v);
    if (evaluate(filledTruth, ops) !== payload.result)
      return { ok: false, reason: "solution does not satisfy the equation" };
    return { ok: true };
  }
};

// src/core/puzzles/visual.ts
function flipH(g) {
  return g.map((row) => [...row].reverse());
}
function flipV(g) {
  return [...g].reverse().map((r) => [...r]);
}
function rotate180(g) {
  return flipV(flipH(g));
}
function applyTransform(g, t) {
  return t === "flip-h" ? flipH(g) : t === "flip-v" ? flipV(g) : rotate180(g);
}
function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function randomGrid(rng, size) {
  const g = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) row.push(rng.next() < 0.5 ? 1 : 0);
    g.push(row);
  }
  return g;
}
function mutate(rng, g) {
  const copy = g.map((r2) => [...r2]);
  const r = rng.int(0, g.length - 1);
  const c = rng.int(0, g[0].length - 1);
  copy[r][c] = copy[r][c] === 1 ? 0 : 1;
  return copy;
}
var visualType = {
  id: "visual",
  label: "Visual",
  generate(rng, difficulty) {
    const size = difficulty === "hard" ? 4 : 3;
    const transform = rng.pick(["flip-h", "flip-v", "rotate-180"]);
    let grid = randomGrid(rng, size);
    let answer = applyTransform(grid, transform);
    let guard = 0;
    while (eq(grid, answer) && guard++ < 20) {
      grid = randomGrid(rng, size);
      answer = applyTransform(grid, transform);
    }
    const distractors = [];
    let attempts = 0;
    while (distractors.length < 3 && attempts++ < 200) {
      const d = mutate(rng, answer);
      if (!eq(d, answer) && !distractors.some((x) => eq(x, d))) distractors.push(d);
    }
    const all = rng.shuffle([answer, ...distractors]);
    const index = all.findIndex((g) => eq(g, answer));
    return {
      type: "visual",
      difficulty,
      payload: { grid, transform, options: all },
      solution: { index },
      speedWindow: { fastMs: 1e4, slowMs: 75e3 }
    };
  },
  validate(submission, solution, payload) {
    const sub = submission ?? {};
    if (typeof sub.index !== "number" || sub.index < 0 || sub.index >= payload.options.length)
      return { completed: false, accuracy: 0, detail: "No choice" };
    const correct = sub.index === solution.index;
    return { completed: true, accuracy: correct ? 1 : 0, detail: correct ? "Correct" : "Wrong option" };
  },
  selfCheck(puzzle) {
    const { payload, solution } = puzzle;
    const truth = applyTransform(payload.grid, payload.transform);
    if (eq(payload.grid, truth)) return { ok: false, reason: "transform is a no-op (symmetric grid)" };
    const matches = payload.options.filter((o) => eq(o, truth));
    if (matches.length !== 1) return { ok: false, reason: `expected 1 matching option, found ${matches.length}` };
    if (!eq(payload.options[solution.index], truth))
      return { ok: false, reason: "solution index does not point at the correct option" };
    return { ok: true };
  }
};

// src/core/puzzles/memory.ts
var ALPHABET = ["A", "B", "C", "D", "E", "F"];
var memoryType = {
  id: "memory",
  label: "Memory",
  generate(rng, difficulty) {
    const length = difficulty === "easy" ? 5 : difficulty === "medium" ? 7 : 9;
    const alphabetSize = difficulty === "hard" ? 6 : 4;
    const alphabet = ALPHABET.slice(0, alphabetSize);
    const sequence = [];
    for (let i = 0; i < length; i++) sequence.push(rng.pick(alphabet));
    const flashMs = difficulty === "easy" ? 4e3 : difficulty === "medium" ? 3500 : 3e3;
    return {
      type: "memory",
      difficulty,
      payload: { alphabet, length, flashMs },
      // The full sequence is the solution — held server-side only.
      solution: { sequence },
      speedWindow: { fastMs: 6e3, slowMs: 45e3 }
    };
  },
  validate(submission, solution, payload) {
    const sub = submission ?? {};
    const seq = Array.isArray(sub.sequence) ? sub.sequence : [];
    const completed = seq.length === payload.length;
    if (!completed) return { completed: false, accuracy: 0, detail: "Incomplete recall" };
    let correct = 0;
    for (let i = 0; i < solution.sequence.length; i++) if (seq[i] === solution.sequence[i]) correct++;
    return {
      completed: true,
      accuracy: correct / solution.sequence.length,
      detail: `${correct}/${solution.sequence.length} recalled`
    };
  },
  selfCheck(puzzle) {
    const { payload, solution } = puzzle;
    if (solution.sequence.length !== payload.length)
      return { ok: false, reason: "sequence length mismatch" };
    if (solution.sequence.some((s) => !payload.alphabet.includes(s)))
      return { ok: false, reason: "sequence uses a symbol outside the alphabet" };
    return { ok: true };
  }
};

// src/core/puzzles/trivia.ts
var WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function buildSeries(rng, difficulty) {
  const kind = rng.pick(["weekday", "month", "letter", "count", "skip"]);
  const len = difficulty === "hard" ? 5 : 4;
  switch (kind) {
    case "weekday": {
      const start = rng.int(0, 6);
      const seq = Array.from({ length: len }, (_, i) => WEEKDAYS[(start + i) % 7]);
      return { prompt: "What comes next?", seq };
    }
    case "month": {
      const start = rng.int(0, 11);
      const seq = Array.from({ length: len }, (_, i) => MONTHS[(start + i) % 12]);
      return { prompt: "What comes next?", seq };
    }
    case "letter": {
      const start = rng.int(0, 26 - (len + 1));
      const seq = Array.from({ length: len }, (_, i) => LETTERS[start + i]);
      return { prompt: "Which letter is next?", seq };
    }
    case "skip": {
      const start = rng.int(1, 9);
      const step = rng.pick([2, 3, 5]);
      const seq = Array.from({ length: len }, (_, i) => String(start + i * step));
      return { prompt: `Continue the pattern`, seq };
    }
    case "count":
    default: {
      const start = rng.int(1, 20);
      const seq = Array.from({ length: len }, (_, i) => String(start + i));
      return { prompt: "What number is next?", seq };
    }
  }
}
function nextOf(seq) {
  if (WEEKDAYS.includes(seq[0])) {
    const idx = WEEKDAYS.indexOf(seq[seq.length - 1]);
    return WEEKDAYS[(idx + 1) % 7];
  }
  if (MONTHS.includes(seq[0])) {
    const idx = MONTHS.indexOf(seq[seq.length - 1]);
    return MONTHS[(idx + 1) % 12];
  }
  if (LETTERS.includes(seq[0]) && seq[0].length === 1) {
    const idx = LETTERS.indexOf(seq[seq.length - 1]);
    return LETTERS[(idx + 1) % 26];
  }
  const nums = seq.map(Number);
  const step = nums[1] - nums[0];
  return String(nums[nums.length - 1] + step);
}
function distractorsFor(rng, seq, answer) {
  const pool = /* @__PURE__ */ new Set();
  if (WEEKDAYS.includes(answer)) WEEKDAYS.forEach((d) => pool.add(d));
  else if (MONTHS.includes(answer)) MONTHS.forEach((m) => pool.add(m));
  else if (LETTERS.includes(answer) && answer.length === 1) {
    const idx = LETTERS.indexOf(answer);
    [-2, -1, 1, 2].forEach((d) => pool.add(LETTERS[(idx + d + 26) % 26]));
  } else {
    const n = Number(answer);
    [-3, -2, -1, 1, 2, 3].forEach((d) => pool.add(String(n + d)));
  }
  pool.delete(answer);
  seq.forEach((s) => pool.delete(s));
  const choices = rng.shuffle([...pool]).slice(0, 3);
  return choices;
}
var triviaType = {
  id: "trivia",
  label: "Trivia-lite",
  generate(rng, difficulty) {
    const series = buildSeries(rng, difficulty);
    const answer = nextOf(series.seq);
    const options = rng.shuffle([answer, ...distractorsFor(rng, series.seq, answer)]);
    return {
      type: "trivia",
      difficulty,
      payload: { prompt: series.prompt, sequence: series.seq, options },
      solution: { answer },
      speedWindow: { fastMs: 8e3, slowMs: 6e4 }
    };
  },
  validate(submission, solution) {
    const sub = submission ?? {};
    const answer = (sub.answer ?? "").toString();
    if (!answer) return { completed: false, accuracy: 0, detail: "No choice" };
    const correct = answer === solution.answer;
    return { completed: true, accuracy: correct ? 1 : 0, detail: correct ? "Correct" : "Wrong" };
  },
  selfCheck(puzzle) {
    const { payload, solution } = puzzle;
    if (!payload.options.includes(solution.answer))
      return { ok: false, reason: "answer not among the options" };
    if (new Set(payload.options).size !== payload.options.length)
      return { ok: false, reason: "duplicate options" };
    const recomputed = nextOf(payload.sequence);
    if (recomputed !== solution.answer)
      return { ok: false, reason: "solution is not the true continuation" };
    const correctCount = payload.options.filter((o) => o === recomputed).length;
    if (correctCount !== 1) return { ok: false, reason: "not exactly one correct option" };
    return { ok: true };
  }
};

// src/core/puzzles/weekend.ts
var N = 4;
var BOX = 2;
function clone(g) {
  return g.map((r) => [...r]);
}
function canPlace(g, r, c, v) {
  for (let i = 0; i < N; i++) {
    if (g[r][i] === v) return false;
    if (g[i][c] === v) return false;
  }
  const br = Math.floor(r / BOX) * BOX;
  const bc = Math.floor(c / BOX) * BOX;
  for (let i = 0; i < BOX; i++)
    for (let j = 0; j < BOX; j++) if (g[br + i][bc + j] === v) return false;
  return true;
}
function countSolutions2(grid, cap = 2) {
  const g = clone(grid);
  let count = 0;
  const solve = () => {
    if (count >= cap) return;
    let r = -1;
    let c = -1;
    outer: for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        if (g[i][j] === 0) {
          r = i;
          c = j;
          break outer;
        }
    if (r === -1) {
      count++;
      return;
    }
    for (let v = 1; v <= N; v++) {
      if (canPlace(g, r, c, v)) {
        g[r][c] = v;
        solve();
        g[r][c] = 0;
        if (count >= cap) return;
      }
    }
  };
  solve();
  return count;
}
function fullGrid(rng) {
  const g = Array.from({ length: N }, () => Array(N).fill(0));
  const fill = (pos) => {
    if (pos === N * N) return true;
    const r = Math.floor(pos / N);
    const c = pos % N;
    for (const v of rng.shuffle([1, 2, 3, 4])) {
      if (canPlace(g, r, c, v)) {
        g[r][c] = v;
        if (fill(pos + 1)) return true;
        g[r][c] = 0;
      }
    }
    return false;
  };
  fill(0);
  return g;
}
var weekendType = {
  id: "weekend",
  label: "Weekend feature",
  generate(rng, difficulty) {
    const solved = fullGrid(rng);
    const puzzle = clone(solved);
    const targetBlanks = difficulty === "hard" ? 9 : difficulty === "medium" ? 8 : 6;
    const cells = rng.shuffle(
      Array.from({ length: N * N }, (_, i) => ({ r: Math.floor(i / N), c: i % N }))
    );
    let blanks = 0;
    for (const { r, c } of cells) {
      if (blanks >= targetBlanks) break;
      const saved = puzzle[r][c];
      puzzle[r][c] = 0;
      if (countSolutions2(puzzle, 2) === 1) {
        blanks++;
      } else {
        puzzle[r][c] = saved;
      }
    }
    return {
      type: "weekend",
      difficulty,
      payload: { grid: puzzle },
      solution: { grid: solved },
      speedWindow: { fastMs: 45e3, slowMs: 3e5 }
    };
  },
  validate(submission, solution, payload) {
    const sub = submission ?? {};
    const grid = sub.grid;
    if (!Array.isArray(grid) || grid.length !== N || grid.some((row) => !Array.isArray(row) || row.length !== N))
      return { completed: false, accuracy: 0, detail: "Malformed grid" };
    let blanks = 0;
    let correct = 0;
    let allFilled = true;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (payload.grid[r][c] === 0) {
          blanks++;
          const v = grid[r][c];
          if (typeof v !== "number" || v < 1 || v > N) allFilled = false;
          if (v === solution.grid[r][c]) correct++;
        }
      }
    }
    if (!allFilled) return { completed: false, accuracy: 0, detail: "Grid not fully filled" };
    return { completed: true, accuracy: blanks === 0 ? 1 : correct / blanks, detail: `${correct}/${blanks} cells` };
  },
  selfCheck(puzzle) {
    const { payload, solution } = puzzle;
    for (let r = 0; r < N; r++) {
      const row = new Set(solution.grid[r]);
      if (row.size !== N || [...row].some((v) => v < 1 || v > N))
        return { ok: false, reason: "solution row invalid" };
    }
    for (let c = 0; c < N; c++) {
      const col = new Set(solution.grid.map((row) => row[c]));
      if (col.size !== N) return { ok: false, reason: "solution column invalid" };
    }
    for (let br = 0; br < N; br += BOX)
      for (let bc = 0; bc < N; bc += BOX) {
        const box = /* @__PURE__ */ new Set();
        for (let i = 0; i < BOX; i++) for (let j = 0; j < BOX; j++) box.add(solution.grid[br + i][bc + j]);
        if (box.size !== N) return { ok: false, reason: "solution box invalid" };
      }
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (payload.grid[r][c] !== 0 && payload.grid[r][c] !== solution.grid[r][c])
          return { ok: false, reason: "clue contradicts solution" };
    const solutions = countSolutions2(payload.grid, 2);
    if (solutions !== 1) return { ok: false, reason: `expected unique solution, found ${solutions}` };
    return { ok: true };
  }
};

// src/core/puzzles/registry.ts
var PUZZLE_TYPES = {
  word: wordType,
  logic: logicType,
  number: numberType,
  visual: visualType,
  memory: memoryType,
  trivia: triviaType,
  weekend: weekendType
};
function getPuzzleType(id) {
  const t = PUZZLE_TYPES[id];
  if (!t) throw new Error(`Unknown puzzle type: ${id}`);
  return t;
}
var PuzzleValidationError = class extends Error {
  constructor(typeId, reason) {
    super(`Puzzle [${typeId}] failed validation: ${reason}`);
    this.typeId = typeId;
    this.reason = reason;
    this.name = "PuzzleValidationError";
  }
  typeId;
  reason;
};
function generateDailyPuzzle(playDate, leagueSalt = "bout-global") {
  const { type, difficulty } = scheduleForDate(playDate);
  const def = getPuzzleType(type);
  const MAX_ATTEMPTS = 50;
  let lastReason = "unknown";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const seed = attempt === 0 ? dailySeed(playDate, leagueSalt) : `${dailySeed(playDate, leagueSalt)}#${attempt}`;
    const rng = makeRng(seed);
    const puzzle = def.generate(rng, difficulty);
    const check = def.selfCheck(puzzle);
    if (check.ok) return puzzle;
    lastReason = check.reason ?? "failed selfCheck";
  }
  throw new PuzzleValidationError(type, `no valid instance after ${MAX_ATTEMPTS} attempts: ${lastReason}`);
}
function assertPublishable(puzzle) {
  const def = getPuzzleType(puzzle.type);
  const result = def.selfCheck(puzzle);
  if (!result.ok) throw new PuzzleValidationError(puzzle.type, result.reason ?? "unknown");
}
function toClientPayload(puzzle) {
  return {
    type: puzzle.type,
    difficulty: puzzle.difficulty,
    payload: puzzle.payload,
    speedWindow: puzzle.speedWindow
  };
}
function validateSubmission(puzzle, submission) {
  const def = getPuzzleType(puzzle.type);
  return def.validate(submission, puzzle.solution, puzzle.payload);
}

// src/core/puzzles/fingerprint.ts
function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const obj = value;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}
function fingerprint(puzzle) {
  const input = canonicalize({
    type: puzzle.type,
    difficulty: puzzle.difficulty,
    payload: puzzle.payload,
    solution: puzzle.solution
  });
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = hash * prime & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

// src/core/puzzles/stream.ts
var ALL_TYPES = Object.keys(PUZZLE_TYPES);
var DIFFICULTIES = ["easy", "medium", "hard"];
function createUniqueStream(opts = {}) {
  const seen = new Set(opts.seen ?? []);
  const salt = opts.salt ?? "bout-stream";
  const maxAttempts = opts.maxAttemptsPerPuzzle ?? 5e3;
  let counter = 0;
  let last = null;
  const next = () => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const typeId = opts.type ?? ALL_TYPES[counter % ALL_TYPES.length];
      const def = getPuzzleType(typeId);
      const difficulty = opts.difficulty ?? DIFFICULTIES[(counter >> 3) % DIFFICULTIES.length];
      const seed = `${salt}:${typeId}:${difficulty}:${counter}:${attempt}`;
      counter++;
      const puzzle = def.generate(makeRng(seed), difficulty);
      if (!def.selfCheck(puzzle).ok) continue;
      const fp = fingerprint(puzzle);
      if (seen.has(fp)) continue;
      seen.add(fp);
      last = fp;
      return puzzle;
    }
    throw new Error(
      `puzzle space exhausted for type=${opts.type ?? "all"} after ${maxAttempts} attempts`
    );
  };
  return {
    next,
    take: (n) => Array.from({ length: n }, () => next()),
    lastFingerprint: () => last,
    size: () => seen.size
  };
}
function generateUnique(count, opts = {}) {
  return createUniqueStream(opts).take(count);
}
function generateUniqueDaily(playDate, seenFingerprints = [], leagueSalt = "bout-global") {
  const { type, difficulty } = scheduleForDate(playDate);
  const def = getPuzzleType(type);
  const seen = new Set(seenFingerprints);
  for (let attempt = 0; attempt < 1e4; attempt++) {
    const seed = `${leagueSalt}:${playDate}:${attempt}`;
    const puzzle = def.generate(makeRng(seed), difficulty);
    if (!def.selfCheck(puzzle).ok) continue;
    const fp = fingerprint(puzzle);
    if (seen.has(fp)) continue;
    return { puzzle, fingerprint: fp };
  }
  throw new Error(`could not generate a non-repeating ${type} puzzle for ${playDate}`);
}
export {
  Config,
  PICKEM,
  PUSH,
  PUZZLE_TYPES,
  PuzzleValidationError,
  SCORING,
  SEASON,
  SEED_WEIGHT_CLASS,
  SPEED,
  WEIGHT_CLASSES,
  accuracyPoints,
  actualDayWinner,
  assertPublishable,
  buildSeasonWindow,
  canonicalize,
  computeDivisionChanges,
  createUniqueStream,
  dailySeed,
  difficultyForDayOfWeek,
  fingerprint,
  generateDailyPuzzle,
  generateInviteCode,
  generateUnique,
  generateUniqueDaily,
  getPuzzleType,
  improvementPoints,
  inviteLink,
  isFinalsDay,
  isValidInviteCode,
  makeRng,
  matchHouseLeague,
  nextSeasonStart,
  nextStreak,
  rankStandings,
  resetForNewSeason,
  resolvePredictions,
  rollingAverage,
  scheduleForDate,
  scoreAttempt,
  seasonStatusOn,
  seedStandings,
  speedPoints,
  streakIsAlive,
  streakMultiplier,
  toClientPayload,
  typeForDayOfWeek,
  validateSubmission
};
