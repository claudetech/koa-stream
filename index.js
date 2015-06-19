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

const streamFile = function (ctx, range, filepath, stat) {
  ctx.set('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + stat.size);
  ctx.set('Content-Length', range.end - range.start + 1);
  ctx.set('Content-Type', mime.lookup(filepath));
  ctx.set('Accept-Ranges', 'bytes');
  ctx.set('Cache-Control', 'no-cache');
  ctx.status = 206;
  ctx.body = fs.createReadStream(filepath, {start: range.start, end: range.end});
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

  streamFile(ctx, range, filepath, stat);
};

const decode = function (filepath) {
  try {
    return decodeURIComponent(filepath);
  } catch (err) {
    return -1;
  }
};

const stream = function (ctx, filepath, options) {
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

module.exports = stream;
