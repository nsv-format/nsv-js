# NSV - Newline-Separated Values

[![CI](https://github.com/nsv-format/nsv-js/workflows/CI/badge.svg)](https://github.com/nsv-format/nsv-js/actions)

NSV is a plain text format for sequences of sequences.

```nsv
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


## Streaming

For large files, one can use `Reader` and `Writer` to process data incrementally without loading everything into memory:

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

The `Reader` is resumable: at end of input, an incomplete trailing row (one not terminated by an empty line) is buffered, not emitted. Use the non-resumable `parse()` for batch input where the end of the string is the definitive end of data—it does emit the incomplete tail.

**Stream API:**
- `read(stream)` - read entire stream into memory as array
- `write(data, stream)` - write entire array to stream
- `reader.readRow()` - read next row (returns `null` when done)
- `reader.readRows()` - read all remaining rows into array
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

## Cross-tested

This implementation is tested against:
- [Python implementation](https://pypi.org/project/nsv/)
- [Rust implementation](https://crates.io/crates/nsv)

## Spec

See [nsv-format/nsv](https://github.com/nsv-format/nsv) for the format specification.

