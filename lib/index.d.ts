import type { BrotliOptions, ZlibOptions, ZstdOptions } from "node:zlib";
import type Koa = require("koa");

type ThresholdFunction = (
  type: string,
  size: number,
  ctx: Koa.Context,
) => number | string | ThresholdFunction;

type ZlibOptionsFunction = (
  type: string,
  size: number,
  ctx: Koa.Context,
) => boolean | null | ZlibOptions | ZlibOptionsFunction;

type BrotliOptionsFunction = (
  type: string,
  size: number,
  ctx: Koa.Context,
) => boolean | null | BrotliOptions | BrotliOptionsFunction;

type ZstdOptionsFunction = (
  type: string,
  size: number,
  ctx: Koa.Context,
) => boolean | null | ZstdOptions | ZstdOptionsFunction;

declare type CompressOptions = {
  filter?: (type: string) => boolean;
  threshold?: number | string | ThresholdFunction;
  defaultEncoding?: string;
  wildcardAcceptEncoding?: string;
  encodingPreference?: string[];
  deflate?: boolean | null | ZlibOptions | ZlibOptionsFunction;
  gzip?: boolean | null | ZlibOptions | ZlibOptionsFunction;
  br?: boolean | null | BrotliOptions | BrotliOptionsFunction;
  zstd?: boolean | null | ZstdOptions | ZstdOptionsFunction;
};

declare function compress(options: CompressOptions = {}): Koa.Middleware;

declare module "koa" {
  interface DefaultContext {
    compress?: boolean | CompressOptions;
  }
}

export = compress;
