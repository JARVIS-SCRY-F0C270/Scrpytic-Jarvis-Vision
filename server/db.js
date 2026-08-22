const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SCREENSHOTS_FILE = path.join(DATA_DIR, 'screenshots.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf8');
}
if (!fs.existsSync(SCREENSHOTS_FILE)) {
  fs.writeFileSync(SCREENSHOTS_FILE, JSON.stringify([]), 'utf8');
}

function readJson(file) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
}

// User Operations
function getAllUsers() {
  return readJson(USERS_FILE);
}

function findUserByUsername(username) {
  const users = getAllUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

function findUserById(id) {
  const users = getAllUsers();
  return users.find(u => u.id === id);
}

function createUser(userData) {
  const users = getAllUsers();
  users.push(userData);
  writeJson(USERS_FILE, users);
  return userData;
}

// Screenshot Operations (Strict Tenant Isolation by userId)
function getAllScreenshots() {
  return readJson(SCREENSHOTS_FILE);
}

function getScreenshotsByUser(userId) {
  const screenshots = getAllScreenshots();
  return screenshots.filter(s => s.userId === userId);
}

function getScreenshotByIdAndUser(id, userId) {
  const screenshots = getAllScreenshots();
  return screenshots.find(s => s.id === id && s.userId === userId);
}

function saveScreenshot(screenshotData) {
  const screenshots = getAllScreenshots();
  screenshots.unshift(screenshotData); // newest first
  writeJson(SCREENSHOTS_FILE, screenshots);
  return screenshotData;
}

function updateScreenshot(id, userId, updates) {
  const screenshots = getAllScreenshots();
  const index = screenshots.findIndex(s => s.id === id && s.userId === userId);
  if (index === -1) return null;

  screenshots[index] = {
    ...screenshots[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  writeJson(SCREENSHOTS_FILE, screenshots);
  return screenshots[index];
}

function deleteScreenshot(id, userId) {
  const screenshots = getAllScreenshots();
  const item = screenshots.find(s => s.id === id && s.userId === userId);
  if (!item) return false;

  const filtered = screenshots.filter(s => !(s.id === id && s.userId === userId));
  writeJson(SCREENSHOTS_FILE, filtered);
  return item;
}

function getUserStats(userId) {
  const userScreenshots = getScreenshotsByUser(userId);
  const totalScreenshots = userScreenshots.length;
  
  const categoryCounts = {};
  let totalWords = 0;
  let totalSize = 0;

  for (const s of userScreenshots) {
    const cat = s.category || 'general';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    if (s.extractedText) {
      totalWords += s.extractedText.split(/\s+/).filter(Boolean).length;
    }
    totalSize += s.size || 0;
  }

  return {
    totalScreenshots,
    totalWords,
    totalSizeBytes: totalSize,
    totalSizeFormatted: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
    categoryCounts
  };
}

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
  getScreenshotsByUser,
  getScreenshotByIdAndUser,
  saveScreenshot,
  updateScreenshot,
  deleteScreenshot,
  getUserStats
};
