var request = require('supertest')
var assert = require('assert')
var http = require('http')
var koa = require('koa')
var Stream = require('stream')
var crypto = require('crypto')
var fs = require('fs')
var path = require('path')
var compress = require('..')

describe('Compress', function () {
  var buffer = crypto.randomBytes(1024)
  var string = buffer.toString('hex')

  function* sendString(next) {
    this.body = string
  }

  function* sendBuffer(next) {
    this.compress = true
    this.body = buffer
  }

  it('should compress strings', function (done) {
    var app = koa()

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
    var app = koa()

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

  it('should compress buffers', function (done) {
    var app = koa()

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
    var app = koa()

    app.use(compress())

    app.use(function* (next) {
      this.type = 'application/javascript'
      this.body = fs.createReadStream(path.join(__dirname, 'index.js'))
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

  it('should compress when this.compress === true', function (done) {
    var app = koa()

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

  it('should not compress when this.compress === false', function (done) {
    var app = koa()

    app.use(compress())
    app.use(function *(next) {
      this.compress = false
      this.body = buffer
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
    var app = koa()

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
    var app = koa()

    app.use(compress())
    app.use(sendBuffer)

    request(app.listen())
    .get('/')
    .set('Accept-Encoding', 'sdch, gzip, deflate')
    .expect(200, done)
  })
})