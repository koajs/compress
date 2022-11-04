const { stringifyAsync } = require('yieldable-json')

/**
 * @param value
 * @return {Promise<string>}
 */
const asyncStringify = (value) =>
  new Promise((resolve, reject) =>
    stringifyAsync(value, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  )

module.exports.asyncStringify = asyncStringify
