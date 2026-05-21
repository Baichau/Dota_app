require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public')); // serve frontend files from /public

// Session (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }   // set true if using https
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Steam strategy
passport.use(new SteamStrategy({
    returnURL: 'http://localhost:3000/auth/steam/return',
    realm: 'http://localhost:3000/',
    apiKey: process.env.STEAM_API_KEY
  },
  (identifier, profile, done) => {
    // profile contains: id (steam64), displayName, photos[2].value (avatar)
    return done(null, profile);
  }
));

// ---------- Routes ----------

// 1. Start Steam login
app.get('/auth/steam', passport.authenticate('steam', { failureRedirect: '/' }));

// 2. Steam callback – redirect to frontend with user data in query params
app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    const user = req.user;
    // Redirect to frontend with user info as URL parameters
    const frontendUrl = `/?steamId=${user.id}&name=${encodeURIComponent(user.displayName)}&avatar=${encodeURIComponent(user.photos[2].value)}`;
    res.redirect(frontendUrl);
  }
);

// 3. In-memory user data store (replace with database later)
const userData = new Map();

// Get user progress
app.get('/api/user/:steamId', (req, res) => {
  const data = userData.get(req.params.steamId) || {
    stars: 1000,
    inventory: [],
    questsCompleted: 0,
    casesOpened: 0,
    dailyBonusAvailable: true,
    firstCaseFree: true,
  };
  res.json(data);
});

// Save user progress
app.post('/api/user/:steamId', (req, res) => {
  userData.set(req.params.steamId, req.body);
  res.json({ success: true });
});

// 4. Logout
app.get('/api/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));