const nsv = require('./index');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Test cases
const tests = [
  { name: 'simple table', input: 'a\nb\n\nc\nd\n' },
  { name: 'four newlines', input: '\n\n\n\n' },
  { name: 'double newline then first', input: '\n\nfirst\n' },
  { name: 'first, triple newline, second', input: 'first\n\n\n\nsecond\n' },
  { name: 'empty cell token', input: '\\\n' },
  { name: 'text with dangling backslash', input: 'text\\\n' },
  { name: 'unknown escape sequence', input: 'test\\x41\n' },
  { name: 'spec example', input: 'Tab\\tseparated\\tvalues\\n(would be left as-is normally)\n' },
  { name: 'mixed escapes', input: 'Roses are red\\nViolets are blue\\nThis may be pain\\nBut CSV would be, too\n' },
  { name: 'empty rows', input: '\n\na\n\n\n' },
  { name: 'trailing newlines', input: 'a\n\n\n' },
  { name: 'complex example', input: 'first\nrow\n\nsecond\nrow\n\nmissing ->\n\\\n<- missing\n\nRoses are red\\nViolets are blue\\nThis may be pain\\nBut CSV would be, too\nTab\\tseparated\\tvalues\\n(would be left as-is normally)\nNot a newline: \\\\n\n' },
];

console.log('Cross-testing JS implementation against Python (PyPI 0.2.3)\n');
console.log('='.repeat(60) + '\n');

let passCount = 0;
let failCount = 0;

// Create temp file for input
const tmpFile = path.join(os.tmpdir(), 'nsv-test-input.txt');

for (const test of tests) {
  // Write test input to temp file
  fs.writeFileSync(tmpFile, test.input);

  // Run Python implementation from PyPI
  let pythonResult;
  try {
    const pythonCode = `import sys; import json; import nsv; f = open(sys.argv[1]); result = nsv.load(f); f.close(); print(json.dumps(result))`;
    const output = execSync(`python3 -c ${JSON.stringify(pythonCode)} ${JSON.stringify(tmpFile)}`, {
      encoding: 'utf8'
    });
    pythonResult = JSON.parse(output.trim());
  } catch (e) {
    console.error(`✗ ${test.name}`);
    console.error(`  Error: ${e.message}`);
    failCount++;
    continue;
  }

  // Run JS implementation
  const jsResult = nsv.parse(test.input);

  // Compare
  const match = JSON.stringify(jsResult) === JSON.stringify(pythonResult);

  if (match) {
    console.log(`✓ ${test.name}`);
    passCount++;
  } else {
    console.log(`✗ ${test.name}`);
    console.log(`  Input: ${JSON.stringify(test.input)}`);
    console.log(`  Python: ${JSON.stringify(pythonResult)}`);
    console.log(`  JS:     ${JSON.stringify(jsResult)}`);
    failCount++;
  }
}

// Cleanup
try {
  fs.unlinkSync(tmpFile);
} catch (e) {
  // Ignore cleanup errors
}

console.log('\n' + '='.repeat(60));
console.log(`Results: ${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
