'use strict'

/**
 * Module dependencies.
 */

const compressible = require('compressible')
const isJSON = require('koa-is-json')
const status = require('statuses')
const Stream = require('stream')
const bytes = require('bytes')

const Encodings = require('./encodings')

/**
* Regex to match no-transform directive in a cache-control header
*/
const NO_TRANSFORM_REGEX = /(?:^|,)\s*?no-transform\s*?(?:,|$)/

/**
 * Compress middleware.
 *
 * @param {Object} [options]
 * @return {Function}
 * @api public
 */

module.exports = (options = {}) => {
  // "global" options
  const { filter = compressible, defaultEncoding = 'identity' } = options

  return async (ctx, next) => {
    ctx.vary('Accept-Encoding')

    await next()

    // early exit if there's no content body or the body is already encoded
    let { body } = ctx
    const { type, length: size } = ctx.response
    if (!body) return
    if (ctx.res.headersSent || !ctx.writable) return
    if (ctx.compress === false) return
    if (ctx.request.method === 'HEAD') return
    if (status.empty[ctx.response.status]) return
    if (ctx.response.get('Content-Encoding')) return

    // forced compression or implied
    if (!(ctx.compress || filter(type))) return

    // don't compress for Cache-Control: no-transform
    // https://tools.ietf.org/html/rfc7234#section-5.2.1.6
    const cacheControl = ctx.response.get('Cache-Control')
    if (cacheControl && NO_TRANSFORM_REGEX.test(cacheControl)) return

    // calculate "local" compression options
    const responseOptions = { ...options, ...ctx.compress }
    let { threshold = 1024 } = responseOptions
    while (typeof threshold === 'function') threshold = threshold(type, size)
    if (typeof threshold === 'string') threshold = bytes(threshold)

    // don't compress if the current response is below the threshold
    if (threshold && size < threshold) return

    // get the preferred content encoding
    Encodings.preferredEncodings.forEach((encoding) => {
      // calculate compressor options, if any
      if (!(encoding in responseOptions)) return
      let compressor = responseOptions[encoding]
      while (typeof compressor === 'function') compressor = compressor(type, size)
      responseOptions[encoding] = compressor
    })
    const preferredEncodings = Encodings.preferredEncodings.filter((encoding) => responseOptions[encoding] !== false && responseOptions[encoding] !== null)
    const encodings = new Encodings({ preferredEncodings })
    encodings.parseAcceptEncoding(ctx.request.headers['accept-encoding'] || defaultEncoding)
    const encoding = encodings.getPreferredContentEncoding()

    // identity === no compression
    if (encoding === 'identity') return

    /** begin compression logic **/

    // json
    if (isJSON(body)) body = ctx.body = JSON.stringify(body)

    ctx.set('Content-Encoding', encoding)
    ctx.res.removeHeader('Content-Length')

    const compress = Encodings.encodingMethods[encoding]
    const stream = ctx.body = compress(responseOptions[encoding])

    if (body instanceof Stream) {
      body.pipe(stream)
    } else {
      stream.end(body)
    }
  }
}
