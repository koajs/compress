
const assert = require('assert')

const {
  parseAcceptEncoding,
  getPreferredContentEncoding
} = require('../lib/encodings')

describe('parseAcceptEncoding', () => {
  const fixtures = [
    {
      input: 'br, gzip, compress, deflate',
      output: {
        br: 1,
        gzip: 1,
        compress: 1,
        deflate: 1,
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
        identity: 0.5
      }
    }
  ]

  fixtures.forEach((fixture) => {
    test(fixture.input, () => {
      const encodingWeights = parseAcceptEncoding(fixture.input)

      Object.keys(fixture.output).forEach((encoding) => {
        const expected = fixture.output[encoding]
        const actual = encodingWeights.get(encoding)
        assert.strictEqual(actual, expected, `Expected ${encoding} to have weight ${expected}, got ${actual}.`)
      })
    })
  })
})

describe('getPreferredContentEncoding', () => {
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
    }
  ]

  fixtures.forEach((fixture) => {
    test(fixture.name || fixture.acceptEncoding, () => {
      const weights = parseAcceptEncoding(fixture.acceptEncoding)
      const preferredEncoding = getPreferredContentEncoding(weights, fixture.preferredEncodings)
      assert.strictEqual(preferredEncoding, fixture.preferredEncoding)
    })
  })
})
