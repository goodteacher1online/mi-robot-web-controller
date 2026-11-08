const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Load index.html
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');

console.log('--- TEST 1: Piano Stop Option Removal ---');
const songSelectHtml = html.match(/<select id="songSelect"[\s\S]*?<\/select>/)[0];
assert(!songSelectHtml.includes('value="stop"'), 'Piano song select should not have "stop" option');
assert(html.includes('id="btnStopSong"'), 'Dedicated btnStopSong should exist');
console.log('[PASS] Piano song select clean of stop option, dedicated button present.');

console.log('--- TEST 2: D-Pad Center Button Styling & Markup ---');
assert(!html.includes('border: 2px dashed var(--card-border);'), 'D-Pad center should not have unfinished dashed border');
assert(html.includes('dpad-btn dpad-center'), 'dpad-center button exists');
console.log('[PASS] D-Pad center button has solid polished styling.');

console.log('--- TEST 3: Self-Balancing Toggle Switch in HTML ---');
assert(html.includes('id="btnToggleBalance"'), 'btnToggleBalance must be present in HTML');
assert(html.includes('id="balanceModeBadge"'), 'balanceModeBadge must be present in HTML');
console.log('[PASS] Self-balancing toggle button and status badge present.');

console.log('--- TEST 4: Port A,B,C,D Accordion & Custom Color Event Configurator ---');
assert(html.includes('id="portsDetailAccordion"'), 'portsDetailAccordion must exist');
assert(html.includes('id="ruleAction_5"'), 'ruleAction_5 (Red) must exist');
assert(html.includes('id="ruleAction_3"'), 'ruleAction_3 (Green) must exist');
assert(html.includes('id="ruleAction_1"'), 'ruleAction_1 (Black Line) must exist');
console.log('[PASS] Accordion and customizable color rules inputs present.');

console.log('--- TEST 5: Vision AI Master Switch & Safe Stop ---');
assert(html.includes('id="visionMasterStatusBadge"'), 'visionMasterStatusBadge must exist');
console.log('[PASS] Vision master status badge present.');

// Test robot-ble.js motor mapping logic
const { MiRobotBLE } = require(path.join(root, 'robot-ble.js'));
const robot = new MiRobotBLE();

console.log('--- TEST 6: Motor Individual & Synced Control in BLE Driver ---');
// Test Left Motor Only (Port A)
robot.setMotors(50, 0);
assert.strictEqual(robot.axisLeft, 192, 'Port A should be 192 (+50%)');
assert.strictEqual(robot.axisRight, 128, 'Port B should be 128 (Neutral/Stop)');

// Test Right Motor Only (Port B)
robot.setMotors(0, 50);
assert.strictEqual(robot.axisLeft, 128, 'Port A should be 128 (Neutral/Stop)');
assert.strictEqual(robot.axisRight, 192, 'Port B should be 192 (+50%)');

// Test Both Motors Synced (Forward 50%)
robot.setMotors(50, 50);
assert.strictEqual(robot.axisLeft, 192, 'Port A should be 192 (+50%)');
assert.strictEqual(robot.axisRight, 192, 'Port B should be 192 (+50%)');

// Test Stop
robot.stop();
assert.strictEqual(robot.axisLeft, 128, 'Port A should be 128 (Stop)');
assert.strictEqual(robot.axisRight, 128, 'Port B should be 128 (Stop)');
assert.strictEqual(robot.isEmergencyStopped, false, 'Normal stop should not lock with isEmergencyStopped');
console.log('[PASS] Dual motor independent and synced control fully verified!');

console.log('--- TEST 7: Self-Balancing Activation Toggle ---');
robot.setBalanceActive(false);
assert.strictEqual(robot.isSelfBalancing, false, 'Self-balancing should be false');
robot.setBalanceActive(true);
assert.strictEqual(robot.isSelfBalancing, true, 'Self-balancing should be true');
console.log('[PASS] Self-balancing toggle logic verified.');

console.log('--- TEST 8: Color Sensor Custom Rules Engine ---');
const { MiRobotColorSensor } = require(path.join(root, 'color-sensor.js'));
const sensor = new MiRobotColorSensor(robot);
assert(sensor.customRules[5], 'Rule for Red (5) should exist');
assert.strictEqual(sensor.customRules[5].action, 'stop');
sensor.setCustomRule(5, 'forward', 70);
assert.strictEqual(sensor.customRules[5].action, 'forward');
assert.strictEqual(sensor.customRules[5].speed, 70);
console.log('[PASS] Color sensor custom rules engine verified.');

console.log('==============================================');
console.log('ALL FIXES & ENHANCEMENTS VERIFIED: 100% PASS!');
console.log('==============================================');
