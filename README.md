# NSV - Newline-Separated Values

[![CI](https://github.com/nsv-format/nsv-js/workflows/CI/badge.svg)](https://github.com/nsv-format/nsv-js/actions)

NSV is a plain text format for sequences of sequences. Single newlines separate cells, double newlines separate rows.

```
name
email

Alice
alice@example.com

Bob
bob@example.com
```

## Install

```bash
npm install @nsv-format/nsv
```

## Use

```javascript
const nsv = require('@nsv-format/nsv');

// Parse
const data = nsv.parse('name\nemail\n\nAlice\nalice@example.com\n');
// => [['name', 'email'], ['Alice', 'alice@example.com']]

// Serialize
const text = nsv.stringify([['name', 'email'], ['Alice', 'alice@example.com']]);
// => 'name\nemail\n\nAlice\nalice@example.com\n'
```

## Escaping

Three escape sequences:
- `\\` → literal backslash
- `\n` → newline within a cell
- `\` (alone) → empty cell

```javascript
const data = [
  ['Name', 'City'],
  ['Alice', 'New York'],
  ['Bob', ''],  // Empty city
  ['Charlie', 'San\nFrancisco']  // Newline in city
];

const text = nsv.stringify(data);
// =>
// Name
// City
//
// Alice
// New York
//
// Bob
// \
//
// Charlie
// San\nFrancisco
//
```

## Streaming

Process large files incrementally without loading everything into memory:

```javascript
const fs = require('fs');
const nsv = require('@nsv-format/nsv');

const reader = new nsv.Reader(fs.createReadStream('input.nsv'));
const writer = new nsv.Writer(fs.createWriteStream('output.nsv'));

// Process rows one at a time - bounded memory usage
for await (const row of reader) {
  const transformed = row.map(cell => cell.toUpperCase());
  await writer.writeRow(transformed);
}
```

The `Reader` truly streams - it parses rows as data arrives, not after loading the entire file. Works with infinite streams.

**Additional functions:**
- `nsv.load(stream)` - Load entire stream into memory as 2D array
- `nsv.dump(data, stream)` - Write entire 2D array to stream
- `reader.readRow()` - Read next row (returns `null` when done)
- `reader.readRows()` - Read all remaining rows
- `writer.writeRows(rows)` - Write multiple rows

## TypeScript

Type definitions included.

```typescript
import * as nsv from '@nsv-format/nsv';

const data: string[][] = nsv.parse(text);
```

## Compatibility

Cross-tested against:
- [nsv-python](https://pypi.org/project/nsv/)
- [nsv-rust](https://crates.io/crates/nsv)

## Format spec

See [nsv-format/nsv](https://github.com/nsv-format/nsv)
