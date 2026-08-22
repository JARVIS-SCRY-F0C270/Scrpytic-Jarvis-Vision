const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');
const auth = require('./auth');
const { classifyContent, CATEGORY_PATTERNS } = require('./classifier');
const { computeSemanticVector, searchScreenshots } = require('./vectorEngine');
const { processImage, ocrQueue } = require('./ocr');
const { startTunnel, getPublicUrl } = require('./tunnel');
const { seedUserWithSamples } = require('./sampleData');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure Multer for secure, high-speed upload handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user ? req.user.id : 'temp';
    const userDir = path.join(__dirname, '..', 'uploads', userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const fileId = `${uuidv4()}${ext}`;
    cb(null, fileId);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

// Authentication Routes
app.post('/api/auth/register', auth.register);
app.post('/api/auth/login', auth.login);
app.post('/api/auth/guest', async (req, res) => {
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
    const token = auth.generateToken(newUser);

    // Pre-seed sample screenshots for demo guest so they can test immediately
    seedUserWithSamples(newUser.id);

    return res.json({
      message: 'Instant isolated demo session started with samples',
      token,
      user: { id: newUser.id, username: newUser.username, name: newUser.name, isGuest: true }
    });
  } catch (err) {
    console.error('Guest creation error:', err);
    return res.status(500).json({ error: 'Could not create guest session' });
  }
});
app.get('/api/auth/me', auth.authMiddleware, auth.getMe);

// High-Speed Multi-Image Upload & Background OCR Processing
app.post('/api/upload', auth.authMiddleware, upload.array('screenshots', 50), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No screenshot images uploaded.' });
    }

    const userId = req.user.id;
    console.log(`[Upload] User ${userId} uploaded ${files.length} images. Starting OCR queue...`);

    const results = [];
    const batchStartTime = Date.now();

    for (const file of files) {
      const filePath = file.path;
      const fileId = path.basename(file.filename, path.extname(file.filename));

      // Fast OCR processing via worker pool
      const ocrResult = await ocrQueue.add(() => processImage(filePath));

      // Content-based classification (categorize by actual extracted content, NOT filename!)
      const classification = classifyContent(ocrResult.text);

      // Semantic vector representation
      const vector = computeSemanticVector(
        ocrResult.text,
        classification.category,
        classification.entities
      );

      const record = {
        id: fileId,
        userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadTime: new Date().toISOString(),
        extractedText: ocrResult.text,
        ocrConfidence: ocrResult.confidence,
        category: classification.category,
        categoryLabel: classification.label,
        categoryColor: classification.color,
        categoryIcon: classification.icon,
        confidence: classification.confidence,
        summary: classification.summary,
        entities: classification.entities,
        tags: classification.tags,
        vector,
        processingTimeMs: ocrResult.processingTimeMs
      };

      db.saveScreenshot(record);
      results.push(record);
    }

    const totalBatchTimeMs = Date.now() - batchStartTime;
    const avgTimePerImage = Math.round(totalBatchTimeMs / files.length);

    console.log(`[Upload] Batch complete: ${files.length} images processed in ${totalBatchTimeMs}ms (avg ${avgTimePerImage}ms/img)`);

    return res.status(201).json({
      message: `Successfully processed ${results.length} screenshot(s)`,
      totalBatchTimeMs,
      avgTimePerImageMs: avgTimePerImage,
      screenshots: results
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    return res.status(500).json({ error: err.message || 'Error processing uploads' });
  }
});

// List screenshots for current user (Strict Tenant Isolation)
app.get('/api/screenshots', auth.authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { category, tag } = req.query;
  let list = db.getScreenshotsByUser(userId);

  if (category && category !== 'all') {
    list = list.filter(s => s.category === category);
  }
  if (tag) {
    list = list.filter(s => s.tags && s.tags.includes(tag.toLowerCase()));
  }

  return res.json({
    total: list.length,
    screenshots: list
  });
});

// Semantic Vector Search Endpoint
app.get('/api/search', auth.authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { q, category } = req.query;

  const userScreenshots = db.getScreenshotsByUser(userId);
  const searchStartTime = Date.now();

  const results = searchScreenshots(q, userScreenshots, { category });
  const searchDurationMs = Date.now() - searchStartTime;

  return res.json({
    query: q || '',
    categoryFilter: category || 'all',
    totalMatches: results.length,
    searchDurationMs,
    results
  });
});

// Get single screenshot detail
app.get('/api/screenshots/:id', auth.authMiddleware, (req, res) => {
  const item = db.getScreenshotByIdAndUser(req.params.id, req.user.id);
  if (!item) {
    return res.status(404).json({ error: 'Screenshot not found or access denied.' });
  }
  return res.json(item);
});

// Update screenshot metadata (e.g. custom category or tag)
app.put('/api/screenshots/:id', auth.authMiddleware, (req, res) => {
  const { category, tags } = req.body;
  const updates = {};
  if (category) {
    const meta = CATEGORY_PATTERNS[category] || { label: category, color: '#6b7280', icon: 'tag' };
    updates.category = category;
    updates.categoryLabel = meta.label;
    updates.categoryColor = meta.color;
    updates.categoryIcon = meta.icon;
  }
  if (tags && Array.isArray(tags)) {
    updates.tags = tags;
  }

  const updated = db.updateScreenshot(req.params.id, req.user.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Screenshot not found' });
  }
  return res.json(updated);
});

// Delete screenshot
app.delete('/api/screenshots/:id', auth.authMiddleware, (req, res) => {
  const deleted = db.deleteScreenshot(req.params.id, req.user.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Screenshot not found' });
  }

  // Delete physical file
  const filePath = path.join(__dirname, '..', 'uploads', req.user.id, deleted.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('File unlink error:', e);
    }
  }

  return res.json({ message: 'Screenshot deleted successfully', id: req.params.id });
});

// Secure image serving endpoint with tenant isolation check
app.get('/api/images/:id', auth.authMiddleware, (req, res) => {
  const item = db.getScreenshotByIdAndUser(req.params.id, req.user.id);
  if (!item) {
    return res.status(404).json({ error: 'Image not found or unauthorized' });
  }

  const filePath = path.join(__dirname, '..', 'uploads', req.user.id, item.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file not found on disk' });
  }

  res.setHeader('Content-Type', item.mimeType || 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(filePath).pipe(res);
});

// User Analytics & Statistics
app.get('/api/stats', auth.authMiddleware, (req, res) => {
  const stats = db.getUserStats(req.user.id);
  return res.json({
    ...stats,
    categoriesConfig: CATEGORY_PATTERNS
  });
});

// Re-seed sample data
app.post('/api/seed-samples', auth.authMiddleware, (req, res) => {
  const created = seedUserWithSamples(req.user.id);
  return res.json({
    message: `Seeded ${created.length} sample screenshots`,
    screenshots: created
  });
});

// Public Tunnel Status & URL
app.get('/api/tunnel', (req, res) => {
  const url = getPublicUrl();
  return res.json({
    publicUrl: url,
    isLive: Boolean(url),
    tunnelStatus: url ? 'ACTIVE' : 'STARTING_OR_LOCAL_ONLY'
  });
});

// Categories Reference Endpoint
app.get('/api/categories', (req, res) => {
  return res.json(CATEGORY_PATTERNS);
});

// Static Files & Single Page App Fallback
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server & Auto-Start Public Tunnel
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`⚡ SCRYPTIC HACKATHON - TEAM JARVIS (SCRY-F0C270)`);
  console.log(`🚀 Screenshot Semantic Engine running at:`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`====================================================`);

  // Start public tunnel asynchronously
  startTunnel(PORT).catch(err => {
    console.warn('[Tunnel] Auto-start notice:', err.message);
  });
});
