const request = require('supertest')
const assert = require('assert')
const crypto = require('crypto')
const path = require('path')
const zlib = require('zlib')
const Koa = require('koa')
const fs = require('fs')

const compress = require('..')

describe('Compress', () => {
  const buffer = crypto.randomBytes(1024)
  const string = buffer.toString('hex')

  function sendString(ctx, next) {
    ctx.body = string
  }

  function sendBuffer(ctx, next) {
    ctx.compress = true
    ctx.body = buffer
  }

  let server
  afterEach(() => { if (server) server.close() })

  it('should compress strings', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendString)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.equal(res.headers['transfer-encoding'], 'chunked')
    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
    assert.equal(res.text, string)
  })

  it('should not compress strings below threshold', async () => {
    const app = new Koa()

    app.use(compress({
      threshold: '1mb'
    }))
    app.use(sendString)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.equal(res.headers['content-length'], '2048')
    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-encoding'])
    assert(!res.headers['transfer-encoding'])
    assert.equal(res.text, string)
  })

  it('should compress JSON body', async () => {
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

    assert.equal(res.headers['transfer-encoding'], 'chunked')
    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
    assert.equal(res.text, JSON.stringify(jsonBody))
  })

  it('should not compress JSON body below threshold', async () => {
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

    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-encoding'])
    assert(!res.headers['transfer-encoding'])
    assert.equal(res.text, JSON.stringify(jsonBody))
  })

  it('should compress buffers', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.equal(res.headers['transfer-encoding'], 'chunked')
    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
  })

  it('should compress streams', async () => {
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
    assert.equal(res.headers['transfer-encoding'], 'chunked')
    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
  })

  it('should compress when ctx.compress === true', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    assert.equal(res.headers['transfer-encoding'], 'chunked')
    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
  })

  it('should not compress when ctx.compress === false', async () => {
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

    assert.equal(res.headers['content-length'], '1024')
    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-encoding'])
    assert(!res.headers['transfer-encoding'])
  })

  it('should not compress HEAD requests', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendString)
    server = app.listen()

    const res = await request(server)
      .head('/')
      .expect(200)

    assert(!res.headers['content-encoding'])
  })

  it('should not crash even if accept-encoding: sdch', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    await request(server)
      .get('/')
      .set('Accept-Encoding', 'sdch, gzip, deflate')
      .expect(200)
  })

  it('should not compress if no accept-encoding is sent (with the default)', async () => {
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
    assert.equal(res.headers['content-length'], '1024')
    assert.equal(res.headers.vary, 'Accept-Encoding')
  })

  it('should be gzip if no accept-encoding is sent (with the standard default)', async () => {
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

    assert.equal(res.headers['content-encoding'], 'gzip')
    assert.equal(res.headers.vary, 'Accept-Encoding')
  })

  it('should not crash if a type does not pass the filter', async () => {
    const app = new Koa()

    app.use(compress())
    app.use((ctx) => {
      ctx.type = 'image/png'
      ctx.body = Buffer.alloc(2048)
    })
    server = app.listen()

    await request(server)
      .get('/')
      .expect(200)
  })

  it('should not compress when transfer-encoding is already set', async () => {
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

    await request(server)
      .get('/')
      .expect('asdf')
  })

  it('should support Z_SYNC_FLUSH', async () => {
    const app = new Koa()

    app.use(compress({
      flush: zlib.constants.Z_SYNC_FLUSH
    }))
    app.use(sendString)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .expect(200)

    // res.should.have.header('Content-Encoding', 'gzip')
    assert.equal(res.headers['transfer-encoding'], 'chunked')
    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert(!res.headers['content-length'])
    assert.equal(res.text, string)
  })

  describe('Cache-Control', () => {
    ['no-transform', 'public, no-transform', 'no-transform, private', 'no-transform , max-age=1000', 'max-age=1000 , no-transform'].forEach(headerValue => {
      it(`should skip Cache-Control: ${headerValue}`, async () => {
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

        assert.equal(res.headers['content-length'], '2048')
        assert.equal(res.headers.vary, 'Accept-Encoding')
        assert(!res.headers['content-encoding'])
        assert(!res.headers['transfer-encoding'])
        assert.equal(res.text, string)
      })
    });

    ['not-no-transform', 'public', 'no-transform-thingy'].forEach(headerValue => {
      it(`should not skip Cache-Control: ${headerValue}`, async () => {
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

        assert.equal(res.headers['transfer-encoding'], 'chunked')
        assert.equal(res.headers.vary, 'Accept-Encoding')
        assert(!res.headers['content-length'])
        assert.equal(res.text, string)
      })
    })
  })

  it('accept-encoding: deflate', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .set('Accept-Encoding', 'deflate')
      .expect(200)

    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert.equal(res.headers['content-encoding'], 'deflate')
  })

  it('accept-encoding: gzip', async () => {
    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .set('Accept-Encoding', 'gzip, deflate')
      .expect(200)

    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert.equal(res.headers['content-encoding'], 'gzip')
  })

  it('accept-encoding: br', async () => {
    if (!process.versions.brotli) return

    const app = new Koa()

    app.use(compress())
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .set('Accept-Encoding', 'br')
      .expect(200)

    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert.equal(res.headers['content-encoding'], 'br')
  })

  it('accept-encoding: br (banned, should be gzip)', async () => {
    const app = new Koa()

    app.use(compress({ br: false }))
    app.use(sendBuffer)
    server = app.listen()

    const res = await request(server)
      .get('/')
      .set('Accept-Encoding', 'gzip, deflate, br')
      .expect(200)

    assert.equal(res.headers.vary, 'Accept-Encoding')
    assert.equal(res.headers['content-encoding'], 'gzip')
  })
})
