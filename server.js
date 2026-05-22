require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Ensure data directory exists ----------
const dataDir = path.join(__dirname, 'data');
try { fs.mkdirSync(dataDir, { recursive: true }); } catch (err) {}

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'dotaquest_hub_super_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));

app.use(passport.initialize());
app.use(passport.session());

// ---------- Steam OAuth Strategy ----------
passport.use(new SteamStrategy({
    returnURL: `http://localhost:${PORT}/auth/steam/return`,
    realm: `http://localhost:${PORT}/`,
    apiKey: process.env.STEAM_API_KEY
  },
  (identifier, profile, done) => {
    const user = {
      steamId: profile.id,
      nickname: profile.displayName || 'Dota Warrior',
      avatar: profile.photos[2]?.value || profile.photos[1]?.value || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
      stars: 1000,
      inventory: [],
      questsCompleted: 0,
      casesOpened: 0,
      dailyBonusAvailable: true,
      lastBonusDate: null,
      firstCaseFree: true,
      completedQuestsIds: []
    };
    return done(null, user);
  }
));

passport.serializeUser((user, done) => done(null, user.steamId));
passport.deserializeUser(async (steamId, done) => {
  try {
    const userData = await loadUser(steamId);
    if (!userData) return done(null, false);
    done(null, { steamId, ...userData });
  } catch (err) { done(err); }
});

// ---------- File‑based user persistence ----------
const dataPath = path.join(__dirname, 'data', 'users.json');

async function loadUser(steamId) {
  try {
    const raw = await fs.promises.readFile(dataPath, 'utf8');
    const users = JSON.parse(raw);
    return users[steamId] || null;
  } catch (err) {
    return null;
  }
}

async function saveUser(steamId, userData) {
  let users = {};
  try {
    const raw = await fs.promises.readFile(dataPath, 'utf8');
    users = JSON.parse(raw);
  } catch (err) {}
  users[steamId] = userData;
  await fs.promises.writeFile(dataPath, JSON.stringify(users, null, 2));
}

// ---------- Helper: daily reset ----------
function checkDailyBonus(userData) {
  const today = new Date().toDateString();
  if (userData.lastBonusDate !== today) {
    userData.dailyBonusAvailable = true;
    userData.lastBonusDate = today;
  }
  return userData;
}

// ---------- Auth Routes ----------
app.get('/auth/steam', passport.authenticate('steam', { failureRedirect: '/' }));

app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  async (req, res) => {
    const user = req.user;
    let existing = await loadUser(user.steamId);
    if (!existing) {
      existing = {
        nickname: user.nickname,
        avatar: user.avatar,
        stars: user.stars,
        inventory: user.inventory,
        questsCompleted: user.questsCompleted,
        casesOpened: user.casesOpened,
        dailyBonusAvailable: user.dailyBonusAvailable,
        lastBonusDate: new Date().toDateString(),
        firstCaseFree: user.firstCaseFree,
        completedQuestsIds: user.completedQuestsIds
      };
    } else {
      // Preserve existing data but update nickname/avatar if changed
      existing.nickname = user.nickname;
      existing.avatar = user.avatar;
      existing = checkDailyBonus(existing);
    }
    await saveUser(user.steamId, existing);
    res.redirect(`/?steamId=${user.steamId}&name=${encodeURIComponent(user.nickname)}&avatar=${encodeURIComponent(user.avatar)}`);
  }
);

// ---------- API Routes ----------
app.get('/api/user/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  let data = await loadUser(req.user.steamId);
  if (data) {
    data = checkDailyBonus(data);
    await saveUser(req.user.steamId, data);
  }
  res.json({ steamId: req.user.steamId, ...data });
});

app.post('/api/user/save', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  const newData = req.body;
  const existing = await loadUser(req.user.steamId);
  const merged = { ...existing, ...newData };
  await saveUser(req.user.steamId, merged);
  res.json({ success: true });
});

app.get('/api/cases', (req, res) => {
  res.json([
    { id: 1, name: 'Radiant Relic', cost: 150, image: '🏆', contents: [
      { name: 'Dragonclaw Hook', rarity: 'Legendary', chance: 10, icon: '🔪' },
      { name: 'Blades of Voth Domosh', rarity: 'Rare', chance: 30, icon: '⚔️' },
      { name: 'Iron Branch', rarity: 'Common', chance: 60, icon: '🌿' }
    ]},
    { id: 2, name: 'Dire Darkness', cost: 200, image: '🌑', contents: [
      { name: 'Arcana Lina', rarity: 'Arcana', chance: 5, icon: '🔥' },
      { name: 'Shadow Blade', rarity: 'Common', chance: 50, icon: '🗡️' },
      { name: 'Demon Edge', rarity: 'Rare', chance: 45, icon: '⚔️' }
    ]},
    { id: 3, name: 'Ancient Fortune', cost: 300, image: '💎', contents: [
      { name: 'Exalted PA Arcana', rarity: 'Arcana', chance: 8, icon: '🗡️' },
      { name: 'Scythe of Vyse', rarity: 'Mythical', chance: 25, icon: '🐑' },
      { name: 'Butterfly', rarity: 'Legendary', chance: 67, icon: '🦋' }
    ]}
  ]);
});

app.post('/api/validate-quest', async (req, res) => {
  const { matchId, questType } = req.body;
  if (!matchId || !questType) return res.status(400).json({ error: 'Missing matchId or questType' });
  try {
    const { data } = await axios.get(`https://api.opendota.com/api/matches/${matchId}`, { timeout: 10000 });
    let valid = false;
    switch (questType) {
      case 'wards':
        valid = data.players.some(p => (p.obs_placed || 0) >= 15);
        break;
      case 'rubick':
        const rubick = data.players.find(p => p.hero_id === 126);
        valid = rubick && rubick.kills > 0;
        break;
      case 'towers':
        const towerKills = (data.tower_status_radiant || 0) + (data.tower_status_dire || 0);
        valid = towerKills >= 5;
        break;
      case 'support_wins':
        const winningTeam = data.radiant_win ? 0 : 1;
        const supports = data.players.filter(p => p.player_slot !== undefined && ((p.player_slot < 5 ? 0 : 1) === winningTeam) && (p.role === 4 || p.role === 5));
        valid = supports.length > 0;
        break;
      default: valid = false;
    }
    res.json({ valid });
  } catch (err) {
    console.error('OpenDota error:', err.message);
    res.status(500).json({ error: 'Could not fetch match data. Check Match ID or try again later.' });
  }
});

app.get('/api/user/inventory', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  // Mock Steam inventory – replace with real Steam API if needed
  res.json([
    { name: "Axe's Berserker Helm", rarity: 'Rare', image: 'https://community.cloudflare.steamstatic.com/economy/image/class/570/140551' },
    { name: 'Dragon Knight Shield', rarity: 'Legendary', image: 'https://community.cloudflare.steamstatic.com/economy/image/class/570/108229' },
    { name: 'Crimson Guard', rarity: 'Mythical', image: '' }
  ]);
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`✅ DotaQuest Hub running on http://localhost:${PORT}`));