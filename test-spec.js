const assert = require('assert');
const nsv = require('./index');

// Test cases from NSV spec README
console.log('Testing examples from NSV specification...\n');

// Example 1: Trivial example from spec
{
  const input = `col1
col2

a
b

c
d
`;
  const expected = [
    ['col1', 'col2'],
    ['a', 'b'],
    ['c', 'd']
  ];
  const result = nsv.parse(input);
  assert.deepStrictEqual(result, expected);
  console.log('✓ Trivial example from spec');
}

// Example 2: Less trivial example from spec
{
  const input = `first
row

second
row

missing ->
\\
<- missing

Roses are red\\nViolets are blue\\nThis may be pain\\nBut CSV would be, too
Tab\\tseparated\\tvalues\\n(would be left as-is normally)
Not a newline: \\\\n
`;

  const expected = [
    ['first', 'row'],
    ['second', 'row'],
    ['missing ->', '', '<- missing'],
    [
      'Roses are red\nViolets are blue\nThis may be pain\nBut CSV would be, too',
      'Tab\\tseparated\\tvalues\n(would be left as-is normally)',  // \t is unknown escape (literal \t), \n is newline
      'Not a newline: \\n'  // This is the literal string backslash-n
    ]
  ];

  const result = nsv.parse(input);
  assert.deepStrictEqual(result, expected);
  console.log('✓ Less trivial example from spec');
}

// Test dangling backslash handling (per spec: should be stripped)
{
  const input = 'test\\\n';
  const result = nsv.parse(input);
  assert.deepStrictEqual(result, [['test']]);
  console.log('✓ Dangling backslash is stripped');
}

// Test unknown escape sequences (per spec: pass through literal backslash)
{
  const input = 'test\\x41\n';
  const result = nsv.parse(input);
  assert.deepStrictEqual(result, [['test\\x41']]);
  console.log('✓ Unknown escape sequences pass through literal backslash');
}

// Test empty rows
{
  const input = '\n\na\n\n\n';
  const result = nsv.parse(input);
  // \n\n = first empty row, a\n = cell, \n\n = complete row and start second empty row, \n = third empty row
  assert.deepStrictEqual(result, [[], [], ['a'], []]);
  console.log('✓ Empty rows');
}

// Test single empty cell in a row
{
  const input = '\\\n';
  const result = nsv.parse(input);
  assert.deepStrictEqual(result, [['']]);
  console.log('✓ Single empty cell');
}

// Test multiple empty cells
{
  const input = '\\\n\\\n\\\n';
  const result = nsv.parse(input);
  assert.deepStrictEqual(result, [['', '', '']]);
  console.log('✓ Multiple empty cells in row');
}

// Test CR is not special (per spec)
{
  const input = 'test\\rvalue\n';
  const result = nsv.parse(input);
  assert.deepStrictEqual(result, [['test\\rvalue']]);
  console.log('✓ CR is not recognized as special character');
}

// Test round-trip with spec examples
{
  const original = [
    ['first', 'row'],
    ['second', 'row'],
    ['missing ->', '', '<- missing'],
    [
      'Roses are red\nViolets are blue\nThis may be pain\nBut CSV would be, too',
      'Tab\\tseparated\\tvalues\n(would be left as-is normally)',  // \t is unknown escape (literal \t), \n is newline
      'Not a newline: \\n'  // This is the literal string backslash-n
    ]
  ];

  const serialized = nsv.stringify(original);
  const parsed = nsv.parse(serialized);
  assert.deepStrictEqual(parsed, original);
  console.log('✓ Round-trip with complex spec example');
}

// Test that tabs are preserved literally
{
  const input = 'tab\there\n';
  const result = nsv.parse(input);
  assert.deepStrictEqual(result, [['tab\there']]);
  console.log('✓ Tabs are preserved literally');
}

// Test encoding/decoding preserves structure
{
  const data = [
    [],
    [''],
    ['', ''],
    ['a'],
    ['a', 'b'],
    ['a', '', 'c']
  ];

  const encoded = nsv.stringify(data);
  const decoded = nsv.parse(encoded);
  assert.deepStrictEqual(decoded, data);
  console.log('✓ Structure preservation for various row types');
}

// Test that trailing newlines behavior matches Python
{
  const input1 = 'a\n';
  const input2 = 'a\n\n';
  const input3 = 'a\n\n\n';
  const input4 = 'a\n\n\n\n';

  assert.deepStrictEqual(nsv.parse(input1), [['a']]);
  assert.deepStrictEqual(nsv.parse(input2), [['a']]);
  assert.deepStrictEqual(nsv.parse(input3), [['a'], []]);
  assert.deepStrictEqual(nsv.parse(input4), [['a'], [], []]);
  console.log('✓ Trailing newlines are handled correctly');
}

// Test backslash followed by regular character
{
  const input = 'test\\abc\n';
  const result = nsv.parse(input);
  assert.deepStrictEqual(result, [['test\\abc']]);
  console.log('✓ Backslash before regular character passes through');
}

// Edge case: Multiple backslashes
{
  const input = '\\\\\\\\\n';  // Four backslashes
  const result = nsv.parse(input);
  assert.deepStrictEqual(result, [['\\\\']]);
  console.log('✓ Multiple escaped backslashes');
}

// Edge case: Backslash-n that's not a newline escape
{
  const original = [['Not a newline: \\n']];
  const encoded = nsv.stringify(original);
  const decoded = nsv.parse(encoded);
  assert.deepStrictEqual(decoded, original);
  console.log('✓ Literal backslash-n in data');
}

console.log('\n✓ All spec-based tests passed!');
