
const assert = require('assert')
const zlib = require('zlib')

const createCompressMiddleware = require('..')

test('default brotli param quality should be 4', () => {
  const middleware = createCompressMiddleware()
  assert(Array.isArray(middleware.preferredEncodings))
  assert(middleware.encodingOptions)
  assert.strictEqual(middleware.encodingOptions.br.params[zlib.constants.BROTLI_PARAM_QUALITY], 4)
})
