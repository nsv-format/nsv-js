// Test streaming with chunked data
const { Readable, Writable } = require('stream');
const nsv = require('./index');

console.log('Testing true streaming behavior...\n');

// Test 1: Reader processes chunks incrementally
async function testChunkedReading() {
  console.log('Test 1: Reading data that arrives in chunks');

  // Create a stream that emits data in small chunks
  const chunks = ['a\n', 'b\n', '\n', 'c\n', 'd\n', '\n'];
  let index = 0;

  const stream = new Readable({
    read() {
      if (index < chunks.length) {
        this.push(chunks[index++]);
      } else {
        this.push(null); // End of stream
      }
    }
  });

  const reader = new nsv.Reader(stream);
  const rows = [];

  for await (const row of reader) {
    rows.push(row);
    console.log(`  Got row: ${JSON.stringify(row)}`);
  }

  const expected = [['a', 'b'], ['c', 'd']];
  if (JSON.stringify(rows) === JSON.stringify(expected)) {
    console.log('✓ Chunked reading works\n');
  } else {
    console.error('✗ Expected:', expected);
    console.error('  Got:', rows);
    process.exit(1);
  }
}

// Test 2: Writer incrementally writes rows
async function testIncrementalWriting() {
  console.log('Test 2: Writing rows incrementally');

  let output = '';
  const stream = new Writable({
    write(chunk, encoding, callback) {
      output += chunk.toString();
      console.log(`  Wrote chunk: ${JSON.stringify(chunk.toString())}`);
      callback();
    }
  });

  const writer = new nsv.Writer(stream);

  await writer.writeRow(['name', 'value']);
  console.log('  First row written');

  await writer.writeRow(['Alice', '100']);
  console.log('  Second row written');

  await writer.writeRow(['Bob', '200']);
  console.log('  Third row written');

  const expected = 'name\nvalue\n\nAlice\n100\n\nBob\n200\n\n';
  if (output === expected) {
    console.log('✓ Incremental writing works\n');
  } else {
    console.error('✗ Expected:', JSON.stringify(expected));
    console.error('  Got:', JSON.stringify(output));
    process.exit(1);
  }
}

// Test 3: Simulate processing infinite stream
async function testInfiniteStream() {
  console.log('Test 3: Processing stream without loading all data');

  // Create a stream that emits rows one at a time with delays
  const dataRows = [
    ['row1-a', 'row1-b'],
    ['row2-a', 'row2-b'],
    ['row3-a', 'row3-b']
  ];

  let rowIndex = 0;
  const stream = new Readable({
    read() {
      if (rowIndex < dataRows.length) {
        const row = dataRows[rowIndex++];
        const nsvRow = row.map(cell => cell + '\n').join('') + '\n';
        this.push(nsvRow);
      } else {
        this.push(null);
      }
    }
  });

  const reader = new nsv.Reader(stream);
  let processedCount = 0;

  // Process rows one at a time as they arrive
  for await (const row of reader) {
    processedCount++;
    console.log(`  Processed row ${processedCount}: ${JSON.stringify(row)}`);
    // In real use case, you could do expensive processing here
    // without holding entire dataset in memory
  }

  if (processedCount === 3) {
    console.log('✓ Stream processing works without buffering all data\n');
  } else {
    console.error('✗ Expected 3 rows, got', processedCount);
    process.exit(1);
  }
}

// Test 4: Empty rows survive streaming, including across chunk boundaries
async function testEmptyRows() {
  console.log('Test 4: Streaming inputs with empty rows match parse()');

  const cases = [
    { name: 'empty row between rows', chunks: ['a\n\n\nb\n\n'] },
    { name: 'only empty rows', chunks: ['\n\n\n\n'] },
    { name: 'consecutive empty rows', chunks: ['first\n\n\n\nsecond\n\n'] },
    { name: 'empty row split across chunk boundary', chunks: ['a\n\n', '\nb\n\n'] },
    { name: 'every newline its own chunk', chunks: ['a', '\n', '\n', '\n', 'b', '\n', '\n'] },
  ];

  for (const { name, chunks } of cases) {
    let index = 0;
    const stream = new Readable({
      read() {
        if (index < chunks.length) {
          this.push(chunks[index++]);
        } else {
          this.push(null);
        }
      }
    });

    const reader = new nsv.Reader(stream);
    const rows = [];
    for await (const row of reader) {
      rows.push(row);
    }

    const expected = nsv.parse(chunks.join(''));
    if (JSON.stringify(rows) === JSON.stringify(expected)) {
      console.log(`  ✓ ${name}: ${JSON.stringify(rows)}`);
    } else {
      console.error(`✗ ${name}`);
      console.error('  Expected:', expected);
      console.error('  Got:', rows);
      process.exit(1);
    }
  }
  console.log('✓ Empty rows handled correctly\n');
}

// Test 5: Buffer chunks are bytes — result independent of chunk boundaries
async function testBufferChunksAreBytes() {
  console.log('Test 5: Buffer chunks treated as bytes, invariant under chunk boundaries');

  function bufferStream(chunks) {
    let index = 0;
    return new Readable({
      read() {
        this.push(index < chunks.length ? chunks[index++] : null);
      }
    });
  }

  async function readBoth(chunks) {
    const readerRows = [];
    for await (const row of new nsv.Reader(bufferStream(chunks))) {
      readerRows.push(row);
    }
    const readRows = await nsv.read(bufferStream(chunks));
    return [['Reader', readerRows], ['read()', readRows]];
  }

  const cases = [
    { name: '2-byte (é)', text: 'café\n\né\n\n' },
    { name: '3-byte (★)', text: 'a★b\n\n★\n\n' },
    { name: '4-byte (🎉)', text: 'a\u{1f389}b\n\n\u{1f389}\n\n' },
  ];

  for (const { name, text } of cases) {
    const bytes = Buffer.from(text, 'utf8');
    const expected = nsv.parse(bytes.toString('latin1'));

    const recovered = expected.map(row =>
      row.map(cell => Buffer.from(cell, 'latin1').toString('utf8')));
    if (JSON.stringify(recovered) !== JSON.stringify(nsv.parse(text))) {
      console.error(`✗ ${name}: latin1 transport is not byte-faithful`);
      console.error('  Expected:', nsv.parse(text));
      console.error('  Got:', recovered);
      process.exit(1);
    }

    for (let split = 0; split <= bytes.length; split++) {
      const chunks = [bytes.slice(0, split), bytes.slice(split)];
      for (const [path, rows] of await readBoth(chunks)) {
        if (JSON.stringify(rows) !== JSON.stringify(expected)) {
          console.error(`✗ ${name} via ${path}, split at byte ${split}`);
          console.error('  Expected:', expected);
          console.error('  Got:', rows);
          process.exit(1);
        }
      }
    }
    console.log(`  ✓ ${name}: byte-faithful, all ${bytes.length + 1} split positions, Reader and read()`);
  }

  {
    const text = 'a\\nb\n\né\u{1f389}\n\n';
    const bytes = Buffer.from(text, 'utf8');
    const expected = nsv.parse(bytes.toString('latin1'));
    const escapeSplit = 2;
    const codePointSplit = bytes.length - 4;
    const chunks = [
      bytes.slice(0, escapeSplit),
      bytes.slice(escapeSplit, codePointSplit),
      bytes.slice(codePointSplit),
    ];
    for (const [path, rows] of await readBoth(chunks)) {
      if (JSON.stringify(rows) !== JSON.stringify(expected)) {
        console.error(`✗ combined escape+code-point split via ${path}`);
        console.error('  Expected:', expected);
        console.error('  Got:', rows);
        process.exit(1);
      }
    }
    console.log('  ✓ combined: boundary in escape sequence + boundary in code point');
  }
  console.log('✓ Buffer chunks handled as bytes correctly\n');
}

// Run all tests
(async () => {
  await testChunkedReading();
  await testIncrementalWriting();
  await testInfiniteStream();
  await testEmptyRows();
  await testBufferChunksAreBytes();
  console.log('✓ All streaming tests passed!');
})().catch(error => {
  console.error('✗ Test failed:', error);
  process.exit(1);
});
