// Simple validation for PixelBlastCA
const fs = require('fs');

const code = fs.readFileSync('PixelBlastCA.jsx', 'utf8');

// Check for key CA features
const checks = [
  { name: 'Ping-pong buffers', pattern: /targetA.*targetB/s, found: false },
  { name: 'Neighbor sampling', pattern: /for.*x = -1.*y = -1/s, found: false },
  { name: 'State texture uniform', pattern: /previousState.*value/s, found: false },
  { name: 'CA rules', pattern: /uRule.*==.*0/s, found: false },
  { name: 'Buffer swap', pattern: /\[targetA, targetB\] = \[targetB, targetA\]/, found: false },
  { name: 'Display shader', pattern: /caState.*texture/s, found: false },
  { name: 'Click spawning', pattern: /onPointerDown/, found: false },
  { name: 'Shape masking', pattern: /maskCircle|maskTriangle|maskDiamond/, found: false }
];

console.log('Checking PixelBlastCA implementation...\n');

let allPassed = true;
checks.forEach(check => {
  check.found = check.pattern.test(code);
  const status = check.found ? '✓' : '✗';
  console.log(`${status} ${check.name}`);
  if (!check.found) allPassed = false;
});

console.log('\n' + (allPassed ? '✓ All checks passed!' : '✗ Some checks failed'));

// Check for common issues
const issues = [];

if (!code.includes('NearestFilter')) {
  issues.push('Warning: Should use NearestFilter for CA state textures');
}

if (issues.length > 0) {
  console.log('\nNotes:');
  issues.forEach(i => console.log('  - ' + i));
}

const lines = code.split('\n').length;
const rules = (code.match(/uRule == /g) || []).length;

console.log('\nCode stats:');
console.log(`  Lines: ${lines}`);
console.log(`  CA shader: ${code.includes('CA_FRAGMENT') ? 'Present' : 'Missing'}`);
console.log(`  Display shader: ${code.includes('DISPLAY_FRAGMENT') ? 'Present' : 'Missing'}`);
console.log(`  Rules defined: ${rules}`);
