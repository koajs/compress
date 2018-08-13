# Koa Compress

[![Build Status](https://travis-ci.org/koajs/compress.svg?branch=master)](https://travis-ci.org/koajs/compress)
[![codecov](https://codecov.io/gh/koajs/compress/branch/master/graph/badge.svg)](https://codecov.io/gh/koajs/compress)
[![Greenkeeper badge](https://badges.greenkeeper.io/koajs/compress.svg)](https://greenkeeper.io/)

Compress middleware for Koa

## Example

```js
var compress = require('koa-compress')
var Koa = require('koa')

var app = new Koa()
app.use(compress({
  filter: function (content_type) {
  	return /text/i.test(content_type)
  },
  threshold: 2048,
  flush: require('zlib').Z_SYNC_FLUSH
}))
```

## Options

### encoding

`options[encoding]` values are passed to the respective library for the encoding.  If unspecified, will fallback to passing the full `options` object maintaining backwards compatability.

- `options.gzip` - passed to `zlib`: http://nodejs.org/api/zlib.html#zlib_options
- `options.deflate` - passed to `zlib`: http://nodejs.org/api/zlib.html#zlib_options

#### brotli support

Brotli support requires you add the optional dependency of `iltorb` as well as a `br` object under options.  It is recommended to only enable `brotli` support when using an output cache as the time may be significantly slower than `gzip`.

- `options.br` - passed to `iltorb`: https://www.npmjs.com/package/iltorb#brotliencodeparams

### filter

An optional function that checks the response content type to decide whether to compress.
By default, it uses [compressible](https://github.com/expressjs/compressible).

### threshold

Minimum response size in bytes to compress.
Default `1024` bytes or `1kb`.

## Manually turning compression on and off

You can always enable compression by setting `this.compress = true`.
You can always disable compression by setting `this.compress = false`.
This bypasses the filter check.

```js
app.use((ctx, next) => {
  ctx.compress = true
  ctx.body = fs.createReadStream(file)
})
```
