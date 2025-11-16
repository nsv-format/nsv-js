const nsv = require('./index');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Use NSV_RUST_VERSION env var if set, otherwise default to 0.0.3
const nsvVersion = process.env.NSV_RUST_VERSION || '0.0.3';

// Test cases
const tests = [
  { name: 'simple table', input: 'a\nb\n\nc\nd\n' },
  { name: 'four newlines', input: '\n\n\n\n' },
  { name: 'double newline then first', input: '\n\nfirst\n' },
  { name: 'first, triple newline, second', input: 'first\n\n\n\nsecond\n' },
  { name: 'empty cell token', input: '\\\n' },
  { name: 'text with dangling backslash', input: 'text\\\n' },
  { name: 'unknown escape sequence', input: 'test\\x41\n' },
  { name: 'spec example', input: 'Tab\\tseparated\\tvalues\\n(would be left as-is normally)\n' },
  { name: 'mixed escapes', input: 'Roses are red\\nViolets are blue\\nThis may be pain\\nBut CSV would be, too\n' },
  { name: 'empty rows', input: '\n\na\n\n\n' },
  { name: 'trailing newlines', input: 'a\n\n\n' },
  { name: 'complex example', input: 'first\nrow\n\nsecond\nrow\n\nmissing ->\n\\\n<- missing\n\nRoses are red\\nViolets are blue\\nThis may be pain\\nBut CSV would be, too\nTab\\tseparated\\tvalues\\n(would be left as-is normally)\nNot a newline: \\\\n\n' },
];

console.log(`Cross-testing JS implementation against Rust (crates.io ${nsvVersion})\n`);
console.log('='.repeat(60) + '\n');

let passCount = 0;
let failCount = 0;

// Create a temporary Rust program to use the nsv crate
const rustTestProgram = `
use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();

    let result = nsv::loads(&input);

    // Output as JSON for comparison
    println!("{}", serde_json::to_string(&result).unwrap());
}
`;

const cargoToml = `
[package]
name = "nsv-test"
version = "0.1.0"
edition = "2021"

[dependencies]
nsv = "${nsvVersion}"
serde_json = "1"
serde = { version = "1", features = ["derive"] }
`;

// Create temporary directory for Rust test
const tmpDir = '/tmp/nsv-rust-test';
try {
  execSync(`rm -rf ${tmpDir}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'Cargo.toml'), cargoToml);
  fs.writeFileSync(path.join(tmpDir, 'src', 'main.rs'), rustTestProgram);

  console.log('Building Rust test program...');
  execSync('cargo build --release --quiet', { cwd: tmpDir, stdio: 'inherit' });
  console.log('');
} catch (e) {
  console.error('Failed to build Rust test program:', e.message);
  console.error('Skipping Rust cross-tests');
  process.exit(1);
}

const rustBinary = path.join(tmpDir, 'target', 'release', 'nsv-test');

for (const test of tests) {
  let rustResult;
  try {
    const output = execSync(rustBinary, {
      input: test.input,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    rustResult = JSON.parse(output.trim());
  } catch (e) {
    console.error(`✗ ${test.name}`);
    console.error(`  Error: ${e.message}`);
    failCount++;
    continue;
  }

  // Run JS implementation
  const jsResult = nsv.parse(test.input);

  // Compare
  const match = JSON.stringify(jsResult) === JSON.stringify(rustResult);

  if (match) {
    console.log(`✓ ${test.name}`);
    passCount++;
  } else {
    console.log(`✗ ${test.name}`);
    console.log(`  Input: ${JSON.stringify(test.input)}`);
    console.log(`  Rust: ${JSON.stringify(rustResult)}`);
    console.log(`  JS:   ${JSON.stringify(jsResult)}`);
    failCount++;
  }
}

// Cleanup
execSync(`rm -rf ${tmpDir}`);

console.log('\n' + '='.repeat(60));
console.log(`Results: ${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
