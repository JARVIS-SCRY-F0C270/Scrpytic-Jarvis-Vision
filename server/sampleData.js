const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { classifyContent } = require('./classifier');
const { computeSemanticVector } = require('./vectorEngine');
const db = require('./db');

const SAMPLE_SCREENSHOTS = [
  {
    name: 'starbucks_receipt.png',
    text: `STARBUCKS COFFEE #1042\n1234 MARKET STREET, SAN FRANCISCO CA\n\nDATE: 08/18/2026  10:24 AM\nCASHIER: EMILY\n\n1 GR ICED CARAMEL MACCHIATO  $5.75\n1 CROISSANT                  $4.50\n1 BLUEBERRY MUFFIN           $3.25\n\nSUBTOTAL:                   $13.50\nTAX (8.5%):                  $1.15\nTOTAL:                      $14.65\n\nPAID VIA VISA ENDING IN 4092\nTHANK YOU FOR VISITING STARBUCKS!`,
    svgBg: '#1e3932',
    textColor: '#ffffff',
    title: 'Starbucks Receipt - $14.65'
  },
  {
    name: 'pasta_recipe.png',
    text: `CREAMY TUSCAN GARLIC CHICKEN PASTA\n\nPREP TIME: 15 MINS | COOK TIME: 20 MINS | SERVINGS: 4\n\nINGREDIENTS:\n- 2 large chicken breasts, sliced\n- 8 oz fettuccine or penne pasta\n- 1 tablespoon olive oil\n- 4 cloves garlic, minced\n- 1 cup heavy whipping cream\n- 1/2 cup grated parmesan cheese\n- 2 cups fresh baby spinach\n- 1/2 cup sun-dried tomatoes\n- 1 teaspoon salt & black pepper\n\nDIRECTIONS:\n1. Boil pasta in salted water until al dente.\n2. In a large skillet over medium-high heat, cook chicken with olive oil and garlic until golden.\n3. Add heavy cream, parmesan, and simmer for 3 minutes.\n4. Stir in spinach and sun-dried tomatoes until wilted.\n5. Toss with cooked pasta and serve hot!`,
    svgBg: '#831843',
    textColor: '#fdf2f8',
    title: 'Tuscan Garlic Chicken Recipe'
  },
  {
    name: 'delivery_address_map.png',
    text: `DELIVERY DESTINATION & NAVIGATION\n\nDELIVER TO:\nALEXANDER WRIGHT\nAPT 4B, 742 EVERGREEN TERRACE\nSPRINGFIELD, OR 97477\n\nCONTACT: (555) 839-2019\nDELIVERY INSTRUCTIONS: Leave at front porch behind the flower pot. Gate code: #4092.\n\nESTIMATED TIME OF ARRIVAL: 25 MINS (4.2 MILES AWAY)\nVIA ROUTE 99 HIGHWAY & OAK STREET.`,
    svgBg: '#1e293b',
    textColor: '#38bdf8',
    title: 'Delivery Address & Map Info'
  },
  {
    name: 'python_terminal_error.png',
    text: `app.py - Visual Studio Code (Terminal Output)\n\n$ python main.py --run-server\n[2026-08-21 22:15:02] Loading configuration...\n[2026-08-21 22:15:03] Connecting to PostgreSQL database localhost:5432\n\nTraceback (most recent call last):\n  File "C:\\Projects\\app\\server\\auth_service.py", line 42, in authenticate_user\n    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])\n  File "C:\\Python312\\Lib\\site-packages\\jwt\\api_jwt.py", line 124, in decode\n    raise ExpiredSignatureError("Signature has expired")\njwt.exceptions.ExpiredSignatureError: Signature has expired\n\nTypeError: NoneType object is not subscriptable at line 89 in routes/user.py`,
    svgBg: '#0f172a',
    textColor: '#f87171',
    title: 'Python Terminal Traceback Error'
  },
  {
    name: 'whatsapp_chat_plans.png',
    text: `WhatsApp - Team Jarvis Project Chat\n\n[10:14 AM] Anantha: Hey guys, did you check the hackathon submission deadline?\n[10:15 AM] Mathavan: Yes! It is tonight. We need to implement the OCR semantic vector index.\n[10:16 AM] Sugan: I am finalizing the UI with dark mode and public tunnel.\n[10:18 AM] Ellancheliyan: Awesome! Let's test the batch upload speed for 4,000 screenshots benchmark.\n[10:20 AM] Mathavan: Meeting link: https://meet.google.com/xyz-hack-jarvis at 6:00 PM.\n[10:21 AM] Anantha: See you all there! 🚀`,
    svgBg: '#064e3b',
    textColor: '#a7f3d0',
    title: 'WhatsApp Chat - Team Jarvis'
  },
  {
    name: 'wifi_credentials_note.png',
    text: `CONFIDENTIAL - HOME OFFICE CREDENTIALS\n\nWi-Fi Network (SSID): QuantumSpeed_5GHz\nWi-Fi Password: Tr0pical#Falcon9921!\nGuest Network: Quantum_Guest (Pass: Welcome2026)\n\nRouter IP: http://192.168.1.1\nAdmin Login: admin / SuperVaultSecureKey48\n\nNAS Backup Server: \\\\192.168.1.150\\secure_backup\nAPI Key for Staging: sk_live_938491820384019284`,
    svgBg: '#713f12',
    textColor: '#fef08a',
    title: 'Wi-Fi & Home Office Passwords'
  },
  {
    name: 'upi_payment_receipt.png',
    text: `Google Pay / UPI Payment Receipt\n\nPAID TO: Organic Fresh Mart\nAMOUNT: ₹ 2,450.00\n\nTRANSACTION STATUS: SUCCESSFUL\nDATE: 20 Aug 2026, 07:45 PM\nUPI TRANSACTION ID: 423984920194\nGOOGLE PAY REF NO: CICAgKCn78jYdg\nDEBITED FROM: State Bank of India •••• 5821\nUPI ID: organicmart@okaxis\n\nMoney sent successfully from your account.`,
    svgBg: '#065f46',
    textColor: '#6ee7b7',
    title: 'UPI Payment ₹2,450 - Success'
  },
  {
    name: 'flight_boarding_pass.png',
    text: `DELTA AIR LINES - BOARDING PASS\n\nPASSENGER: SMITH / JOHN MR\nFLIGHT: DL 1492\nFROM: NEW YORK (JFK) -> TO: LONDON (LHR)\nDATE: 24 AUG 2026\n\nBOARDING TIME: 18:30 | DEPARTURE: 19:15\nGATE: B24 | TERMINAL: 4\nSEAT: 14A (ZONE 2) | CLASS: ECONOMY (M)\n\nPNR / BOOKING REF: X8KF92\nELECTRONIC TICKET: 0062491029481`,
    svgBg: '#1e3a8a',
    textColor: '#93c5fd',
    title: 'Delta Flight Boarding Pass JFK-LHR'
  }
];

function createSvgPlaceholder(sample, filepath) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="${sample.svgBg}"/>
    <rect x="20" y="20" width="760" height="560" rx="12" fill="#000000" fill-opacity="0.35" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2"/>
    <circle cx="50" cy="50" r="7" fill="#ef4444"/>
    <circle cx="70" cy="50" r="7" fill="#f59e0b"/>
    <circle cx="90" cy="50" r="7" fill="#10b981"/>
    <text x="120" y="55" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">${sample.title}</text>
    <line x1="20" y1="80" x2="780" y2="80" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5"/>
    <g transform="translate(45, 120)">
      ${sample.text.split('\n').slice(0, 18).map((line, i) => {
        const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<text x="0" y="${i * 24}" fill="${sample.textColor}" font-family="Consolas, 'Courier New', monospace" font-size="15" font-weight="${i < 2 ? 'bold' : 'normal'}">${escaped}</text>`;
      }).join('\n')}
    </g>
    <rect x="580" y="520" width="180" height="35" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>
    <text x="600" y="542" fill="#38bdf8" font-family="sans-serif" font-size="12" font-weight="bold">⚡ SCRYPTIC JARVIS</text>
  </svg>`;

  fs.writeFileSync(filepath, svg, 'utf8');
}

function seedUserWithSamples(userId) {
  const uploadsDir = path.join(__dirname, '..', 'uploads', userId);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const createdScreenshots = [];

  for (const sample of SAMPLE_SCREENSHOTS) {
    const fileId = uuidv4();
    const filename = `${fileId}.svg`;
    const filepath = path.join(uploadsDir, filename);

    // Write SVG mock image
    createSvgPlaceholder(sample, filepath);
    const stats = fs.statSync(filepath);

    // Run classification & entity extraction
    const classification = classifyContent(sample.text);
    const vector = computeSemanticVector(sample.text, classification.category, classification.entities);

    const record = {
      id: fileId,
      userId,
      filename,
      originalName: sample.name,
      mimeType: 'image/svg+xml',
      size: stats.size,
      uploadTime: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 5)).toISOString(),
      extractedText: sample.text,
      ocrConfidence: 98,
      category: classification.category,
      categoryLabel: classification.label,
      categoryColor: classification.color,
      categoryIcon: classification.icon,
      confidence: classification.confidence,
      summary: classification.summary,
      entities: classification.entities,
      tags: classification.tags,
      vector,
      processingTimeMs: Math.floor(Math.random() * 250) + 150
    };

    db.saveScreenshot(record);
    createdScreenshots.push(record);
  }

  console.log(`[Seed] Seeded ${createdScreenshots.length} sample screenshots for user ${userId}`);
  return createdScreenshots;
}

module.exports = {
  seedUserWithSamples,
  SAMPLE_SCREENSHOTS
};
