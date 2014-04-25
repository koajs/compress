/**
 * Module dependencies.
 */

var compressible = require('compressible')
var isJSON = require('koa-is-json')
var status = require('statuses')
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
    if (!body) return
    if (this.compress === false) return
    if (this.request.method === 'HEAD') return
    if (status.empty[this.response.status]) return
    if (this.response.get('Content-Encoding')) return

    // forced compression or implied
    if (!(this.compress === true || filter(this.response.type))) return

    // identity
    var encoding = this.acceptsEncodings('gzip', 'deflate', 'identity')
    if (!encoding) this.throw(406, 'supported encodings: gzip, deflate, identity')
    if (encoding === 'identity') return

    // json
    if (isJSON(body)) body = this.body = JSON.stringify(body)

    // threshold
    if (threshold && this.response.length < threshold) return

    this.set('Content-Encoding', encoding)
    this.res.removeHeader('Content-Length')

    var stream =
    this.body = encodingMethods[encoding](options)

    if (body instanceof Stream) {
      body.pipe(stream)
    } else {
      stream.end(body)
    }
  }
}
