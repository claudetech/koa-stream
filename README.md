# koa-stream

Helper to stream file with range requests using koa.
This can be used with `video` tags, and other resource using the `Range` header.

The implementation follows [RFC 7233](https://tools.ietf.org/html/rfc7233).

## Installation 

```sh
$ npm install koa-stream
```

## Usage

```javascript
var stream = require('koa-stream');
var path   = require('path');
var app    = require('koa');

app.use(function *() {
    yield stream('my-video.mp4', {root: path.join(__dirname, '/public')});
});
```

An example is provided in [the sample directory](./sample).

### Options

* `root`: the directory from which file paths will be resolved
* `allowDownload`: allow to return the file instead of streaming it if not `Range` header is provided


