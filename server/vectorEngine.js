// Semantic Vector Embedding & Nearest-Neighbor Search Engine

// Semantic Concept Space Mapping (Simulates dense semantic embedding representations)
const SEMANTIC_CLUSTERS = {
  receipt: ['bill', 'receipt', 'invoice', 'spent', 'cost', 'expense', 'payment', 'paid', 'purchase', 'total', 'subtotal', 'tax', 'price', 'dollar', 'rupee', 'euro', 'tip', 'cashier', 'store', 'order', 'restaurant', 'dinner', 'lunch', 'breakfast', 'starbucks', 'uber', 'mcdonalds'],
  recipe: ['recipe', 'food', 'cooking', 'cook', 'bake', 'baking', 'ingredients', 'dish', 'meal', 'dinner', 'lunch', 'breakfast', 'tablespoon', 'tbsp', 'teaspoon', 'tsp', 'cup', 'preheat', 'oven', 'stir', 'fry', 'boil', 'pasta', 'cake', 'cookie', 'chicken', 'sauce', 'garlic', 'onion', 'sugar', 'salt', 'flour'],
  address: ['address', 'location', 'place', 'where', 'map', 'directions', 'directions to', 'street', 'road', 'avenue', 'boulevard', 'city', 'state', 'zipcode', 'pincode', 'postal', 'navigation', 'google maps', 'destination', 'pickup', 'dropoff', 'near', 'miles', 'km'],
  code: ['code', 'programming', 'developer', 'bug', 'error', 'exception', 'stack trace', 'traceback', 'function', 'variable', 'class', 'python', 'javascript', 'typescript', 'java', 'c++', 'react', 'git', 'github', 'terminal', 'powershell', 'bash', 'syntax', 'script', 'line', 'npm', 'database', 'sql', 'query', '404', '500'],
  chat: ['chat', 'message', 'text', 'conversation', 'talk', 'whatsapp', 'imessage', 'slack', 'discord', 'telegram', 'dm', 'friend', 'replied', 'talking', 'online', 'sent', 'sms', 'inbox'],
  shopping: ['shopping', 'buy', 'product', 'item', 'cart', 'amazon', 'flipkart', 'store', 'deal', 'discount', 'price', 'cost', 'wishlist', 'order', 'delivery', 'shipping', 'review', 'rating'],
  payment: ['payment', 'upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'bank', 'transfer', 'money', 'sent', 'received', 'credited', 'debited', 'transaction', 'utr', 'ref no', 'successful'],
  credentials: ['password', 'passcode', 'wifi', 'wi-fi', 'network', 'ssid', 'key', 'login', 'username', 'secret', 'pin', 'token', 'auth', 'notes', 'memo', 'credentials'],
  travel: ['travel', 'flight', 'ticket', 'boarding pass', 'airline', 'gate', 'seat', 'airport', 'terminal', 'hotel', 'reservation', 'train', 'booking', 'pnr', 'vacation', 'trip'],
  document: ['document', 'certificate', 'form', 'contract', 'agreement', 'letter', 'legal', 'passport', 'id', 'license', 'official', 'signed', 'terms']
};

// Simple Porter Stemmer approximation for normalization
function tokenizeAndNormalize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s$₹€£.-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !isStopWord(t));
}

function isStopWord(w) {
  const stops = new Set(['the', 'and', 'is', 'in', 'at', 'of', 'a', 'an', 'to', 'for', 'it', 'on', 'with', 'as', 'this', 'that', 'by', 'from', 'or', 'are', 'was', 'were', 'be', 'been']);
  return stops.has(w);
}

// Generate high-dimensional semantic vector (dim = 64)
function computeSemanticVector(text, category = '', entities = {}) {
  const tokens = tokenizeAndNormalize(text);
  const vector = new Array(64).fill(0);

  if (tokens.length === 0) return vector;

  // 1. Frequency mapping into vector space
  for (const token of tokens) {
    const hash = simpleHash(token) % 40;
    vector[hash] += 1.0;
  }

  // 2. Semantic Cluster Embedding projection
  let clusterIdx = 40;
  for (const [cat, words] of Object.entries(SEMANTIC_CLUSTERS)) {
    let clusterScore = 0;
    for (const w of words) {
      if (tokens.includes(w) || (text && text.toLowerCase().includes(w))) {
        clusterScore += 1.0;
      }
    }
    if (category === cat) clusterScore += 3.0;
    vector[clusterIdx % 64] += clusterScore;
    clusterIdx++;
  }

  // 3. Entity signals into vector tail
  if (entities.prices && entities.prices.length > 0) vector[58] += 2.0;
  if (entities.dates && entities.dates.length > 0) vector[59] += 1.5;
  if (entities.codes && entities.codes.length > 0) vector[60] += 2.5;
  if (entities.locations && entities.locations.length > 0) vector[61] += 2.0;
  if (entities.emails && entities.emails.length > 0) vector[62] += 1.5;
  if (entities.urls && entities.urls.length > 0) vector[63] += 1.5;

  // Normalize L2 magnitude
  return normalizeVector(vector);
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeVector(vec) {
  const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (mag === 0) return vec;
  return vec.map(v => Number((v / mag).toFixed(4)));
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dot));
}

// Levenshtein fuzzy distance for typo tolerance
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Search across user screenshots using hybrid Vector + BM25 + Fuzzy matcher
function searchScreenshots(query, screenshots, filters = {}) {
  if (!query || query.trim().length === 0) {
    // If no query, return filtered or latest
    let results = [...screenshots];
    if (filters.category && filters.category !== 'all') {
      results = results.filter(s => s.category === filters.category);
    }
    return results.map(s => ({
      ...s,
      score: 1.0,
      matchSnippet: s.summary || s.extractedText.substring(0, 100)
    }));
  }

  const cleanQuery = query.trim().toLowerCase();
  const queryTokens = tokenizeAndNormalize(query);
  const queryVector = computeSemanticVector(query, filters.category || '');

  const scoredResults = [];

  for (const item of screenshots) {
    if (filters.category && filters.category !== 'all' && item.category !== filters.category) {
      continue;
    }

    const textLower = (item.extractedText || '').toLowerCase();
    const summaryLower = (item.summary || '').toLowerCase();
    const tagsLower = (item.tags || []).join(' ').toLowerCase();

    // 1. Vector Cosine Similarity
    const itemVector = item.vector || computeSemanticVector(item.extractedText, item.category, item.entities);
    const vectorScore = cosineSimilarity(queryVector, itemVector);

    // 2. Keyword & Fuzzy Match Score
    let keywordScore = 0;
    let matchSnippet = '';

    for (const qToken of queryTokens) {
      if (textLower.includes(qToken)) {
        keywordScore += 3.0;
        if (!matchSnippet) {
          const idx = textLower.indexOf(qToken);
          const start = Math.max(0, idx - 40);
          const end = Math.min(textLower.length, idx + 80);
          matchSnippet = '...' + item.extractedText.substring(start, end) + '...';
        }
      } else if (summaryLower.includes(qToken) || tagsLower.includes(qToken)) {
        keywordScore += 2.0;
      } else {
        // Check fuzzy match against words in text
        const words = textLower.split(/\s+/).slice(0, 50);
        for (const w of words) {
          if (w.length > 3 && qToken.length > 3 && levenshteinDistance(w, qToken) <= 1) {
            keywordScore += 1.5;
            break;
          }
        }
      }
    }

    // 3. Exact Substring Match Boost
    if (textLower.includes(cleanQuery)) {
      keywordScore += 5.0;
    }

    // 4. Semantic Concept Boost
    for (const [cat, words] of Object.entries(SEMANTIC_CLUSTERS)) {
      const queryHasConcept = queryTokens.some(qt => words.includes(qt));
      if (queryHasConcept && item.category === cat) {
        keywordScore += 3.5;
      }
    }

    const finalScore = Number((vectorScore * 0.45 + Math.min(1, keywordScore / 10) * 0.55).toFixed(3));

    if (finalScore > 0.15 || keywordScore > 0) {
      scoredResults.push({
        ...item,
        score: finalScore,
        matchSnippet: matchSnippet || item.summary || (item.extractedText ? item.extractedText.substring(0, 120) : 'Visual match')
      });
    }
  }

  // Sort by highest score descending
  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults;
}

module.exports = {
  computeSemanticVector,
  searchScreenshots,
  cosineSimilarity
};
