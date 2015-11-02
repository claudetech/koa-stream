'use strict';

const request = require('supertest');
const koa     = require('koa');

const stream = require('..');

const testBuffer = new Buffer([1,2,3,4,5]);

const makeRequest = function (filepath, options) {
  let app = koa();
  options = options || {};

  app.use(function *() {
    yield stream.file(this, filepath, options);
  });

  let req = request(app.listen())
    .get('/');
  if (options.range) {
    req.set('Range', 'bytes=' + options.range.start + '-' + options.range.end);
  }
  return req;
};

const makeRequestForBuffer = function (options) {
  let app = koa();
  options = options || {};

  let contentType = 'application/octet-stream';

  app.use(function *() {
    stream.buffer(this, testBuffer, contentType, options);
  });

  let req = request(app.listen())
    .get('/');
  if (options.range) {
    req.set('Range', 'bytes=' + options.range.start + '-' + options.range.end);
  }
  return req;
};

describe('streamFile(ctx, file)', function () {
  context('with no root', function () {
    context('with absolute path', function () {
      it('should return 404', function (done) {
        makeRequest(__dirname + '/fixtures/file.txt')
          .expect(404, done);
      });
    });
    context('with relative path', function () {
      it('should download file', function (done) {
        makeRequest('test/fixtures/file.txt', {allowDownload: true})
          .expect(200)
          .expect('0123456789', done);
      });
    });

    context('with path containing ..', function () {
      it('should return 403', function (done) {
        makeRequest('../leaves/package.json', {allowDownload: true})
          .expect(403, done);
      });
    });
  });

  context('with root', function () {
    it('should use provided root', function (done) {
      makeRequest('file.txt', {root: __dirname + '/fixtures', allowDownload: true})
        .expect(200)
        .expect('0123456789', done);
    });
  });

  context('with directory', function () {
    it('should return 404', function (done) {
      makeRequest('test/fixtures', {allowDownload: true})
        .expect(404, done);
    });
  });

  context('with no range', function () {
    context('when download not allowed', function () {
      it('should return 404', function (done) {
        makeRequest('test/fixtures/file.txt')
          .expect(404, done);
      });
    });
    context('when download allowed', function () {
      it('should download file', function (done) {
        makeRequest('test/fixtures/file.txt', {allowDownload: true})
          .expect(200)
          .expect('0123456789', done);
      });
    });
  });

  context('with range', function () {
    context('when range is correct', function () {
      it('should return partial response', function (done) {
        makeRequest('test/fixtures/file.txt', {range: {start: 1, end: 3}})
          .expect(206)
          .expect('123', done);
      });
    });
    context('when start is incorrect', function () {
      it('should default to 0', function (done) {
        makeRequest('test/fixtures/file.txt', {range: {start: -1, end: 3}})
          .expect(206)
          .expect('01', done);
      });
    });

    context('when range is too large', function () {
      it('should return 416', function (done) {
        makeRequest('test/fixtures/file.txt', {range: {start: 5, end: 100}})
          .expect(416, done);
      });
    });
  });

  context('with encoded path', function () {
    context('if path is correctly encoded', function () {
      it('should return file', function (done) {
        makeRequest('test%2Ffixtures%2Ffile.txt', {allowDownload: true})
          .expect(200)
          .expect('0123456789', done);
      });
    });
    context('if it fails decoding', function () {
      it('should return 400', function (done) {
        makeRequest('test%2Zfixtures%2Ffile.txt', {allowDownload: true})
          .expect(400, done);
      });
    });
  });
});

describe('streamBuffer(ctx, buffer, type)', function () {
  context('with no range', function () {
    context('when download not allowed', function () {
      it('should return 404', function (done) {
        makeRequestForBuffer()
          .expect(404, done);
      });
    });

    context('when download allowed', function () {
      it('should fetch the entire buffer', function (done) {
        makeRequestForBuffer({allowDownload: true})
          .expect(200)
          .expect(testBuffer.toString(), done);
      });
    });
  });

  context('with range', function () {
    context('when range is correct', function () {
      it('should return partial response', function (done) {
        makeRequestForBuffer({range: {start: 1, end: 3}})
          .expect(206)
          .expect(testBuffer.slice(1, 3).toString(), done);
      });
    });

    context('when start is incorrect', function () {
      it('should default to 0', function (done) {
        makeRequestForBuffer({range: {start: -1, end: 3}})
          .expect(206)
          .expect(testBuffer.slice(0, 1).toString(), done);
      });
    });

    context('when range is too large', function () {
      it('should return 416', function (done) {
        makeRequestForBuffer({range: {start: 5, end: 100}})
          .expect(416, done);
      });
    });
  });
});
