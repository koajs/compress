const request = require('supertest')
const assert = require('assert')
const crypto = require('crypto')
const path = require('path')
const Koa = require('koa')
const fs = require('fs')

const compress = require('..')

describe('Compress', () => {
  const buffer = crypto.randomBytes(1024)
  const string = buffer.toString('hex')

  function sendString (ctx, next) {
    ctx.body = string
  }

  function sendBuffer (ctx, next) {
    ctx.compress = true
    ctx.body = buffer
  }

  let server
  afterEach(() => { if (server) server.close() })

  test('should compress strings', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendString)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
    assert.strictEqual(res.text, string)
  })

  test('should not compress strings below threshold', async () => {
    const app = new Koa()

    app.use(compress({
      threshold: '1mb'
    }))
    app.use(sendString)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.strictEqual(res.headers['content-length'], '2048')
    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-encoding'])
    assert(!res.headers['transfer-encoding'])
    assert.strictEqual(res.text, string)
  })

  test('should compress JSON body', async () => {
    const app = new Koa()
    const jsonBody = { status: 200, message: 'ok', data: string }

    app.use(compress())
    app.use((ctx, next) => {
      ctx.body = jsonBody
    })
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
    assert.strictEqual(res.text, JSON.stringify(jsonBody))
  })

  test('should not compress JSON body below threshold', async () => {
    const app = new Koa()
    const jsonBody = { status: 200, message: 'ok' }

    app.use(compress())
    app.use((ctx, next) => {
      ctx.body = jsonBody
    })
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-encoding'])
    assert(!res.headers['transfer-encoding'])
    assert.strictEqual(res.text, JSON.stringify(jsonBody))
  })

  test('should compress buffers', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
  })

  test('should compress streams', async () => {
    const app = new Koa()

    app.use(compress())

    app.use((ctx, next) => {
      ctx.type = 'application/javascript'
      ctx.body = fs.createReadStream(path.join(__dirname, 'index.js'))
    })
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    // res.should.have.header('Content-Encoding', 'gzip')
    assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
  })

  test('should compress when ctx.compress === true', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
  })

  test('should not compress when ctx.compress === false', async () => {
    const app = new Koa()

    app.use(compress())
    app.use((ctx, next) => {
      ctx.compress = false
      ctx.body = buffer
    })
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.strictEqual(res.headers['content-length'], '1024')
    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-encoding'])
    assert(!res.headers['transfer-encoding'])
  })

  test('should not compress HEAD requests', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendString)
    server = app.listen()

    const res = await request(server)
      .head('/')

    assert(!res.headers['content-encoding'])
  })

  test('should not crash even if accept-encoding: sdch', () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    return request(server)
      .get('/')
      .set('Accept-Encoding', 'sdch, gzip, deflate')
      .expect(200)
  })

  test('should not compress if no accept-encoding is sent (with the default)', async () => {
    const app = new Koa()
    app.use(compress({
      threshold: 0
    }))
    app.use((ctx) => {
      ctx.type = 'text'
      ctx.body = buffer
    })
    server = app.listen()

    const res = await request(server)
      .get('/')
      .set('Accept-Encoding', '')

    assert(!res.headers['content-encoding'])
    assert(!res.headers['transfer-encoding'])
    assert.strictEqual(res.headers['content-length'], '1024')
    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
  })

  test('should be gzip if no accept-encoding is sent (with the standard default)', async () => {
    const app = new Koa()
    app.use(compress({
      threshold: 0,
      defaultEncoding: '*'
    }))
    app.use((ctx) => {
      ctx.type = 'text'
      ctx.body = buffer
    })
    server = app.listen()

    const res = await request(server)
      .get('/')
      .set('Accept-Encoding', '')

    assert.strictEqual(res.headers['content-encoding'], 'gzip')
    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
  })

  test('should not crash if a type does not pass the filter', () => {
    const app = new Koa()

    app.use(compress())
    app.use((ctx) => {
      ctx.type = 'image/png'
      ctx.body = Buffer.alloc(2048)
    })
    server = app.listen()

    return request(server)
      .get('/')
      .expect(200)
  })

  test('should not compress when transfer-encoding is already set', () => {
    const app = new Koa()

    app.use(compress({
      threshold: 0
    }))
    app.use((ctx) => {
      ctx.set('Content-Encoding', 'identity')
      ctx.type = 'text'
      ctx.body = 'asdf'
    })
    server = app.listen()

    return request(server)
      .get('/')
      .expect('asdf')
  })

  describe('Cache-Control', () => {
    ['no-transform', 'public, no-transform', 'no-transform, private', 'no-transform , max-age=1000', 'max-age=1000 , no-transform'].forEach(headerValue => {
      test(`should skip Cache-Control: ${headerValue}`, async () => {
        const app = new Koa()

        app.use(compress())
        app.use((ctx, next) => {
          ctx.set('Cache-Control', headerValue)
          next()
        })
        app.use(sendString)
        server = app.listen()

        const res = await request(server)
          .get('/')
          .expect(200)

        assert.strictEqual(res.headers['content-length'], '2048')
        assert.strictEqual(res.headers.vary, 'Accept-Encoding')
        assert(!res.headers['content-encoding'])
        assert(!res.headers['transfer-encoding'])
        assert.strictEqual(res.text, string)
      })
    });

    ['not-no-transform', 'public', 'no-transform-thingy'].forEach(headerValue => {
      test(`should not skip Cache-Control: ${headerValue}`, async () => {
        const app = new Koa()

        app.use(compress())
        app.use((ctx, next) => {
          ctx.set('Cache-Control', headerValue)
          next()
        })
        app.use(sendString)
        server = app.listen()

        const res = await request(server)
          .get('/')
          .expect(200)

        assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
        assert.strictEqual(res.headers.vary, 'Accept-Encoding')
        assert(!res.headers['content-length'])
        assert.strictEqual(res.text, string)
      })
    })
  })

  test('accept-encoding: deflate', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .set('Accept-Encoding', 'deflate')
      .expect(200)

    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert.strictEqual(res.headers['content-encoding'], 'deflate')
  })

  test('accept-encoding: gzip', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .set('Accept-Encoding', 'gzip, deflate')
      .expect(200)

    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert.strictEqual(res.headers['content-encoding'], 'gzip')
  })

  if (process.versions.brotli) {
    test('accept-encoding: br', async () => {
      const app = new Koa()

      app.use(compress())
      app.use(sendBuffer)
      server = app.listen()

      const res = await request(server)
        .get('/')
        .set('Accept-Encoding', 'br')
        .expect(200)

      assert.strictEqual(res.headers.vary, 'Accept-Encoding')
      assert.strictEqual(res.headers['content-encoding'], 'br')
    })
  }

  test('accept-encoding: br (banned, should be gzip)', async () => {
    const app = new Koa()

    app.use(compress({ br: false }))
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .set('Accept-Encoding', 'gzip, deflate, br')
      .expect(200)

    assert.strictEqual(res.headers.vary, 'Accept-Encoding')
    assert.strictEqual(res.headers['content-encoding'], 'gzip')
  })
})
