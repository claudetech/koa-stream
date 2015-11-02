'use strict';

const assert      = require('assert');
const resolvePath = require('resolve-path');
const path        = require('path');
const mime        = require('mime');
const fs          = require('mz/fs');

const parseRange = function (range, totalLength) {
  if (typeof range === 'undefined' || range === null || range.length === 0) {
    return null;
  }

  let array = range.split(/bytes=([0-9]*)-([0-9]*)/);
  let result = {
    start: parseInt(array[1]),
    end: parseInt(array[2])
  };

  if (isNaN(result.end) || result.end < 0) {
    result.end = totalLength - 1;
  }

  if (isNaN(result.start) || result.start < 0) {
    result.start = 0;
  }

  result.totalLength = totalLength;

  return result;
};

const endRequest = function (ctx, size) {
  ctx.set('Content-Range', 'bytes */' + size);
  ctx.body = null;
  ctx.status = 416;
};

const sendFile = function (ctx, filepath, size) {
  ctx.set('Content-Type', mime.lookup(filepath));
  ctx.set('Content-Length', size);
  ctx.set('Accept-Ranges', 'bytes');
  ctx.body = fs.createReadStream(filepath);
};

const sendBufferAtOnce = function (ctx, buffer, type) {
  ctx.set('Content-Type', type);
  ctx.set('Content-Length', buffer.length);
  ctx.body = buffer;
};

const streamRange = function (ctx, body, range, contentType) {
  ctx.set('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + range.totalLength);
  ctx.set('Content-Length', range.end - range.start + 1);
  ctx.set('Content-Type', contentType);
  ctx.set('Accept-Ranges', 'bytes');
  ctx.set('Cache-Control', 'no-cache');
  ctx.status = 206;
  ctx.body = body;
};

const handleFileStream = function (ctx, range, filepath) {
  let stream = fs.createReadStream(filepath, {start: range.start, end: range.end});
  let contentType = mime.lookup(filepath);
  streamRange(ctx, stream, range, contentType);
};

const getFileStat = function *(filepath) {
  try {
    let stats = yield fs.stat(filepath);
    if (stats.isDirectory()) {
      return false;
    }
    return stats;
  } catch (err) {
    let notfound = ['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'];
    if (notfound.indexOf(err.code) !== -1) {
      return false;
    }
    err.status = 500;
    throw err;
  }
};

const handleRequest = function *(ctx, filepath, options) {
  let stat = yield getFileStat(filepath);
  if (!stat) {
    return;
  }

  let range = parseRange(ctx.headers.range, stat.size);

  if (range === null) {
    return options.allowDownload ? sendFile(ctx, filepath, stat.size) : null;
  }

  if (range.start >= stat.size || range.end >= stat.size) {
    return endRequest(ctx, stat.size);
  }

  handleFileStream(ctx, range, filepath, stat);
};

const handleBuffer = function (ctx, buffer, contentType, options) {
  let range = parseRange(ctx.headers.range, buffer.length);

  if (range === null) {
    return options.allowDownload ? sendBufferAtOnce(ctx, buffer, contentType) : null;
  }

  if (range.start >= buffer.length || range.end >= buffer.length) {
    return endRequest(ctx, buffer.length);
  }

  let bufferSlice = buffer.slice(range.start, range.end);
  streamRange(ctx, bufferSlice, range, contentType);
};

const decode = function (filepath) {
  try {
    return decodeURIComponent(filepath);
  } catch (err) {
    return -1;
  }
};

const streamFile = function (ctx, filepath, options) {
  assert(ctx, 'koa context required');
  assert(filepath, 'filepath required');
  options = options || {};
  let root = options.root ? path.normalize(path.resolve(options.root)) : '';
  filepath = filepath[0] === '/' ? filepath.slice(1) : filepath;
  filepath = decode(filepath);
  if (filepath === -1) {
    return ctx.throw('failed to decode', 400);
  }
  filepath = resolvePath(root, filepath);
  return handleRequest(ctx, filepath, options);
};

const streamBuffer = function (ctx, buffer, contentType, options) {
  assert(ctx, 'koa context required');
  assert(buffer instanceof Buffer, 'buffer required');
  options = options || {};
  return handleBuffer(ctx, buffer, contentType, options);
};

module.exports = {
	file: streamFile,
	buffer: streamBuffer
};
