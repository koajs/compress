# Koa Compress

[![Node.js CI](https://github.com/koajs/compress/workflows/Node.js%20CI/badge.svg?branch=master)](https://github.com/koajs/compress/actions?query=workflow%3A%22Node.js+CI%22+branch%3Amaster)
[![codecov](https://codecov.io/gh/koajs/compress/branch/master/graph/badge.svg)](https://codecov.io/gh/koajs/compress)

Compress middleware for Koa

## Example

```js
const compress = require("koa-compress");
const Koa = require("koa");

const app = new Koa();
app.use(
  compress({
    filter(content_type) {
      return /text/i.test(content_type);
    },
    threshold: 2048,
    gzip: {
      flush: require("zlib").constants.Z_SYNC_FLUSH,
    },
    deflate: {
      flush: require("zlib").constants.Z_SYNC_FLUSH,
    },
    zstd: {
      flush: require("zlib").constants.Z_SYNC_FLUSH,
    },
    br: false, // disable brotli
  }),
);
```

## Maintainers

- Lead: @jonathanong [@jongleberry](https://twitter.com/jongleberry)
- Team: @koajs/compress

## Options

### filter\<Function\>

```ts
function (mimeType: string): boolean {}
```

A predicate that checks the response MIME type to decide whether to compress.
Default: [compressible](https://github.com/jshttp/compressible).

### options.threshold\<String|Number|Function\>

Minimum response size in bytes to compress.
Can also be a string parsed by `bytes()` (e.g. `"1kb"`) or a function (see [Functional properties](#functional-properties)).
Default: `1024`.

### options[encoding]\<Object|Function\>

Supported encodings in default preference order: `zstd`, `br`, `gzip`, `deflate`.
Setting `options[encoding] = {}` passes those options to the corresponding `zlib` compressor.
Setting `options[encoding] = false` disables that encoding.

Can also be a function (see [Functional properties](#functional-properties)).

#### options.br

[Brotli compression](https://en.wikipedia.org/wiki/Brotli) is available natively in all supported Node.js versions.
The default quality level is 4 for performance reasons.

#### options.zstd

[Zstandard compression](https://en.wikipedia.org/wiki/Zstandard) is natively supported starting from Node.js v22.15.0 (LTS) and v23.8.0 (Current). The middleware detects `zlib.createZstdCompress` at runtime; if available, zstd is enabled automatically, otherwise it is skipped.

### options.defaultEncoding\<String\>

Encoding assumed when the client sends no
[Accept-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding) header.
Default: `"identity"` (no compression).

The HTTP spec treats a missing header as `*` (any encoding is acceptable),
but that causes problems when debugging with tools like `curl` or `wget`.
Set `defaultEncoding` to `"*"` to restore spec-compliant behavior.

## Manually turning compression on and off

You can force compression by setting `ctx.compress = true` (bypasses the filter check).
You can disable compression by setting `ctx.compress = false`.

```js
app.use((ctx, next) => {
  ctx.compress = true;
  ctx.body = fs.createReadStream(file);
});
```

`ctx.compress` can also be an options object (same shape as the middleware options).
Its `threshold` and encoding properties override the global defaults for this response.
Note: an options object does **not** bypass the filter check — only `true` does.

## Functional properties

The `threshold` and per-encoding options can be functions. They are called
for every response with three arguments:

- `type` &mdash; same as `ctx.response.type`
- `size` &mdash; same as `ctx.response.length`
- `ctx` &mdash; the full Koa context object

The function should return a valid value for that property.
Returning another function of the same shape is allowed — it will be called in turn.

Example:

```js
app.use(
  compress({
    gzip: (type, size) => (size && size < 65536 ? { level: 9 } : false),
    br: (type, size) => size && size >= 65536,
  }),
);
```

See the Koa documentation for [`ctx`](https://koajs.com/#context) and [`ctx.response`](https://koajs.com/#response).
