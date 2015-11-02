# koa-stream [![Build Status](https://travis-ci.org/claudetech/koa-stream.svg?branch=master)](https://travis-ci.org/claudetech/koa-stream) [![Coverage Status](https://coveralls.io/repos/claudetech/koa-stream/badge.svg)](https://coveralls.io/r/claudetech/koa-stream)

Helper to stream file with range requests using koa.
This can be used with `video` tags, and other resource using the `Range` header.

The implementation follows [RFC 7233](https://tools.ietf.org/html/rfc7233).

## Installation

```sh
$ npm install koa-stream
```

## Usage

### Stream Files

```javascript
var streamFile = require('koa-stream').streamFile;
var path   = require('path');
var app    = require('koa');

app.use(function *() {
    yield streamFile(this, 'my-video.mp4', {root: path.join(__dirname, '/public')});
});
```

### Stream Buffers

```javascript
var streamBuffer = require('koa-stream').streamBuffer;
var path   = require('path');
var app    = require('koa');

app.use(function *() {
    streamBuffer(this, new Buffer([1,2,3]), 'image/png', {allowDownload: true});
});
```

See [sample/index.js](./sample/index.js) for a working example.

### Options

* `root`: the directory from which file paths will be resolved
* `allowDownload`: allow to return the file instead of streaming it if not `Range` header is provided


