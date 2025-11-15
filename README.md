# NSV - Newline-Separated Values

A modern, ergonomic JavaScript library for working with the NSV (Newline-Separated Values) format.

[![CI](https://github.com/nsv-format/nsv-js/workflows/CI/badge.svg)](https://github.com/nsv-format/nsv-js/actions)

## What is NSV?

NSV is a plain text format for representing sequences of sequences (tabular data). It's designed to be:

- **Simpler than CSV** - No complex quoting rules, just straightforward escaping
- **Git-friendly** - Clean line-based diffs since each cell is on its own line
- **Human-readable** - Easy to read and edit in any text editor
- **Fast** - Simple parsing rules lead to better performance

### Format Basics

- Single newlines (`\n`) separate **cells** within a row
- Double newlines (`\n\n`) separate **rows**
- Backslash escapes special characters:
  - `\\` for a literal backslash
  - `\n` for a newline within a cell
  - `\` (alone) for an empty cell

### Example

```
name
email
city

Alice
alice@example.com
New York

Bob
bob@example.com
\

Charlie
charlie@example.com
San Francisco
```

This represents:
```javascript
[
  ['name', 'email', 'city'],
  ['Alice', 'alice@example.com', 'New York'],
  ['Bob', 'bob@example.com', ''],
  ['Charlie', 'charlie@example.com', 'San Francisco']
]
```

## Installation

```bash
npm install @nsv-format/nsv
```

## Quick Start

```javascript
const nsv = require('@nsv-format/nsv');

// Parse NSV string
const data = nsv.parse('name\nemail\n\nAlice\nalice@example.com\n');
// => [['name', 'email'], ['Alice', 'alice@example.com']]

// Serialize to NSV
const text = nsv.stringify([
  ['name', 'email'],
  ['Alice', 'alice@example.com']
]);
// => 'name\nemail\n\nAlice\nalice@example.com\n'
```

## API Reference

### Core Functions

#### `parse(text)` / `loads(text)`

Parse an NSV string into a 2D array.

```javascript
const data = nsv.parse('a\nb\n\nc\nd\n');
// => [['a', 'b'], ['c', 'd']]
```

**Parameters:**
- `text` (string): NSV-formatted string

**Returns:** `string[][]` - Array of rows, each row is an array of cells

---

#### `stringify(data)` / `dumps(data)`

Serialize a 2D array to an NSV string.

```javascript
const text = nsv.stringify([['a', 'b'], ['c', 'd']]);
// => 'a\nb\n\nc\nd\n'
```

**Parameters:**
- `data` (string[][]): Array of rows to serialize

**Returns:** `string` - NSV-formatted string

**Throws:** `TypeError` if data is not a valid 2D array of strings

---

#### `load(input)`

Parse NSV from a readable stream or string (async).

```javascript
const fs = require('fs');

// From file stream
const stream = fs.createReadStream('data.nsv');
const data = await nsv.load(stream);

// From string
const data = await nsv.load('a\nb\n');
```

**Parameters:**
- `input` (Readable | string): Stream or string to parse

**Returns:** `Promise<string[][]>` - Promise resolving to parsed data

---

#### `dump(data, output)`

Serialize data to NSV and write to a stream (async).

```javascript
const fs = require('fs');

const data = [['a', 'b'], ['c', 'd']];
const stream = fs.createWriteStream('output.nsv');
await nsv.dump(data, stream);
```

**Parameters:**
- `data` (string[][]): Data to serialize
- `output` (Writable): Stream to write to

**Returns:** `Promise<void>`

---

### Incremental Reading and Writing

#### `Writer`

For incrementally writing NSV rows to a stream.

```javascript
const fs = require('fs');
const stream = fs.createWriteStream('output.nsv');
const writer = new nsv.Writer(stream);

await writer.writeRow(['header1', 'header2']);
await writer.writeRow(['value1', 'value2']);

// Or write multiple rows at once
await writer.writeRows([
  ['row1-col1', 'row1-col2'],
  ['row2-col1', 'row2-col2']
]);
```

**Methods:**
- `writeRow(row)` - Write a single row
- `writeRows(rows)` - Write multiple rows

---

#### `Reader`

For incrementally reading NSV rows from a stream or string.

```javascript
const fs = require('fs');
const stream = fs.createReadStream('data.nsv');
const reader = new nsv.Reader(stream);

// Read one row at a time
let row;
while ((row = await reader.readRow()) !== null) {
  console.log(row);
}

// Or read all remaining rows
const allRows = await reader.readRows();

// Or use async iteration
for await (const row of reader) {
  console.log(row);
}
```

**Methods:**
- `readRow()` - Read next row, returns `null` when done
- `readRows()` - Read all remaining rows
- Supports `for await...of` iteration

---

## Testing

```bash
# Run unit tests
npm test

# Run spec-based tests
node test-spec.js

# Cross-test against Python implementation (requires nsv from PyPI)
node cross-test-python.js

# Cross-test against Rust implementation (requires cargo and nsv crate)
node cross-test-rust.js
```

## Compatibility

This implementation has been cross-tested against reference implementations:
- **nsv-python** ([PyPI](https://pypi.org/project/nsv/) v0.2.1+, [GitHub](https://github.com/nsv-format/nsv-python)) - 100% compatible
- **nsv-rust** ([crates.io](https://crates.io/crates/nsv)) - 100% compatible

All implementations pass the same comprehensive test suite.

## Usage Examples

### Working with Files

```javascript
const fs = require('fs');
const nsv = require('@nsv-format/nsv');

// Read from file
async function readFile(filename) {
  const stream = fs.createReadStream(filename, 'utf8');
  return await nsv.load(stream);
}

// Write to file
async function writeFile(filename, data) {
  const stream = fs.createWriteStream(filename);
  await nsv.dump(data, stream);
}

// Usage
const data = await readFile('input.nsv');
console.log(data);
await writeFile('output.nsv', data);
```

### Processing Large Files

For large files, use incremental reading to avoid loading everything into memory:

```javascript
const fs = require('fs');
const nsv = require('@nsv-format/nsv');

async function processLargeFile(inputFile, outputFile) {
  const input = fs.createReadStream(inputFile);
  const output = fs.createWriteStream(outputFile);

  const reader = new nsv.Reader(input);
  const writer = new nsv.Writer(output);

  for await (const row of reader) {
    // Process row (e.g., filter, transform)
    const processed = row.map(cell => cell.toUpperCase());
    await writer.writeRow(processed);
  }
}
```

### Converting CSV to NSV

```javascript
const fs = require('fs');
const csv = require('csv-parse/sync');
const nsv = require('@nsv-format/nsv');

function csvToNsv(csvText) {
  // Parse CSV (adjust options as needed)
  const records = csv.parse(csvText, {
    skip_empty_lines: true,
    relax_column_count: true
  });

  // Convert to NSV
  return nsv.stringify(records);
}

const csvData = fs.readFileSync('data.csv', 'utf8');
const nsvData = csvToNsv(csvData);
fs.writeFileSync('data.nsv', nsvData);
```

### Handling Special Characters

```javascript
const nsv = require('@nsv-format/nsv');

const data = [
  ['Name', 'Bio'],
  ['Alice', 'Line 1\nLine 2'],  // Newline in cell
  ['Bob', 'Uses \\ backslashes'],  // Backslash in cell
  ['Charlie', '']  // Empty cell
];

const text = nsv.stringify(data);
console.log(text);
// Output:
// Name
// Bio
//
// Alice
// Line 1\nLine 2
//
// Bob
// Uses \\ backslashes
//
// Charlie
// \
//

// Parse back
const parsed = nsv.parse(text);
console.log(parsed);
// => Same as original data
```

### TypeScript Usage

This library includes TypeScript type definitions:

```typescript
import * as nsv from '@nsv-format/nsv';
import { NSVData, NSVRow } from '@nsv-format/nsv';

const data: NSVData = [['a', 'b'], ['c', 'd']];
const text: string = nsv.stringify(data);
const parsed: NSVData = nsv.parse(text);

// Reader/Writer are also typed
const reader = new nsv.Reader(text);
const row: NSVRow | null = await reader.readRow();
```

## Performance Characteristics

NSV is designed for performance:

- **Parsing** is O(n) where n is the input length
- **Serialization** is O(n) where n is the total character count
- **Memory** usage is proportional to data size
- No complex state machines or lookahead required

For best performance with large datasets:
- Use incremental `Reader`/`Writer` to process data in chunks
- Stream directly from/to files rather than loading into memory

## Comparison with CSV

| Feature | NSV | CSV |
|---------|-----|-----|
| Complexity | Simple backslash escaping | Complex quoting rules |
| Git diffs | Clean, line-per-cell | Noisy, entire row changes |
| Editing | Easy in any text editor | Tricky with quotes |
| Performance | Fast | Varies by implementation |
| Newlines in cells | ✓ Supported | ✓ Supported (with quotes) |
| Empty cells | ✓ Explicit `\` | ✓ Empty or quoted |
| Tool support | Growing | Ubiquitous |

## Best Practices

1. **Always use strings**: NSV only supports string values. Convert numbers/dates before serializing.

2. **Validate data**: Check that your data is a proper 2D array before calling `stringify()`.

3. **Handle errors**: Wrap parsing in try-catch to handle malformed input gracefully.

4. **Stream large files**: Use `Reader`/`Writer` for files that don't fit comfortably in memory.

5. **UTF-8 encoding**: NSV assumes UTF-8. Always use UTF-8 when reading/writing files.

## License

MIT

## Contributing

Contributions welcome! Please see the [nsv-format](https://github.com/nsv-format) organization on GitHub.

## Links

- [GitHub Repository](https://github.com/nsv-format/nsv-js)
- [NSV Format Specification](https://github.com/nsv-format/nsv)
- [npm Package](https://www.npmjs.com/package/@nsv-format/nsv)
