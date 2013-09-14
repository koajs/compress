
/**
 * Module dependencies.
 */

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

  var filter = options.filter
    || /json|text|javascript|dart/i

  var threshold = !options.threshold ? 1024
    : typeof options.threshold === 'number' ? options.threshold
    : typeof options.threshold === 'string' ? bytes(options.threshold)
    : 1024

  return function compress(next) {
    return function *() {
      yield next

      this.vary('Accept-Encoding')

      var body = this.body

      if (this.compress === false
        || this.method === 'HEAD'
        || this.status === 204
        || this.status === 304
        // Assumes you either always set a body or always don't
        || body == null
      ) return

      var length = this.responseLength;

      // set Content-Type for filtering
      if (Buffer.isBuffer(body)) {
        if (!this.responseHeader['content-type'])
          this.set('Content-Type', 'application/octet-stream')
      } else if (typeof body === 'string') {
        if (!this.responseHeader['content-type'])
          this.set('Content-Type', 'text/plain; charset=utf-8')
      } else if (body instanceof Stream) {
        if (!this.responseHeader['content-type'])
          this.set('Content-Type', 'application/octet-stream')
      } else {
        // JSON
        body = JSON.stringify(body, null, this.app.jsonSpaces)
        this.set('Content-Type', 'application/json')
      }

      // forced compression or implied
      var contentType = this.responseHeader['content-type']
      if (!(this.compress === true || filter.test(contentType)))
        return

      // identity
      var encoding = this.acceptedEncodings[0]
      if (encoding === 'identity') return

      // threshold
      if (threshold && length < threshold) return

      this.set('Content-Encoding', encoding)
      this.res.removeHeader('Content-Length')

      var stream = encodingMethods[encoding](options)

      if (body instanceof Stream)
        body.pipe(stream)
      else
        stream.end(body)

      this.body = stream
    }
  }
}
