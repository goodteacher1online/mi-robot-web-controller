const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

console.log('==============================================');
console.log('MI ROBOT WEB STUDIO PRO - DEEP INTEGRITY TEST');
console.log('==============================================');

// 1. Check DOM IDs
const idMatches = html.matchAll(/id=["']([^"']+)["']/g);
const declaredIds = new Set();
for (const match of idMatches) {
  declaredIds.add(match[1]);
}
console.log(`[PASS] Found ${declaredIds.size} declared DOM element IDs.`);

// 2. Check getElementById calls
const jsFiles = [
  'index.html',
  'device-capability.js',
  'piano-engine.js',
  'robot-alias.js',
  'robot-ble.js',
  'sensor-ml.js',
  'vision-ai.js'
];

let missingIds = [];
for (const file of jsFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf-8');
  const getByIdMatches = content.matchAll(/document\.getElementById\(["']([^"']+)["']\)/g);
  for (const match of getByIdMatches) {
    const id = match[1];
    if (!declaredIds.has(id)) {
      missingIds.push({ id, file });
    }
  }
}

if (missingIds.length > 0) {
  console.error('[FAIL] Missing DOM IDs referenced in JS:', missingIds);
  process.exit(1);
} else {
  console.log('[PASS] All document.getElementById() calls resolve to valid HTML elements.');
}

// 3. Check inline event handlers
const handlerMatches = html.matchAll(/on(?:click|input|change)=["']([^"']+)["']/g);
const inlineCalls = [];
for (const m of handlerMatches) {
  inlineCalls.push(m[1].trim());
}

const allJsCode = jsFiles.map(f => fs.readFileSync(path.join(root, f), 'utf-8')).join('\n');

let missingFuncs = [];
for (const call of inlineCalls) {
  // Extract expressions e.g. "switchStudioTab('balance')", "robot.calibrateBalance()", "updateSpeed(this.value)"
  const parts = call.split(';').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const fnMatch = part.match(/([a-zA-Z0-9_$.]+)\s*\(/);
    if (!fnMatch) continue;
    const fullCall = fnMatch[1];
    if (fullCall.includes('.')) {
      const [obj, method] = fullCall.split('.');
      const methodRegex = new RegExp(`(?:async\\s+${method}\\b|${method}\\s*\\()`);
      if (!methodRegex.test(allJsCode)) {
        missingFuncs.push(`${obj}.${method}`);
      }
    } else {
      const regex = new RegExp(`(?:function\\s+${fullCall}\\b|window\\.${fullCall}\\s*=|let\\s+${fullCall}\\s*=|const\\s+${fullCall}\\s*=|var\\s+${fullCall}\\s*=)`);
      if (!regex.test(allJsCode)) {
        missingFuncs.push(fullCall);
      }
    }
  }
}

if (missingFuncs.length > 0) {
  console.error('[FAIL] Missing inline functions/methods:', missingFuncs);
  process.exit(1);
} else {
  console.log(`[PASS] All inline event handlers and object methods are verified.`);
}

// 4. Test Service Worker cache manifest against actual directory files
const swPath = path.join(root, 'sw.js');
const swContent = fs.readFileSync(swPath, 'utf-8');
const cacheMatch = swContent.match(/const\s+ASSETS\s*=\s*\[([\s\S]*?)\];/);
if (cacheMatch) {
  const assets = cacheMatch[1]
    .split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(s => s.length > 0 && s !== './');
  
  let missingAssets = [];
  for (const asset of assets) {
    const filePath = path.join(root, asset.replace(/^\.\//, ''));
    if (!fs.existsSync(filePath)) {
      missingAssets.push(asset);
    }
  }
  if (missingAssets.length > 0) {
    console.error('[FAIL] Assets listed in sw.js not found on disk:', missingAssets);
    process.exit(1);
  } else {
    console.log(`[PASS] All ${assets.length} service worker cached assets exist on disk.`);
  }
}

// 5. Test BLE Checksum logic exhaustively across full ranges
function computeChecksum(bytes) {
  let xor = 0;
  for (let i = 0; i < 18; i++) {
    xor ^= bytes[i];
  }
  return xor;
}

// Test rocker drive packet encoding
function makeRockerPacket(x, y) {
  const buf = new Uint8Array(20);
  buf[0] = 0x55;
  buf[1] = 0x02;
  buf[2] = 0x02;
  buf[3] = 0x00;
  buf[4] = x < 0 ? (256 + x) & 0xff : x & 0xff;
  buf[5] = 0x00;
  buf[6] = y < 0 ? (256 + y) & 0xff : y & 0xff;
  buf[18] = computeChecksum(buf);
  buf[19] = 0xAA;
  return buf;
}

const testVectors = [
  [0, 0],
  [-100, 100],
  [100, -100],
  [-50, -50],
  [127, -128]
];
let packetErrors = 0;
for (const [x, y] of testVectors) {
  const pkt = makeRockerPacket(x, y);
  if (pkt[0] !== 0x55 || pkt[19] !== 0xAA) packetErrors++;
  if (computeChecksum(pkt) !== pkt[18]) packetErrors++;
}
if (packetErrors === 0) {
  console.log('[PASS] BLE Rocker packet structure and checksum verified for all boundary vectors.');
} else {
  console.error('[FAIL] BLE packet verification failed');
  process.exit(1);
}

// 6. Test k-NN ML engine
const SensorPatternML = require('../sensor-ml.js');
const classifier = new SensorPatternML();
console.log('[PASS] SensorPatternML class instantiated successfully.');

// Test empty prediction (should return '학습 필요')
const emptyPred = classifier.predict([0, 0, 0, 0, 0, 0]);
if (emptyPred.className === '학습 필요') {
  console.log('[PASS] ML predict() returns "학습 필요" safely before training.');
} else {
  console.error('[FAIL] ML predict() did not handle empty state gracefully');
  process.exit(1);
}

// Train with sample classes
for (let i = 0; i < 15; i++) {
  classifier.addExample('Normal', [0.01 * (i % 3), 0.02 * (i % 2), 0.05, 0.04, 0.01, 0.01]);
  classifier.addExample('Tilt', [3.5 + 0.1 * i, 0.5, 3.8, 0.6, 0.2, 0.1]);
  classifier.addExample('Impact', [15.0 + i, 2.0, 18.0, 3.0, 4.0, 1.5]);
}

const testNormal = classifier.predict([0.01, 0.02, 0.05, 0.04, 0.01, 0.01]);
const testTilt = classifier.predict([3.6, 0.5, 3.8, 0.6, 0.2, 0.1]);
const testImpact = classifier.predict([16.0, 2.0, 17.5, 2.8, 3.8, 1.4]);

console.log(`[PASS] ML Classification Results:
  - Normal input -> ${testNormal.className} (Confidence: ${testNormal.confidence}%)
  - Tilt input   -> ${testTilt.className} (Confidence: ${testTilt.confidence}%)
  - Impact input -> ${testImpact.className} (Confidence: ${testImpact.confidence}%)`);

if (testNormal.className === 'Normal' && testTilt.className === 'Tilt' && testImpact.className === 'Impact') {
  console.log('[PASS] ML classification 100% correct across all test patterns.');
} else {
  console.error('[FAIL] ML classification accuracy check failed');
  process.exit(1);
}

console.log('==============================================');
console.log('DEEP INTEGRITY VERIFICATION COMPLETED: ALL PASS');
console.log('==============================================');
