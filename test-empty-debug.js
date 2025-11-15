const nsv = require('./index');

// Test what we actually get for various inputs
const tests = [
  { input: '\n', desc: 'single newline' },
  { input: '\n\n', desc: 'double newline' },
  { input: '\n\n\n', desc: 'triple newline' },
  { input: '\\\n\n', desc: 'empty cell token + double newline' },
  { input: '\n\na\n\n\n', desc: 'from spec test' },
  { input: 'a\n\n', desc: 'row with a' },
  { input: '\n\n\n\na\n\n', desc: 'empty row then a' },
];

tests.forEach(t => {
  const result = nsv.parse(t.input);
  console.log(`${t.desc}:`);
  console.log('  Input:', JSON.stringify(t.input));
  console.log('  Result:', JSON.stringify(result));
  console.log();
});

// Test encoding
console.log('Encoding tests:');
console.log('[] =>', JSON.stringify(nsv.stringify([])));
console.log('[[]] =>', JSON.stringify(nsv.stringify([[]])));
console.log('[[""]]=>', JSON.stringify(nsv.stringify([['']])));
console.log('[[], ["a"]] =>', JSON.stringify(nsv.stringify([[], ['a']])));
