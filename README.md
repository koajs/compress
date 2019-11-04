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

The options are passed to `zlib`: http://nodejs.org/api/zlib.html#zlib_options

### filter

An optional function that checks the response content type to decide whether to compress.
By default, it uses [compressible](https://github.com/expressjs/compressible).

### threshold

Minimum response size in bytes to compress.
Default `1024` bytes or `1kb`.

### brotliOptions

Koa Compress can use [Brotli compression](https://en.wikipedia.org/wiki/Brotli) on modern versions of Node
(at least from since v11.7.0), which includes it natively. By default it is a preferred compression method
if it is available and a user agent indicates its support by including `br` in `Accept-Encoding`
(subject to `filter` and `threshold` described above).

`brotliOptions` is the options object, which is passed to `zlib`: https://nodejs.org/api/zlib.html#zlib_class_brotlioptions

If it is set to `null` Brotli compression will be skipped falling back to `gzip` and `deflate` as usual.

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