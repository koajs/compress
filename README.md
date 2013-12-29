# Koa Compress [![Build Status](https://travis-ci.org/koajs/compress.png)](https://travis-ci.org/koajs/compress)

Compress middleware for Koa

## Example

```js
var compress = require('koa-compress')
var koa = require('koa')

var app = koa()
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

## Manually turning compression on and off

You can always enable compression by setting `this.compress = true`.
You can always disable compression by setting `this.compress = false`.
This bypasses the filter check.

```js
app.use(function (next) {
  return function *() {
    this.compress = true
    this.body = fs.createReadStream(file)
  }
})
```

## License

The MIT License (MIT)

Copyright (c) 2013 Jonathan Ong me@jongleberry.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
