import crypto = require("crypto");
import Koa = require("koa");

import compress = require("..");
import { Server } from "http";

function compressTest() {
  const buffer = crypto.randomBytes(1024);
  const string = buffer.toString("hex");

  function sendString(ctx: Koa.Context, next: Koa.Next) {
    ctx.body = string;
  }

  function sendBuffer(ctx: Koa.Context, next: Koa.Next) {
    ctx.compress = true;
    ctx.body = buffer;
  }

  let server: Server;
  // afterEach(() => { if (server) server.close() })

  async function shouldCompressStringsTest() {
    const app = new Koa();

    app.use(compress());
    app.use(sendString);
    server = app.listen();
  }
  shouldCompressStringsTest();

  async function shouldNotCompressStringsBelowThresholdTest() {
    const app = new Koa();

    app.use(
      compress({
        threshold: "1mb",
      }),
    );
    app.use(sendString);
    server = app.listen();
  }
  shouldNotCompressStringsBelowThresholdTest();

  async function shouldNotCompressWhenCtxCompressIsFalseTest() {
    const app = new Koa();

    app.use(compress());
    app.use((ctx, next) => {
      ctx.compress = false;
      ctx.body = buffer;
    });
    server = app.listen();
  }
  shouldNotCompressWhenCtxCompressIsFalseTest();

  async function shouldNotCompressIfNoAcceptEncodingIsSentTest() {
    const app = new Koa();
    app.use(
      compress({
        threshold: 0,
      }),
    );
    app.use((ctx) => {
      ctx.type = "text";
      ctx.body = buffer;
    });
    server = app.listen();
  }
  shouldNotCompressIfNoAcceptEncodingIsSentTest();

  async function shouldBeGzipIfNoAcceptEncodingIsSentTest() {
    const app = new Koa();
    app.use(
      compress({
        threshold: 0,
        defaultEncoding: "*",
      }),
    );
    app.use((ctx) => {
      ctx.type = "text";
      ctx.body = buffer;
    });
    server = app.listen();
  }
  shouldBeGzipIfNoAcceptEncodingIsSentTest();

  async function acceptEncodingBrTest() {
    const app = new Koa();

    app.use(compress({ br: false }));
    app.use(sendBuffer);
    server = app.listen();
  }
  acceptEncodingBrTest();

  async function acceptEncodingZstdTest() {
    const app = new Koa();

    app.use(compress({ zstd: false }));
    app.use(sendBuffer);
    server = app.listen();
  }
  acceptEncodingZstdTest();

  function functionalThresholdShouldNotCompressTest() {
    const app = new Koa();

    app.use(
      compress({
        threshold: () => "1mb",
      }),
    );
    app.use(sendString);
    server = app.listen();
  }
  functionalThresholdShouldNotCompressTest();

  function functionalCompressorsShouldNotCompressTest() {
    const app = new Koa();

    app.use(
      compress({
        br: false,
        gzip: (type, size) => /^text\//i.test(type) && size > 1000000,
      }),
    );
    app.use(sendBuffer);
    server = app.listen();
  }
  functionalCompressorsShouldNotCompressTest();

  function functionalCompressorsShouldNotCompressWithGzipTest() {
    const app = new Koa();

    app.use(compress({ br: false, gzip: false }));
    app.use((ctx) => {
      ctx.compress = { gzip: (type, size) => size < 1000000 };
      ctx.body = string;
    });
    server = app.listen();
  }
  functionalCompressorsShouldNotCompressWithGzipTest();

  function functionalCompressorsShouldNotCompressWithGzip2Test() {
    const app = new Koa();

    app.use(compress({ br: false, gzip: false }));
    app.use((ctx) => {
      ctx.compress = { gzip: (type, size) => size < 100 };
      ctx.body = string;
    });
    server = app.listen();
  }
  functionalCompressorsShouldNotCompressWithGzip2Test();

  function functionalCompressorsShouldNotCompressWithBrTest() {
    const app = new Koa();

    app.use(compress({ br: false, gzip: false }));
    app.use((ctx) => {
      ctx.compress = { gzip: () => false, br: () => true };
      ctx.body = string;
    });
    server = app.listen();
  }
  functionalCompressorsShouldNotCompressWithBrTest();

  function functionalCompressorsShouldCompressWithZstdTest() {
    const app = new Koa();

    app.use(compress({ br: false, gzip: false, zstd: false }));
    app.use((ctx) => {
      ctx.compress = { gzip: () => false, br: () => false, zstd: () => true };
      ctx.body = string;
    });
    server = app.listen();
  }
  functionalCompressorsShouldCompressWithZstdTest();

  function shouldRespectEncodingPreferenceTest() {
    const app = new Koa();

    app.use(compress({ encodingPreference: ["deflate", "gzip", "br"] }));
    app.use((ctx) => {
      ctx.body = string;
    });
    server = app.listen();
  }
  shouldRespectEncodingPreferenceTest();

  // coverage tests

  async function shouldBeIdentityIfBadDefaultEncodingTest() {
    const app = new Koa();
    app.use(
      compress({
        threshold: 0,
        defaultEncoding: "invalid",
      }),
    );
    app.use((ctx) => {
      ctx.type = "text";
      ctx.body = buffer;
    });
    server = app.listen();
  }
  shouldBeIdentityIfBadDefaultEncodingTest();

  async function shouldBeIdentityIfBadWildcardAcceptEncodingTest() {
    const app = new Koa();
    app.use(
      compress({
        threshold: 0,
        wildcardAcceptEncoding: "invalid",
      }),
    );
    app.use((ctx) => {
      ctx.type = "text";
      ctx.body = buffer;
    });
    server = app.listen();
  }
  shouldBeIdentityIfBadWildcardAcceptEncodingTest();
}
compressTest();
