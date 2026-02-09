import type { BrotliOptions, ZlibOptions, ZstdOptions } from "node:zlib";
import type Koa = require("koa");

/**
 * Function to calculate a threshold value dynamically from a MIME type,
 * an existing size and the current context.
 */
export type ThresholdFunction = (
  /** MIME type of the response */
  type: string,
  /** Size of the response in bytes */
  size: number,
  /** Context of the request */
  ctx: Koa.Context,
) => number | string | ThresholdFunction;

/**
 * Function to calculate compression parameters for `deflate` and `gzip` from a MIME type,
 * an exisiting size and the current context.
 */
export type ZlibOptionsFunction = (
  /** MIME type of the response */
  type: string,
  /** Size of the response in bytes */
  size: number,
  /** Context of the request */
  ctx: Koa.Context,
) => boolean | null | ZlibOptions | ZlibOptionsFunction;

/**
 * Function to calculate compression parameters for `brotli` from a MIME type,
 * an exisiting size and the current context.
 */
export type BrotliOptionsFunction = (
  /** MIME type of the response */
  type: string,
  /** Size of the response in bytes */
  size: number,
  /** Context of the request */
  ctx: Koa.Context,
) => boolean | null | BrotliOptions | BrotliOptionsFunction;

/**
 * Function to calculate compression parameters for `zstd` from a MIME type,
 * an exisiting size and the current context.
 */
export type ZstdOptionsFunction = (
  /** MIME type of the response */
  type: string,
  /** Size of the response in bytes */
  size: number,
  /** Context of the request */
  ctx: Koa.Context,
) => boolean | null | ZstdOptions | ZstdOptionsFunction;

/**
 * Compression options that govern how `koa/compress` handles responses.
 */
export type CompressOptions = {
  /**
   * Function to determine if compression should be applied.
   * Default: `compressible()`.
   * @param type MIME type of the response
   * @returns `true` if compression should be applied, `false` otherwise
   */
  filter?: (type: string) => boolean;
  /**
   * Lower limit to apply compression to content. If it is a number, it is size in bytes,
   * if it is a string, it is a human-readable size accepted by `bytes()`, e.g., `"1mb"`,
   * or a `ThresholdFunction` that can calculate that value. Default: `1024`.
   */
  threshold?: number | string | ThresholdFunction;
  /**
   * Default value for `Accept-Encoding` header, if it is not supplied by the client.
   * Default: `"identity"`.
   */
  defaultEncoding?: string;
  /**
   * What `Accept-Encoding` value should be assumed if it is set to `"*"`. Default: `"gzip"`.
   */
  wildcardAcceptEncoding?: string;
  /**
   * An array of compression types, which should be used when we have multiple choices
   * with the same weight. An item with a lower index has higher priority.
   * Default: `['zstd', 'br', 'gzip', 'deflate']`.
   */
  encodingPreference?: string[];
  /**
   * Options to use when compressing with `deflate()`.
   * If it is `false` or `null` this compression should be disabled.
   * It can be a function used to calculate such values.
   * Default: `{}`.
   */
  deflate?: boolean | null | ZlibOptions | ZlibOptionsFunction;
  /**
   * Options to use when compressing with `gzip()`.
   * If it is `false` or `null` this compression should be disabled.
   * It can be a function used to calculate such values.
   * Default: `{}`.
   */
  gzip?: boolean | null | ZlibOptions | ZlibOptionsFunction;
  /**
   * Options to use when compressing with `br()`.
   * If it is `false` or `null` this compression should be disabled.
   * It can be a function used to calculate such values.
   * Default: `{[zlib.constants.BROTLI_PARAM_QUALITY]: 4}`.
   */
  br?: boolean | null | BrotliOptions | BrotliOptionsFunction;
  /**
   * Options to use when compressing with `zstd()`.
   * If it is `false` or `null` this compression should be disabled.
   * It can be a function used to calculate such values.
   * Default: `{}`.
   */
  zstd?: boolean | null | ZstdOptions | ZstdOptionsFunction;
};

/**
 * The main function that constructs a middleware for compressing responses.
 * @param options sets the default way to handle compression.
 * @returns a middleware function that compresses responses.
 */
declare function compress(options: CompressOptions = {}): Koa.Middleware;

declare module "koa" {
  interface DefaultContext {
    /**
     * Context property used to handle individual responses.
     * If it is set to `false`, the compression is disabled.
     * If it is an object, it is mixed with the default options overriding
     * its properties for this request.
     */
    compress?: boolean | CompressOptions;
  }
}

export = compress;
