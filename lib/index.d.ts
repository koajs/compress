import type { BrotliOptions, ZlibOptions, ZstdOptions } from "node:zlib";
import type Koa = require("koa");

declare namespace compress {
  /**
   * Function to calculate a threshold value dynamically from a MIME type,
   * an existing size and the current context.
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
   * Function to calculate compression parameters for `deflate` and `gzip` from a MIME type,
   * an existing size and the current context.
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
   * Function to calculate compression parameters for `brotli` from a MIME type,
   * an existing size and the current context.
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
   * Function to calculate compression parameters for `zstd` from a MIME type,
   * an existing size and the current context.
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
   * Compression options that govern how `koa/compress` handles responses.
   */
  type CompressOptions = {
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
     * Default: `['zstd', 'br', 'gzip', 'deflate', 'identity']`.
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
     * Default: `{params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 4}}`.
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
   * Encoding options computed by the middleware: default options merged with
   * user-provided options for each supported encoding.
   */
  type EncodingOptions = {
    [encoding: string]: BrotliOptions | ZlibOptions | ZstdOptions | undefined;
  };

  /**
   * Koa middleware function with additional properties exposed for introspection.
   */
  interface CompressMiddleware extends Koa.Middleware {
    /**
     * The list of supported content encodings, filtered to those available
     * in the current Node.js runtime. Encodings earlier in the list are
     * preferred when the client has no preference.
     */
    preferredEncodings: string[];
    /**
     * The resolved encoding options for each supported encoding.
     * Each entry is the result of merging the built-in defaults
     * with the user-provided options for that encoding.
     */
    encodingOptions: EncodingOptions;
  }
}

/**
 * Creates a Koa middleware that compresses response bodies using content
 * negotiation. The returned middleware function also exposes
 * {@link compress.CompressMiddleware.preferredEncodings | preferredEncodings} and
 * {@link compress.CompressMiddleware.encodingOptions | encodingOptions} for introspection.
 *
 * @param options - Compression options that set the default behavior.
 * @returns A Koa middleware function with additional properties.
 */
declare function compress(options?: compress.CompressOptions): compress.CompressMiddleware;

declare module "koa" {
  interface DefaultContext {
    /**
     * Context property used to handle individual responses.
     * If it is set to `false`, the compression is disabled.
     * If it is an object, it is mixed with the default options overriding
     * its properties for this request.
     */
    compress?: boolean | compress.CompressOptions;
  }
}

export = compress;
