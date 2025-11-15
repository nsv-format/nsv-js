/**
 * NSV (Newline-Separated Values) format parser and serializer
 *
 * NSV is a plain text data format for sequences of sequences.
 * - Single newlines separate cells within a row
 * - Double newlines separate rows
 * - Backslash escapes: \\ for \, \n for newline, \ for empty cell
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
    if (str[i] === '\\' && i + 1 < str.length) {
      const next = str[i + 1];
      if (next === '\\') {
        result += '\\';
        i += 2;
      } else if (next === 'n') {
        result += '\n';
        i += 2;
      } else {
        // Unknown escape sequence - treat backslash literally
        result += str[i];
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

  // Remove trailing newlines for consistent parsing
  const trimmed = text.replace(/\n+$/, '');

  if (trimmed === '') {
    return [];
  }

  // Split by double newlines to get rows
  const rows = trimmed.split('\n\n');

  return rows.map(row => {
    // Split by single newlines to get cells
    const cells = row.split('\n');
    return cells.map(unescape);
  });
}

/**
 * Serialize array of arrays to NSV string
 * @param {string[][]} data - Array of rows to serialize
 * @returns {string} NSV formatted string
 */
function stringify(data) {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array');
  }

  return data
    .map(row => {
      if (!Array.isArray(row)) {
        throw new TypeError('Each row must be an array');
      }

      return row
        .map(cell => {
          if (typeof cell !== 'string') {
            throw new TypeError('Each cell must be a string');
          }
          return escape(cell);
        })
        .join('\n');
    })
    .join('\n\n') + (data.length > 0 ? '\n' : '');
}

/**
 * Parse NSV from a readable stream or string
 * @param {NodeJS.ReadableStream|string} input - Stream or string to parse
 * @returns {Promise<string[][]>} Promise resolving to parsed data
 */
async function load(input) {
  if (typeof input === 'string') {
    return parse(input);
  }

  // Handle stream
  const chunks = [];

  return new Promise((resolve, reject) => {
    input.on('data', chunk => chunks.push(chunk));
    input.on('end', () => {
      // Handle both Buffer and string chunks
      const text = chunks.map(chunk =>
        typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      ).join('');
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
async function dump(data, output) {
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
    this.firstRow = true;
  }

  /**
   * Write a single row
   * @param {string[]} row - Array of cell values
   * @returns {Promise<void>}
   */
  async writeRow(row) {
    if (!Array.isArray(row)) {
      throw new TypeError('Row must be an array');
    }

    const escapedCells = row.map(cell => {
      if (typeof cell !== 'string') {
        throw new TypeError('Each cell must be a string');
      }
      return escape(cell);
    });

    const rowText = escapedCells.join('\n');
    const textToWrite = this.firstRow ? rowText + '\n' : '\n' + rowText + '\n';

    return new Promise((resolve, reject) => {
      this.stream.write(textToWrite, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          this.firstRow = false;
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
 */
class Reader {
  /**
   * @param {NodeJS.ReadableStream|string} input - Stream or string to read from
   */
  constructor(input) {
    this.input = input;
    this._data = null;
    this._index = 0;
  }

  /**
   * Load data if not already loaded
   * @private
   */
  async _ensureLoaded() {
    if (this._data === null) {
      this._data = await load(this.input);
    }
  }

  /**
   * Read next row
   * @returns {Promise<string[]|null>} Next row or null if no more rows
   */
  async readRow() {
    await this._ensureLoaded();

    if (this._index >= this._data.length) {
      return null;
    }

    return this._data[this._index++];
  }

  /**
   * Read all remaining rows
   * @returns {Promise<string[][]>} All remaining rows
   */
  async readRows() {
    await this._ensureLoaded();

    const result = this._data.slice(this._index);
    this._index = this._data.length;
    return result;
  }

  /**
   * Async iterator support
   */
  async *[Symbol.asyncIterator]() {
    await this._ensureLoaded();

    while (this._index < this._data.length) {
      yield this._data[this._index++];
    }
  }
}

// Export API
module.exports = {
  parse,
  stringify,
  load,
  dump,
  Writer,
  Reader,

  // Convenience aliases
  loads: parse,
  dumps: stringify,
};
