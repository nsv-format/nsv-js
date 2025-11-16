# NSV - Newline-Separated Values

[![CI](https://github.com/nsv-format/nsv-js/workflows/CI/badge.svg)](https://github.com/nsv-format/nsv-js/actions)

NSV is a plain text format for sequences of sequences. It uses newlines as delimiters: single newlines separate elements within a sequence, double newlines separate the sequences themselves.

```
name
email

Alice
alice@example.com

Bob
bob@example.com
```

The format is git-friendly (clean diffs) and simple (no quoting complexity).

## Install

```bash
npm install @nsv-format/nsv
```

## Basic usage

```javascript
const nsv = require('@nsv-format/nsv');

// Parse NSV text
const data = nsv.parse('name\nemail\n\nAlice\nalice@example.com\n');
// => [['name', 'email'], ['Alice', 'alice@example.com']]

// Serialize to NSV
const text = nsv.stringify([['name', 'email'], ['Alice', 'alice@example.com']]);
// => 'name\nemail\n\nAlice\nalice@example.com\n'
```

Aliases: `loads` for `parse`, `dumps` for `stringify`.

## Escaping

NSV has three escape sequences:
- `\\` represents a literal backslash
- `\n` represents a newline within an element
- `\` alone represents an empty element

Example:

```javascript
const data = [
  ['Name', 'Address'],
  ['Alice', '123 Main St'],
  ['Bob', '456 Oak Ave\nApt 2'],  // Address with newline
  ['Charlie', '']                  // Empty address
];

nsv.stringify(data);
// =>
// Name
// Address
//
// Alice
// 123 Main St
//
// Bob
// 456 Oak Ave\nApt 2
//
// Charlie
// \
//
```

## Streaming

For large files, use `Reader` and `Writer` to process data incrementally without loading everything into memory:

```javascript
const fs = require('fs');

const reader = new nsv.Reader(fs.createReadStream('input.nsv'));
const writer = new nsv.Writer(fs.createWriteStream('output.nsv'));

for await (const row of reader) {
  const processed = row.map(cell => cell.toUpperCase());
  await writer.writeRow(processed);
}
```

The `Reader` parses incrementally as data arrives—it handles infinite streams and maintains bounded memory usage.

**Stream API:**
- `load(stream)` - read entire stream into memory as array
- `dump(data, stream)` - write entire array to stream
- `reader.readRow()` - read next row (returns `null` when done)
- `reader.readRows()` - read all remaining rows into array
- `writer.writeRow(row)` - write a single row
- `writer.writeRows(rows)` - write multiple rows

## TypeScript

Type definitions are included:

```typescript
import * as nsv from '@nsv-format/nsv';

const data: string[][] = nsv.parse(text);
```

## Cross-tested

This implementation is tested against:
- [Python implementation](https://pypi.org/project/nsv/)
- [Rust implementation](https://crates.io/crates/nsv)

All implementations pass the same test suite.

## Spec

See [nsv-format/nsv](https://github.com/nsv-format/nsv) for the format specification.
