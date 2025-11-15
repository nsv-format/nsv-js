/// <reference types="node" />

import { Readable, Writable } from 'stream';

export type NSVData = string[][];
export type NSVRow = string[];

/**
 * Parse NSV string into array of arrays
 * @param text - NSV formatted string
 * @returns Array of rows, each row is an array of cells
 */
export function parse(text: string): NSVData;

/**
 * Serialize array of arrays to NSV string
 * @param data - Array of rows to serialize
 * @returns NSV formatted string
 */
export function stringify(data: NSVData): string;

/**
 * Parse NSV from a readable stream or string
 * @param input - Stream or string to parse
 * @returns Promise resolving to parsed data
 */
export function load(input: Readable | string): Promise<NSVData>;

/**
 * Serialize data to NSV and write to stream
 * @param data - Data to serialize
 * @param output - Stream to write to
 * @returns Promise that resolves when writing is complete
 */
export function dump(data: NSVData, output: Writable): Promise<void>;

/**
 * Writer for incrementally writing NSV rows
 */
export class Writer {
  constructor(stream: Writable);

  /**
   * Write a single row
   * @param row - Array of cell values
   */
  writeRow(row: NSVRow): Promise<void>;

  /**
   * Write multiple rows
   * @param rows - Array of rows
   */
  writeRows(rows: NSVData): Promise<void>;
}

/**
 * Reader for incrementally reading NSV rows
 */
export class Reader {
  constructor(input: Readable | string);

  /**
   * Read next row
   * @returns Next row or null if no more rows
   */
  readRow(): Promise<NSVRow | null>;

  /**
   * Read all remaining rows
   * @returns All remaining rows
   */
  readRows(): Promise<NSVData>;

  /**
   * Async iterator support
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<NSVRow>;
}

/**
 * Alias for parse()
 */
export const loads: typeof parse;

/**
 * Alias for stringify()
 */
export const dumps: typeof stringify;
