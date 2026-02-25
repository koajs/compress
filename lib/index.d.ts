import type { BrotliOptions, ZlibOptions, ZstdOptions } from "node:zlib";
import type Koa = require("koa");

declare namespace compress {
  /**
   * Calculates a threshold value dynamically from the MIME type,
   * the response size, and the current context.
   */
  type ThresholdFunction = (
    /** MIME type of the response */
    type: string,
    /** Size of the response in bytes */
    size: number,
    /** Context of the request */
    ctx: Koa.Context,
  ) => number | string | ThresholdFunction;

  /**
   * Computes `deflate`/`gzip` compression options from the MIME type,
   * the response size, and the current context.
   */
  type ZlibOptionsFunction = (
    /** MIME type of the response */
    type: string,
    /** Size of the response in bytes */
    size: number,
    /** Context of the request */
    ctx: Koa.Context,
  ) => boolean | null | ZlibOptions | ZlibOptionsFunction;

  /**
   * Computes `brotli` compression options from the MIME type,
   * the response size, and the current context.
   */
  type BrotliOptionsFunction = (
    /** MIME type of the response */
    type: string,
    /** Size of the response in bytes */
    size: number,
    /** Context of the request */
    ctx: Koa.Context,
  ) => boolean | null | BrotliOptions | BrotliOptionsFunction;

  /**
   * Computes `zstd` compression options from the MIME type,
   * the response size, and the current context.
   */
  type ZstdOptionsFunction = (
    /** MIME type of the response */
    type: string,
    /** Size of the response in bytes */
    size: number,
    /** Context of the request */
    ctx: Koa.Context,
  ) => boolean | null | ZstdOptions | ZstdOptionsFunction;

  /**
   * Options for the `koa-compress` middleware.
   */
  type CompressOptions = {
    /**
     * Predicate that decides whether a given MIME type should be compressed.
     * Default: `compressible()`.
     * @param type - MIME type of the response
     * @returns `true` to compress, `false` to skip
     */
    filter?: (type: string) => boolean;
    /**
     * Minimum response size to compress. A number (bytes), a string
     * parsed by `bytes()` (e.g. `"1mb"`), or a {@link ThresholdFunction}.
     * Default: `1024`.
     */
    threshold?: number | string | ThresholdFunction;
    /**
     * Encoding assumed when the client sends no `Accept-Encoding` header.
     * Set to `"*"` for spec-compliant behavior. Default: `"identity"`.
     */
    defaultEncoding?: string;
    /**
     * Encoding to use when `Accept-Encoding` is `"*"`. Default: `"gzip"`.
     */
    wildcardAcceptEncoding?: string;
    /**
     * Preferred encoding order used to break ties among equally weighted
     * encodings. Lower index = higher priority.
     * Default: `['zstd', 'br', 'gzip', 'deflate', 'identity']`.
     */
    encodingPreference?: string[];
    /**
     * Options passed to `zlib.createDeflate()`, or `false`/`null` to disable.
     * Can be a {@link ZlibOptionsFunction} for per-response values.
     * Default: `{}`.
     */
    deflate?: boolean | null | ZlibOptions | ZlibOptionsFunction;
    /**
     * Options passed to `zlib.createGzip()`, or `false`/`null` to disable.
     * Can be a {@link ZlibOptionsFunction} for per-response values.
     * Default: `{}`.
     */
    gzip?: boolean | null | ZlibOptions | ZlibOptionsFunction;
    /**
     * Options passed to `zlib.createBrotliCompress()`, or `false`/`null` to disable.
     * Can be a {@link BrotliOptionsFunction} for per-response values.
     * Default: `{params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 4}}`.
     */
    br?: boolean | null | BrotliOptions | BrotliOptionsFunction;
    /**
     * Options passed to `zlib.createZstdCompress()`, or `false`/`null` to disable.
     * Can be a {@link ZstdOptionsFunction} for per-response values.
     * Default: `{}`.
     */
    zstd?: boolean | null | ZstdOptions | ZstdOptionsFunction;
  };

  /**
   * Per-encoding options: built-in defaults merged with user-supplied values.
   */
  type EncodingOptions = {
    [encoding: string]: BrotliOptions | ZlibOptions | ZstdOptions | undefined;
  };

  /**
   * Koa middleware with additional properties for introspection.
   */
  interface CompressMiddleware extends Koa.Middleware {
    /**
     * Supported content encodings available in the current Node.js runtime,
     * ordered by preference.
     */
    preferredEncodings: string[];
    /**
     * Resolved options for each supported encoding (built-in defaults
     * merged with user-provided values).
     */
    encodingOptions: EncodingOptions;
  }
}

/**
 * Creates a Koa middleware that compresses response bodies via content
 * negotiation. The returned function also exposes
 * {@link compress.CompressMiddleware.preferredEncodings | preferredEncodings} and
 * {@link compress.CompressMiddleware.encodingOptions | encodingOptions}.
 *
 * @param options - Compression options. See {@link compress.CompressOptions}.
 * @returns Koa middleware with introspection properties.
 */
declare function compress(options?: compress.CompressOptions): compress.CompressMiddleware;

declare module "koa" {
  interface DefaultContext {
    /**
     * Per-response compression override.
     * Set to `false` to disable compression, `true` to force it
     * (bypassing the filter), or a `CompressOptions` object whose
     * properties override the defaults for this response.
     */
    compress?: boolean | compress.CompressOptions;
  }
}

export = compress;
