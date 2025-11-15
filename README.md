# NSV - Newline-Separated Values

[![CI](https://github.com/nsv-format/nsv-js/workflows/CI/badge.svg)](https://github.com/nsv-format/nsv-js/actions)

A dead-simple format for tabular data. Each cell on its own line, double newline separates rows.

```
name
email

Alice
alice@example.com

Bob
bob@example.com
```

That's it. No quotes, no commas, no CSV nonsense.

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

## Special cases

- Empty cell: `\` (backslash alone)
- Newline in cell: `\n` (escaped)
- Literal backslash: `\\` (doubled)

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
  // Transform each row
  const transformed = row.map(cell => cell.toUpperCase());
  await writer.writeRow(transformed);
}
```

The `Reader` truly streams - it parses rows as data arrives, not after loading the entire file. Works with infinite streams.

## API

### `parse(text)` / `loads(text)`
Parse NSV string → 2D array

### `stringify(data)` / `dumps(data)`
Serialize 2D array → NSV string

### `load(stream)`
Parse from stream (async) → 2D array

### `dump(data, stream)`
Serialize to stream (async)

### `Reader(stream)`
Incremental reading. Methods: `readRow()`, `readRows()`. Supports `for await...of`.

### `Writer(stream)`
Incremental writing. Methods: `writeRow(row)`, `writeRows(rows)`.

## TypeScript

Type definitions included.

```typescript
import * as nsv from '@nsv-format/nsv';

const data: string[][] = nsv.parse(text);
```

## Compatibility

Cross-tested against:
- [nsv-python](https://pypi.org/project/nsv/) v0.2.1+
- [nsv-rust](https://crates.io/crates/nsv)

## Format spec

See [nsv-format/nsv](https://github.com/nsv-format/nsv)

## License

MIT
