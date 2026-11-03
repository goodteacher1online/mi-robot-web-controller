const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf-8');

const scriptSrcs = [];
const scriptRegex = /<script src=["']([^"']+)["']><\/script>/g;
let m;
while ((m = scriptRegex.exec(html)) !== null) {
  scriptSrcs.push(m[1]);
}
console.log('Script files in index.html in order:', scriptSrcs);

const sandbox = {
  window: {},
  document: {
    addEventListener: () => {},
    documentElement: { setAttribute: () => {}, getAttribute: () => 'light' },
    querySelectorAll: () => [],
    getElementById: () => ({ addEventListener: () => {}, querySelectorAll: () => [], classList: { add: () => {}, remove: () => {} } })
  },
  navigator: { bluetooth: {}, mediaDevices: {} },
  localStorage: { getItem: () => null, setItem: () => {} },
  EventTarget: class {},
  CustomEvent: class {},
  AudioContext: class {},
  webkitAudioContext: class {},
  console: console
};
sandbox.window = sandbox;

for (const src of scriptSrcs) {
  const code = fs.readFileSync(path.join(base, src), 'utf-8');
  try {
    vm.runInNewContext(code, sandbox);
    console.log('Loaded script OK:', src);
  } catch (e) {
    console.error('ERROR in script', src, e.message);
  }
}

// Now check if classes instantiated in index.html exist
console.log('--- GLOBAL INSTANTIATION CHECK ---');
console.log('MiRobotBLE:', typeof sandbox.MiRobotBLE);
console.log('RobotAliasManager:', typeof sandbox.RobotAliasManager);
console.log('PianoEngine:', typeof sandbox.PianoEngine);
console.log('MiPianoEngine:', typeof sandbox.MiPianoEngine);
console.log('SensorPatternML:', typeof sandbox.SensorPatternML);
console.log('VisionHandController:', typeof sandbox.VisionHandController);
