const assert = require('assert')
const zlib = require('zlib')

const Encodings = require('../lib/encodings')

describe('parseAcceptEncoding', () => {
  const fixtures = [
    {
      input: 'zstd, br, gzip, compress, deflate',
      output: {
        br: 1,
        gzip: 1,
        compress: 1,
        deflate: 1,
        zstd: 1,
        identity: undefined
      }
    },
    {
      input: 'br, *; q = 0.1',
      output: {
        br: 1,
        gzip: 0.1,
        compress: undefined,
        deflate: 0.1,
        zstd: undefined,
        identity: undefined
      }
    },
    {
      input: '*, gzip;q=0',
      output: {
        br: undefined,
        gzip: 0,
        compress: undefined,
        deflate: 1,
        zstd: undefined,
        identity: undefined
      }
    },
    {
      input: 'identity',
      output: {
        br: undefined,
        gzip: undefined,
        compress: undefined,
        deflate: undefined,
        zstd: undefined,
        identity: 1
      }
    },
    {
      input: 'gzip;q=0.8, identity;q=0.5, *;q=0.3',
      output: {
        br: undefined,
        gzip: 0.8,
        compress: undefined,
        deflate: 0.3,
        zstd: undefined,
        identity: 0.5
      }
    },
    {
      input: 'zstd;q=0.9, br;q=0.8',
      output: {
        br: 0.8,
        gzip: undefined,
        compress: undefined,
        deflate: undefined,
        zstd: 0.9,
        identity: undefined
      }
    }
  ]

  fixtures.forEach((fixture) => {
    test(fixture.input, () => {
      const encodings = new Encodings()
      encodings.parseAcceptEncoding(fixture.input)
      const { encodingWeights } = encodings

      Object.keys(fixture.output).forEach((encoding) => {
        const expected = fixture.output[encoding]
        const actual = encodingWeights.get(encoding)
        assert.strictEqual(actual, expected, `Expected ${encoding} to have weight ${expected}, got ${actual}.`)
      })
    })
  })
})

describe('getPreferredContentEncoding', () => {
  const zstdAvailable = typeof zlib.createZstdCompress === 'function'

  const fixtures = [
    {
      acceptEncoding: 'gzip, br',
      preferredEncoding: 'br'
    },
    {
      acceptEncoding: 'gzip, br, *;q=0.5',
      preferredEncoding: 'br'
    },
    {
      acceptEncoding: 'br, gzip',
      preferredEncoding: 'br'
    },
    {
      acceptEncoding: 'gzip, deflate',
      preferredEncoding: 'gzip'
    },
    {
      name: 'w/o br as a preferred encoding',
      acceptEncoding: 'gzip, deflate, br',
      preferredEncodings: ['gzip', 'deflate'],
      preferredEncoding: 'gzip'
    },
    {
      acceptEncoding: 'identity',
      preferredEncoding: 'identity'
    },
    ...(
      zstdAvailable
        ? [
            {
              acceptEncoding: 'zstd, gzip',
              preferredEncoding: 'zstd'
            },
            {
              acceptEncoding: 'deflate, zstd',
              preferredEncoding: 'zstd'
            },
            {
              name: 'zstd with higher priority than br',
              acceptEncoding: 'zstd, br',
              preferredEncoding: 'zstd'
            }
          ]
        : []
    )
  ]

  fixtures.forEach((fixture) => {
    test(fixture.name || fixture.acceptEncoding, () => {
      const encodings = new Encodings({
        preferredEncodings: fixture.preferredEncodings
      })
      encodings.parseAcceptEncoding(fixture.acceptEncoding)
      const preferredEncoding = encodings.getPreferredContentEncoding()
      assert.strictEqual(preferredEncoding, fixture.preferredEncoding)
    })
  })
})
