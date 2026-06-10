/// <reference types="node" />

import { Readable, Writable } from 'stream';

/**
 * Escape string for NSV encoding
 * @param str - The string to escape
 * @returns The escaped string
 */
export function escape(str: string): string;

/**
 * Unescape NSV-encoded string
 * @param str - The escaped string
 * @returns The unescaped string
 */
export function unescape(str: string): string;

/**
 * Flatten groups into a sequence with sentinel terminators.
 * @param sentinel - The sentinel value to use as terminator
 * @param groups - The groups to flatten
 * @returns The flattened sequence with sentinel terminators
 */
export function spill<T>(sentinel: T, groups: T[][]): T[];

/**
 * Split a sequence on a sentinel into groups (inverse of spill).
 * @param sentinel - The sentinel value to split on
 * @param sequence - The flat sequence to split
 * @returns The recovered groups
 */
export function unspill<T>(sentinel: T, sequence: T[]): T[][];

/**
 * Parse NSV string into array of arrays
 * @param text - NSV formatted string
 * @returns Array of rows, each row is an array of cells
 */
export function parse(text: string): string[][];

/**
 * Serialize array of arrays to NSV string
 * @param data - Array of rows to serialize
 * @returns NSV formatted string
 */
export function stringify(data: string[][]): string;

/**
 * Parse NSV from a readable stream or string
 * @param input - Stream or string to parse
 * @returns Promise resolving to parsed data
 */
export function read(input: Readable | string): Promise<string[][]>;

/**
 * Serialize data to NSV and write to stream
 * @param data - Data to serialize
 * @param output - Stream to write to
 * @returns Promise that resolves when writing is complete
 */
export function write(data: string[][], output: Writable): Promise<void>;

/**
 * Writer for incrementally writing NSV rows
 */
export class Writer {
  constructor(stream: Writable);

  /**
   * Write a single row
   * @param row - Array of cell values
   */
  writeRow(row: string[]): Promise<void>;

  /**
   * Write multiple rows
   * @param rows - Array of rows
   */
  writeRows(rows: string[][]): Promise<void>;
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
  readRow(): Promise<string[] | null>;

  /**
   * Raw encoded text of the row in progress, as consumed so far
   * @returns The unparsed text; empty when there is none
   */
  partial(): string;

  /**
   * Read all remaining rows
   * @returns All remaining rows
   */
  readRows(): Promise<string[][]>;

  /**
   * Async iterator support
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<string[]>;
}
