const Store = (() => {
  const KEY = "pixel-study-v1";
  let state = load();

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "");
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.scores)) {
        if (!Array.isArray(parsed.ratings)) parsed.ratings = [];
        if (!Array.isArray(parsed.pets)) parsed.pets = [];
        return parsed;
      }
    } catch (err) {
      /* 壞掉的存檔就從頭開始 */
    }
    return { users: [], scores: [], ratings: [], pets: [], session: null };
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function bytesToHex(buffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return bytesToHex(buf);
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }

  function current() {
    if (!state.session) return null;
    return state.users.find((user) => user.id === state.session) || null;
  }

  function nameOf(userId) {
    const user = state.users.find((item) => item.id === userId);
    return user ? user.username : "";
  }

  function validName(username) {
    const name = username.trim();
    if (name.length < 2) return "name-short";
    if (name.length > 12) return "name-long";
    if (/\s/.test(name)) return "name-space";
    return "";
  }

  async function register(username, password) {
    const nameError = validName(username);
    if (nameError) return { ok: false, error: nameError };
    if (password.length < 6) return { ok: false, error: "password-short" };
    if (password.length > 32) return { ok: false, error: "password-long" };
    const name = username.trim();
    const taken = state.users.some((user) => user.username.toLowerCase() === name.toLowerCase());
    if (taken) return { ok: false, error: "taken" };
    const salt = randomSalt();
    const hash = await sha256(salt + password);
    const user = { id: crypto.randomUUID(), username: name, salt, hash, createdAt: Date.now() };
    state.users.push(user);
    state.session = user.id;
    save();
    return { ok: true, user };
  }

  async function login(username, password) {
    const name = username.trim();
    const user = state.users.find((item) => item.username.toLowerCase() === name.toLowerCase());
    if (!user) return { ok: false, error: "bad-login" };
    const hash = await sha256(user.salt + password);
    if (hash !== user.hash) return { ok: false, error: "bad-login" };
    state.session = user.id;
    save();
    return { ok: true, user };
  }

  function logout() {
    state.session = null;
    save();
  }

  function submitScore(gameId, raw, max) {
    const user = current();
    const safeMax = Math.max(1, Number(max) || 1);
    const value = Math.max(0, Math.min(safeMax, Math.round(Number(raw))));
    if (!Number.isFinite(value)) return { ok: false, reason: "bad" };
    if (!user) return { ok: false, reason: "auth", raw: value };
    const points = Math.round((value / safeMax) * 100);
    const existing = state.scores.find((item) => item.userId === user.id && item.gameId === gameId);
    if (!existing) {
      state.scores.push({ userId: user.id, gameId, raw: value, points, at: Date.now() });
      save();
      return { ok: true, improved: true, raw: value, points, best: value, max: safeMax };
    }
    if (value > existing.raw) {
      existing.raw = value;
      existing.points = points;
      existing.at = Date.now();
      save();
      return { ok: true, improved: true, raw: value, points, best: value, max: safeMax };
    }
    return { ok: true, improved: false, raw: value, points: existing.points, best: existing.raw, max: safeMax };
  }

  function gameBoard(gameId) {
    return state.scores
      .filter((item) => item.gameId === gameId)
      .map((item) => ({ ...item, username: nameOf(item.userId) }))
      .sort((a, b) => b.raw - a.raw || a.at - b.at);
  }

  function globalBoard() {
    const map = new Map();
    state.scores.forEach((item) => {
      const row = map.get(item.userId) || { userId: item.userId, username: nameOf(item.userId), points: 0, games: 0, at: 0 };
      row.points += item.points;
      row.games += 1;
      row.at = Math.max(row.at, item.at);
      map.set(item.userId, row);
    });
    return [...map.values()].sort((a, b) => b.points - a.points || b.games - a.games || a.at - b.at);
  }

  function myBest(gameId) {
    const user = current();
    if (!user) return null;
    return state.scores.find((item) => item.userId === user.id && item.gameId === gameId) || null;
  }

  function ratingOf(gameId) {
    const rows = state.ratings.filter((item) => item.gameId === gameId && item.stars >= 0.5);
    if (!rows.length) return { average: 0, count: 0 };
    const sum = rows.reduce((total, item) => total + item.stars, 0);
    return { average: sum / rows.length, count: rows.length };
  }

  function myRating(gameId) {
    const user = current();
    if (!user) return null;
    const row = state.ratings.find((item) => item.userId === user.id && item.gameId === gameId);
    return row ? row.stars : null;
  }

  function setRating(gameId, stars) {
    const user = current();
    if (!user) return { ok: false, error: "auth" };
    if (!myBest(gameId)) return { ok: false, error: "need-play" };
    const raw = Number(stars);
    const value = Math.round(raw * 2) / 2;
    if (!Number.isFinite(raw) || Math.abs(raw - value) > 0.001 || value < 0.5 || value > 5) {
      return { ok: false, error: "bad-stars" };
    }
    const existing = state.ratings.find((item) => item.userId === user.id && item.gameId === gameId);
    if (existing) {
      existing.stars = value;
      existing.at = Date.now();
    } else {
      state.ratings.push({ userId: user.id, gameId, stars: value, at: Date.now() });
    }
    save();
    return { ok: true, stars: value, ...ratingOf(gameId) };
  }

  const PET_GAIN = 20;
  const PET_DAILY = 100;
  const PET_NEED = [0, 100, 400, 1100, 2500];
  const PET_IDS = ["bubble", "baby", "grow", "adult", "scholar"];
  const PET_SPECIES = ["cat", "dog", "rabbit"];

  function todayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
  }

  function stageIndex(xp) {
    let stage = 0;
    PET_NEED.forEach((need, index) => {
      if (xp >= need) stage = index;
    });
    return stage;
  }

  function findPet(user) {
    if (!Array.isArray(state.pets)) state.pets = [];
    return state.pets.find((item) => item.userId === user.id) || null;
  }

  function petRow(user) {
    const row = findPet(user);
    if (!row || !row.species) return null;
    const today = todayKey();
    if (row.day !== today) {
      row.day = today;
      row.dayXp = 0;
    }
    return row;
  }

  function petView() {
    const user = current();
    if (!user) return null;
    const existing = findPet(user);
    if (existing && !existing.species) {
      existing.species = "dog";
      save();
    }
    const row = petRow(user);
    if (!row) return { needsChoice: true };
    const stage = stageIndex(row.xp);
    const next = stage < PET_NEED.length - 1 ? PET_NEED[stage + 1] : null;
    const prev = PET_NEED[stage];
    return {
      species: row.species,
      id: PET_IDS[stage],
      stage,
      xp: row.xp,
      dayXp: row.dayXp,
      daily: PET_DAILY,
      next,
      into: next == null ? 1 : (row.xp - prev) / (next - prev),
    };
  }

  function choosePet(species) {
    const user = current();
    if (!user) return { ok: false, error: "auth" };
    if (!PET_SPECIES.includes(species)) return { ok: false, error: "bad-pet" };
    const existing = findPet(user);
    if (existing && existing.species) return { ok: false, error: "chosen" };
    const today = todayKey();
    if (existing) {
      existing.species = species;
    } else {
      state.pets.push({ userId: user.id, species, xp: 0, day: today, dayXp: 0 });
    }
    save();
    return { ok: true, species };
  }

  function gainPetXp() {
    const user = current();
    if (!user) return { ok: false, reason: "auth" };
    const row = petRow(user);
    if (!row) return { ok: false, reason: "nopet" };
    const before = stageIndex(row.xp);
    const gain = Math.min(PET_GAIN, Math.max(0, PET_DAILY - row.dayXp));
    if (gain > 0) {
      row.xp += gain;
      row.dayXp += gain;
      save();
    }
    const stage = stageIndex(row.xp);
    return {
      ok: true,
      gain,
      dayXp: row.dayXp,
      daily: PET_DAILY,
      xp: row.xp,
      stage,
      species: row.species,
      id: PET_IDS[stage],
      evolved: stage > before,
    };
  }

  function mySummary() {
    const user = current();
    if (!user) return null;
    const mine = state.scores.filter((item) => item.userId === user.id);
    const points = mine.reduce((sum, item) => sum + item.points, 0);
    return { username: user.username, points, games: mine.length };
  }

  return {
    current, register, login, logout, submitScore, gameBoard, globalBoard, myBest, mySummary,
    ratingOf, myRating, setRating, petView, choosePet, gainPetXp,
  };
})();
