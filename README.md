[![CI](https://github.com/nsv-format/nsv-js/workflows/CI/badge.svg)](https://github.com/nsv-format/nsv-js/actions)

# NSV JS

JavaScript implementation of the [NSV (Newline-Separated Values)](https://nsv-format.org) format.

## Installation

```bash
npm install @nsv-format/nsv
```

## Basic usage

```javascript
const nsv = require('@nsv-format/nsv');

// Parse NSV text
const data = nsv.parse('name\nemail\n\nAlice\nalice@example.com\n\n');
// => [['name', 'email'], ['Alice', 'alice@example.com']]

// Serialize to NSV
const text = nsv.stringify([['name', 'email'], ['Alice', 'alice@example.com']]);
// => 'name\nemail\n\nAlice\nalice@example.com\n\n'
```


## Streaming

For large files, one can use `Reader` and `Writer` to process data incrementally without loading everything into memory:

```javascript
const fs = require('fs');

const reader = new nsv.Reader(fs.createReadStream('input.nsv', { encoding: 'utf8' }));
const writer = new nsv.Writer(fs.createWriteStream('output.nsv'));

for await (const row of reader) {
  const processed = row.map(cell => cell.toUpperCase());
  await writer.writeRow(processed);
}
```

The `Reader` parses incrementally as data arrives—it handles infinite streams and maintains bounded memory usage.

**Stream API:**
- `read(stream)` - read entire stream into memory as array
- `write(data, stream)` - write entire array to stream
- `reader.readRow()` - read next row (returns `null` when done)
- `reader.readRows()` - read all remaining rows into array
- `reader.partial()` - raw text of the row in progress
- `writer.writeRow(row)` - write a single row
- `writer.writeRows(rows)` - write multiple rows

## Spill/unspill

Flatten/recover seqseq dimension with terminators.

```javascript
const flat = nsv.spill('', [['a', 'b'], ['c']]);
// => ['a', 'b', '', 'c', '']

const structured = nsv.unspill('', flat);
// => [['a', 'b'], ['c']]
```

Generic — works with any sentinel type. These decompose the encode/decode pipeline:

```
encode = spill('\n') ∘ spill('') ∘ map(map(escape))
decode = map(map(unescape)) ∘ unspill('') ∘ unspill('\n')
```

## TypeScript

Type definitions are included:

```typescript
import * as nsv from '@nsv-format/nsv';

const data: string[][] = nsv.parse(text);
```

## Vendor

The core NSV format is frozen by-design.  
Unless you rely on ENSV features or are performance-aware, copying the naive implementation directly to your codebase may be the better way to handle NSV files.  
Controllable code, controllable interfaces, zero chance of a supply-chain attack.

