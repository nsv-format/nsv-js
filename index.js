/**
 * NSV (Newline-Separated Values) format parser and serializer
 *
 * NSV is a plain text data format for sequences of sequences.
 * - Single newlines separate cells within a row
 * - Double newlines separate rows
 * - Backslash escapes: \\ for \, \n for newline, \ for empty cell
 *
 * Encoding: NSV structure is byte-level — only 0x0A, 0x5C, 0x6E are
 * significant — with no encoding assumption: the format works over any
 * ASCII-compatible encoding. As in the other implementations (cf. Rust's
 * decode_bytes / byte-level streaming Reader), this library never decodes
 * for you: string input is parsed as given, and Buffer chunks are
 * transported as raw bytes (latin1, the byte-identity decoding). Callers
 * wanting decoded text should decode themselves (e.g.
 * stream.setEncoding('utf8')) or re-encode cells with
 * Buffer.from(cell, 'latin1') and decode as they see fit.
 */

/**
 * Unescape NSV-encoded string
 * @param {string} str - The escaped string
 * @returns {string} The unescaped string
 */
function unescape(str) {
  if (str === '\\') {
    return '';
  }

  let result = '';
  let i = 0;

  while (i < str.length) {
    if (str[i] === '\\') {
      if (i + 1 < str.length) {
        const next = str[i + 1];
        if (next === '\\') {
          result += '\\';
          i += 2;
        } else if (next === 'n') {
          result += '\n';
          i += 2;
        } else {
          // Unknown escape sequence - pass through literal backslash
          result += str[i];
          i += 1;
        }
      } else {
        // Dangling backslash at end - strip it per spec
        i += 1;
      }
    } else {
      result += str[i];
      i += 1;
    }
  }

  return result;
}

/**
 * Escape string for NSV encoding
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
function escape(str) {
  if (str === '') {
    return '\\';
  }

  return str
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n');
}

/**
 * Parse NSV string into array of arrays
 * @param {string} text - NSV formatted string
 * @returns {string[][]} Array of rows, each row is an array of cells
 */
function parse(text) {
  if (!text) {
    return [];
  }

  // Use same algorithm as Python/Scala/Rust implementations
  const data = [];
  let row = [];
  let start = 0;

  for (let pos = 0; pos < text.length; pos++) {
    if (text[pos] === '\n') {
      if (pos - start >= 1) {
        // There's content before this newline - it's a cell
        row.push(unescape(text.substring(start, pos)));
      } else {
        // Empty line - row is complete
        data.push(row);
        row = [];
      }
      start = pos + 1;
    }
  }

  // Handle any remaining content after the last newline
  if (start < text.length) {
    row.push(unescape(text.substring(start)));
  }

  // Append final row if it has content
  if (row.length > 0) {
    data.push(row);
  }

  return data;
}

/**
 * Serialize array of arrays to NSV string
 * @param {string[][]} data - Array of rows to serialize
 * @returns {string} NSV formatted string
 */
function stringify(data) {
  // Use same algorithm as Python/Scala/Rust: build lines array
  const lines = [];

  for (const row of data) {
    for (const cell of row) {
      lines.push(escape(cell));
    }

    // Empty string represents row terminator
    lines.push('');
  }

  // Join all lines with newline
  return lines.map(line => line + '\n').join('');
}

/**
 * Parse NSV from a readable stream or string
 * @param {NodeJS.ReadableStream|string} input - Stream or string to parse
 * @returns {Promise<string[][]>} Promise resolving to parsed data
 */
async function read(input) {
  if (typeof input === 'string') {
    return parse(input);
  }

  // Handle stream
  const chunks = [];

  return new Promise((resolve, reject) => {
    // Buffer chunks are bytes, not text: latin1 is the byte-identity
    // decoding, so this is safe at any chunk boundary and assumes no
    // encoding (see module header).
    input.on('data', chunk => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('latin1'));
    });
    input.on('end', () => {
      const text = chunks.join('');
      try {
        resolve(parse(text));
      } catch (error) {
        reject(error);
      }
    });
    input.on('error', reject);
  });
}

/**
 * Serialize data to NSV and write to stream
 * @param {string[][]} data - Data to serialize
 * @param {NodeJS.WritableStream} output - Stream to write to
 * @returns {Promise<void>} Promise that resolves when writing is complete
 */
async function write(data, output) {
  const text = stringify(data);

  return new Promise((resolve, reject) => {
    output.write(text, 'utf8', (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Create a writer for incrementally writing NSV rows
 */
class Writer {
  /**
   * @param {NodeJS.WritableStream} stream - The stream to write to
   */
  constructor(stream) {
    this.stream = stream;
  }

  /**
   * Write a single row
   * @param {string[]} row - Array of cell values
   * @returns {Promise<void>}
   */
  async writeRow(row) {
    // Write each cell followed by newline
    for (const cell of row) {
      this.stream.write(escape(cell) + '\n');
    }

    // Write row terminator (empty line)
    return new Promise((resolve, reject) => {
      this.stream.write('\n', 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Write multiple rows
   * @param {string[][]} rows - Array of rows
   * @returns {Promise<void>}
   */
  async writeRows(rows) {
    for (const row of rows) {
      await this.writeRow(row);
    }
  }
}

/**
 * Create a reader for incrementally reading NSV rows
 * Truly streams data - parses rows as chunks arrive without buffering entire input
 */
class Reader {
  /**
   * @param {NodeJS.ReadableStream|string} input - Stream or string to read from
   */
  constructor(input) {
    this.input = input;
    this._buffer = '';
    this._currentRow = [];
    this._rowQueue = [];
    this._done = false;
    this._started = false;
    this._error = null;
  }

  /**
   * Start streaming if not already started
   * @private
   */
  _start() {
    if (this._started) return;
    this._started = true;

    // If input is a string, process it directly
    if (typeof this.input === 'string') {
      this._processChunk(this.input);
      this._finalize();
      return;
    }

    // Otherwise set up stream handlers
    this.input.on('data', (chunk) => {
      try {
        // Buffer chunks are bytes, not text: latin1 is the byte-identity
        // decoding, so this is safe at any chunk boundary and assumes no
        // encoding (see module header).
        const text = typeof chunk === 'string' ? chunk : chunk.toString('latin1');
        this._processChunk(text);
      } catch (error) {
        this._error = error;
      }
    });

    this.input.on('end', () => {
      this._finalize();
    });

    this.input.on('error', (error) => {
      this._error = error;
    });
  }

  /**
   * Process a chunk of text, extracting complete rows
   * @private
   */
  _processChunk(text) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '\n') {
        if (this._buffer.length === 0) {
          // Empty line - row complete
          this._rowQueue.push(this._currentRow);
          this._currentRow = [];
        } else {
          // Content before this newline - it's a cell
          this._currentRow.push(unescape(this._buffer));
          this._buffer = '';
        }
      } else {
        // Regular character
        this._buffer += char;
      }
    }
  }

  /**
   * Finalize parsing when stream ends
   * @private
   */
  _finalize() {
    // Handle any remaining buffered content
    if (this._buffer.length > 0) {
      this._currentRow.push(unescape(this._buffer));
    }

    // Add final row if it has content
    if (this._currentRow.length > 0) {
      this._rowQueue.push(this._currentRow);
    }

    this._done = true;
  }

  /**
   * Read next row
   * @returns {Promise<string[]|null>} Next row or null if no more rows
   */
  async readRow() {
    this._start();

    // Wait for a row to be available or stream to finish
    while (this._rowQueue.length === 0 && !this._done) {
      if (this._error) throw this._error;
      // Wait a tick for more data
      await new Promise(resolve => setImmediate(resolve));
    }

    if (this._error) throw this._error;

    if (this._rowQueue.length > 0) {
      return this._rowQueue.shift();
    }

    return null;
  }

  /**
   * Read all remaining rows
   * @returns {Promise<string[][]>} All remaining rows
   */
  async readRows() {
    this._start();

    const rows = [];
    let row;
    while ((row = await this.readRow()) !== null) {
      rows.push(row);
    }
    return rows;
  }

  /**
   * Async iterator support
   */
  async *[Symbol.asyncIterator]() {
    this._start();

    let row;
    while ((row = await this.readRow()) !== null) {
      yield row;
    }
  }
}

/**
 * Flatten groups into a sequence with sentinel terminators.
 *
 * spill('', [['a', 'b'], ['c']]) → ['a', 'b', '', 'c', '']
 * spill('\n', ['abc', 'de'])     → [...'abc', '\n', ...'de', '\n']
 *
 * @template T
 * @param {T} sentinel - The sentinel value to use as terminator
 * @param {T[][]} groups - The groups to flatten
 * @returns {T[]} The flattened sequence with sentinel terminators
 */
function spill(sentinel, groups) {
  const result = [];
  for (const group of groups) {
    for (const element of group) {
      result.push(element);
    }
    result.push(sentinel);
  }
  return result;
}

/**
 * Split a sequence on a sentinel into groups (inverse of spill).
 *
 * unspill('', ['a', 'b', '', 'c', '']) → [['a', 'b'], ['c']]
 *
 * @template T
 * @param {T} sentinel - The sentinel value to split on
 * @param {T[]} sequence - The flat sequence to split
 * @returns {T[][]} The recovered groups
 */
function unspill(sentinel, sequence) {
  const groups = [];
  let current = [];
  for (const element of sequence) {
    if (element === sentinel) {
      groups.push(current);
      current = [];
    } else {
      current.push(element);
    }
  }
  // Any remaining elements form an unterminated group
  if (current.length > 0 || groups.length === 0) {
    groups.push(current);
  }
  return groups;
}

// Export API
module.exports = {
  parse,
  stringify,
  escape,
  unescape,
  read,
  write,
  Writer,
  Reader,
  spill,
  unspill,
};
