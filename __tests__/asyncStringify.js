const assert = require('assert')

const { asyncStringify } = require('../lib/asyncStringify')

describe('asyncStringify', () => {
  class Class {
    constructor (value) {
      this.value = value
    }
  }

  const obj = { value: 3 }

  it.each`
      input            | expected
      ${undefined}     | ${undefined}
      ${{ value: 1 }}  | ${'{"value":1}'}
      ${new Class(2)} | ${'{"value":2}'}
      ${obj}           | ${'{"value":3}'}
    `('should transform $input', async ({
    input,
    expected
  }) => {
    const stringValue = await asyncStringify(input)

    assert.strictEqual(stringValue, expected)
  })

  it('should fail on incorrect input', async () => {
    const input = Symbol('')

    await assert.rejects(() => asyncStringify(input))
  })
})
