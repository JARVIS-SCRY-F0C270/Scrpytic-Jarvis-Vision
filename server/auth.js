const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'scryptic-jarvis-hackathon-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authMiddleware(req, res, next) {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

async function register(req, res) {
  try {
    const { username, password, name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const existing = db.findUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: uuidv4(),
      username: username.trim(),
      name: (name || username).trim(),
      passwordHash,
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: newUser.id, username: newUser.username, name: newUser.name }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);

    return res.json({
      message: 'Logged in successfully',
      token,
      user: { id: user.id, username: user.username, name: user.name }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
}

async function createGuestUser(req, res) {
  try {
    const guestId = uuidv4().substring(0, 8);
    const username = `judge_${guestId}`;
    const newUser = {
      id: uuidv4(),
      username,
      name: `Hackathon Guest #${guestId.toUpperCase()}`,
      passwordHash: 'guest_no_password',
      isGuest: true,
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);
    const token = generateToken(newUser);

    return res.json({
      message: 'Instant isolated demo session started',
      token,
      user: { id: newUser.id, username: newUser.username, name: newUser.name, isGuest: true }
    });
  } catch (err) {
    console.error('Guest creation error:', err);
    return res.status(500).json({ error: 'Could not create guest session' });
  }
}

function getMe(req, res) {
  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({
    user: { id: user.id, username: user.username, name: user.name }
  });
}

module.exports = {
  authMiddleware,
  register,
  login,
  createGuestUser,
  getMe,
  generateToken
};
