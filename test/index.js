var request = require('supertest')
var assert = require('assert')
var http = require('http')
var Koa = require('koa')
var Stream = require('stream')
var crypto = require('crypto')
var fs = require('fs')
var path = require('path')
var compress = require('..')

require('should-http')

describe('Compress', () => {
  var buffer = crypto.randomBytes(1024)
  var string = buffer.toString('hex')

  function sendString(ctx, next) {
    ctx.body = string
  }

  function sendBuffer(ctx, next) {
    ctx.compress = true
    ctx.body = buffer
  }

  it('should compress strings', (done) => {
    var app = new Koa()

    app.use(compress())
    app.use(sendString)

    request(app.listen())
    .get('/')
    .expect(200)
    .end((err, res) => {
      if (err)
        return done(err)

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-length')
      res.text.should.equal(string)

      done()
    })
  })

  it('should not compress strings below threshold', (done) => {
    var app = new Koa()

    app.use(compress({
      threshold: '1mb'
    }))
    app.use(sendString)

    request(app.listen())
    .get('/')
    .expect(200)
    .end((err, res) => {
      if (err)
        return done(err)

      res.should.have.header('Content-Length', '2048')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-encoding')
      res.headers.should.not.have.property('transfer-encoding')
      res.text.should.equal(string)

      done()
    })
  })

  it('should compress JSON body', (done) => {
    var app = new Koa()
    var jsonBody = { 'status': 200, 'message': 'ok', 'data': string }

    app.use(compress())
    app.use((ctx, next) => {
      ctx.body = jsonBody
    })

    request(app.listen())
    .get('/')
    .expect(200)
    .end((err, res) => {
      if (err)
        return done(err)

      res.should.have.header('Transfer-Encoding', 'chunked')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-length')
      res.text.should.equal(JSON.stringify(jsonBody))

      done()
    })
  })

  it('should not compress JSON body below threshold', (done) => {
    var app = new Koa()
    var jsonBody = { 'status': 200, 'message': 'ok' }

    app.use(compress())
    app.use((ctx, next) => {
      ctx.body = jsonBody
    })

    request(app.listen())
    .get('/')
    .expect(200)
    .end((err, res) => {
      if (err)
        return done(err)

      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-encoding')
      res.headers.should.not.have.property('transfer-encoding')
      res.text.should.equal(JSON.stringify(jsonBody))

      done()
    })
  })

  it('should compress buffers', (done) => {
    var app = new Koa()

    app.use(compress())
    app.use(sendBuffer)

    request(app.listen())
    .get('/')
    .expect(200)
    .end((err, res) => {
      if (err)
        return done(err)

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-length')

      done()
    })
  })

  it('should compress streams', (done) => {
    var app = new Koa()

    app.use(compress())

    app.use((ctx, next) => {
      ctx.type = 'application/javascript'
      ctx.body = fs.createReadStream(path.join(__dirname, 'index.js'))
    })

    request(app.listen())
    .get('/')
    .expect(200)
    .end((err, res) => {
      if (err)
        return done(err)

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-length')

      done()
    })
  })

  it('should compress when ctx.compress === true', (done) => {
    var app = new Koa()

    app.use(compress())
    app.use(sendBuffer)

    request(app.listen())
    .get('/')
    .expect(200)
    .end((err, res) => {
      if (err)
        return done(err)

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-length')

      done()
    })
  })

  it('should not compress when ctx.compress === false', (done) => {
    var app = new Koa()

    app.use(compress())
    app.use((ctx, next) => {
      ctx.compress = false
      ctx.body = buffer
    })

    request(app.listen())
    .get('/')
    .expect(200)
    .end((err, res) => {
      if (err)
        return done(err)

      res.should.have.header('Content-Length', '1024')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-encoding')
      res.headers.should.not.have.property('transfer-encoding')

      done()
    })
  })

  it('should not compress HEAD requests', (done) => {
    var app = new Koa()

    app.use(compress())
    app.use(sendString)

    request(app.listen())
    .head('/')
    .expect(200, (err, res) => {
      if (err)
        return done(err)

      res.headers.should.not.have.property('content-encoding')

      done()
    })
  })

  it('should not crash even if accept-encoding: sdch', (done) => {
    var app = new Koa()

    app.use(compress())
    app.use(sendBuffer)

    request(app.listen())
    .get('/')
    .set('Accept-Encoding', 'sdch, gzip, deflate')
    .expect(200, done)
  })

  it('should not crash if no accept-encoding is sent', (done) => {
    var app = new Koa()

    app.use(compress())
    app.use(sendBuffer)

    request(app.listen())
    .get('/')
    .expect(200, done)
  })

  it('should not crash if a type does not pass the filter', (done) => {
    var app = new Koa()

    app.use(compress())
    app.use((ctx) => {
      ctx.type = 'image/png'
      ctx.body = new Buffer(2048)
    })

    request(app.listen())
    .get('/')
    .expect(200, done)
  })

  it('should not compress when transfer-encoding is already set', (done) => {
    var app = new Koa()

    app.use(compress({
      threshold: 0
    }))
    app.use((ctx) => {
      ctx.set('Content-Encoding', 'identity')
      ctx.type = 'text'
      ctx.body = 'asdf'
    })

    request(app.listen())
    .get('/')
    .expect('asdf', done)
  })
})
