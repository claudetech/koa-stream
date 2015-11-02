'use strict';

const koa    = require('koa');
const stream = require('..');

let app = koa();

app.use(function *() {
  if (this.path === '/video') {
    yield stream.file(this, 'sample_video.mp4', {root: '/tmp/videos'});
  } else {
    this.body = '<video src="http://localhost:3000/video" controls autoplay>';
  }
});

app.listen(3000);
