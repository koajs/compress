
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
const errors = require('http-errors')
const zlib = require('zlib')

// all supported encoding methods
exports.encodingMethods = {
  gzip: zlib.createGzip,
  deflate: zlib.createDeflate,
  br: zlib.createBrotliCompress
}

// how we treat `Accept-Encoding: *`
exports.wildcardAcceptEncoding = ['gzip', 'deflate']
// our preferred encodings
exports.preferredEncodings = ['br', 'gzip', 'deflate']
exports.reDirective = /^\s*(gzip|compress|deflate|br|identity|\*)\s*(?:;\s*q\s*=\s*(\d(?:\.\d)?))?\s*$/

exports.parseAcceptEncoding = (acceptEncoding) => {
  const encodingWeights = new Map()

  acceptEncoding.split(',').forEach((directive) => {
    const match = exports.reDirective.exec(directive)
    if (!match) return // not a supported encoding above

    const encoding = match[1]

    // weight must be in [0, 1]
    let weight = match[2] && !isNaN(match[2]) ? parseFloat(match[2], 10) : 1
    weight = Math.max(weight, 0)
    weight = Math.min(weight, 1)

    if (encoding === '*') {
      // set the weights for the default encodings
      exports.wildcardAcceptEncoding.forEach((enc) => {
        if (!encodingWeights.has(enc)) encodingWeights.set(enc, weight)
      })
      return
    }

    encodingWeights.set(encoding, weight)
  })

  return encodingWeights
}

exports.getPreferredContentEncoding = (encodingWeights) => {
  // get ordered list of accepted encodings
  const acceptedEncodings = Array.from(encodingWeights.keys())
    // sort by weight
    .sort((a, b) => encodingWeights.get(b) - encodingWeights.get(a))
    // filter by supported encodings
    .filter((encoding) => encoding === 'identity' || typeof exports.encodingMethods[encoding] === 'function')

  // group them by weights
  const weightClasses = new Map()
  acceptedEncodings.forEach((encoding) => {
    const weight = encodingWeights.get(encoding)
    if (!weightClasses.has(weight)) weightClasses.set(weight, new Set())
    weightClasses.get(weight).add(encoding)
  })

  // search by weight, descending
  const weights = Array.from(weightClasses.keys()).sort((a, b) => b - a)
  for (let i = 0; i < weights.length; i++) {
    // encodings at this weight
    const encodings = weightClasses.get(weights[i])
    // return the first encoding in the preferred list
    for (let j = 0; j < exports.preferredEncodings.length; j++) {
      const preferredEncoding = exports.preferredEncodings[j]
      if (encodings.has(preferredEncoding)) return preferredEncoding
    }
  }

  // no encoding matches, check to see if the client set identity, q=0
  if (encodingWeights.get('identity') === 0) throw errors(406, 'Please accept br, gzip, deflate, or identity.')

  return 'identity'
}
