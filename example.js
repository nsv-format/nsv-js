/**
 * Example usage of the NSV library
 */

const nsv = require('./index');

console.log('NSV (Newline-Separated Values) Library Examples\n');
console.log('='.repeat(50) + '\n');

// Example 1: Basic parsing
console.log('Example 1: Basic Parsing');
console.log('-'.repeat(50));

const input = `name
email
city

Alice
alice@example.com
New York

Bob
bob@example.com
\\

Charlie
charlie@example.com
San Francisco
`;

const parsed = nsv.parse(input);
console.log('Input NSV:');
console.log(input);
console.log('Parsed data:');
console.log(JSON.stringify(parsed, null, 2));
console.log();

// Example 2: Serialization
console.log('Example 2: Serialization');
console.log('-'.repeat(50));

const data = [
  ['Product', 'Price', 'Description'],
  ['Widget', '$19.99', 'A useful widget'],
  ['Gadget', '$29.99', 'Multi-line\ndescription\nfor gadget'],
  ['Doohickey', '$9.99', '']
];

const serialized = nsv.stringify(data);
console.log('Data:');
console.log(JSON.stringify(data, null, 2));
console.log('\nSerialized NSV:');
console.log(serialized);
console.log();

// Example 3: Round-trip conversion
console.log('Example 3: Round-trip Conversion');
console.log('-'.repeat(50));

const original = [
  ['name', 'value'],
  ['backslash', 'C:\\Program Files\\App'],
  ['newlines', 'Line 1\nLine 2\nLine 3'],
  ['empty', '']
];

const nsvText = nsv.stringify(original);
const roundTrip = nsv.parse(nsvText);

console.log('Original:', JSON.stringify(original));
console.log('After round-trip:', JSON.stringify(roundTrip));
console.log('Match:', JSON.stringify(original) === JSON.stringify(roundTrip) ? '✓' : '✗');
console.log();

// Example 4: Working with Writer (async)
console.log('Example 4: Incremental Writing');
console.log('-'.repeat(50));

async function writerExample() {
  const { Writable } = require('stream');

  // Create a writable stream that collects data
  let output = '';
  const stream = new Writable({
    write(chunk, encoding, callback) {
      output += chunk.toString();
      callback();
    }
  });

  const writer = new nsv.Writer(stream);

  await writer.writeRow(['Header 1', 'Header 2', 'Header 3']);
  await writer.writeRow(['Row 1 A', 'Row 1 B', 'Row 1 C']);
  await writer.writeRow(['Row 2 A', 'Row 2 B', 'Row 2 C']);

  console.log('Written NSV:');
  console.log(output);
}

writerExample().then(() => {
  // Example 5: Working with Reader (async)
  console.log('Example 5: Incremental Reading');
  console.log('-'.repeat(50));

  return (async function readerExample() {
    const testData = 'a\nb\nc\n\nd\ne\nf\n\ng\nh\ni\n';

    const reader = new nsv.Reader(testData);

    console.log('Reading rows one at a time:');
    let rowNum = 1;
    let row;
    while ((row = await reader.readRow()) !== null) {
      console.log(`  Row ${rowNum}:`, row);
      rowNum++;
    }
  })();
}).then(() => {
  // Example 6: Async iteration
  console.log('\nExample 6: Async Iteration');
  console.log('-'.repeat(50));

  return (async function asyncIterationExample() {
    const testData = 'x\ny\n\np\nq\n';

    const reader = new nsv.Reader(testData);

    console.log('Using for-await-of:');
    for await (const row of reader) {
      console.log('  Row:', row);
    }
  })();
}).then(() => {
  console.log('\n' + '='.repeat(50));
  console.log('All examples completed!');
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
