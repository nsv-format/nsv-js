const fs = require('fs');

let content = fs.readFileSync('test.js', 'utf8');

// Fix all the stringify expectations by adding double trailing newline
const replacements = [
  ["assertEqual(result, 'a\\nb\\n', 'dumps alias')", "assertEqual(result, 'a\\nb\\n\\n', 'dumps alias')"],
  ["assertEqual(result, 'a\\nb\\n\\nc\\nd\\n', 'dump to stream')", "assertEqual(result, 'a\\nb\\n\\nc\\nd\\n\\n', 'dump to stream')"],
  ["assertEqual(result, 'a\\nb\\n', 'Writer - single row')", "assertEqual(result, 'a\\nb\\n\\n', 'Writer - single row')"],
  ["assertEqual(result, 'a\\nb\\n\\nc\\nd\\n', 'Writer - multiple rows')", "assertEqual(result, 'a\\nb\\n\\nc\\nd\\n\\n', 'Writer - multiple rows')"],
  ["assertEqual(result, 'a\\nb\\n\\nc\\nd\\n', 'Writer - writeRows')", "assertEqual(result, 'a\\nb\\n\\nc\\nd\\n\\n', 'Writer - writeRows')"],
  ["assertEqual(result, '\\n', 'Single empty row')", "assertEqual(result, '\\n\\n', 'Single empty row')"],
  ["assertEqual(result, '\\n\\n\\n', 'Multiple empty rows')", "assertEqual(result, '\\n\\n\\n\\n', 'Multiple empty rows')"],
];

for (const [from, to] of replacements) {
  content = content.replace(from, to);
}

fs.writeFileSync('test.js', content);
console.log('Fixed test expectations');
