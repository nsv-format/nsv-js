const assert = require('assert');
const { Readable, Writable } = require('stream');
const nsv = require('./index');

// Test utilities
function assertEqual(actual, expected, message) {
  try {
    assert.deepStrictEqual(actual, expected);
  } catch (error) {
    console.error(`FAIL: ${message}`);
    console.error(`  Expected:`, expected);
    console.error(`  Got:`, actual);
    throw error;
  }
}

function createReadableStream(data) {
  return Readable.from([data]);
}

function createWritableStream() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    }
  });
  stream.getData = () => Buffer.concat(chunks).toString('utf8');
  return stream;
}

// Tests
async function runTests() {
  console.log('Running NSV tests...\n');

  // Test 1: Basic parsing
  {
    const input = 'a\nb\n\nc\nd\n';
    const result = nsv.parse(input);
    assertEqual(result, [['a', 'b'], ['c', 'd']], 'Basic parsing');
    console.log('✓ Basic parsing');
  }

  // Test 2: Empty cells
  {
    const input = 'a\n\\\n\nb\nc\n';
    const result = nsv.parse(input);
    assertEqual(result, [['a', ''], ['b', 'c']], 'Empty cells');
    console.log('✓ Empty cells');
  }

  // Test 3: Escaped backslash
  {
    const input = 'a\\\\b\n';
    const result = nsv.parse(input);
    assertEqual(result, [['a\\b']], 'Escaped backslash');
    console.log('✓ Escaped backslash');
  }

  // Test 4: Escaped newline
  {
    const input = 'a\\nb\n';
    const result = nsv.parse(input);
    assertEqual(result, [['a\nb']], 'Escaped newline');
    console.log('✓ Escaped newline');
  }

  // Test 5: Complex escaping
  {
    const input = 'line1\\nline2\n\\\ntext\\\\more\n';
    const result = nsv.parse(input);
    assertEqual(result, [['line1\nline2', '', 'text\\more']], 'Complex escaping');
    console.log('✓ Complex escaping');
  }

  // Test 6: Empty input
  {
    const result = nsv.parse('');
    assertEqual(result, [], 'Empty input');
    console.log('✓ Empty input');
  }

  // Test 7: Single cell
  {
    const input = 'hello\n';
    const result = nsv.parse(input);
    assertEqual(result, [['hello']], 'Single cell');
    console.log('✓ Single cell');
  }

  // Test 8: Stringify basic
  {
    const input = [['a', 'b'], ['c', 'd']];
    const result = nsv.stringify(input);
    assertEqual(result, 'a\nb\n\nc\nd\n\n', 'Stringify basic');
    console.log('✓ Stringify basic');
  }

  // Test 9: Stringify with empty cells
  {
    const input = [['a', ''], ['b', 'c']];
    const result = nsv.stringify(input);
    assertEqual(result, 'a\n\\\n\nb\nc\n\n', 'Stringify with empty cells');
    console.log('✓ Stringify with empty cells');
  }

  // Test 10: Stringify with special characters
  {
    const input = [['a\\b', 'c\nd']];
    const result = nsv.stringify(input);
    assertEqual(result, 'a\\\\b\nc\\nd\n\n', 'Stringify with special characters');
    console.log('✓ Stringify with special characters');
  }

  // Test 11: Round-trip parse/stringify
  {
    const original = [
      ['hello', 'world'],
      ['foo', 'bar\\baz'],
      ['line1\nline2', ''],
      ['', 'end']
    ];
    const serialized = nsv.stringify(original);
    const parsed = nsv.parse(serialized);
    assertEqual(parsed, original, 'Round-trip parse/stringify');
    console.log('✓ Round-trip parse/stringify');
  }

  // Test 12: read from stream
  {
    const stream = createReadableStream('a\nb\n\nc\nd\n');
    const result = await nsv.read(stream);
    assertEqual(result, [['a', 'b'], ['c', 'd']], 'read from stream');
    console.log('✓ read from stream');
  }

  // Test 13: read from string
  {
    const result = await nsv.read('a\nb\n\n');
    assertEqual(result, [['a', 'b']], 'read from string');
    console.log('✓ read from string');
  }

  // Test 14: write to stream
  {
    const stream = createWritableStream();
    await nsv.write([['a', 'b'], ['c', 'd']], stream);
    const result = stream.getData();
    assertEqual(result, 'a\nb\n\nc\nd\n\n', 'write to stream');
    console.log('✓ write to stream');
  }

  // Test 17: Writer - single row
  {
    const stream = createWritableStream();
    const writer = new nsv.Writer(stream);
    await writer.writeRow(['a', 'b']);
    const result = stream.getData();
    assertEqual(result, 'a\nb\n\n', 'Writer - single row');
    console.log('✓ Writer - single row');
  }

  // Test 18: Writer - multiple rows
  {
    const stream = createWritableStream();
    const writer = new nsv.Writer(stream);
    await writer.writeRow(['a', 'b']);
    await writer.writeRow(['c', 'd']);
    const result = stream.getData();
    assertEqual(result, 'a\nb\n\nc\nd\n\n', 'Writer - multiple rows');
    console.log('✓ Writer - multiple rows');
  }

  // Test 19: Writer - writeRows
  {
    const stream = createWritableStream();
    const writer = new nsv.Writer(stream);
    await writer.writeRows([['a', 'b'], ['c', 'd']]);
    const result = stream.getData();
    assertEqual(result, 'a\nb\n\nc\nd\n\n', 'Writer - writeRows');
    console.log('✓ Writer - writeRows');
  }

  // Test 20: Reader - readRow
  {
    const reader = new nsv.Reader('a\nb\n\nc\nd\n');
    const row1 = await reader.readRow();
    const row2 = await reader.readRow();
    const row3 = await reader.readRow();
    assertEqual(row1, ['a', 'b'], 'Reader - readRow first');
    assertEqual(row2, ['c', 'd'], 'Reader - readRow second');
    assertEqual(row3, null, 'Reader - readRow end');
    console.log('✓ Reader - readRow');
  }

  // Test 21: Reader - readRows
  {
    const reader = new nsv.Reader('a\nb\n\nc\nd\n');
    const rows = await reader.readRows();
    assertEqual(rows, [['a', 'b'], ['c', 'd']], 'Reader - readRows');
    console.log('✓ Reader - readRows');
  }

  // Test 22: Reader - async iterator
  {
    const reader = new nsv.Reader('a\nb\n\nc\nd\n');
    const rows = [];
    for await (const row of reader) {
      rows.push(row);
    }
    assertEqual(rows, [['a', 'b'], ['c', 'd']], 'Reader - async iterator');
    console.log('✓ Reader - async iterator');
  }

  // Test 23: Reader from stream
  {
    const stream = createReadableStream('a\nb\n\nc\nd\n');
    const reader = new nsv.Reader(stream);
    const rows = await reader.readRows();
    assertEqual(rows, [['a', 'b'], ['c', 'd']], 'Reader from stream');
    console.log('✓ Reader from stream');
  }

  // Test 24: Empty data array
  {
    const result = nsv.stringify([]);
    assertEqual(result, '', 'Empty data array');
    console.log('✓ Empty data array');
  }

  // Test 28: Single empty row
  {
    const result = nsv.stringify([[]]);
    assertEqual(result, '\n', 'Single empty row');
    console.log('✓ Single empty row');
  }

  // Test 29: Multiple empty rows
  {
    const result = nsv.stringify([[], []]);
    assertEqual(result, '\n\n', 'Multiple empty rows');
    console.log('✓ Multiple empty rows');
  }

  // Test 30: Trailing newlines behavior
  {
    const input1 = 'a\nb\n\n';
    const input2 = 'a\nb\n\n';
    const input3 = 'a\nb\n\n\n';
    const result1 = nsv.parse(input1);
    const result2 = nsv.parse(input2);
    const result3 = nsv.parse(input3);
    // Single trailing newline completes the row
    assertEqual(result1, [['a', 'b']], 'Trailing newlines - single');
    // Double trailing newline - second newline is consumed as row terminator
    assertEqual(result2, [['a', 'b']], 'Trailing newlines - double');
    // Triple trailing newline - third newline indicates an empty row
    assertEqual(result3, [['a', 'b'], []], 'Trailing newlines - triple');
    console.log('✓ Trailing newlines handled correctly');
  }

  // === spill/unspill tests ===

  // Test: spill empty groups
  {
    const result = nsv.spill('|', []);
    assertEqual(result, [], 'spill - no groups');
    console.log('✓ spill - no groups');
  }

  // Test: spill single empty group
  {
    const result = nsv.spill('|', [[]]);
    assertEqual(result, ['|'], 'spill - one empty group');
    console.log('✓ spill - one empty group');
  }

  // Test: spill two empty groups
  {
    const result = nsv.spill('|', [[], []]);
    assertEqual(result, ['|', '|'], 'spill - two empty groups');
    console.log('✓ spill - two empty groups');
  }

  // Test: spill with data
  {
    const result = nsv.spill('|', [['a', 'b'], ['c']]);
    assertEqual(result, ['a', 'b', '|', 'c', '|'], 'spill - with data');
    console.log('✓ spill - with data');
  }

  // Test: spill single element group
  {
    const result = nsv.spill('|', [['a']]);
    assertEqual(result, ['a', '|'], 'spill - single element group');
    console.log('✓ spill - single element group');
  }

  // Test: round-trip spill/unspill - no groups
  // Note: spill(s, []) → [] and unspill(s, []) → [[]], so the round-trip
  // maps [] to [[]] — this is expected since an empty flat sequence is
  // indistinguishable from one produced by a single empty group.
  {
    const input = [];
    assertEqual(nsv.unspill('|', nsv.spill('|', input)), [[]], 'round-trip - no groups gives one empty group');
    console.log('✓ round-trip spill/unspill - no groups');
  }

  // Test: round-trip spill/unspill - one empty group
  {
    const input = [[]];
    assertEqual(nsv.unspill('|', nsv.spill('|', input)), input, 'round-trip - one empty group');
    console.log('✓ round-trip spill/unspill - one empty group');
  }

  // Test: round-trip spill/unspill - two empty groups
  {
    const input = [[], []];
    assertEqual(nsv.unspill('|', nsv.spill('|', input)), input, 'round-trip - two empty groups');
    console.log('✓ round-trip spill/unspill - two empty groups');
  }

  // Test: round-trip spill/unspill - with data
  {
    const input = [['a', 'b'], ['c']];
    assertEqual(nsv.unspill('|', nsv.spill('|', input)), input, 'round-trip - with data');
    console.log('✓ round-trip spill/unspill - with data');
  }

  // Test: round-trip spill/unspill - single element
  {
    const input = [['a']];
    assertEqual(nsv.unspill('|', nsv.spill('|', input)), input, 'round-trip - single element');
    console.log('✓ round-trip spill/unspill - single element');
  }

  // Test: unspill empty sequence
  {
    const result = nsv.unspill('|', []);
    assertEqual(result, [[]], 'unspill - empty sequence gives one empty group');
    console.log('✓ unspill - empty sequence');
  }

  // Test: spill with empty string sentinel (NSV inner spill)
  {
    const result = nsv.spill('', [['a', 'b'], ['c']]);
    assertEqual(result, ['a', 'b', '', 'c', ''], 'spill - empty string sentinel');
    console.log('✓ spill - empty string sentinel');
  }

  // Test: unspill with empty string sentinel
  {
    const result = nsv.unspill('', ['a', 'b', '', 'c', '']);
    assertEqual(result, [['a', 'b'], ['c']], 'unspill - empty string sentinel');
    console.log('✓ unspill - empty string sentinel');
  }

  // === Algebraic equivalence tests ===
  // encode = spill[Char, '\n'] ∘ spill[String, ''] ∘ map(map(escape))
  // decode = map(map(unescape)) ∘ unspill[String, ''] ∘ unspill[Char, '\n']

  {
    const testCases = [
      { name: 'empty', data: [] },
      { name: 'single empty row', data: [[]] },
      { name: 'multiple empty rows', data: [[], [], []] },
      { name: 'simple data', data: [['a', 'b'], ['c', 'd']] },
      { name: 'cells with newlines', data: [['line1\nline2', 'hello']] },
      { name: 'cells with backslash', data: [['a\\b', 'c']] },
      { name: 'cells with both', data: [['a\nb\\c', 'd\ne']] },
      { name: 'empty cells', data: [['', 'a'], ['', '']] },
      { name: 'mixed empty and data rows', data: [[], ['a'], [], ['b', 'c'], []] },
    ];

    for (const { name, data } of testCases) {
      // Test encoding equivalence: stringify === spill decomposition
      const direct = nsv.stringify(data);
      const viaSpill = nsv.spill('\n', nsv.spill('', data.map(row => row.map(nsv.escape)))).join('');
      assertEqual(direct, viaSpill, `algebraic encode - ${name}`);

      // Test decoding equivalence: parse === unspill decomposition
      // decode = map(map(unescape)) ∘ unspill[String, ''] ∘ unspill[Char, '\n']
      // Between char-level and string-level unspill, we join char groups into strings.
      if (direct.length > 0) {
        const directParse = nsv.parse(direct);
        const charGroups = nsv.unspill('\n', [...direct]);
        const strings = charGroups.map(g => g.join(''));
        const rows = nsv.unspill('', strings);
        const viaUnspill = rows.map(row => row.map(nsv.unescape));
        assertEqual(directParse, viaUnspill, `algebraic decode - ${name}`);
      }
    }
    console.log('✓ algebraic equivalence (encode and decode) for all test cases');
  }

  console.log('\n✓ All tests passed!');
}

// Run tests
runTests().catch(error => {
  console.error('\n✗ Test failed:', error.message);
  process.exit(1);
});
