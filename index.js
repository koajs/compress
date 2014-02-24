/**
 * Module dependencies.
 */

var compressible = require('compressible')
var Stream = require('stream')
var bytes = require('bytes')
var zlib = require('zlib')

/**
 * Encoding methods supported.
 */

var encodingMethods = {
  gzip: zlib.createGzip,
  deflate: zlib.createDeflate
}

/**
 * Compress middleware.
 *
 * @param {Object} [options]
 * @return {Function}
 * @api public
 */

module.exports = function (options) {
  options = options || {}

  var filter = options.filter || compressible

  var threshold = !options.threshold ? 1024
    : typeof options.threshold === 'number' ? options.threshold
    : typeof options.threshold === 'string' ? bytes(options.threshold)
    : 1024

  return function* compress(next) {
    this.vary('Accept-Encoding')

    yield* next

    var body = this.body

    if (this.compress === false
      || this.method === 'HEAD'
      || this.status === 204
      || this.status === 304
      // Assumes you either always set a body or always don't
      || body == null
    ) return

    // forced compression or implied
    if (!(this.compress === true || filter(this.response.type))) return

    // identity
    var encoding = this.acceptsEncodings('gzip', 'deflate', 'identity')
    if (!encoding) this.throw(406, 'supported encodings: gzip, deflate, identity')
    if (encoding === 'identity') return

    // threshold
    if (threshold && this.response.length < threshold) return

    // json
    if (isJSON(body)) {
      body = JSON.stringify(body)
      if (threshold && body.length < threshold) return
    }

    this.set('Content-Encoding', encoding)
    this.res.removeHeader('Content-Length')

    var stream = encodingMethods[encoding](options)

    if (body instanceof Stream) {
      body.on('error', this.onerror).pipe(stream)
    } else {
      stream.end(body)
    }

    this.body = stream
  }
}

/**
 * Check if `obj` should be interpreted as json.
 *
 * TODO: lame... ctx.responseType?
 */

function isJSON(obj) {
  if ('string' == typeof obj) return false;
  if (obj instanceof Stream) return false;
  if (Buffer.isBuffer(obj)) return false;
  return true;
}
