SEE https://github.com/koajs/compress/releases

5.2.0 / 2026-02-10
==================

* add functional and local options
* updated dependencies
* copied the project setup from Koa
* add zstd
* use `negotiator` for content negotiation
* add TypeScript typings and tests

5.1.1 / 2023-04-08
==================

* minor refactoring + updated dependencies

5.1.0 / 2021-08-17
==================

* change brotli defaults (compression level to 4)
* updated dependencies

5.0.1 / 2020-07-06
==================

* updated to accomodate Node changes: zlib constants were moved to a different namespace

5.0.0 / 2020-07-05
==================

 * add `defaultEncoding`

4.0.1 / 2020-04-29
==================

 * fix issue with state being preserved between requests

4.0.0 / 2020-04-27
==================

 * drop support for versions of node below 10
 * add brotli support for versions of node that support it
 * changed compression options; `options` is no longer passed to each compression function. Use `options.gzip = {}`, `options.br = {}`, etc.
 * added compression disabling option: set `options.br = false`

3.1.0 / 2020-04-15
==================

 * support no-transform @Pawda

3.0.0 / 2018-04-14
==================

 * republish 2.1.0 as it switches to async functions

2.1.0 / 2018-04-13 (unpublished)
==================

 * do not compress if the response is not writable
 * switch testing frameworks to jest
 * implement linting

1.0.8 / 2014-09-14
==================

 * bump compressible

1.0.7 / 2014-05-13
==================

 * bump bytes

1.0.6 / 2014-04-24
==================

 * refactor
 * use statuses

1.0.5 / 2014-04-24
==================

 * bump bytes
 * refactor to use koa-is-json

1.0.4 / 2014-03-
==================

 * skip compression if content-encoding is not set

1.0.3 / 2014-02-24
==================

 * fix for threshold and JSON bodies @logicoder
 * remove `app.jsonSpaces` support

1.0.2 / 2014-01-21
==================

 * fix for when `identity;q=0`

1.0.1 / 2014-01-14
==================

 * update compressible

1.0.0 / 2013-13-21
==================

 * use `yield* next`
 * use compressible
