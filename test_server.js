const http = require('http');

async function testBackend() {
  console.log('Testing JARVIS Vision Backend and Modules...');

  const db = require('./server/db');
  const auth = require('./server/auth');
  const { classifyContent } = require('./server/classifier');
  const { computeSemanticVector, searchScreenshots } = require('./server/vectorEngine');
  const { seedUserWithSamples } = require('./server/sampleData');

  console.log('1. Testing Content Classifier on various screenshot texts (Content NOT Filename):');
  
  const receiptText = "TOTAL $42.50\nTAX $3.50\nVISA 4920\nTHANK YOU FOR DINING AT OLIVE GARDEN";
  const catReceipt = classifyContent(receiptText);
  console.log(`- Receipt Classified as: [${catReceipt.category}] (Confidence: ${catReceipt.confidence}, Prices: ${catReceipt.entities.prices.join(', ')})`);
  if (catReceipt.category !== 'receipt') throw new Error('Receipt classification failed');

  const recipeText = "PREHEAT OVEN 350 DEGREES\nINGREDIENTS: 2 CUPS FLOUR, 1 TBSP SUGAR, 1 TSP VANILLA EXTRACT, 1/2 CUP BUTTER";
  const catRecipe = classifyContent(recipeText);
  console.log(`- Recipe Classified as: [${catRecipe.category}] (Confidence: ${catRecipe.confidence})`);
  if (catRecipe.category !== 'recipe') throw new Error('Recipe classification failed');

  const codeText = "Traceback (most recent call last):\n  File 'server.py', line 45, in <module>\nTypeError: unsupported operand type(s) for +: 'int' and 'str'";
  const catCode = classifyContent(codeText);
  console.log(`- Code Error Classified as: [${catCode.category}] (Codes: ${catCode.entities.codes.join(', ')})`);
  if (catCode.category !== 'code') throw new Error('Code classification failed');

  const wifiText = "Wi-Fi SSID: OfficeNet_HighSpeed\nPassword: SecureFalconKey#99!\nIP: 192.168.1.1";
  const catWifi = classifyContent(wifiText);
  console.log(`- Credentials Classified as: [${catWifi.category}]`);
  if (catWifi.category !== 'credentials') throw new Error('Credentials classification failed');

  console.log('\n2. Testing Semantic Vector Search:');
  const testScreenshots = [
    { id: '1', category: 'receipt', summary: 'Starbucks coffee bill $14.65', extractedText: receiptText, vector: computeSemanticVector(receiptText, 'receipt', catReceipt.entities) },
    { id: '2', category: 'recipe', summary: 'Homemade chocolate cookies recipe', extractedText: recipeText, vector: computeSemanticVector(recipeText, 'recipe', catRecipe.entities) },
    { id: '3', category: 'code', summary: 'Python TypeError traceback', extractedText: codeText, vector: computeSemanticVector(codeText, 'code', catCode.entities) },
    { id: '4', category: 'credentials', summary: 'Office Wi-Fi password notes', extractedText: wifiText, vector: computeSemanticVector(wifiText, 'credentials', catWifi.entities) }
  ];

  const searchResults1 = searchScreenshots('how much was dinner bill', testScreenshots);
  console.log(`- Query: "how much was dinner bill" -> Top match: ID ${searchResults1[0].id} (${searchResults1[0].category}) - Score: ${searchResults1[0].score}`);
  if (searchResults1[0].id !== '1') throw new Error('Semantic search for bill failed');

  const searchResults2 = searchScreenshots('baking flour butter ingredients', testScreenshots);
  console.log(`- Query: "baking flour butter ingredients" -> Top match: ID ${searchResults2[0].id} (${searchResults2[0].category}) - Score: ${searchResults2[0].score}`);
  if (searchResults2[0].id !== '2') throw new Error('Semantic search for recipe failed');

  const searchResults3 = searchScreenshots('python bug in line 45', testScreenshots);
  console.log(`- Query: "python bug in line 45" -> Top match: ID ${searchResults3[0].id} (${searchResults3[0].category}) - Score: ${searchResults3[0].score}`);
  if (searchResults3[0].id !== '3') throw new Error('Semantic search for bug failed');

  console.log('\n3. Testing Database & User Isolation:');
  const testUserId = 'test_user_' + Date.now();
  seedUserWithSamples(testUserId);
  const userItems = db.getScreenshotsByUser(testUserId);
  console.log(`- Seeded & retrieved ${userItems.length} screenshots for isolated user: ${testUserId}`);
  if (userItems.length === 0) throw new Error('DB user isolation failed');

  const stats = db.getUserStats(testUserId);
  console.log(`- User stats: ${stats.totalScreenshots} screenshots, ${stats.totalWords} words processed`);

  console.log('\n✅ ALL BACKEND & SEMANTIC VECTOR RETRIEVAL TESTS PASSED SUCCESSFULLY!');
}

testBackend().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
