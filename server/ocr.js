const { createWorker } = require('tesseract.js');
const fs = require('fs');

let worker = null;
let isInitializing = false;
const initCallbacks = [];

async function getWorker() {
  if (worker) return worker;
  if (isInitializing) {
    return new Promise((resolve) => {
      initCallbacks.push(resolve);
    });
  }

  isInitializing = true;
  console.log('[OCR] Initializing Tesseract worker pool for high-speed processing...');
  
  try {
    worker = await createWorker('eng');
    console.log('[OCR] Tesseract OCR Worker ready!');
    while (initCallbacks.length > 0) {
      const cb = initCallbacks.shift();
      cb(worker);
    }
    isInitializing = false;
    return worker;
  } catch (err) {
    console.error('[OCR] Worker init error:', err);
    isInitializing = false;
    throw err;
  }
}

// Extract OCR text from image file path or buffer
async function processImage(imagePath) {
  const startTime = Date.now();
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at ${imagePath}`);
    }

    const ocrWorker = await getWorker();
    const ret = await ocrWorker.recognize(imagePath);
    const processingTimeMs = Date.now() - startTime;

    const rawText = ret.data.text || '';
    const cleanText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return {
      text: cleanText,
      rawText,
      confidence: ret.data.confidence || 85,
      processingTimeMs,
      wordsCount: cleanText.split(/\s+/).filter(Boolean).length
    };
  } catch (err) {
    console.error('[OCR] Extraction error:', err.message);
    const processingTimeMs = Date.now() - startTime;
    return {
      text: '',
      rawText: '',
      confidence: 0,
      processingTimeMs,
      wordsCount: 0,
      error: err.message
    };
  }
}

// Background Task Queue for high-speed batch uploads
class FastOCRQueue {
  constructor(concurrency = 2) {
    this.queue = [];
    this.concurrency = concurrency;
    this.activeWorkers = 0;
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.next();
    });
  }

  async next() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.activeWorkers++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.activeWorkers--;
      this.next();
    }
  }
}

const ocrQueue = new FastOCRQueue(3);

module.exports = {
  processImage,
  ocrQueue,
  getWorker
};
