var zlib = require('zlib')
var Stream = require('stream')
var bytes = require('bytes')
var Negotiator = require('negotiator')

var encodingMethods = {
  gzip: zlib.createGzip,
  deflate: zlib.createDeflate
}

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

      var length
      if (Buffer.isBuffer(body)) {
        if (!this.responseHeader['content-type'])
          this.set('Content-Type', 'application/octet-stream')

        length = body.length
      } else if (typeof body === 'string') {
        if (!this.responseHeader['content-type'])
          this.set('Content-Type', 'text/plain; charset=utf-8')

        length = Buffer.byteLength(body)
      } else if (body instanceof Stream) {
        if (!this.responseHeader['content-type'])
          this.set('Content-Type', 'application/octet-stream')
      } else {
        // JSON
        body = JSON.stringify(body, null, this.app.jsonSpaces)
        length = Buffer.byteLength(body)
        this.set('Content-Type', 'application/json')
      }

      var contentType = this.responseHeader['content-type']
      if (!(this.compress === true || filter.test(contentType)))
        return

      var encodings = new Negotiator(this.req)
        .preferredEncodings(['gzip', 'deflate', 'identity'])
      var encoding = encodings[0] || 'identity'
      if (encoding === 'identity')
        return

      if (threshold
        && (typeof body === 'string' || Buffer.isBuffer(body))
        && length < threshold
      ) return

      this.set('Content-Encoding', encoding)
      this.res.removeHeader('Content-Length')

      var stream = encodingMethods[encoding](options)
        .on('error', this.onerror.bind(this))

      if (body instanceof Stream)
        body.pipe(stream)
      else
        stream.end(body)

      this.body = stream
    }
  }
}
