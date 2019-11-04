'use strict'

/**
 * Module dependencies.
 */

const compressible = require('compressible')
const isJSON = require('koa-is-json')
const status = require('statuses')
const Stream = require('stream')
const bytes = require('bytes')
const zlib = require('zlib')

/**
 * Encoding methods supported.
 */

const brotliSupport = !!zlib.createBrotliCompress

const encodingMethods = {
  gzip: zlib.createGzip,
  deflate: zlib.createDeflate
}
if (brotliSupport) encodingMethods.br = zlib.createBrotliCompress

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
  let { brotliOptions, filter = compressible, threshold = 1024 } = options
  if (typeof threshold === 'string') threshold = bytes(threshold)

  return async (ctx, next) => {
    ctx.vary('Accept-Encoding')

    await next()

    let { body } = ctx
    if (!body) return
    if (ctx.res.headersSent || !ctx.writable) return
    if (ctx.compress === false) return
    if (ctx.request.method === 'HEAD') return
    if (status.empty[ctx.response.status]) return
    if (ctx.response.get('Content-Encoding')) return

    // forced compression or implied
    if (!(ctx.compress === true || filter(ctx.response.type))) return

    // Don't compress for Cache-Control: no-transform
    // https://tools.ietf.org/html/rfc7234#section-5.2.1.6
    const cacheControl = ctx.response.get('Cache-Control')
    if (cacheControl && NO_TRANSFORM_REGEX.test(cacheControl)) return

    // identity
    let encoding = null
    if (brotliSupport && brotliOptions !== null) encoding = ctx.acceptsEncodings('br') // 1st choice
    if (!encoding) encoding = ctx.acceptsEncodings('gzip', 'deflate', 'identity')
    if (!encoding) ctx.throw(406, 'supported encodings: br, gzip, deflate, identity')
    if (encoding === 'identity') return

    // json
    if (isJSON(body)) body = ctx.body = JSON.stringify(body)

    // threshold
    if (threshold && ctx.response.length < threshold) return

    ctx.set('Content-Encoding', encoding)
    ctx.res.removeHeader('Content-Length')

    const stream = ctx.body = encodingMethods[encoding](encoding === 'br' ? brotliOptions : options)

    if (body instanceof Stream) {
      body.pipe(stream)
    } else {
      stream.end(body)
    }
  }
}
