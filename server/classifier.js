// Intelligent Content Classifier & Entity Extractor (Classifies by CONTENT, not filename)

const CATEGORY_PATTERNS = {
  receipt: {
    label: 'Receipt & Invoice',
    icon: 'receipt',
    color: '#10b981', // green
    keywords: [
      'receipt', 'invoice', 'subtotal', 'total', 'tax', 'gst', 'vat', 'cgst', 'sgst',
      'amount due', 'balance due', 'cashier', 'merchant', 'bill to', 'sold to',
      'payment method', 'change due', 'card #', 'terminal #', 'store #', 'order total',
      'qty', 'price', 'discount', 'tip', 'gratuity', 'cash tender', 'visa', 'mastercard',
      'amex', 'debit sale', 'pos transaction', 'table #'
    ],
    weightRegex: /(\b(total|subtotal|tax|amount due|invoice|receipt)\b|[$₹€£]\s*\d+([.,]\d{2})?)/i,
    threshold: 3
  },
  recipe: {
    label: 'Food & Recipe',
    icon: 'utensils',
    color: '#f59e0b', // amber
    keywords: [
      'recipe', 'ingredients', 'tablespoon', 'tbsp', 'teaspoon', 'tsp', 'cup', 'cups',
      'pinch', 'preheat', 'bake', 'cook', 'boil', 'fry', 'simmer', 'roast', 'grill',
      'calories', 'prep time', 'cook time', 'servings', 'serves', 'stir', 'whisk',
      'sauce', 'pasta', 'chicken', 'garlic', 'onion', 'salt', 'sugar', 'flour', 'butter',
      'oven', 'degrees f', 'degrees c', 'nutrition facts', 'cholesterol', 'protein'
    ],
    weightRegex: /(\b(ingredients|recipe|tbsp|tsp|preheat oven|servings)\b)/i,
    threshold: 3
  },
  address: {
    label: 'Address & Location',
    icon: 'map-pin',
    color: '#ef4444', // red
    keywords: [
      'street', 'st.', 'avenue', 'ave.', 'boulevard', 'blvd', 'road', 'rd.', 'lane',
      'ln.', 'drive', 'dr.', 'highway', 'hwy', 'zip code', 'pincode', 'postal code',
      'apt #', 'suite', 'floor', 'landmark', 'near', 'opposite', 'directions', 'destination',
      'pickup location', 'dropoff', 'eta', 'miles', 'km away', 'turn left', 'turn right',
      'google maps', 'apple maps', 'navigation'
    ],
    weightRegex: /(\b(street|ave|road|drive|blvd|zip|pincode|directions|google maps)\b|\b\d{5}(-\d{4})?\b)/i,
    threshold: 3
  },
  code: {
    label: 'Code & Tech',
    icon: 'code',
    color: '#8b5cf6', // purple
    keywords: [
      'function', 'const', 'let', 'var', 'import', 'export', 'return', 'class', 'def',
      'console.log', 'print(', 'public static void', 'public class', 'npm install', 'git commit',
      'python', 'javascript', 'typescript', 'select * from', 'syntaxerror', 'typeerror',
      'nullpointerexception', 'traceback', 'stack trace', 'error: ', 'exception in thread',
      'line ', 'docker', 'kubectl', 'terminal', 'powershell', 'bash', 'sudo', 'api_key',
      'endpoint', 'localhost', 'http://', 'https://', 'json', 'yaml', 'xml'
    ],
    weightRegex: /(\b(function|const|import|console\.log|traceback|syntaxerror|select \* from|git commit)\b|[{}();=>]{3,})/i,
    threshold: 3
  },
  chat: {
    label: 'Chat & Message',
    icon: 'message-square',
    color: '#3b82f6', // blue
    keywords: [
      'online', 'typing...', 'seen', 'delivered', 'read', 'whatsapp', 'imessage',
      'discord', 'telegram', 'slack', 'messenger', 'replying to', 'voice message',
      'today at', 'yesterday at', 'am', 'pm', 'chat', 'direct message', 'reacted',
      'message...', 'send a message', 'audio call', 'video call', 'forwarded'
    ],
    weightRegex: /(\b\d{1,2}:\d{2}\s*(am|pm)\b|typing\.\.\.|whatsapp|imessage|telegram|slack)/i,
    threshold: 3
  },
  shopping: {
    label: 'Shopping & Product',
    icon: 'shopping-bag',
    color: '#ec4899', // pink
    keywords: [
      'add to cart', 'buy now', 'in stock', 'out of stock', 'free shipping', 'free delivery',
      'prime', 'customer reviews', 'ratings', 'sold by', 'ships from', 'amazon', 'flipkart',
      'walmart', 'ebay', 'product details', 'specifications', 'size guide', 'variant',
      'eligible for free', 'deal of the day', 'limited time deal', 'coupon'
    ],
    weightRegex: /(\b(add to cart|buy now|in stock|customer reviews|free shipping)\b)/i,
    threshold: 3
  },
  payment: {
    label: 'Payment & UPI',
    icon: 'credit-card',
    color: '#14b8a6', // teal
    keywords: [
      'upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'bhim', 'transaction id',
      'upi ref', 'utr', 'paid successfully', 'payment successful', 'debited from',
      'credited to', 'bank transfer', 'ref no', 'bank of', 'account ending in',
      'completed on', 'money sent to', 'payment request'
    ],
    weightRegex: /(\b(upi|transaction id|paid successfully|payment successful|phonepe|gpay|utr)\b)/i,
    threshold: 3
  },
  credentials: {
    label: 'Credentials & Notes',
    icon: 'key',
    color: '#eab308', // yellow
    keywords: [
      'password', 'passcode', 'wifi', 'wi-fi', 'ssid', 'network key', 'secret key',
      'recovery phrase', 'seed phrase', 'pin code', 'username:', 'login:', 'auth token',
      'meeting notes', 'todo', 'to-do', 'checklist', 'remember to', 'note to self'
    ],
    weightRegex: /(\b(wifi password|wi-fi|ssid|passcode|secret key|recovery phrase|todo:)\b)/i,
    threshold: 2
  },
  document: {
    label: 'Document & Legal',
    icon: 'file-text',
    color: '#64748b', // slate
    keywords: [
      'certificate', 'agreement', 'contract', 'terms and conditions', 'privacy policy',
      'signature', 'signed by', 'government of', 'passport', 'driving license',
      'identification', 'national id', 'declaration', 'affidavit', 'memorandum',
      'hereby certify', 'effective date', 'pursuant to'
    ],
    weightRegex: /(\b(certificate of|hereby certify|agreement|terms and conditions|signature)\b)/i,
    threshold: 3
  },
  travel: {
    label: 'Travel & Ticket',
    icon: 'plane',
    color: '#06b6d4', // cyan
    keywords: [
      'boarding pass', 'flight', 'airline', 'gate', 'seat', 'terminal', 'departure',
      'arrival', 'pnr', 'booking reference', 'passenger', 'ticket', 'train', 'coach',
      'berth', 'hotel reservation', 'check-in', 'check-out', 'room type', 'itinerary'
    ],
    weightRegex: /(\b(boarding pass|flight|airline|pnr|gate|terminal|hotel reservation)\b)/i,
    threshold: 3
  }
};

function extractEntities(text) {
  const entities = {
    prices: [],
    dates: [],
    locations: [],
    emails: [],
    phones: [],
    urls: [],
    codes: []
  };

  if (!text) return entities;

  // 1. Extract Prices / Amounts
  const priceRegex = /([$₹€£]\s*\d+(?:[.,]\d{1,2})?|\b\d+(?:[.,]\d{1,2})?\s*(?:USD|INR|EUR|GBP|Rs\.?|Rupees))/gi;
  const priceMatches = text.match(priceRegex) || [];
  entities.prices = [...new Set(priceMatches.map(p => p.trim()))].slice(0, 5);

  // 2. Extract Dates
  const dateRegex = /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi;
  const dateMatches = text.match(dateRegex) || [];
  entities.dates = [...new Set(dateMatches.map(d => d.trim()))].slice(0, 4);

  // 3. Extract Emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = text.match(emailRegex) || [];
  entities.emails = [...new Set(emailMatches)].slice(0, 3);

  // 4. Extract Phone Numbers
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = text.match(phoneRegex) || [];
  entities.phones = [...new Set(phoneMatches.map(p => p.trim()))].slice(0, 3);

  // 5. Extract URLs
  const urlRegex = /\b(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;
  const urlMatches = text.match(urlRegex) || [];
  entities.urls = [...new Set(urlMatches.map(u => u.trim()))].slice(0, 3);

  // 6. Extract Code / Error Snippets
  const codeRegex = /\b(?:Error|Exception|Traceback|TypeError|SyntaxError|ReferenceError|NullPointerException|404 Not Found|500 Server Error):?\s*([^\n\r]+)/gi;
  const codeMatches = [];
  let m;
  while ((m = codeRegex.exec(text)) !== null) {
    codeMatches.push(m[0].trim());
  }
  entities.codes = [...new Set(codeMatches)].slice(0, 3);

  return entities;
}

function generateSummary(text, category, entities) {
  if (!text || text.trim().length === 0) {
    return 'Image with no detected text or visual caption.';
  }

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const firstLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 2).slice(0, 3).join(' • ');

  switch (category) {
    case 'receipt': {
      const topPrice = entities.prices[0] ? `Total: ${entities.prices[0]}` : '';
      const topDate = entities.dates[0] ? `on ${entities.dates[0]}` : '';
      return `Receipt / Invoice (${[topPrice, topDate].filter(Boolean).join(', ') || 'Itemized details'}). ${firstLines.substring(0, 100)}...`;
    }
    case 'recipe': {
      return `Recipe / Culinary guide with ingredients & instructions. ${firstLines.substring(0, 120)}...`;
    }
    case 'address': {
      return `Location / Address screenshot with map directions. ${firstLines.substring(0, 120)}...`;
    }
    case 'code': {
      const err = entities.codes[0] ? `[${entities.codes[0]}] ` : '';
      return `Code snippet / Terminal output ${err}• ${firstLines.substring(0, 120)}`;
    }
    case 'chat': {
      return `Chat conversation log with message exchange. ${firstLines.substring(0, 120)}...`;
    }
    case 'shopping': {
      const pr = entities.prices[0] ? `Price: ${entities.prices[0]} ` : '';
      return `E-commerce product page (${pr}) • ${firstLines.substring(0, 100)}...`;
    }
    case 'payment': {
      const pr = entities.prices[0] ? `Amount: ${entities.prices[0]}` : '';
      return `Payment confirmation / UPI transaction alert (${pr}). ${firstLines.substring(0, 100)}...`;
    }
    case 'credentials': {
      return `Credentials / Important access note or Wi-Fi keys. ${firstLines.substring(0, 120)}...`;
    }
    case 'travel': {
      return `Travel ticket / Boarding pass booking confirmation. ${firstLines.substring(0, 120)}...`;
    }
    case 'document': {
      return `Formal document / Certificate / Agreement text. ${firstLines.substring(0, 120)}...`;
    }
    default:
      return cleanText.length > 140 ? cleanText.substring(0, 140) + '...' : cleanText;
  }
}

function classifyContent(extractedText) {
  if (!extractedText || extractedText.trim().length === 0) {
    return {
      category: 'general',
      label: 'General Screenshot',
      icon: 'image',
      color: '#6b7280',
      confidence: 0.5,
      tags: ['screenshot', 'image'],
      entities: extractEntities(''),
      summary: 'Image with no detected text.'
    };
  }

  const textLower = extractedText.toLowerCase();
  const entities = extractEntities(extractedText);
  const scores = {};

  for (const [catKey, catDef] of Object.entries(CATEGORY_PATTERNS)) {
    let score = 0;
    
    // Check keyword hits
    for (const kw of catDef.keywords) {
      if (textLower.includes(kw)) {
        score += 1.5;
      }
    }

    // Check regex pattern boost
    if (catDef.weightRegex.test(extractedText)) {
      score += 4.0;
    }

    // Entity contextual boost
    if (catKey === 'receipt' && entities.prices.length > 0) score += 3.0;
    if (catKey === 'payment' && (textLower.includes('upi') || textLower.includes('transaction'))) score += 4.0;
    if (catKey === 'code' && entities.codes.length > 0) score += 4.0;
    if (catKey === 'travel' && (textLower.includes('flight') || textLower.includes('gate') || textLower.includes('pnr'))) score += 3.5;
    if (catKey === 'credentials' && (textLower.includes('password') || textLower.includes('wifi') || textLower.includes('ssid'))) score += 4.0;

    scores[catKey] = score;
  }

  // Find best category
  let bestCategory = 'general';
  let maxScore = 0;

  for (const [catKey, score] of Object.entries(scores)) {
    if (score > maxScore && score >= (CATEGORY_PATTERNS[catKey]?.threshold || 2)) {
      maxScore = score;
      bestCategory = catKey;
    }
  }

  const catMeta = CATEGORY_PATTERNS[bestCategory] || {
    label: 'General Screenshot',
    icon: 'image',
    color: '#6b7280'
  };

  const confidence = Math.min(0.99, Math.max(0.55, Number((0.55 + maxScore * 0.05).toFixed(2))));

  // Generate dynamic tags
  const dynamicTags = [bestCategory, catMeta.label.toLowerCase()];
  if (entities.prices.length > 0) dynamicTags.push('has-price');
  if (entities.dates.length > 0) dynamicTags.push('has-date');
  if (entities.codes.length > 0) dynamicTags.push('has-code');
  if (entities.emails.length > 0) dynamicTags.push('has-email');

  const summary = generateSummary(extractedText, bestCategory, entities);

  return {
    category: bestCategory,
    label: catMeta.label,
    icon: catMeta.icon,
    color: catMeta.color,
    confidence,
    tags: [...new Set(dynamicTags)],
    entities,
    summary
  };
}

module.exports = {
  classifyContent,
  extractEntities,
  CATEGORY_PATTERNS
};
