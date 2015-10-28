var request = require('supertest')
var assert = require('assert')
var http = require('http')
var Koa = require('koa')
var Stream = require('stream')
var crypto = require('crypto')
var fs = require('fs')
var path = require('path')
var compress = require('..')

describe('Compress', function () {
  var buffer = crypto.randomBytes(1024)
  var string = buffer.toString('hex')

  function sendString(ctx, next) {
    ctx.body = string
  }

  function sendBuffer(ctx, next) {
    ctx.compress = true
    ctx.body = buffer
  }

  it('should compress strings', function (done) {
    var app = new Koa()

    app.use(compress())
    app.use(sendString)

    request(app.listen())
    .get('/')
    .expect(200)
    .end(function (err, res) {
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

  it('should not compress strings below threshold', function (done) {
    var app = new Koa()

    app.use(compress({
      threshold: '1mb'
    }))
    app.use(sendString)

    request(app.listen())
    .get('/')
    .expect(200)
    .end(function (err, res) {
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

  it('should compress JSON body', function (done) {
    var app = new Koa()
    var jsonBody = { 'status': 200, 'message': 'ok', 'data': string }

    app.use(compress())
    app.use(function (ctx, next) {
      ctx.body = jsonBody
    })

    request(app.listen())
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (err)
        return done(err)

      res.should.have.header('Transfer-Encoding', 'chunked')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-length')
      res.text.should.equal(JSON.stringify(jsonBody))

      done()
    })
  })

  it('should not compress JSON body below threshold', function (done) {
    var app = new Koa()
    var jsonBody = { 'status': 200, 'message': 'ok' }

    app.use(compress())
    app.use(function sendJSON(ctx, next) {
      ctx.body = jsonBody
    })

    request(app.listen())
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (err)
        return done(err)

      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-encoding')
      res.headers.should.not.have.property('transfer-encoding')
      res.text.should.equal(JSON.stringify(jsonBody))

      done()
    })
  })

  it('should compress buffers', function (done) {
    var app = new Koa()

    app.use(compress())
    app.use(sendBuffer)

    request(app.listen())
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (err)
        return done(err)

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-length')

      done()
    })
  })

  it('should compress streams', function (done) {
    var app = new Koa()

    app.use(compress())

    app.use(function (ctx, next) {
      ctx.type = 'application/javascript'
      ctx.body = fs.createReadStream(path.join(__dirname, 'index.js'))
    })

    request(app.listen())
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (err)
        return done(err)

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-length')

      done()
    })
  })

  it('should compress when ctx.compress === true', function (done) {
    var app = new Koa()

    app.use(compress())
    app.use(sendBuffer)

    request(app.listen())
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (err)
        return done(err)

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-length')

      done()
    })
  })

  it('should not compress when ctx.compress === false', function (done) {
    var app = new Koa()

    app.use(compress())
    app.use(function (ctx, next) {
      ctx.compress = false
      ctx.body = buffer
    })

    request(app.listen())
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (err)
        return done(err)

      res.should.have.header('Content-Length', '1024')
      res.should.have.header('Vary', 'Accept-Encoding')
      res.headers.should.not.have.property('content-encoding')
      res.headers.should.not.have.property('transfer-encoding')

      done()
    })
  })

  it('should not compress HEAD requests', function (done) {
    var app = new Koa()

    app.use(compress())
    app.use(sendString)

    request(app.listen())
    .head('/')
    .expect(200)
    .expect('', function (err, res) {
      if (err)
        return done(err)

      res.headers.should.not.have.property('content-encoding')

      done()
    })
  })

  it('should not crash even if accept-encoding: sdch', function (done) {
    var app = new Koa()

    app.use(compress())
    app.use(sendBuffer)

    request(app.listen())
    .get('/')
    .set('Accept-Encoding', 'sdch, gzip, deflate')
    .expect(200, done)
  })

  it('should not crash if no accept-encoding is sent', function (done) {
    var app = new Koa()

    app.use(compress())
    app.use(sendBuffer)

    request(app.listen())
    .get('/')
    .expect(200, done)
  })

  it('should not crash if a type does not pass the filter', function (done) {
    var app = new Koa()

    app.use(compress())
    app.use(function (ctx) {
      ctx.type = 'image/png'
      ctx.body = new Buffer(2048)
    })

    request(app.listen())
    .get('/')
    .expect(200, done)
  })

  it('should not compress when transfer-encoding is already set', function (done) {
    var app = new Koa()

    app.use(compress({
      threshold: 0
    }))
    app.use(function (ctx) {
      ctx.set('Content-Encoding', 'identity')
      ctx.type = 'text'
      ctx.body = 'asdf'
    })

    request(app.listen())
    .get('/')
    .expect('asdf', done)
  })
})
