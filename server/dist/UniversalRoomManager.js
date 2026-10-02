var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import require$$0$3 from "events";
import require$$1$2 from "https";
import require$$2$2 from "http";
import require$$3 from "net";
import require$$4 from "tls";
import require$$1$1 from "crypto";
import require$$0$2 from "stream";
import require$$7 from "url";
import require$$0 from "zlib";
import require$$0$1 from "buffer";
import require$$2$1 from "util";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function getAugmentedNamespace(n) {
  if (Object.prototype.hasOwnProperty.call(n, "__esModule")) return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
var bufferUtil = { exports: {} };
var constants;
var hasRequiredConstants;
function requireConstants() {
  if (hasRequiredConstants) return constants;
  hasRequiredConstants = 1;
  const BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
  const hasBlob = typeof Blob !== "undefined";
  if (hasBlob) BINARY_TYPES.push("blob");
  constants = {
    BINARY_TYPES,
    CLOSE_TIMEOUT: 3e4,
    EMPTY_BUFFER: Buffer.alloc(0),
    GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
    hasBlob,
    kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
    kListener: Symbol("kListener"),
    kStatusCode: Symbol("status-code"),
    kWebSocket: Symbol("websocket"),
    NOOP: () => {
    }
  };
  return constants;
}
const __viteOptionalPeerDep_bufferutil_ws = {};
const __viteOptionalPeerDep_bufferutil_ws$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: __viteOptionalPeerDep_bufferutil_ws
}, Symbol.toStringTag, { value: "Module" }));
const require$$1 = /* @__PURE__ */ getAugmentedNamespace(__viteOptionalPeerDep_bufferutil_ws$1);
var hasRequiredBufferUtil;
function requireBufferUtil() {
  if (hasRequiredBufferUtil) return bufferUtil.exports;
  hasRequiredBufferUtil = 1;
  const { EMPTY_BUFFER } = requireConstants();
  const FastBuffer = Buffer[Symbol.species];
  function concat(list, totalLength) {
    if (list.length === 0) return EMPTY_BUFFER;
    if (list.length === 1) return list[0];
    const target = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (let i = 0; i < list.length; i++) {
      const buf = list[i];
      target.set(buf, offset);
      offset += buf.length;
    }
    if (offset < totalLength) {
      return new FastBuffer(target.buffer, target.byteOffset, offset);
    }
    return target;
  }
  function _mask(source, mask, output, offset, length) {
    for (let i = 0; i < length; i++) {
      output[offset + i] = source[i] ^ mask[i & 3];
    }
  }
  function _unmask(buffer, mask) {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] ^= mask[i & 3];
    }
  }
  function toArrayBuffer(buf) {
    if (buf.length === buf.buffer.byteLength) {
      return buf.buffer;
    }
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  }
  function toBuffer(data) {
    toBuffer.readOnly = true;
    if (Buffer.isBuffer(data)) return data;
    let buf;
    if (data instanceof ArrayBuffer) {
      buf = new FastBuffer(data);
    } else if (ArrayBuffer.isView(data)) {
      buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
    } else {
      buf = Buffer.from(data);
      toBuffer.readOnly = false;
    }
    return buf;
  }
  bufferUtil.exports = {
    concat,
    mask: _mask,
    toArrayBuffer,
    toBuffer,
    unmask: _unmask
  };
  if (!process.env.WS_NO_BUFFER_UTIL) {
    try {
      const bufferUtil$1 = require$$1;
      bufferUtil.exports.mask = function(source, mask, output, offset, length) {
        if (length < 48) _mask(source, mask, output, offset, length);
        else bufferUtil$1.mask(source, mask, output, offset, length);
      };
      bufferUtil.exports.unmask = function(buffer, mask) {
        if (buffer.length < 32) _unmask(buffer, mask);
        else bufferUtil$1.unmask(buffer, mask);
      };
    } catch (e) {
    }
  }
  return bufferUtil.exports;
}
var limiter;
var hasRequiredLimiter;
function requireLimiter() {
  if (hasRequiredLimiter) return limiter;
  hasRequiredLimiter = 1;
  const kDone = Symbol("kDone");
  const kRun = Symbol("kRun");
  class Limiter {
    /**
     * Creates a new `Limiter`.
     *
     * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
     *     to run concurrently
     */
    constructor(concurrency) {
      this[kDone] = () => {
        this.pending--;
        this[kRun]();
      };
      this.concurrency = concurrency || Infinity;
      this.jobs = [];
      this.pending = 0;
    }
    /**
     * Adds a job to the queue.
     *
     * @param {Function} job The job to run
     * @public
     */
    add(job) {
      this.jobs.push(job);
      this[kRun]();
    }
    /**
     * Removes a job from the queue and runs it if possible.
     *
     * @private
     */
    [kRun]() {
      if (this.pending === this.concurrency) return;
      if (this.jobs.length) {
        const job = this.jobs.shift();
        this.pending++;
        job(this[kDone]);
      }
    }
  }
  limiter = Limiter;
  return limiter;
}
var permessageDeflate;
var hasRequiredPermessageDeflate;
function requirePermessageDeflate() {
  if (hasRequiredPermessageDeflate) return permessageDeflate;
  hasRequiredPermessageDeflate = 1;
  const zlib = require$$0;
  const bufferUtil2 = requireBufferUtil();
  const Limiter = requireLimiter();
  const { kStatusCode } = requireConstants();
  const FastBuffer = Buffer[Symbol.species];
  const TRAILER = Buffer.from([0, 0, 255, 255]);
  const kPerMessageDeflate = Symbol("permessage-deflate");
  const kTotalLength = Symbol("total-length");
  const kCallback = Symbol("callback");
  const kBuffers = Symbol("buffers");
  const kError = Symbol("error");
  let zlibLimiter;
  class PerMessageDeflate {
    /**
     * Creates a PerMessageDeflate instance.
     *
     * @param {Object} [options] Configuration options
     * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
     *     for, or request, a custom client window size
     * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
     *     acknowledge disabling of client context takeover
     * @param {Number} [options.concurrencyLimit=10] The number of concurrent
     *     calls to zlib
     * @param {Boolean} [options.isServer=false] Create the instance in either
     *     server or client mode
     * @param {Number} [options.maxPayload=0] The maximum allowed message length
     * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
     *     use of a custom server window size
     * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
     *     disabling of server context takeover
     * @param {Number} [options.threshold=1024] Size (in bytes) below which
     *     messages should not be compressed if context takeover is disabled
     * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
     *     deflate
     * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
     *     inflate
     */
    constructor(options) {
      this._options = options || {};
      this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
      this._maxPayload = this._options.maxPayload | 0;
      this._isServer = !!this._options.isServer;
      this._deflate = null;
      this._inflate = null;
      this.params = null;
      if (!zlibLimiter) {
        const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
        zlibLimiter = new Limiter(concurrency);
      }
    }
    /**
     * @type {String}
     */
    static get extensionName() {
      return "permessage-deflate";
    }
    /**
     * Create an extension negotiation offer.
     *
     * @return {Object} Extension parameters
     * @public
     */
    offer() {
      const params = {};
      if (this._options.serverNoContextTakeover) {
        params.server_no_context_takeover = true;
      }
      if (this._options.clientNoContextTakeover) {
        params.client_no_context_takeover = true;
      }
      if (this._options.serverMaxWindowBits) {
        params.server_max_window_bits = this._options.serverMaxWindowBits;
      }
      if (this._options.clientMaxWindowBits) {
        params.client_max_window_bits = this._options.clientMaxWindowBits;
      } else if (this._options.clientMaxWindowBits == null) {
        params.client_max_window_bits = true;
      }
      return params;
    }
    /**
     * Accept an extension negotiation offer/response.
     *
     * @param {Array} configurations The extension negotiation offers/reponse
     * @return {Object} Accepted configuration
     * @public
     */
    accept(configurations) {
      configurations = this.normalizeParams(configurations);
      this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
      return this.params;
    }
    /**
     * Releases all resources used by the extension.
     *
     * @public
     */
    cleanup() {
      if (this._inflate) {
        this._inflate.close();
        this._inflate = null;
      }
      if (this._deflate) {
        const callback = this._deflate[kCallback];
        this._deflate.close();
        this._deflate = null;
        if (callback) {
          callback(
            new Error(
              "The deflate stream was closed while data was being processed"
            )
          );
        }
      }
    }
    /**
     *  Accept an extension negotiation offer.
     *
     * @param {Array} offers The extension negotiation offers
     * @return {Object} Accepted configuration
     * @private
     */
    acceptAsServer(offers) {
      const opts = this._options;
      const accepted = offers.find((params) => {
        if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
          return false;
        }
        return true;
      });
      if (!accepted) {
        throw new Error("None of the extension offers can be accepted");
      }
      if (opts.serverNoContextTakeover) {
        accepted.server_no_context_takeover = true;
      }
      if (opts.clientNoContextTakeover) {
        accepted.client_no_context_takeover = true;
      }
      if (typeof opts.serverMaxWindowBits === "number") {
        accepted.server_max_window_bits = opts.serverMaxWindowBits;
      }
      if (typeof opts.clientMaxWindowBits === "number") {
        accepted.client_max_window_bits = opts.clientMaxWindowBits;
      } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
        delete accepted.client_max_window_bits;
      }
      return accepted;
    }
    /**
     * Accept the extension negotiation response.
     *
     * @param {Array} response The extension negotiation response
     * @return {Object} Accepted configuration
     * @private
     */
    acceptAsClient(response) {
      const params = response[0];
      if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
        throw new Error('Unexpected parameter "client_no_context_takeover"');
      }
      if (!params.client_max_window_bits) {
        if (typeof this._options.clientMaxWindowBits === "number") {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        }
      } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
        throw new Error(
          'Unexpected or invalid parameter "client_max_window_bits"'
        );
      }
      return params;
    }
    /**
     * Normalize parameters.
     *
     * @param {Array} configurations The extension negotiation offers/reponse
     * @return {Array} The offers/response with normalized parameters
     * @private
     */
    normalizeParams(configurations) {
      configurations.forEach((params) => {
        Object.keys(params).forEach((key) => {
          let value = params[key];
          if (value.length > 1) {
            throw new Error(`Parameter "${key}" must have only a single value`);
          }
          value = value[0];
          if (key === "client_max_window_bits") {
            if (value !== true) {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (!this._isServer) {
              throw new TypeError(
                `Invalid value for parameter "${key}": ${value}`
              );
            }
          } else if (key === "server_max_window_bits") {
            const num = +value;
            if (!Number.isInteger(num) || num < 8 || num > 15) {
              throw new TypeError(
                `Invalid value for parameter "${key}": ${value}`
              );
            }
            value = num;
          } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
            if (value !== true) {
              throw new TypeError(
                `Invalid value for parameter "${key}": ${value}`
              );
            }
          } else {
            throw new Error(`Unknown parameter "${key}"`);
          }
          params[key] = value;
        });
      });
      return configurations;
    }
    /**
     * Decompress data. Concurrency limited.
     *
     * @param {Buffer} data Compressed data
     * @param {Boolean} fin Specifies whether or not this is the last fragment
     * @param {Function} callback Callback
     * @public
     */
    decompress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._decompress(data, fin, (err, result) => {
          done();
          callback(err, result);
        });
      });
    }
    /**
     * Compress data. Concurrency limited.
     *
     * @param {(Buffer|String)} data Data to compress
     * @param {Boolean} fin Specifies whether or not this is the last fragment
     * @param {Function} callback Callback
     * @public
     */
    compress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._compress(data, fin, (err, result) => {
          done();
          callback(err, result);
        });
      });
    }
    /**
     * Decompress data.
     *
     * @param {Buffer} data Compressed data
     * @param {Boolean} fin Specifies whether or not this is the last fragment
     * @param {Function} callback Callback
     * @private
     */
    _decompress(data, fin, callback) {
      const endpoint = this._isServer ? "client" : "server";
      if (!this._inflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._inflate = zlib.createInflateRaw({
          ...this._options.zlibInflateOptions,
          windowBits
        });
        this._inflate[kPerMessageDeflate] = this;
        this._inflate[kTotalLength] = 0;
        this._inflate[kBuffers] = [];
        this._inflate.on("error", inflateOnError);
        this._inflate.on("data", inflateOnData);
      }
      this._inflate[kCallback] = callback;
      this._inflate.write(data);
      if (fin) this._inflate.write(TRAILER);
      this._inflate.flush(() => {
        const err = this._inflate[kError];
        if (err) {
          this._inflate.close();
          this._inflate = null;
          callback(err);
          return;
        }
        const data2 = bufferUtil2.concat(
          this._inflate[kBuffers],
          this._inflate[kTotalLength]
        );
        if (this._inflate._readableState.endEmitted) {
          this._inflate.close();
          this._inflate = null;
        } else {
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._inflate.reset();
          }
        }
        callback(null, data2);
      });
    }
    /**
     * Compress data.
     *
     * @param {(Buffer|String)} data Data to compress
     * @param {Boolean} fin Specifies whether or not this is the last fragment
     * @param {Function} callback Callback
     * @private
     */
    _compress(data, fin, callback) {
      const endpoint = this._isServer ? "server" : "client";
      if (!this._deflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._deflate = zlib.createDeflateRaw({
          ...this._options.zlibDeflateOptions,
          windowBits
        });
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        this._deflate.on("data", deflateOnData);
      }
      this._deflate[kCallback] = callback;
      this._deflate.write(data);
      this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
        if (!this._deflate) {
          return;
        }
        let data2 = bufferUtil2.concat(
          this._deflate[kBuffers],
          this._deflate[kTotalLength]
        );
        if (fin) {
          data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
        }
        this._deflate[kCallback] = null;
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
          this._deflate.reset();
        }
        callback(null, data2);
      });
    }
  }
  permessageDeflate = PerMessageDeflate;
  function deflateOnData(chunk) {
    this[kBuffers].push(chunk);
    this[kTotalLength] += chunk.length;
  }
  function inflateOnData(chunk) {
    this[kTotalLength] += chunk.length;
    if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
      this[kBuffers].push(chunk);
      return;
    }
    this[kError] = new RangeError("Max payload size exceeded");
    this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
    this[kError][kStatusCode] = 1009;
    this.removeListener("data", inflateOnData);
    this.reset();
  }
  function inflateOnError(err) {
    this[kPerMessageDeflate]._inflate = null;
    if (this[kError]) {
      this[kCallback](this[kError]);
      return;
    }
    err[kStatusCode] = 1007;
    this[kCallback](err);
  }
  return permessageDeflate;
}
var validation = { exports: {} };
const __viteOptionalPeerDep_utf8Validate_ws = {};
const __viteOptionalPeerDep_utf8Validate_ws$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: __viteOptionalPeerDep_utf8Validate_ws
}, Symbol.toStringTag, { value: "Module" }));
const require$$2 = /* @__PURE__ */ getAugmentedNamespace(__viteOptionalPeerDep_utf8Validate_ws$1);
var hasRequiredValidation;
function requireValidation() {
  if (hasRequiredValidation) return validation.exports;
  hasRequiredValidation = 1;
  const { isUtf8 } = require$$0$1;
  const { hasBlob } = requireConstants();
  const tokenChars = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    // 0 - 15
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    // 16 - 31
    0,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    // 32 - 47
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    // 48 - 63
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    // 64 - 79
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    1,
    1,
    // 80 - 95
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    // 96 - 111
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    1,
    0,
    1,
    0
    // 112 - 127
  ];
  function isValidStatusCode(code) {
    return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
  }
  function _isValidUTF8(buf) {
    const len = buf.length;
    let i = 0;
    while (i < len) {
      if ((buf[i] & 128) === 0) {
        i++;
      } else if ((buf[i] & 224) === 192) {
        if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
          return false;
        }
        i += 2;
      } else if ((buf[i] & 240) === 224) {
        if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
        buf[i] === 237 && (buf[i + 1] & 224) === 160) {
          return false;
        }
        i += 3;
      } else if ((buf[i] & 248) === 240) {
        if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
        buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
          return false;
        }
        i += 4;
      } else {
        return false;
      }
    }
    return true;
  }
  function isBlob(value) {
    return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
  }
  validation.exports = {
    isBlob,
    isValidStatusCode,
    isValidUTF8: _isValidUTF8,
    tokenChars
  };
  if (isUtf8) {
    validation.exports.isValidUTF8 = function(buf) {
      return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
    };
  } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
    try {
      const isValidUTF8 = require$$2;
      validation.exports.isValidUTF8 = function(buf) {
        return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
      };
    } catch (e) {
    }
  }
  return validation.exports;
}
var receiver;
var hasRequiredReceiver;
function requireReceiver() {
  if (hasRequiredReceiver) return receiver;
  hasRequiredReceiver = 1;
  const { Writable } = require$$0$2;
  const PerMessageDeflate = requirePermessageDeflate();
  const {
    BINARY_TYPES,
    EMPTY_BUFFER,
    kStatusCode,
    kWebSocket
  } = requireConstants();
  const { concat, toArrayBuffer, unmask } = requireBufferUtil();
  const { isValidStatusCode, isValidUTF8 } = requireValidation();
  const FastBuffer = Buffer[Symbol.species];
  const GET_INFO = 0;
  const GET_PAYLOAD_LENGTH_16 = 1;
  const GET_PAYLOAD_LENGTH_64 = 2;
  const GET_MASK = 3;
  const GET_DATA = 4;
  const INFLATING = 5;
  const DEFER_EVENT = 6;
  class Receiver extends Writable {
    /**
     * Creates a Receiver instance.
     *
     * @param {Object} [options] Options object
     * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
     *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
     *     multiple times in the same tick
     * @param {String} [options.binaryType=nodebuffer] The type for binary data
     * @param {Object} [options.extensions] An object containing the negotiated
     *     extensions
     * @param {Boolean} [options.isServer=false] Specifies whether to operate in
     *     client or server mode
     * @param {Number} [options.maxBufferedChunks=0] The maximum number of
     *     buffered data chunks
     * @param {Number} [options.maxFragments=0] The maximum number of message
     *     fragments
     * @param {Number} [options.maxPayload=0] The maximum allowed message length
     * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
     *     not to skip UTF-8 validation for text and close messages
     */
    constructor(options = {}) {
      super();
      this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
      this._binaryType = options.binaryType || BINARY_TYPES[0];
      this._extensions = options.extensions || {};
      this._isServer = !!options.isServer;
      this._maxBufferedChunks = options.maxBufferedChunks | 0;
      this._maxFragments = options.maxFragments | 0;
      this._maxPayload = options.maxPayload | 0;
      this._skipUTF8Validation = !!options.skipUTF8Validation;
      this[kWebSocket] = void 0;
      this._bufferedBytes = 0;
      this._buffers = [];
      this._compressed = false;
      this._payloadLength = 0;
      this._mask = void 0;
      this._fragmented = 0;
      this._masked = false;
      this._fin = false;
      this._opcode = 0;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._numFragments = 0;
      this._fragments = [];
      this._errored = false;
      this._loop = false;
      this._state = GET_INFO;
    }
    /**
     * Implements `Writable.prototype._write()`.
     *
     * @param {Buffer} chunk The chunk of data to write
     * @param {String} encoding The character encoding of `chunk`
     * @param {Function} cb Callback
     * @private
     */
    _write(chunk, encoding, cb) {
      if (this._opcode === 8 && this._state == GET_INFO) return cb();
      if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
        cb(
          this.createError(
            RangeError,
            "Too many buffered chunks",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          )
        );
        return;
      }
      this._bufferedBytes += chunk.length;
      this._buffers.push(chunk);
      this.startLoop(cb);
    }
    /**
     * Consumes `n` bytes from the buffered data.
     *
     * @param {Number} n The number of bytes to consume
     * @return {Buffer} The consumed bytes
     * @private
     */
    consume(n) {
      this._bufferedBytes -= n;
      if (n === this._buffers[0].length) return this._buffers.shift();
      if (n < this._buffers[0].length) {
        const buf = this._buffers[0];
        this._buffers[0] = new FastBuffer(
          buf.buffer,
          buf.byteOffset + n,
          buf.length - n
        );
        return new FastBuffer(buf.buffer, buf.byteOffset, n);
      }
      const dst = Buffer.allocUnsafe(n);
      do {
        const buf = this._buffers[0];
        const offset = dst.length - n;
        if (n >= buf.length) {
          dst.set(this._buffers.shift(), offset);
        } else {
          dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
        }
        n -= buf.length;
      } while (n > 0);
      return dst;
    }
    /**
     * Starts the parsing loop.
     *
     * @param {Function} cb Callback
     * @private
     */
    startLoop(cb) {
      this._loop = true;
      do {
        switch (this._state) {
          case GET_INFO:
            this.getInfo(cb);
            break;
          case GET_PAYLOAD_LENGTH_16:
            this.getPayloadLength16(cb);
            break;
          case GET_PAYLOAD_LENGTH_64:
            this.getPayloadLength64(cb);
            break;
          case GET_MASK:
            this.getMask();
            break;
          case GET_DATA:
            this.getData(cb);
            break;
          case INFLATING:
          case DEFER_EVENT:
            this._loop = false;
            return;
        }
      } while (this._loop);
      if (!this._errored) cb();
    }
    /**
     * Reads the first two bytes of a frame.
     *
     * @param {Function} cb Callback
     * @private
     */
    getInfo(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      const buf = this.consume(2);
      if ((buf[0] & 48) !== 0) {
        const error = this.createError(
          RangeError,
          "RSV2 and RSV3 must be clear",
          true,
          1002,
          "WS_ERR_UNEXPECTED_RSV_2_3"
        );
        cb(error);
        return;
      }
      const compressed = (buf[0] & 64) === 64;
      if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
        const error = this.createError(
          RangeError,
          "RSV1 must be clear",
          true,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1"
        );
        cb(error);
        return;
      }
      this._fin = (buf[0] & 128) === 128;
      this._opcode = buf[0] & 15;
      this._payloadLength = buf[1] & 127;
      if (this._opcode === 0) {
        if (compressed) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        if (!this._fragmented) {
          const error = this.createError(
            RangeError,
            "invalid opcode 0",
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        this._opcode = this._fragmented;
      } else if (this._opcode === 1 || this._opcode === 2) {
        if (this._fragmented) {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        this._compressed = compressed;
      } else if (this._opcode > 7 && this._opcode < 11) {
        if (!this._fin) {
          const error = this.createError(
            RangeError,
            "FIN must be set",
            true,
            1002,
            "WS_ERR_EXPECTED_FIN"
          );
          cb(error);
          return;
        }
        if (compressed) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
          const error = this.createError(
            RangeError,
            `invalid payload length ${this._payloadLength}`,
            true,
            1002,
            "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
      } else {
        const error = this.createError(
          RangeError,
          `invalid opcode ${this._opcode}`,
          true,
          1002,
          "WS_ERR_INVALID_OPCODE"
        );
        cb(error);
        return;
      }
      if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
      this._masked = (buf[1] & 128) === 128;
      if (this._isServer) {
        if (!this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be set",
            true,
            1002,
            "WS_ERR_EXPECTED_MASK"
          );
          cb(error);
          return;
        }
      } else if (this._masked) {
        const error = this.createError(
          RangeError,
          "MASK must be clear",
          true,
          1002,
          "WS_ERR_UNEXPECTED_MASK"
        );
        cb(error);
        return;
      }
      if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
      else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
      else this.haveLength(cb);
    }
    /**
     * Gets extended payload length (7+16).
     *
     * @param {Function} cb Callback
     * @private
     */
    getPayloadLength16(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      this._payloadLength = this.consume(2).readUInt16BE(0);
      this.haveLength(cb);
    }
    /**
     * Gets extended payload length (7+64).
     *
     * @param {Function} cb Callback
     * @private
     */
    getPayloadLength64(cb) {
      if (this._bufferedBytes < 8) {
        this._loop = false;
        return;
      }
      const buf = this.consume(8);
      const num = buf.readUInt32BE(0);
      if (num > Math.pow(2, 53 - 32) - 1) {
        const error = this.createError(
          RangeError,
          "Unsupported WebSocket frame: payload length > 2^53 - 1",
          false,
          1009,
          "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
        );
        cb(error);
        return;
      }
      this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
      this.haveLength(cb);
    }
    /**
     * Payload length has been read.
     *
     * @param {Function} cb Callback
     * @private
     */
    haveLength(cb) {
      if (this._payloadLength && this._opcode < 8) {
        this._totalPayloadLength += this._payloadLength;
        if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
          const error = this.createError(
            RangeError,
            "Max payload size exceeded",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
          );
          cb(error);
          return;
        }
      }
      if (this._masked) this._state = GET_MASK;
      else this._state = GET_DATA;
    }
    /**
     * Reads mask bytes.
     *
     * @private
     */
    getMask() {
      if (this._bufferedBytes < 4) {
        this._loop = false;
        return;
      }
      this._mask = this.consume(4);
      this._state = GET_DATA;
    }
    /**
     * Reads data bytes.
     *
     * @param {Function} cb Callback
     * @private
     */
    getData(cb) {
      let data = EMPTY_BUFFER;
      if (this._payloadLength) {
        if (this._bufferedBytes < this._payloadLength) {
          this._loop = false;
          return;
        }
        data = this.consume(this._payloadLength);
        if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
          unmask(data, this._mask);
        }
      }
      if (this._opcode > 7) {
        this.controlMessage(data, cb);
        return;
      }
      if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
        const error = this.createError(
          RangeError,
          "Too many message fragments",
          false,
          1008,
          "WS_ERR_TOO_MANY_BUFFERED_PARTS"
        );
        cb(error);
        return;
      }
      if (this._compressed) {
        this._state = INFLATING;
        this.decompress(data, cb);
        return;
      }
      if (data.length) {
        this._messageLength = this._totalPayloadLength;
        this._fragments.push(data);
      }
      this.dataMessage(cb);
    }
    /**
     * Decompresses data.
     *
     * @param {Buffer} data Compressed data
     * @param {Function} cb Callback
     * @private
     */
    decompress(data, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      perMessageDeflate.decompress(data, this._fin, (err, buf) => {
        if (err) return cb(err);
        if (buf.length) {
          this._messageLength += buf.length;
          if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
          this._fragments.push(buf);
        }
        this.dataMessage(cb);
        if (this._state === GET_INFO) this.startLoop(cb);
      });
    }
    /**
     * Handles a data message.
     *
     * @param {Function} cb Callback
     * @private
     */
    dataMessage(cb) {
      if (!this._fin) {
        this._state = GET_INFO;
        return;
      }
      const messageLength = this._messageLength;
      const fragments = this._fragments;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._fragmented = 0;
      this._numFragments = 0;
      this._fragments = [];
      if (this._opcode === 2) {
        let data;
        if (this._binaryType === "nodebuffer") {
          data = concat(fragments, messageLength);
        } else if (this._binaryType === "arraybuffer") {
          data = toArrayBuffer(concat(fragments, messageLength));
        } else if (this._binaryType === "blob") {
          data = new Blob(fragments);
        } else {
          data = fragments;
        }
        if (this._allowSynchronousEvents) {
          this.emit("message", data, true);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", data, true);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      } else {
        const buf = concat(fragments, messageLength);
        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
          const error = this.createError(
            Error,
            "invalid UTF-8 sequence",
            true,
            1007,
            "WS_ERR_INVALID_UTF8"
          );
          cb(error);
          return;
        }
        if (this._state === INFLATING || this._allowSynchronousEvents) {
          this.emit("message", buf, false);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", buf, false);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
    }
    /**
     * Handles a control message.
     *
     * @param {Buffer} data Data to handle
     * @return {(Error|RangeError|undefined)} A possible error
     * @private
     */
    controlMessage(data, cb) {
      if (this._opcode === 8) {
        if (data.length === 0) {
          this._loop = false;
          this.emit("conclude", 1005, EMPTY_BUFFER);
          this.end();
        } else {
          const code = data.readUInt16BE(0);
          if (!isValidStatusCode(code)) {
            const error = this.createError(
              RangeError,
              `invalid status code ${code}`,
              true,
              1002,
              "WS_ERR_INVALID_CLOSE_CODE"
            );
            cb(error);
            return;
          }
          const buf = new FastBuffer(
            data.buffer,
            data.byteOffset + 2,
            data.length - 2
          );
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          this._loop = false;
          this.emit("conclude", code, buf);
          this.end();
        }
        this._state = GET_INFO;
        return;
      }
      if (this._allowSynchronousEvents) {
        this.emit(this._opcode === 9 ? "ping" : "pong", data);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    }
    /**
     * Builds an error object.
     *
     * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
     * @param {String} message The error message
     * @param {Boolean} prefix Specifies whether or not to add a default prefix to
     *     `message`
     * @param {Number} statusCode The status code
     * @param {String} errorCode The exposed error code
     * @return {(Error|RangeError)} The error
     * @private
     */
    createError(ErrorCtor, message, prefix, statusCode, errorCode) {
      this._loop = false;
      this._errored = true;
      const err = new ErrorCtor(
        prefix ? `Invalid WebSocket frame: ${message}` : message
      );
      Error.captureStackTrace(err, this.createError);
      err.code = errorCode;
      err[kStatusCode] = statusCode;
      return err;
    }
  }
  receiver = Receiver;
  return receiver;
}
var sender;
var hasRequiredSender;
function requireSender() {
  if (hasRequiredSender) return sender;
  hasRequiredSender = 1;
  const { Duplex } = require$$0$2;
  const { randomFillSync } = require$$1$1;
  const {
    types: { isUint8Array }
  } = require$$2$1;
  const PerMessageDeflate = requirePermessageDeflate();
  const { EMPTY_BUFFER, kWebSocket, NOOP } = requireConstants();
  const { isBlob, isValidStatusCode } = requireValidation();
  const { mask: applyMask, toBuffer } = requireBufferUtil();
  const kByteLength = Symbol("kByteLength");
  const maskBuffer = Buffer.alloc(4);
  const RANDOM_POOL_SIZE = 8 * 1024;
  let randomPool;
  let randomPoolPointer = RANDOM_POOL_SIZE;
  const DEFAULT = 0;
  const DEFLATING = 1;
  const GET_BLOB_DATA = 2;
  class Sender {
    /**
     * Creates a Sender instance.
     *
     * @param {Duplex} socket The connection socket
     * @param {Object} [extensions] An object containing the negotiated extensions
     * @param {Function} [generateMask] The function used to generate the masking
     *     key
     */
    constructor(socket, extensions, generateMask) {
      this._extensions = extensions || {};
      if (generateMask) {
        this._generateMask = generateMask;
        this._maskBuffer = Buffer.alloc(4);
      }
      this._socket = socket;
      this._firstFragment = true;
      this._compress = false;
      this._bufferedBytes = 0;
      this._queue = [];
      this._state = DEFAULT;
      this.onerror = NOOP;
      this[kWebSocket] = void 0;
    }
    /**
     * Frames a piece of data according to the HyBi WebSocket protocol.
     *
     * @param {(Buffer|String)} data The data to frame
     * @param {Object} options Options object
     * @param {Boolean} [options.fin=false] Specifies whether or not to set the
     *     FIN bit
     * @param {Function} [options.generateMask] The function used to generate the
     *     masking key
     * @param {Boolean} [options.mask=false] Specifies whether or not to mask
     *     `data`
     * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
     *     key
     * @param {Number} options.opcode The opcode
     * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
     *     modified
     * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
     *     RSV1 bit
     * @return {(Buffer|String)[]} The framed data
     * @public
     */
    static frame(data, options) {
      let mask;
      let merge = false;
      let offset = 2;
      let skipMasking = false;
      if (options.mask) {
        mask = options.maskBuffer || maskBuffer;
        if (options.generateMask) {
          options.generateMask(mask);
        } else {
          if (randomPoolPointer === RANDOM_POOL_SIZE) {
            if (randomPool === void 0) {
              randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
            }
            randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
            randomPoolPointer = 0;
          }
          mask[0] = randomPool[randomPoolPointer++];
          mask[1] = randomPool[randomPoolPointer++];
          mask[2] = randomPool[randomPoolPointer++];
          mask[3] = randomPool[randomPoolPointer++];
        }
        skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
        offset = 6;
      }
      let dataLength;
      if (typeof data === "string") {
        if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
          dataLength = options[kByteLength];
        } else {
          data = Buffer.from(data);
          dataLength = data.length;
        }
      } else {
        dataLength = data.length;
        merge = options.mask && options.readOnly && !skipMasking;
      }
      let payloadLength = dataLength;
      if (dataLength >= 65536) {
        offset += 8;
        payloadLength = 127;
      } else if (dataLength > 125) {
        offset += 2;
        payloadLength = 126;
      }
      const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
      target[0] = options.fin ? options.opcode | 128 : options.opcode;
      if (options.rsv1) target[0] |= 64;
      target[1] = payloadLength;
      if (payloadLength === 126) {
        target.writeUInt16BE(dataLength, 2);
      } else if (payloadLength === 127) {
        target[2] = target[3] = 0;
        target.writeUIntBE(dataLength, 4, 6);
      }
      if (!options.mask) return [target, data];
      target[1] |= 128;
      target[offset - 4] = mask[0];
      target[offset - 3] = mask[1];
      target[offset - 2] = mask[2];
      target[offset - 1] = mask[3];
      if (skipMasking) return [target, data];
      if (merge) {
        applyMask(data, mask, target, offset, dataLength);
        return [target];
      }
      applyMask(data, mask, data, 0, dataLength);
      return [target, data];
    }
    /**
     * Sends a close message to the other peer.
     *
     * @param {Number} [code] The status code component of the body
     * @param {(String|Buffer)} [data] The message component of the body
     * @param {Boolean} [mask=false] Specifies whether or not to mask the message
     * @param {Function} [cb] Callback
     * @public
     */
    close(code, data, mask, cb) {
      let buf;
      if (code === void 0) {
        buf = EMPTY_BUFFER;
      } else if (typeof code !== "number" || !isValidStatusCode(code)) {
        throw new TypeError("First argument must be a valid error code number");
      } else if (data === void 0 || !data.length) {
        buf = Buffer.allocUnsafe(2);
        buf.writeUInt16BE(code, 0);
      } else {
        const length = Buffer.byteLength(data);
        if (length > 123) {
          throw new RangeError("The message must not be greater than 123 bytes");
        }
        buf = Buffer.allocUnsafe(2 + length);
        buf.writeUInt16BE(code, 0);
        if (typeof data === "string") {
          buf.write(data, 2);
        } else if (isUint8Array(data)) {
          buf.set(data, 2);
        } else {
          throw new TypeError("Second argument must be a string or a Uint8Array");
        }
      }
      const options = {
        [kByteLength]: buf.length,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 8,
        readOnly: false,
        rsv1: false
      };
      if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, buf, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(buf, options), cb);
      }
    }
    /**
     * Sends a ping message to the other peer.
     *
     * @param {*} data The message to send
     * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
     * @param {Function} [cb] Callback
     * @public
     */
    ping(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 9,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    /**
     * Sends a pong message to the other peer.
     *
     * @param {*} data The message to send
     * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
     * @param {Function} [cb] Callback
     * @public
     */
    pong(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 10,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    /**
     * Sends a data message to the other peer.
     *
     * @param {*} data The message to send
     * @param {Object} options Options object
     * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
     *     or text
     * @param {Boolean} [options.compress=false] Specifies whether or not to
     *     compress `data`
     * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
     *     last one
     * @param {Boolean} [options.mask=false] Specifies whether or not to mask
     *     `data`
     * @param {Function} [cb] Callback
     * @public
     */
    send(data, options, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      let opcode = options.binary ? 2 : 1;
      let rsv1 = options.compress;
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (this._firstFragment) {
        this._firstFragment = false;
        if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
          rsv1 = byteLength >= perMessageDeflate._threshold;
        }
        this._compress = rsv1;
      } else {
        rsv1 = false;
        opcode = 0;
      }
      if (options.fin) this._firstFragment = true;
      const opts = {
        [kByteLength]: byteLength,
        fin: options.fin,
        generateMask: this._generateMask,
        mask: options.mask,
        maskBuffer: this._maskBuffer,
        opcode,
        readOnly,
        rsv1
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
        } else {
          this.getBlobData(data, this._compress, opts, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, this._compress, opts, cb]);
      } else {
        this.dispatch(data, this._compress, opts, cb);
      }
    }
    /**
     * Gets the contents of a blob as binary data.
     *
     * @param {Blob} blob The blob
     * @param {Boolean} [compress=false] Specifies whether or not to compress
     *     the data
     * @param {Object} options Options object
     * @param {Boolean} [options.fin=false] Specifies whether or not to set the
     *     FIN bit
     * @param {Function} [options.generateMask] The function used to generate the
     *     masking key
     * @param {Boolean} [options.mask=false] Specifies whether or not to mask
     *     `data`
     * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
     *     key
     * @param {Number} options.opcode The opcode
     * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
     *     modified
     * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
     *     RSV1 bit
     * @param {Function} [cb] Callback
     * @private
     */
    getBlobData(blob, compress, options, cb) {
      this._bufferedBytes += options[kByteLength];
      this._state = GET_BLOB_DATA;
      blob.arrayBuffer().then((arrayBuffer) => {
        if (this._socket.destroyed) {
          const err = new Error(
            "The socket was closed while the blob was being read"
          );
          process.nextTick(callCallbacks, this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        const data = toBuffer(arrayBuffer);
        if (!compress) {
          this._state = DEFAULT;
          this.sendFrame(Sender.frame(data, options), cb);
          this.dequeue();
        } else {
          this.dispatch(data, compress, options, cb);
        }
      }).catch((err) => {
        process.nextTick(onError, this, err, cb);
      });
    }
    /**
     * Dispatches a message.
     *
     * @param {(Buffer|String)} data The message to send
     * @param {Boolean} [compress=false] Specifies whether or not to compress
     *     `data`
     * @param {Object} options Options object
     * @param {Boolean} [options.fin=false] Specifies whether or not to set the
     *     FIN bit
     * @param {Function} [options.generateMask] The function used to generate the
     *     masking key
     * @param {Boolean} [options.mask=false] Specifies whether or not to mask
     *     `data`
     * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
     *     key
     * @param {Number} options.opcode The opcode
     * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
     *     modified
     * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
     *     RSV1 bit
     * @param {Function} [cb] Callback
     * @private
     */
    dispatch(data, compress, options, cb) {
      if (!compress) {
        this.sendFrame(Sender.frame(data, options), cb);
        return;
      }
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      this._bufferedBytes += options[kByteLength];
      this._state = DEFLATING;
      perMessageDeflate.compress(data, options.fin, (_, buf) => {
        if (this._socket.destroyed) {
          const err = new Error(
            "The socket was closed while data was being compressed"
          );
          callCallbacks(this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        this._state = DEFAULT;
        options.readOnly = false;
        this.sendFrame(Sender.frame(buf, options), cb);
        this.dequeue();
      });
    }
    /**
     * Executes queued send operations.
     *
     * @private
     */
    dequeue() {
      while (this._state === DEFAULT && this._queue.length) {
        const params = this._queue.shift();
        this._bufferedBytes -= params[3][kByteLength];
        Reflect.apply(params[0], this, params.slice(1));
      }
    }
    /**
     * Enqueues a send operation.
     *
     * @param {Array} params Send operation parameters.
     * @private
     */
    enqueue(params) {
      this._bufferedBytes += params[3][kByteLength];
      this._queue.push(params);
    }
    /**
     * Sends a frame.
     *
     * @param {(Buffer | String)[]} list The frame to send
     * @param {Function} [cb] Callback
     * @private
     */
    sendFrame(list, cb) {
      if (list.length === 2) {
        this._socket.cork();
        this._socket.write(list[0]);
        this._socket.write(list[1], cb);
        this._socket.uncork();
      } else {
        this._socket.write(list[0], cb);
      }
    }
  }
  sender = Sender;
  function callCallbacks(sender2, err, cb) {
    if (typeof cb === "function") cb(err);
    for (let i = 0; i < sender2._queue.length; i++) {
      const params = sender2._queue[i];
      const callback = params[params.length - 1];
      if (typeof callback === "function") callback(err);
    }
  }
  function onError(sender2, err, cb) {
    callCallbacks(sender2, err, cb);
    sender2.onerror(err);
  }
  return sender;
}
var eventTarget;
var hasRequiredEventTarget;
function requireEventTarget() {
  if (hasRequiredEventTarget) return eventTarget;
  hasRequiredEventTarget = 1;
  const { kForOnEventAttribute, kListener } = requireConstants();
  const kCode = Symbol("kCode");
  const kData = Symbol("kData");
  const kError = Symbol("kError");
  const kMessage = Symbol("kMessage");
  const kReason = Symbol("kReason");
  const kTarget = Symbol("kTarget");
  const kType = Symbol("kType");
  const kWasClean = Symbol("kWasClean");
  class Event {
    /**
     * Create a new `Event`.
     *
     * @param {String} type The name of the event
     * @throws {TypeError} If the `type` argument is not specified
     */
    constructor(type) {
      this[kTarget] = null;
      this[kType] = type;
    }
    /**
     * @type {*}
     */
    get target() {
      return this[kTarget];
    }
    /**
     * @type {String}
     */
    get type() {
      return this[kType];
    }
  }
  Object.defineProperty(Event.prototype, "target", { enumerable: true });
  Object.defineProperty(Event.prototype, "type", { enumerable: true });
  class CloseEvent extends Event {
    /**
     * Create a new `CloseEvent`.
     *
     * @param {String} type The name of the event
     * @param {Object} [options] A dictionary object that allows for setting
     *     attributes via object members of the same name
     * @param {Number} [options.code=0] The status code explaining why the
     *     connection was closed
     * @param {String} [options.reason=''] A human-readable string explaining why
     *     the connection was closed
     * @param {Boolean} [options.wasClean=false] Indicates whether or not the
     *     connection was cleanly closed
     */
    constructor(type, options = {}) {
      super(type);
      this[kCode] = options.code === void 0 ? 0 : options.code;
      this[kReason] = options.reason === void 0 ? "" : options.reason;
      this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
    }
    /**
     * @type {Number}
     */
    get code() {
      return this[kCode];
    }
    /**
     * @type {String}
     */
    get reason() {
      return this[kReason];
    }
    /**
     * @type {Boolean}
     */
    get wasClean() {
      return this[kWasClean];
    }
  }
  Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
  class ErrorEvent extends Event {
    /**
     * Create a new `ErrorEvent`.
     *
     * @param {String} type The name of the event
     * @param {Object} [options] A dictionary object that allows for setting
     *     attributes via object members of the same name
     * @param {*} [options.error=null] The error that generated this event
     * @param {String} [options.message=''] The error message
     */
    constructor(type, options = {}) {
      super(type);
      this[kError] = options.error === void 0 ? null : options.error;
      this[kMessage] = options.message === void 0 ? "" : options.message;
    }
    /**
     * @type {*}
     */
    get error() {
      return this[kError];
    }
    /**
     * @type {String}
     */
    get message() {
      return this[kMessage];
    }
  }
  Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
  Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
  class MessageEvent extends Event {
    /**
     * Create a new `MessageEvent`.
     *
     * @param {String} type The name of the event
     * @param {Object} [options] A dictionary object that allows for setting
     *     attributes via object members of the same name
     * @param {*} [options.data=null] The message content
     */
    constructor(type, options = {}) {
      super(type);
      this[kData] = options.data === void 0 ? null : options.data;
    }
    /**
     * @type {*}
     */
    get data() {
      return this[kData];
    }
  }
  Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
  const EventTarget = {
    /**
     * Register an event listener.
     *
     * @param {String} type A string representing the event type to listen for
     * @param {(Function|Object)} handler The listener to add
     * @param {Object} [options] An options object specifies characteristics about
     *     the event listener
     * @param {Boolean} [options.once=false] A `Boolean` indicating that the
     *     listener should be invoked at most once after being added. If `true`,
     *     the listener would be automatically removed when invoked.
     * @public
     */
    addEventListener(type, handler, options = {}) {
      for (const listener of this.listeners(type)) {
        if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          return;
        }
      }
      let wrapper;
      if (type === "message") {
        wrapper = function onMessage(data, isBinary) {
          const event = new MessageEvent("message", {
            data: isBinary ? data : data.toString()
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "close") {
        wrapper = function onClose(code, message) {
          const event = new CloseEvent("close", {
            code,
            reason: message.toString(),
            wasClean: this._closeFrameReceived && this._closeFrameSent
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "error") {
        wrapper = function onError(error) {
          const event = new ErrorEvent("error", {
            error,
            message: error.message
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "open") {
        wrapper = function onOpen() {
          const event = new Event("open");
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else {
        return;
      }
      wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
      wrapper[kListener] = handler;
      if (options.once) {
        this.once(type, wrapper);
      } else {
        this.on(type, wrapper);
      }
    },
    /**
     * Remove an event listener.
     *
     * @param {String} type A string representing the event type to remove
     * @param {(Function|Object)} handler The listener to remove
     * @public
     */
    removeEventListener(type, handler) {
      for (const listener of this.listeners(type)) {
        if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          this.removeListener(type, listener);
          break;
        }
      }
    }
  };
  eventTarget = {
    CloseEvent,
    ErrorEvent,
    Event,
    EventTarget,
    MessageEvent
  };
  function callListener(listener, thisArg, event) {
    if (typeof listener === "object" && listener.handleEvent) {
      listener.handleEvent.call(listener, event);
    } else {
      listener.call(thisArg, event);
    }
  }
  return eventTarget;
}
var extension;
var hasRequiredExtension;
function requireExtension() {
  if (hasRequiredExtension) return extension;
  hasRequiredExtension = 1;
  const { tokenChars } = requireValidation();
  function push(dest, name, elem) {
    if (dest[name] === void 0) dest[name] = [elem];
    else dest[name].push(elem);
  }
  function parse(header) {
    const offers = /* @__PURE__ */ Object.create(null);
    let params = /* @__PURE__ */ Object.create(null);
    let mustUnescape = false;
    let isEscaping = false;
    let inQuotes = false;
    let extensionName;
    let paramName;
    let start = -1;
    let code = -1;
    let end = -1;
    let i = 0;
    for (; i < header.length; i++) {
      code = header.charCodeAt(i);
      if (extensionName === void 0) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const name = header.slice(start, end);
          if (code === 44) {
            push(offers, name, params);
            params = /* @__PURE__ */ Object.create(null);
          } else {
            extensionName = name;
          }
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else if (paramName === void 0) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (code === 32 || code === 9) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          push(params, header.slice(start, end), true);
          if (code === 44) {
            push(offers, extensionName, params);
            params = /* @__PURE__ */ Object.create(null);
            extensionName = void 0;
          }
          start = end = -1;
        } else if (code === 61 && start !== -1 && end === -1) {
          paramName = header.slice(start, i);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else {
        if (isEscaping) {
          if (tokenChars[code] !== 1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (start === -1) start = i;
          else if (!mustUnescape) mustUnescape = true;
          isEscaping = false;
        } else if (inQuotes) {
          if (tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 34 && start !== -1) {
            inQuotes = false;
            end = i;
          } else if (code === 92) {
            isEscaping = true;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
          inQuotes = true;
        } else if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (start !== -1 && (code === 32 || code === 9)) {
          if (end === -1) end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          let value = header.slice(start, end);
          if (mustUnescape) {
            value = value.replace(/\\/g, "");
            mustUnescape = false;
          }
          push(params, paramName, value);
          if (code === 44) {
            push(offers, extensionName, params);
            params = /* @__PURE__ */ Object.create(null);
            extensionName = void 0;
          }
          paramName = void 0;
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
    }
    if (start === -1 || inQuotes || code === 32 || code === 9) {
      throw new SyntaxError("Unexpected end of input");
    }
    if (end === -1) end = i;
    const token = header.slice(start, end);
    if (extensionName === void 0) {
      push(offers, token, params);
    } else {
      if (paramName === void 0) {
        push(params, token, true);
      } else if (mustUnescape) {
        push(params, paramName, token.replace(/\\/g, ""));
      } else {
        push(params, paramName, token);
      }
      push(offers, extensionName, params);
    }
    return offers;
  }
  function format(extensions) {
    return Object.keys(extensions).map((extension2) => {
      let configurations = extensions[extension2];
      if (!Array.isArray(configurations)) configurations = [configurations];
      return configurations.map((params) => {
        return [extension2].concat(
          Object.keys(params).map((k) => {
            let values = params[k];
            if (!Array.isArray(values)) values = [values];
            return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
          })
        ).join("; ");
      }).join(", ");
    }).join(", ");
  }
  extension = { format, parse };
  return extension;
}
var websocket;
var hasRequiredWebsocket;
function requireWebsocket() {
  if (hasRequiredWebsocket) return websocket;
  hasRequiredWebsocket = 1;
  const EventEmitter = require$$0$3;
  const https = require$$1$2;
  const http = require$$2$2;
  const net = require$$3;
  const tls = require$$4;
  const { randomBytes, createHash } = require$$1$1;
  const { Duplex, Readable } = require$$0$2;
  const { URL } = require$$7;
  const PerMessageDeflate = requirePermessageDeflate();
  const Receiver = requireReceiver();
  const Sender = requireSender();
  const { isBlob } = requireValidation();
  const {
    BINARY_TYPES,
    CLOSE_TIMEOUT,
    EMPTY_BUFFER,
    GUID,
    kForOnEventAttribute,
    kListener,
    kStatusCode,
    kWebSocket,
    NOOP
  } = requireConstants();
  const {
    EventTarget: { addEventListener, removeEventListener }
  } = requireEventTarget();
  const { format, parse } = requireExtension();
  const { toBuffer } = requireBufferUtil();
  const kAborted = Symbol("kAborted");
  const protocolVersions = [8, 13];
  const readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
  const subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
  class WebSocket2 extends EventEmitter {
    /**
     * Create a new `WebSocket`.
     *
     * @param {(String|URL)} address The URL to which to connect
     * @param {(String|String[])} [protocols] The subprotocols
     * @param {Object} [options] Connection options
     */
    constructor(address, protocols, options) {
      super();
      this._binaryType = BINARY_TYPES[0];
      this._closeCode = 1006;
      this._closeFrameReceived = false;
      this._closeFrameSent = false;
      this._closeMessage = EMPTY_BUFFER;
      this._closeTimer = null;
      this._errorEmitted = false;
      this._extensions = {};
      this._paused = false;
      this._protocol = "";
      this._readyState = WebSocket2.CONNECTING;
      this._receiver = null;
      this._sender = null;
      this._socket = null;
      if (address !== null) {
        this._bufferedAmount = 0;
        this._isServer = false;
        this._redirects = 0;
        if (protocols === void 0) {
          if (!options || options.protocols === void 0) {
            protocols = [];
          } else if (Array.isArray(options.protocols)) {
            protocols = options.protocols;
          } else {
            protocols = [options.protocols];
          }
        } else if (!Array.isArray(protocols)) {
          if (typeof protocols === "object" && protocols !== null) {
            options = protocols;
            if (options.protocols === void 0) {
              protocols = [];
            } else if (Array.isArray(options.protocols)) {
              protocols = options.protocols;
            } else {
              protocols = [options.protocols];
            }
          } else {
            protocols = [protocols];
          }
        }
        initAsClient(this, address, protocols, options);
      } else {
        this._autoPong = options.autoPong;
        this._closeTimeout = options.closeTimeout;
        this._isServer = true;
      }
    }
    /**
     * For historical reasons, the custom "nodebuffer" type is used by the default
     * instead of "blob".
     *
     * @type {String}
     */
    get binaryType() {
      return this._binaryType;
    }
    set binaryType(type) {
      if (!BINARY_TYPES.includes(type)) return;
      this._binaryType = type;
      if (this._receiver) this._receiver._binaryType = type;
    }
    /**
     * @type {Number}
     */
    get bufferedAmount() {
      if (!this._socket) return this._bufferedAmount;
      return this._socket._writableState.length + this._sender._bufferedBytes;
    }
    /**
     * @type {String}
     */
    get extensions() {
      return Object.keys(this._extensions).join();
    }
    /**
     * @type {Boolean}
     */
    get isPaused() {
      return this._paused;
    }
    /**
     * @type {Function}
     */
    /* istanbul ignore next */
    get onclose() {
      return null;
    }
    /**
     * @type {Function}
     */
    /* istanbul ignore next */
    get onerror() {
      return null;
    }
    /**
     * @type {Function}
     */
    /* istanbul ignore next */
    get onopen() {
      return null;
    }
    /**
     * @type {Function}
     */
    /* istanbul ignore next */
    get onmessage() {
      return null;
    }
    /**
     * @type {String}
     */
    get protocol() {
      return this._protocol;
    }
    /**
     * @type {Number}
     */
    get readyState() {
      return this._readyState;
    }
    /**
     * @type {String}
     */
    get url() {
      return this._url;
    }
    /**
     * Set up the socket and the internal resources.
     *
     * @param {Duplex} socket The network socket between the server and client
     * @param {Buffer} head The first packet of the upgraded stream
     * @param {Object} options Options object
     * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
     *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
     *     multiple times in the same tick
     * @param {Function} [options.generateMask] The function used to generate the
     *     masking key
     * @param {Number} [options.maxBufferedChunks=0] The maximum number of
     *     buffered data chunks
     * @param {Number} [options.maxFragments=0] The maximum number of message
     *     fragments
     * @param {Number} [options.maxPayload=0] The maximum allowed message size
     * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
     *     not to skip UTF-8 validation for text and close messages
     * @private
     */
    setSocket(socket, head, options) {
      const receiver2 = new Receiver({
        allowSynchronousEvents: options.allowSynchronousEvents,
        binaryType: this.binaryType,
        extensions: this._extensions,
        isServer: this._isServer,
        maxBufferedChunks: options.maxBufferedChunks,
        maxFragments: options.maxFragments,
        maxPayload: options.maxPayload,
        skipUTF8Validation: options.skipUTF8Validation
      });
      const sender2 = new Sender(socket, this._extensions, options.generateMask);
      this._receiver = receiver2;
      this._sender = sender2;
      this._socket = socket;
      receiver2[kWebSocket] = this;
      sender2[kWebSocket] = this;
      socket[kWebSocket] = this;
      receiver2.on("conclude", receiverOnConclude);
      receiver2.on("drain", receiverOnDrain);
      receiver2.on("error", receiverOnError);
      receiver2.on("message", receiverOnMessage);
      receiver2.on("ping", receiverOnPing);
      receiver2.on("pong", receiverOnPong);
      sender2.onerror = senderOnError;
      if (socket.setTimeout) socket.setTimeout(0);
      if (socket.setNoDelay) socket.setNoDelay();
      if (head.length > 0) socket.unshift(head);
      socket.on("close", socketOnClose);
      socket.on("data", socketOnData);
      socket.on("end", socketOnEnd);
      socket.on("error", socketOnError);
      this._readyState = WebSocket2.OPEN;
      this.emit("open");
    }
    /**
     * Emit the `'close'` event.
     *
     * @private
     */
    emitClose() {
      if (!this._socket) {
        this._readyState = WebSocket2.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
        return;
      }
      if (this._extensions[PerMessageDeflate.extensionName]) {
        this._extensions[PerMessageDeflate.extensionName].cleanup();
      }
      this._receiver.removeAllListeners();
      this._readyState = WebSocket2.CLOSED;
      this.emit("close", this._closeCode, this._closeMessage);
    }
    /**
     * Start a closing handshake.
     *
     *          +----------+   +-----------+   +----------+
     *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
     *    |     +----------+   +-----------+   +----------+     |
     *          +----------+   +-----------+         |
     * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
     *          +----------+   +-----------+   |
     *    |           |                        |   +---+        |
     *                +------------------------+-->|fin| - - - -
     *    |         +---+                      |   +---+
     *     - - - - -|fin|<---------------------+
     *              +---+
     *
     * @param {Number} [code] Status code explaining why the connection is closing
     * @param {(String|Buffer)} [data] The reason why the connection is
     *     closing
     * @public
     */
    close(code, data) {
      if (this.readyState === WebSocket2.CLOSED) return;
      if (this.readyState === WebSocket2.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this.readyState === WebSocket2.CLOSING) {
        if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
          this._socket.end();
        }
        return;
      }
      this._sender.close(code, data, !this._isServer, (err) => {
        if (err) return;
        this._closeFrameSent = true;
        if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
          this._socket.end();
        }
      });
      this._readyState = WebSocket2.CLOSING;
      setCloseTimer(this);
    }
    /**
     * Pause the socket.
     *
     * @public
     */
    pause() {
      if (this.readyState === WebSocket2.CONNECTING || this.readyState === WebSocket2.CLOSED) {
        return;
      }
      this._paused = true;
      this._socket.pause();
    }
    /**
     * Send a ping.
     *
     * @param {*} [data] The data to send
     * @param {Boolean} [mask] Indicates whether or not to mask `data`
     * @param {Function} [cb] Callback which is executed when the ping is sent
     * @public
     */
    ping(data, mask, cb) {
      if (this.readyState === WebSocket2.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = void 0;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = void 0;
      }
      if (typeof data === "number") data = data.toString();
      if (this.readyState !== WebSocket2.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === void 0) mask = !this._isServer;
      this._sender.ping(data || EMPTY_BUFFER, mask, cb);
    }
    /**
     * Send a pong.
     *
     * @param {*} [data] The data to send
     * @param {Boolean} [mask] Indicates whether or not to mask `data`
     * @param {Function} [cb] Callback which is executed when the pong is sent
     * @public
     */
    pong(data, mask, cb) {
      if (this.readyState === WebSocket2.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = void 0;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = void 0;
      }
      if (typeof data === "number") data = data.toString();
      if (this.readyState !== WebSocket2.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === void 0) mask = !this._isServer;
      this._sender.pong(data || EMPTY_BUFFER, mask, cb);
    }
    /**
     * Resume the socket.
     *
     * @public
     */
    resume() {
      if (this.readyState === WebSocket2.CONNECTING || this.readyState === WebSocket2.CLOSED) {
        return;
      }
      this._paused = false;
      if (!this._receiver._writableState.needDrain) this._socket.resume();
    }
    /**
     * Send a data message.
     *
     * @param {*} data The message to send
     * @param {Object} [options] Options object
     * @param {Boolean} [options.binary] Specifies whether `data` is binary or
     *     text
     * @param {Boolean} [options.compress] Specifies whether or not to compress
     *     `data`
     * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
     *     last one
     * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
     * @param {Function} [cb] Callback which is executed when data is written out
     * @public
     */
    send(data, options, cb) {
      if (this.readyState === WebSocket2.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (typeof data === "number") data = data.toString();
      if (this.readyState !== WebSocket2.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      const opts = {
        binary: typeof data !== "string",
        mask: !this._isServer,
        compress: true,
        fin: true,
        ...options
      };
      if (!this._extensions[PerMessageDeflate.extensionName]) {
        opts.compress = false;
      }
      this._sender.send(data || EMPTY_BUFFER, opts, cb);
    }
    /**
     * Forcibly close the connection.
     *
     * @public
     */
    terminate() {
      if (this.readyState === WebSocket2.CLOSED) return;
      if (this.readyState === WebSocket2.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this._socket) {
        this._readyState = WebSocket2.CLOSING;
        this._socket.destroy();
      }
    }
  }
  Object.defineProperty(WebSocket2, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket2, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket2.prototype, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket2, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket2.prototype, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket2, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  Object.defineProperty(WebSocket2.prototype, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  [
    "binaryType",
    "bufferedAmount",
    "extensions",
    "isPaused",
    "protocol",
    "readyState",
    "url"
  ].forEach((property) => {
    Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
  });
  ["open", "error", "close", "message"].forEach((method) => {
    Object.defineProperty(WebSocket2.prototype, `on${method}`, {
      enumerable: true,
      get() {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute]) return listener[kListener];
        }
        return null;
      },
      set(handler) {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute]) {
            this.removeListener(method, listener);
            break;
          }
        }
        if (typeof handler !== "function") return;
        this.addEventListener(method, handler, {
          [kForOnEventAttribute]: true
        });
      }
    });
  });
  WebSocket2.prototype.addEventListener = addEventListener;
  WebSocket2.prototype.removeEventListener = removeEventListener;
  websocket = WebSocket2;
  function initAsClient(websocket2, address, protocols, options) {
    const opts = {
      allowSynchronousEvents: true,
      autoPong: true,
      closeTimeout: CLOSE_TIMEOUT,
      protocolVersion: protocolVersions[1],
      maxBufferedChunks: 256 * 1024,
      maxFragments: 16 * 1024,
      maxPayload: 100 * 1024 * 1024,
      skipUTF8Validation: false,
      perMessageDeflate: true,
      followRedirects: false,
      maxRedirects: 10,
      ...options,
      socketPath: void 0,
      hostname: void 0,
      protocol: void 0,
      protocols: void 0,
      timeout: void 0,
      method: "GET",
      host: void 0,
      path: void 0,
      port: void 0
    };
    websocket2._autoPong = opts.autoPong;
    websocket2._closeTimeout = opts.closeTimeout;
    if (!protocolVersions.includes(opts.protocolVersion)) {
      throw new RangeError(
        `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
      );
    }
    let parsedUrl;
    if (address instanceof URL) {
      parsedUrl = address;
    } else {
      try {
        parsedUrl = new URL(address);
      } catch {
        throw new SyntaxError(`Invalid URL: ${address}`);
      }
    }
    if (parsedUrl.protocol === "http:") {
      parsedUrl.protocol = "ws:";
    } else if (parsedUrl.protocol === "https:") {
      parsedUrl.protocol = "wss:";
    }
    websocket2._url = parsedUrl.href;
    const isSecure = parsedUrl.protocol === "wss:";
    const isIpcUrl = parsedUrl.protocol === "ws+unix:";
    let invalidUrlMessage;
    if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
      invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
    } else if (isIpcUrl && !parsedUrl.pathname) {
      invalidUrlMessage = "The URL's pathname is empty";
    } else if (parsedUrl.hash) {
      invalidUrlMessage = "The URL contains a fragment identifier";
    }
    if (invalidUrlMessage) {
      const err = new SyntaxError(invalidUrlMessage);
      if (websocket2._redirects === 0) {
        throw err;
      } else {
        emitErrorAndClose(websocket2, err);
        return;
      }
    }
    const defaultPort = isSecure ? 443 : 80;
    const key = randomBytes(16).toString("base64");
    const request = isSecure ? https.request : http.request;
    const protocolSet = /* @__PURE__ */ new Set();
    let perMessageDeflate;
    opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
    opts.defaultPort = opts.defaultPort || defaultPort;
    opts.port = parsedUrl.port || defaultPort;
    opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
    opts.headers = {
      ...opts.headers,
      "Sec-WebSocket-Version": opts.protocolVersion,
      "Sec-WebSocket-Key": key,
      Connection: "Upgrade",
      Upgrade: "websocket"
    };
    opts.path = parsedUrl.pathname + parsedUrl.search;
    opts.timeout = opts.handshakeTimeout;
    if (opts.perMessageDeflate) {
      perMessageDeflate = new PerMessageDeflate({
        ...opts.perMessageDeflate,
        isServer: false,
        maxPayload: opts.maxPayload
      });
      opts.headers["Sec-WebSocket-Extensions"] = format({
        [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
      });
    }
    if (protocols.length) {
      for (const protocol of protocols) {
        if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
          throw new SyntaxError(
            "An invalid or duplicated subprotocol was specified"
          );
        }
        protocolSet.add(protocol);
      }
      opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
    }
    if (opts.origin) {
      if (opts.protocolVersion < 13) {
        opts.headers["Sec-WebSocket-Origin"] = opts.origin;
      } else {
        opts.headers.Origin = opts.origin;
      }
    }
    if (parsedUrl.username || parsedUrl.password) {
      opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
    }
    if (isIpcUrl) {
      const parts = opts.path.split(":");
      opts.socketPath = parts[0];
      opts.path = parts[1];
    }
    let req;
    if (opts.followRedirects) {
      if (websocket2._redirects === 0) {
        websocket2._originalIpc = isIpcUrl;
        websocket2._originalSecure = isSecure;
        websocket2._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
        const headers = options && options.headers;
        options = { ...options, headers: {} };
        if (headers) {
          for (const [key2, value] of Object.entries(headers)) {
            options.headers[key2.toLowerCase()] = value;
          }
        }
      } else if (websocket2.listenerCount("redirect") === 0) {
        const isSameHost = isIpcUrl ? websocket2._originalIpc ? opts.socketPath === websocket2._originalHostOrSocketPath : false : websocket2._originalIpc ? false : parsedUrl.host === websocket2._originalHostOrSocketPath;
        if (!isSameHost || websocket2._originalSecure && !isSecure) {
          delete opts.headers.authorization;
          delete opts.headers.cookie;
          if (!isSameHost) delete opts.headers.host;
          opts.auth = void 0;
        }
      }
      if (opts.auth && !options.headers.authorization) {
        options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
      }
      req = websocket2._req = request(opts);
      if (websocket2._redirects) {
        websocket2.emit("redirect", websocket2.url, req);
      }
    } else {
      req = websocket2._req = request(opts);
    }
    if (opts.timeout) {
      req.on("timeout", () => {
        abortHandshake(websocket2, req, "Opening handshake has timed out");
      });
    }
    req.on("error", (err) => {
      if (req === null || req[kAborted]) return;
      req = websocket2._req = null;
      emitErrorAndClose(websocket2, err);
    });
    req.on("response", (res) => {
      const location = res.headers.location;
      const statusCode = res.statusCode;
      if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
        if (++websocket2._redirects > opts.maxRedirects) {
          abortHandshake(websocket2, req, "Maximum redirects exceeded");
          return;
        }
        req.abort();
        let addr;
        try {
          addr = new URL(location, address);
        } catch (e) {
          const err = new SyntaxError(`Invalid URL: ${location}`);
          emitErrorAndClose(websocket2, err);
          return;
        }
        initAsClient(websocket2, addr, protocols, options);
      } else if (!websocket2.emit("unexpected-response", req, res)) {
        abortHandshake(
          websocket2,
          req,
          `Unexpected server response: ${res.statusCode}`
        );
      }
    });
    req.on("upgrade", (res, socket, head) => {
      websocket2.emit("upgrade", res);
      if (websocket2.readyState !== WebSocket2.CONNECTING) return;
      req = websocket2._req = null;
      const upgrade = res.headers.upgrade;
      if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
        abortHandshake(websocket2, socket, "Invalid Upgrade header");
        return;
      }
      const digest = createHash("sha1").update(key + GUID).digest("base64");
      if (res.headers["sec-websocket-accept"] !== digest) {
        abortHandshake(websocket2, socket, "Invalid Sec-WebSocket-Accept header");
        return;
      }
      const serverProt = res.headers["sec-websocket-protocol"];
      let protError;
      if (serverProt !== void 0) {
        if (!protocolSet.size) {
          protError = "Server sent a subprotocol but none was requested";
        } else if (!protocolSet.has(serverProt)) {
          protError = "Server sent an invalid subprotocol";
        }
      } else if (protocolSet.size) {
        protError = "Server sent no subprotocol";
      }
      if (protError) {
        abortHandshake(websocket2, socket, protError);
        return;
      }
      if (serverProt) websocket2._protocol = serverProt;
      const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
      if (secWebSocketExtensions !== void 0) {
        if (!perMessageDeflate) {
          const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
          abortHandshake(websocket2, socket, message);
          return;
        }
        let extensions;
        try {
          extensions = parse(secWebSocketExtensions);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket2, socket, message);
          return;
        }
        const extensionNames = Object.keys(extensions);
        if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
          const message = "Server indicated an extension that was not requested";
          abortHandshake(websocket2, socket, message);
          return;
        }
        try {
          perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket2, socket, message);
          return;
        }
        websocket2._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
      }
      websocket2.setSocket(socket, head, {
        allowSynchronousEvents: opts.allowSynchronousEvents,
        generateMask: opts.generateMask,
        maxBufferedChunks: opts.maxBufferedChunks,
        maxFragments: opts.maxFragments,
        maxPayload: opts.maxPayload,
        skipUTF8Validation: opts.skipUTF8Validation
      });
    });
    if (opts.finishRequest) {
      opts.finishRequest(req, websocket2);
    } else {
      req.end();
    }
  }
  function emitErrorAndClose(websocket2, err) {
    websocket2._readyState = WebSocket2.CLOSING;
    websocket2._errorEmitted = true;
    websocket2.emit("error", err);
    websocket2.emitClose();
  }
  function netConnect(options) {
    options.path = options.socketPath;
    return net.connect(options);
  }
  function tlsConnect(options) {
    options.path = void 0;
    if (!options.servername && options.servername !== "") {
      options.servername = net.isIP(options.host) ? "" : options.host;
    }
    return tls.connect(options);
  }
  function abortHandshake(websocket2, stream2, message) {
    websocket2._readyState = WebSocket2.CLOSING;
    const err = new Error(message);
    Error.captureStackTrace(err, abortHandshake);
    if (stream2.setHeader) {
      stream2[kAborted] = true;
      stream2.abort();
      if (stream2.socket && !stream2.socket.destroyed) {
        stream2.socket.destroy();
      }
      process.nextTick(emitErrorAndClose, websocket2, err);
    } else {
      stream2.destroy(err);
      stream2.once("error", websocket2.emit.bind(websocket2, "error"));
      stream2.once("close", websocket2.emitClose.bind(websocket2));
    }
  }
  function sendAfterClose(websocket2, data, cb) {
    if (data) {
      const length = isBlob(data) ? data.size : toBuffer(data).length;
      if (websocket2._socket) websocket2._sender._bufferedBytes += length;
      else websocket2._bufferedAmount += length;
    }
    if (cb) {
      const err = new Error(
        `WebSocket is not open: readyState ${websocket2.readyState} (${readyStates[websocket2.readyState]})`
      );
      process.nextTick(cb, err);
    }
  }
  function receiverOnConclude(code, reason) {
    const websocket2 = this[kWebSocket];
    websocket2._closeFrameReceived = true;
    websocket2._closeMessage = reason;
    websocket2._closeCode = code;
    if (websocket2._socket[kWebSocket] === void 0) return;
    websocket2._socket.removeListener("data", socketOnData);
    process.nextTick(resume, websocket2._socket);
    if (code === 1005) websocket2.close();
    else websocket2.close(code, reason);
  }
  function receiverOnDrain() {
    const websocket2 = this[kWebSocket];
    if (!websocket2.isPaused) websocket2._socket.resume();
  }
  function receiverOnError(err) {
    const websocket2 = this[kWebSocket];
    if (websocket2._socket[kWebSocket] !== void 0) {
      websocket2._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket2._socket);
      websocket2.close(err[kStatusCode]);
    }
    if (!websocket2._errorEmitted) {
      websocket2._errorEmitted = true;
      websocket2.emit("error", err);
    }
  }
  function receiverOnFinish() {
    this[kWebSocket].emitClose();
  }
  function receiverOnMessage(data, isBinary) {
    this[kWebSocket].emit("message", data, isBinary);
  }
  function receiverOnPing(data) {
    const websocket2 = this[kWebSocket];
    if (websocket2._autoPong) websocket2.pong(data, !this._isServer, NOOP);
    websocket2.emit("ping", data);
  }
  function receiverOnPong(data) {
    this[kWebSocket].emit("pong", data);
  }
  function resume(stream2) {
    stream2.resume();
  }
  function senderOnError(err) {
    const websocket2 = this[kWebSocket];
    if (websocket2.readyState === WebSocket2.CLOSED) return;
    if (websocket2.readyState === WebSocket2.OPEN) {
      websocket2._readyState = WebSocket2.CLOSING;
      setCloseTimer(websocket2);
    }
    this._socket.end();
    if (!websocket2._errorEmitted) {
      websocket2._errorEmitted = true;
      websocket2.emit("error", err);
    }
  }
  function setCloseTimer(websocket2) {
    websocket2._closeTimer = setTimeout(
      websocket2._socket.destroy.bind(websocket2._socket),
      websocket2._closeTimeout
    );
  }
  function socketOnClose() {
    const websocket2 = this[kWebSocket];
    this.removeListener("close", socketOnClose);
    this.removeListener("data", socketOnData);
    this.removeListener("end", socketOnEnd);
    websocket2._readyState = WebSocket2.CLOSING;
    if (!this._readableState.endEmitted && !websocket2._closeFrameReceived && !websocket2._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
      const chunk = this.read(this._readableState.length);
      websocket2._receiver.write(chunk);
    }
    websocket2._receiver.end();
    this[kWebSocket] = void 0;
    clearTimeout(websocket2._closeTimer);
    if (websocket2._receiver._writableState.finished || websocket2._receiver._writableState.errorEmitted) {
      websocket2.emitClose();
    } else {
      websocket2._receiver.on("error", receiverOnFinish);
      websocket2._receiver.on("finish", receiverOnFinish);
    }
  }
  function socketOnData(chunk) {
    if (!this[kWebSocket]._receiver.write(chunk)) {
      this.pause();
    }
  }
  function socketOnEnd() {
    const websocket2 = this[kWebSocket];
    websocket2._readyState = WebSocket2.CLOSING;
    websocket2._receiver.end();
    this.end();
  }
  function socketOnError() {
    const websocket2 = this[kWebSocket];
    this.removeListener("error", socketOnError);
    this.on("error", NOOP);
    if (websocket2) {
      websocket2._readyState = WebSocket2.CLOSING;
      this.destroy();
    }
  }
  return websocket;
}
var stream;
var hasRequiredStream;
function requireStream() {
  if (hasRequiredStream) return stream;
  hasRequiredStream = 1;
  requireWebsocket();
  const { Duplex } = require$$0$2;
  function emitClose(stream2) {
    stream2.emit("close");
  }
  function duplexOnEnd() {
    if (!this.destroyed && this._writableState.finished) {
      this.destroy();
    }
  }
  function duplexOnError(err) {
    this.removeListener("error", duplexOnError);
    this.destroy();
    if (this.listenerCount("error") === 0) {
      this.emit("error", err);
    }
  }
  function createWebSocketStream(ws, options) {
    let terminateOnDestroy = true;
    const duplex = new Duplex({
      ...options,
      autoDestroy: false,
      emitClose: false,
      objectMode: false,
      writableObjectMode: false
    });
    ws.on("message", function message(msg, isBinary) {
      const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
      if (!duplex.push(data)) ws.pause();
    });
    ws.once("error", function error(err) {
      if (duplex.destroyed) return;
      terminateOnDestroy = false;
      duplex.destroy(err);
    });
    ws.once("close", function close() {
      if (duplex.destroyed) return;
      duplex.push(null);
    });
    duplex._destroy = function(err, callback) {
      if (ws.readyState === ws.CLOSED) {
        callback(err);
        process.nextTick(emitClose, duplex);
        return;
      }
      let called = false;
      ws.once("error", function error(err2) {
        called = true;
        callback(err2);
      });
      ws.once("close", function close() {
        if (!called) callback(err);
        process.nextTick(emitClose, duplex);
      });
      if (terminateOnDestroy) ws.terminate();
    };
    duplex._final = function(callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._final(callback);
        });
        return;
      }
      if (ws._socket === null) return;
      if (ws._socket._writableState.finished) {
        callback();
        if (duplex._readableState.endEmitted) duplex.destroy();
      } else {
        ws._socket.once("finish", function finish() {
          callback();
        });
        ws.close();
      }
    };
    duplex._read = function() {
      if (ws.isPaused) ws.resume();
    };
    duplex._write = function(chunk, encoding, callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._write(chunk, encoding, callback);
        });
        return;
      }
      ws.send(chunk, callback);
    };
    duplex.on("end", duplexOnEnd);
    duplex.on("error", duplexOnError);
    return duplex;
  }
  stream = createWebSocketStream;
  return stream;
}
requireStream();
requireExtension();
requirePermessageDeflate();
requireReceiver();
requireSender();
var subprotocol;
var hasRequiredSubprotocol;
function requireSubprotocol() {
  if (hasRequiredSubprotocol) return subprotocol;
  hasRequiredSubprotocol = 1;
  const { tokenChars } = requireValidation();
  function parse(header) {
    const protocols = /* @__PURE__ */ new Set();
    let start = -1;
    let end = -1;
    let i = 0;
    for (i; i < header.length; i++) {
      const code = header.charCodeAt(i);
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1) start = i;
      } else if (i !== 0 && (code === 32 || code === 9)) {
        if (end === -1 && start !== -1) end = i;
      } else if (code === 44) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (end === -1) end = i;
        const protocol2 = header.slice(start, end);
        if (protocols.has(protocol2)) {
          throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
        }
        protocols.add(protocol2);
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    }
    if (start === -1 || end !== -1) {
      throw new SyntaxError("Unexpected end of input");
    }
    const protocol = header.slice(start, i);
    if (protocols.has(protocol)) {
      throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
    }
    protocols.add(protocol);
    return protocols;
  }
  subprotocol = { parse };
  return subprotocol;
}
requireSubprotocol();
var websocketExports = requireWebsocket();
const WebSocket = /* @__PURE__ */ getDefaultExportFromCjs(websocketExports);
var websocketServer;
var hasRequiredWebsocketServer;
function requireWebsocketServer() {
  if (hasRequiredWebsocketServer) return websocketServer;
  hasRequiredWebsocketServer = 1;
  const EventEmitter = require$$0$3;
  const http = require$$2$2;
  const { Duplex } = require$$0$2;
  const { createHash } = require$$1$1;
  const extension2 = requireExtension();
  const PerMessageDeflate = requirePermessageDeflate();
  const subprotocol2 = requireSubprotocol();
  const WebSocket2 = requireWebsocket();
  const { CLOSE_TIMEOUT, GUID, kWebSocket } = requireConstants();
  const keyRegex = /^[+/0-9A-Za-z]{22}==$/;
  const RUNNING = 0;
  const CLOSING = 1;
  const CLOSED = 2;
  class WebSocketServer2 extends EventEmitter {
    /**
     * Create a `WebSocketServer` instance.
     *
     * @param {Object} options Configuration options
     * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
     *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
     *     multiple times in the same tick
     * @param {Boolean} [options.autoPong=true] Specifies whether or not to
     *     automatically send a pong in response to a ping
     * @param {Number} [options.backlog=511] The maximum length of the queue of
     *     pending connections
     * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
     *     track clients
     * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
     *     wait for the closing handshake to finish after `websocket.close()` is
     *     called
     * @param {Function} [options.handleProtocols] A hook to handle protocols
     * @param {String} [options.host] The hostname where to bind the server
     * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
     *     buffered data chunks
     * @param {Number} [options.maxFragments=16384] The maximum number of message
     *     fragments
     * @param {Number} [options.maxPayload=104857600] The maximum allowed message
     *     size
     * @param {Boolean} [options.noServer=false] Enable no server mode
     * @param {String} [options.path] Accept only connections matching this path
     * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
     *     permessage-deflate
     * @param {Number} [options.port] The port where to bind the server
     * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
     *     server to use
     * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
     *     not to skip UTF-8 validation for text and close messages
     * @param {Function} [options.verifyClient] A hook to reject connections
     * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
     *     class to use. It must be the `WebSocket` class or class that extends it
     * @param {Function} [callback] A listener for the `listening` event
     */
    constructor(options, callback) {
      super();
      options = {
        allowSynchronousEvents: true,
        autoPong: true,
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: false,
        handleProtocols: null,
        clientTracking: true,
        closeTimeout: CLOSE_TIMEOUT,
        verifyClient: null,
        noServer: false,
        backlog: null,
        // use default (511 as implemented in net.js)
        server: null,
        host: null,
        path: null,
        port: null,
        WebSocket: WebSocket2,
        ...options
      };
      if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
        throw new TypeError(
          'One and only one of the "port", "server", or "noServer" options must be specified'
        );
      }
      if (options.port != null) {
        this._server = http.createServer((req, res) => {
          const body = http.STATUS_CODES[426];
          res.writeHead(426, {
            "Content-Length": body.length,
            "Content-Type": "text/plain"
          });
          res.end(body);
        });
        this._server.listen(
          options.port,
          options.host,
          options.backlog,
          callback
        );
      } else if (options.server) {
        this._server = options.server;
      }
      if (this._server) {
        const emitConnection = this.emit.bind(this, "connection");
        this._removeListeners = addListeners(this._server, {
          listening: this.emit.bind(this, "listening"),
          error: this.emit.bind(this, "error"),
          upgrade: (req, socket, head) => {
            this.handleUpgrade(req, socket, head, emitConnection);
          }
        });
      }
      if (options.perMessageDeflate === true) options.perMessageDeflate = {};
      if (options.clientTracking) {
        this.clients = /* @__PURE__ */ new Set();
        this._shouldEmitClose = false;
      }
      this.options = options;
      this._state = RUNNING;
    }
    /**
     * Returns the bound address, the address family name, and port of the server
     * as reported by the operating system if listening on an IP socket.
     * If the server is listening on a pipe or UNIX domain socket, the name is
     * returned as a string.
     *
     * @return {(Object|String|null)} The address of the server
     * @public
     */
    address() {
      if (this.options.noServer) {
        throw new Error('The server is operating in "noServer" mode');
      }
      if (!this._server) return null;
      return this._server.address();
    }
    /**
     * Stop the server from accepting new connections and emit the `'close'` event
     * when all existing connections are closed.
     *
     * @param {Function} [cb] A one-time listener for the `'close'` event
     * @public
     */
    close(cb) {
      if (this._state === CLOSED) {
        if (cb) {
          this.once("close", () => {
            cb(new Error("The server is not running"));
          });
        }
        process.nextTick(emitClose, this);
        return;
      }
      if (cb) this.once("close", cb);
      if (this._state === CLOSING) return;
      this._state = CLOSING;
      if (this.options.noServer || this.options.server) {
        if (this._server) {
          this._removeListeners();
          this._removeListeners = this._server = null;
        }
        if (this.clients) {
          if (!this.clients.size) {
            process.nextTick(emitClose, this);
          } else {
            this._shouldEmitClose = true;
          }
        } else {
          process.nextTick(emitClose, this);
        }
      } else {
        const server = this._server;
        this._removeListeners();
        this._removeListeners = this._server = null;
        server.close(() => {
          emitClose(this);
        });
      }
    }
    /**
     * See if a given request should be handled by this server instance.
     *
     * @param {http.IncomingMessage} req Request object to inspect
     * @return {Boolean} `true` if the request is valid, else `false`
     * @public
     */
    shouldHandle(req) {
      if (this.options.path) {
        const index = req.url.indexOf("?");
        const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
        if (pathname !== this.options.path) return false;
      }
      return true;
    }
    /**
     * Handle a HTTP Upgrade request.
     *
     * @param {http.IncomingMessage} req The request object
     * @param {Duplex} socket The network socket between the server and client
     * @param {Buffer} head The first packet of the upgraded stream
     * @param {Function} cb Callback
     * @public
     */
    handleUpgrade(req, socket, head, cb) {
      socket.on("error", socketOnError);
      const key = req.headers["sec-websocket-key"];
      const upgrade = req.headers.upgrade;
      const version = +req.headers["sec-websocket-version"];
      if (req.method !== "GET") {
        const message = "Invalid HTTP method";
        abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
        return;
      }
      if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
        const message = "Invalid Upgrade header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (key === void 0 || !keyRegex.test(key)) {
        const message = "Missing or invalid Sec-WebSocket-Key header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (version !== 13 && version !== 8) {
        const message = "Missing or invalid Sec-WebSocket-Version header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
          "Sec-WebSocket-Version": "13, 8"
        });
        return;
      }
      if (!this.shouldHandle(req)) {
        abortHandshake(socket, 400);
        return;
      }
      const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
      let protocols = /* @__PURE__ */ new Set();
      if (secWebSocketProtocol !== void 0) {
        try {
          protocols = subprotocol2.parse(secWebSocketProtocol);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Protocol header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
      const extensions = {};
      if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
        const perMessageDeflate = new PerMessageDeflate({
          ...this.options.perMessageDeflate,
          isServer: true,
          maxPayload: this.options.maxPayload
        });
        try {
          const offers = extension2.parse(secWebSocketExtensions);
          if (offers[PerMessageDeflate.extensionName]) {
            perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
            extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
          }
        } catch (err) {
          const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      if (this.options.verifyClient) {
        const info = {
          origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
          secure: !!(req.socket.authorized || req.socket.encrypted),
          req
        };
        if (this.options.verifyClient.length === 2) {
          this.options.verifyClient(info, (verified, code, message, headers) => {
            if (!verified) {
              return abortHandshake(socket, code || 401, message, headers);
            }
            this.completeUpgrade(
              extensions,
              key,
              protocols,
              req,
              socket,
              head,
              cb
            );
          });
          return;
        }
        if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
      }
      this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
    }
    /**
     * Upgrade the connection to WebSocket.
     *
     * @param {Object} extensions The accepted extensions
     * @param {String} key The value of the `Sec-WebSocket-Key` header
     * @param {Set} protocols The subprotocols
     * @param {http.IncomingMessage} req The request object
     * @param {Duplex} socket The network socket between the server and client
     * @param {Buffer} head The first packet of the upgraded stream
     * @param {Function} cb Callback
     * @throws {Error} If called more than once with the same socket
     * @private
     */
    completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
      if (!socket.readable || !socket.writable) return socket.destroy();
      if (socket[kWebSocket]) {
        throw new Error(
          "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
        );
      }
      if (this._state > RUNNING) return abortHandshake(socket, 503);
      const digest = createHash("sha1").update(key + GUID).digest("base64");
      const headers = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${digest}`
      ];
      const ws = new this.options.WebSocket(null, void 0, this.options);
      if (protocols.size) {
        const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
        if (protocol) {
          headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
          ws._protocol = protocol;
        }
      }
      if (extensions[PerMessageDeflate.extensionName]) {
        const params = extensions[PerMessageDeflate.extensionName].params;
        const value = extension2.format({
          [PerMessageDeflate.extensionName]: [params]
        });
        headers.push(`Sec-WebSocket-Extensions: ${value}`);
        ws._extensions = extensions;
      }
      this.emit("headers", headers, req);
      socket.write(headers.concat("\r\n").join("\r\n"));
      socket.removeListener("error", socketOnError);
      ws.setSocket(socket, head, {
        allowSynchronousEvents: this.options.allowSynchronousEvents,
        maxBufferedChunks: this.options.maxBufferedChunks,
        maxFragments: this.options.maxFragments,
        maxPayload: this.options.maxPayload,
        skipUTF8Validation: this.options.skipUTF8Validation
      });
      if (this.clients) {
        this.clients.add(ws);
        ws.on("close", () => {
          this.clients.delete(ws);
          if (this._shouldEmitClose && !this.clients.size) {
            process.nextTick(emitClose, this);
          }
        });
      }
      cb(ws, req);
    }
  }
  websocketServer = WebSocketServer2;
  function addListeners(server, map) {
    for (const event of Object.keys(map)) server.on(event, map[event]);
    return function removeListeners() {
      for (const event of Object.keys(map)) {
        server.removeListener(event, map[event]);
      }
    };
  }
  function emitClose(server) {
    server._state = CLOSED;
    server.emit("close");
  }
  function socketOnError() {
    this.destroy();
  }
  function abortHandshake(socket, code, message, headers) {
    message = message || http.STATUS_CODES[code];
    headers = {
      Connection: "close",
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(message),
      ...headers
    };
    socket.once("finish", socket.destroy);
    socket.end(
      `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
    );
  }
  function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
    if (server.listenerCount("wsClientError")) {
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
      server.emit("wsClientError", err, socket, req);
    } else {
      abortHandshake(socket, code, message, headers);
    }
  }
  return websocketServer;
}
var websocketServerExports = requireWebsocketServer();
const WebSocketServer = /* @__PURE__ */ getDefaultExportFromCjs(websocketServerExports);
class VerticalPositionModule {
  constructor(options = {}) {
    __publicField(this, "z");
    __publicField(this, "hasVerticalVelocity");
    __publicField(this, "verticalVelocity");
    __publicField(this, "enabled");
    this.z = options.z ?? 0;
    this.hasVerticalVelocity = options.hasVerticalVelocity !== void 0 ? options.hasVerticalVelocity : true;
    this.verticalVelocity = options.verticalVelocity ?? 0;
    this.enabled = options.enabled !== void 0 ? options.enabled : true;
  }
}
const _Arena = class _Arena {
  constructor(width = 20, height = 14, tileSize = 1) {
    __publicField(this, "width");
    __publicField(this, "height");
    __publicField(this, "tileSize");
    __publicField(this, "cols");
    __publicField(this, "rows");
    __publicField(this, "wallHeight");
    // Standard height for all walls
    __publicField(this, "gravity");
    __publicField(this, "frictionCoeff");
    __publicField(this, "staticFrictionThreshold");
    __publicField(this, "tileGrid");
    __publicField(this, "walls", []);
    __publicField(this, "currentPresetId", "standard");
    /** All active game objects and characters in the arena */
    __publicField(this, "entities", []);
    /** Active visual altitude scale for pseudo-3D elevation */
    __publicField(this, "visualAltitudeScale", 0.5);
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.cols = Math.floor(width / tileSize);
    this.rows = Math.floor(height / tileSize);
    this.wallHeight = 1;
    this.gravity = 30;
    this.frictionCoeff = 10.4;
    this.staticFrictionThreshold = 0.16;
    this.tileGrid = Array.from(
      { length: this.rows },
      () => Array.from({ length: this.cols }, () => 0)
    );
    this.loadWallPreset("standard");
  }
  /**
   * Reconstructs the physical wall array from the tile grid using standard wall height
   */
  rebuildWalls() {
    this.walls = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.tileGrid[r][c] === 1) {
          this.walls.push({
            id: `wall-${c}-${r}`,
            x: c * this.tileSize,
            y: r * this.tileSize,
            width: this.tileSize,
            height: this.tileSize,
            wallHeight: this.wallHeight
            // All walls have this standard height
          });
        }
      }
    }
  }
  /**
   * Updates standard wall height and synchronizes all walls
   */
  setStandardWallHeight(newHeight) {
    this.wallHeight = newHeight;
    this.rebuildWalls();
  }
  /**
   * Sets a specific grid cell to wall (1) or empty (0) and rebuilds physical walls
   */
  setWallTile(col, row, isWall) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    const val = isWall ? 1 : 0;
    if (this.tileGrid[row][col] === val) return false;
    this.tileGrid[row][col] = val;
    this.rebuildWalls();
    return true;
  }
  /**
   * Checks if a grid cell has a wall
   */
  hasWall(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.tileGrid[row][col] === 1;
  }
  /**
   * Loads a predefined wall layout by preset ID and optionally syncs entity elevations
   */
  loadWallPreset(presetId, entities) {
    const preset = _Arena.WALL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;
    this.currentPresetId = presetId;
    this.tileGrid = preset.generate(this.cols, this.rows);
    this.rebuildWalls();
    this.syncEntitiesWithWalls(entities);
    return true;
  }
  /**
   * Synchronizes entity elevations: any entity on the ground overlapping a newly placed wall
   * is smoothly elevated to the wall height.
   */
  syncEntitiesWithWalls(entities) {
    var _a;
    if (!entities) return;
    for (const ent of entities) {
      const r = ent.hasCollider ? ent.colliderRadius : ((_a = ent.colliderModule) == null ? void 0 : _a.radius) ?? 0.32;
      const supportingWall = this.getSupportingWall(ent.position.x, ent.position.y, r);
      if (supportingWall) {
        if (ent.position.z < supportingWall.wallHeight) {
          if (!ent.hasVerticalPosition) {
            if (!ent.verticalPositionModule) {
              ent.verticalPositionModule = new VerticalPositionModule({
                z: supportingWall.wallHeight,
                hasVerticalVelocity: true
              });
            } else {
              ent.verticalPositionModule.enabled = true;
            }
          }
          ent.position.z = supportingWall.wallHeight;
          ent.supportingSurfaceHeight = supportingWall.wallHeight;
          ent.standingWall = supportingWall;
          ent.verticalVelocity = 0;
        } else {
          ent.standingWall = supportingWall;
          ent.supportingSurfaceHeight = supportingWall.wallHeight;
        }
      } else {
        if (ent.supportingSurfaceHeight >= this.wallHeight - 0.05 || ent.standingWall !== null) {
          ent.standingWall = null;
          ent.supportingSurfaceHeight = 0;
          if (ent.isCharacter) {
            const char = ent;
            if (char.climbingModule) {
              char.climbingModule.isDismountFreefall = true;
            }
          }
        }
      }
    }
  }
  /**
   * Clears all internal walls from the arena
   */
  clearAllWalls(entities) {
    this.loadWallPreset("empty", entities);
  }
  /**
   * Resets the arena to its default layout (Standard Arena)
   */
  resetDefaultWalls(entities) {
    this.loadWallPreset("standard", entities);
  }
  /**
   * Checks if a point (x, y) is located within the footprint of a wall
   */
  getWallAt(x, y) {
    for (const wall of this.walls) {
      if (x >= wall.x && x <= wall.x + wall.width && y >= wall.y && y <= wall.y + wall.height) {
        return wall;
      }
    }
    return null;
  }
  /**
   * Tests if a circle collider at (x, y) with radius overlaps a wall's 2D footprint.
   */
  testWallOverlap(x, y, radius, wall) {
    const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy <= radius * radius + 1e-6;
  }
  /**
   * Finds the wall supporting an entity at (x, y) with given collider radius.
   * If the collider overlaps any wall, that wall supports the entity.
   */
  getSupportingWall(x, y, radius = 0) {
    if (radius <= 0) {
      return this.getWallAt(x, y);
    }
    for (const wall of this.walls) {
      if (this.testWallOverlap(x, y, radius, wall)) {
        return wall;
      }
    }
    return null;
  }
  /**
   * Tests if two walls touch or are contiguous (share an edge or corner with no gap)
   */
  areWallsContiguous(w1, w2) {
    if (w1.id === w2.id) return true;
    const xDist = Math.max(0, Math.max(w1.x, w2.x) - Math.min(w1.x + w1.width, w2.x + w2.width));
    const yDist = Math.max(0, Math.max(w1.y, w2.y) - Math.min(w1.y + w1.height, w2.y + w2.height));
    const xOverlap = Math.min(w1.x + w1.width, w2.x + w2.width) - Math.max(w1.x, w2.x);
    const yOverlap = Math.min(w1.y + w1.height, w2.y + w2.height) - Math.max(w1.y, w2.y);
    return xDist < 1e-3 && yOverlap > 0.05 || yDist < 1e-3 && xOverlap > 0.05;
  }
  /**
   * Returns the elevation of the physical surface directly beneath (x, y) for a collider of radius.
   * If the collider overlaps a wall, returns wall.wallHeight.
   * Otherwise returns 0 (ground level).
   */
  getSupportingSurfaceHeight(x, y, radius = 0) {
    const wall = this.getSupportingWall(x, y, radius);
    return wall ? wall.wallHeight : 0;
  }
};
__publicField(_Arena, "WALL_PRESETS", [
  {
    id: "standard",
    name: "🏛️ Standard Arena",
    badge: "Balanced",
    description: "Center dividing wall with an open gateway and two 2×2 cover obstacles.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
      const midCol = 10;
      for (let r = 1; r <= 4; r++) grid[r][midCol] = 1;
      for (let r = 8; r <= 12; r++) grid[r][midCol] = 1;
      grid[4][4] = 1;
      grid[5][4] = 1;
      grid[4][5] = 1;
      grid[5][5] = 1;
      grid[7][15] = 1;
      grid[8][15] = 1;
      grid[7][16] = 1;
      grid[8][16] = 1;
      return grid;
    }
  },
  {
    id: "trenches",
    name: "⛏️ Trench Tunnels",
    badge: "Dense Walls",
    description: "Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));
      for (let c = 2; c <= 17; c++) {
        grid[3][c] = 0;
        grid[7][c] = 0;
        grid[10][c] = 0;
      }
      for (let r = 2; r <= 11; r++) {
        grid[r][5] = 0;
        grid[r][10] = 0;
        grid[r][14] = 0;
      }
      grid[1][10] = 0;
      grid[12][10] = 0;
      grid[7][1] = 0;
      grid[7][18] = 0;
      for (let r = 5; r <= 9; r++) grid[r][2] = 0;
      for (let r = 5; r <= 9; r++) grid[r][17] = 0;
      for (let c = 2; c <= 5; c++) grid[5][c] = 0;
      for (let c = 10; c <= 14; c++) grid[5][c] = 0;
      for (let c = 5; c <= 10; c++) grid[9][c] = 0;
      for (let c = 14; c <= 17; c++) grid[9][c] = 0;
      grid[7][5] = 0;
      return grid;
    }
  },
  {
    id: "courtyards",
    name: "🏰 Courtyards & Platforms",
    badge: "4 Quadrants",
    description: "Four large raised platforms in each corner with a central dais and open courtyards.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
      for (let r = 2; r <= 4; r++) {
        for (let c = 3; c <= 6; c++) grid[r][c] = 1;
        for (let c = 13; c <= 16; c++) grid[r][c] = 1;
      }
      for (let r = 9; r <= 11; r++) {
        for (let c = 3; c <= 6; c++) grid[r][c] = 1;
        for (let c = 13; c <= 16; c++) grid[r][c] = 1;
      }
      for (let r = 6; r <= 7; r++) {
        for (let c = 9; c <= 10; c++) grid[r][c] = 1;
      }
      return grid;
    }
  },
  {
    id: "pillars",
    name: "🗿 Pillars & Monoliths",
    badge: "Tactical Cover",
    description: "Raised monoliths and stepping-stone pillars scattered across the arena.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
      const pillarCoords = [
        [3, 2],
        [8, 2],
        [15, 2],
        [3, 10],
        [8, 10],
        [15, 10],
        [5, 6],
        [13, 6],
        [9, 6]
      ];
      for (const [pc, pr] of pillarCoords) {
        grid[pr][pc] = 1;
        grid[pr + 1][pc] = 1;
        grid[pr][pc + 1] = 1;
        grid[pr + 1][pc + 1] = 1;
      }
      return grid;
    }
  },
  {
    id: "maze",
    name: "🌀 Labyrinth Maze",
    badge: "Winding Paths",
    description: "Interlocking corridors and winding paths with high walls to climb over or navigate.",
    generate: (cols, rows) => {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
      for (let r = 1; r <= 9; r++) grid[r][4] = 1;
      for (let r = 4; r <= 12; r++) grid[r][7] = 1;
      for (let r = 1; r <= 9; r++) grid[r][10] = 1;
      for (let r = 4; r <= 12; r++) grid[r][13] = 1;
      for (let r = 1; r <= 9; r++) grid[r][16] = 1;
      for (let c = 7; c <= 10; c++) grid[4][c] = 1;
      for (let c = 13; c <= 16; c++) grid[4][c] = 1;
      for (let c = 4; c <= 7; c++) grid[9][c] = 1;
      for (let c = 10; c <= 13; c++) grid[9][c] = 1;
      return grid;
    }
  },
  {
    id: "empty",
    name: "⬜ Empty (Open Arena)",
    badge: "Clean Slate",
    description: "Completely open arena with zero walls for custom level design.",
    generate: (cols, rows) => {
      return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
    }
  }
]);
let Arena = _Arena;
class ColliderModule {
  constructor(options = {}) {
    __publicField(this, "radius");
    __publicField(this, "enabled");
    __publicField(this, "canSweep");
    __publicField(this, "ccdThresholdRatio");
    this.radius = options.radius ?? 0.32;
    this.enabled = options.enabled ?? true;
    this.canSweep = options.canSweep ?? true;
    this.ccdThresholdRatio = options.ccdThresholdRatio ?? 0.5;
  }
}
class MassModule {
  constructor(options = {}) {
    __publicField(this, "mass");
    __publicField(this, "enabled");
    this.mass = options.mass ?? 1;
    this.enabled = options.enabled ?? true;
  }
}
class FrictionModule {
  constructor(options = {}) {
    __publicField(this, "staticFrictionMod");
    __publicField(this, "dynamicFrictionMod");
    __publicField(this, "enabled");
    this.staticFrictionMod = options.staticFrictionMod ?? 1;
    this.dynamicFrictionMod = options.dynamicFrictionMod ?? 1;
    this.enabled = options.enabled ?? true;
  }
}
class BounceModule {
  constructor(options = {}) {
    __publicField(this, "bounceMod");
    __publicField(this, "verticalBounce");
    __publicField(this, "enabled");
    this.bounceMod = options.bounceMod ?? 0.4;
    this.verticalBounce = options.verticalBounce ?? true;
    this.enabled = options.enabled ?? true;
  }
}
class GravityModule {
  constructor(options = {}) {
    __publicField(this, "enabled");
    this.enabled = options.enabled ?? true;
  }
}
class RigidbodyModule {
  constructor(options = {}) {
    __publicField(this, "velocity");
    __publicField(this, "hasVerticalVelocity");
    __publicField(this, "verticalVelocity");
    __publicField(this, "collisionMode");
    __publicField(this, "isKinematic");
    __publicField(this, "enabled");
    var _a, _b;
    this.velocity = {
      x: ((_a = options.velocity) == null ? void 0 : _a.x) ?? 0,
      y: ((_b = options.velocity) == null ? void 0 : _b.y) ?? 0
    };
    this.hasVerticalVelocity = options.hasVerticalVelocity !== void 0 ? options.hasVerticalVelocity : true;
    this.verticalVelocity = options.verticalVelocity ?? 0;
    this.collisionMode = options.collisionMode ?? "dynamic";
    this.isKinematic = options.isKinematic ?? false;
    this.enabled = options.enabled !== void 0 ? options.enabled : true;
  }
}
class GameObject {
  constructor(options = {}) {
    __publicField(this, "id");
    __publicField(this, "name");
    __publicField(this, "position");
    __publicField(this, "color");
    __publicField(this, "isHeld");
    __publicField(this, "heldBy");
    __publicField(this, "lastThrower", null);
    __publicField(this, "isInFlight", false);
    __publicField(this, "isCharacter", false);
    __publicField(this, "isClimbing", false);
    __publicField(this, "visualShape", "circle");
    __publicField(this, "lastCollisionType", "none");
    __publicField(this, "lastContactPoint", null);
    __publicField(this, "lastContactNormal", null);
    __publicField(this, "isSweptActive", false);
    __publicField(this, "lastCollisionTime", 0);
    // Phase 3: Sleeping Freebody & Island Optimization
    __publicField(this, "isSleeping", false);
    __publicField(this, "sleepTimer", 0);
    // Number of consecutive ticks with near-zero kinetic energy
    // Phase 8: Client Prediction Reconciliation & Visual Smoothing Dampener
    __publicField(this, "visualOffset", { x: 0, y: 0 });
    // Phase 9 & 10: Remote Entity Proxy & Immovable Solver Flag
    // When true (e.g. for remote characters on client simulation), the entity acts as a kinematic/immovable obstacle,
    // preventing the local client from authoring its coordinates and eliminating 60Hz bounce-back tethering.
    __publicField(this, "isImmovable", false);
    __publicField(this, "serverCharId");
    __publicField(this, "_staticVelocity", { x: 0, y: 0 });
    // Modular behavior components
    __publicField(this, "rigidbodyModule", null);
    __publicField(this, "colliderModule", null);
    __publicField(this, "massModule", null);
    __publicField(this, "frictionModule", null);
    __publicField(this, "bounceModule", null);
    __publicField(this, "verticalPositionModule", null);
    __publicField(this, "gravityModule", null);
    __publicField(this, "rollModule", null);
    /** Elevation of the physical supporting surface directly beneath (ground or wall top) */
    __publicField(this, "supportingSurfaceHeight", 0);
    /** The specific wall the entity is currently standing on (if supported on layer 2) */
    __publicField(this, "standingWall", null);
    var _a, _b, _c;
    this.id = options.id ?? `obj-${Math.random().toString(36).substring(2, 9)}`;
    this.name = options.name ?? "Entity";
    this.position = {
      x: ((_a = options.position) == null ? void 0 : _a.x) ?? 0,
      y: ((_b = options.position) == null ? void 0 : _b.y) ?? 0,
      z: ((_c = options.position) == null ? void 0 : _c.z) ?? 0
    };
    this.color = options.color ?? "#94a3b8";
    this.isHeld = false;
    this.heldBy = null;
    this.visualShape = options.visualShape ?? "circle";
    this.rigidbodyModule = options.rigidbodyModule !== void 0 ? options.rigidbodyModule : options.hasRigidbody === false ? null : new RigidbodyModule({
      velocity: options.velocity ? { x: options.velocity.x ?? 0, y: options.velocity.y ?? 0 } : void 0,
      hasVerticalVelocity: options.hasVerticalVelocity !== false,
      verticalVelocity: options.verticalVelocity ?? 0,
      collisionMode: options.collisionMode ?? "dynamic"
    });
    this.colliderModule = options.colliderModule !== void 0 ? options.colliderModule : options.colliderRadius !== void 0 ? new ColliderModule({ radius: options.colliderRadius }) : new ColliderModule({ radius: 0.35 });
    this.massModule = options.massModule !== void 0 ? options.massModule : options.mass !== void 0 ? new MassModule({ mass: options.mass }) : new MassModule({ mass: 1 });
    this.frictionModule = options.frictionModule !== void 0 ? options.frictionModule : new FrictionModule({
      staticFrictionMod: options.staticGroundFrictionMod ?? 1,
      dynamicFrictionMod: options.dynamicGroundFrictionMod ?? 1
    });
    this.bounceModule = options.bounceModule !== void 0 ? options.bounceModule : options.bounceMod !== void 0 && options.bounceMod !== null ? new BounceModule({ bounceMod: options.bounceMod }) : new BounceModule({ bounceMod: 0.4 });
    this.verticalPositionModule = options.verticalPositionModule !== void 0 ? options.verticalPositionModule : options.hasVerticalPosition === false ? null : new VerticalPositionModule({
      z: this.position.z,
      hasVerticalVelocity: options.hasVerticalVelocity !== false,
      verticalVelocity: options.verticalVelocity ?? 0
    });
    if (!this.hasVerticalPosition) {
      this.position.z = 0;
    }
    this.gravityModule = options.gravityModule !== void 0 ? options.gravityModule : options.hasGravity === false ? null : new GravityModule();
    this.rollModule = options.rollModule ?? null;
  }
  /**
   * Decays the visual smoothing offset smoothly toward zero (default: 0.70x / frame).
   * Eliminates visual popping when physical prediction reconciles.
   */
  decayVisualOffset(factor = 0.7) {
    if (this.visualOffset.x === 0 && this.visualOffset.y === 0) return;
    this.visualOffset.x *= factor;
    this.visualOffset.y *= factor;
    if (Math.abs(this.visualOffset.x) < 1e-3) this.visualOffset.x = 0;
    if (Math.abs(this.visualOffset.y) < 1e-3) this.visualOffset.y = 0;
  }
  /**
   * Immediately wakes up a sleeping body.
   */
  wakeUp() {
    if (this.isSleeping) {
      this.isSleeping = false;
      this.sleepTimer = 0;
    }
  }
  /**
   * Puts body to sleep, freezing velocities to absolute zero.
   */
  putToSleep() {
    if (this.isCharacter || this.isHeld || this.heldBy !== null) return;
    this.isSleeping = true;
    this.isInFlight = false;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.verticalVelocity = 0;
    if (this.rollModule) {
      this.rollModule.angularVelocity.x = 0;
      this.rollModule.angularVelocity.y = 0;
      this.rollModule.angularVelocity.z = 0;
    }
  }
  // --- Convenience Getters & Setters ---
  get hasRigidbody() {
    return Boolean(this.rigidbodyModule && this.rigidbodyModule.enabled);
  }
  get velocity() {
    if (this.hasRigidbody && this.rigidbodyModule) {
      return this.rigidbodyModule.velocity;
    }
    return this._staticVelocity;
  }
  set velocity(val) {
    if (this.rigidbodyModule) {
      this.rigidbodyModule.velocity = { x: val.x, y: val.y };
    } else {
      this._staticVelocity = { x: val.x, y: val.y };
    }
  }
  get collisionMode() {
    return this.hasRigidbody && this.rigidbodyModule ? this.rigidbodyModule.collisionMode : "discrete";
  }
  set collisionMode(val) {
    if (this.rigidbodyModule) {
      this.rigidbodyModule.collisionMode = val;
    }
  }
  get hasCollider() {
    return Boolean(this.colliderModule && this.colliderModule.enabled);
  }
  /**
   * Evaluates whether this body acts as 'discrete' or 'continuous' on the current tick.
   * If collisionMode is 'dynamic', tests if movement distance (v * dt) exceeds ccdThresholdRatio * radius.
   */
  getEffectiveCollisionMode(dt = 1 / 60) {
    var _a;
    if (this.collisionMode === "continuous") return "continuous";
    if (this.collisionMode === "discrete") return "discrete";
    if (!this.hasCollider || !((_a = this.colliderModule) == null ? void 0 : _a.canSweep)) return "discrete";
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    const r = Math.max(0.01, this.colliderRadius);
    const displacement = speed * dt;
    const threshold = this.colliderModule.ccdThresholdRatio ?? 0.5;
    return displacement / r >= threshold ? "continuous" : "discrete";
  }
  get colliderRadius() {
    return this.colliderModule && this.colliderModule.enabled ? this.colliderModule.radius : 0;
  }
  set colliderRadius(val) {
    if (this.colliderModule) {
      this.colliderModule.radius = val;
    } else {
      this.colliderModule = new ColliderModule({ radius: val });
    }
  }
  get hasMass() {
    return Boolean(this.massModule && this.massModule.enabled && this.massModule.mass > 0);
  }
  get mass() {
    return this.massModule && this.massModule.enabled ? this.massModule.mass : 0;
  }
  set mass(val) {
    if (this.massModule) {
      this.massModule.mass = val;
    } else {
      this.massModule = new MassModule({ mass: val });
    }
  }
  /**
   * Friction requires both MassModule and FrictionModule. Without mass, normal force is 0.
   */
  get hasFriction() {
    return Boolean(this.hasMass && this.frictionModule && this.frictionModule.enabled);
  }
  get staticGroundFrictionMod() {
    return this.hasFriction && this.frictionModule ? this.frictionModule.staticFrictionMod : 0;
  }
  set staticGroundFrictionMod(val) {
    if (this.frictionModule) {
      this.frictionModule.staticFrictionMod = val;
    } else {
      this.frictionModule = new FrictionModule({ staticFrictionMod: val });
    }
  }
  get dynamicGroundFrictionMod() {
    return this.hasFriction && this.frictionModule ? this.frictionModule.dynamicFrictionMod : 0;
  }
  set dynamicGroundFrictionMod(val) {
    if (this.frictionModule) {
      this.frictionModule.dynamicFrictionMod = val;
    } else {
      this.frictionModule = new FrictionModule({ dynamicFrictionMod: val });
    }
  }
  /**
   * Bounciness requires both MassModule and BounceModule. Without mass, restitution is ignored.
   */
  get hasBounce() {
    return Boolean(this.hasMass && this.bounceModule && this.bounceModule.enabled);
  }
  get bounceMod() {
    return this.hasBounce && this.bounceModule ? this.bounceModule.bounceMod : null;
  }
  set bounceMod(val) {
    if (val === null || val <= 0.01) {
      this.bounceModule = null;
    } else if (this.bounceModule) {
      this.bounceModule.bounceMod = val;
    } else {
      this.bounceModule = new BounceModule({ bounceMod: val });
    }
  }
  get hasVerticalPosition() {
    return Boolean(this.verticalPositionModule && this.verticalPositionModule.enabled);
  }
  /**
   * Vertical velocity is physically dynamic, so it lives on RigidbodyModule,
   * but strictly requires VerticalPositionModule (spatial altitude z-axis).
   * Without VerticalPositionModule, vertical velocity cannot exist.
   */
  get hasVerticalVelocity() {
    var _a;
    return Boolean(
      this.hasRigidbody && ((_a = this.rigidbodyModule) == null ? void 0 : _a.hasVerticalVelocity) && this.hasVerticalPosition
    );
  }
  get verticalVelocity() {
    if (this.hasVerticalVelocity && this.rigidbodyModule) {
      return this.rigidbodyModule.verticalVelocity;
    }
    return 0;
  }
  set verticalVelocity(val) {
    if (this.rigidbodyModule) {
      this.rigidbodyModule.verticalVelocity = val;
    }
    if (this.verticalPositionModule) {
      this.verticalPositionModule.verticalVelocity = val;
    }
  }
  /**
   * Vertical bounce requires MassModule, BounceModule (with verticalBounce=true), and Vertical Velocity.
   */
  get hasVerticalBounce() {
    var _a;
    return Boolean(
      this.hasBounce && ((_a = this.bounceModule) == null ? void 0 : _a.verticalBounce) && this.hasVerticalVelocity
    );
  }
  get hasGravity() {
    return Boolean(this.gravityModule && this.gravityModule.enabled);
  }
  /** True if entity is actively resting on a supporting surface (ground or wall top) */
  get isRestingOnSurface() {
    return Math.abs(this.position.z - this.supportingSurfaceHeight) <= 0.02 && Math.abs(this.verticalVelocity) <= 0.1;
  }
  /** Readonly getter: true if elevated above ground level (z > 0) */
  get isAboveGround() {
    return this.hasVerticalPosition && this.position.z > 1e-3;
  }
  /** Readonly getter: true if elevated at or above standard arena wall height (1.0 unit) or resting on a wall */
  get isAboveWalls() {
    return this.hasVerticalPosition && (this.position.z >= 0.85 || this.supportingSurfaceHeight >= 0.85 || this.standingWall !== null);
  }
  /**
   * Virtual Infinite Layer System:
   * Objects only collide if they are on the exact same layer.
   * Virtually infinite layers where layer = Math.floor(objectHeight / wallHeight) + 1.
   * - Layer 1 (0 <= z < wallHeight): Ground layer (only layer with walls).
   * - Layer 2 (wallHeight <= z < 2 * wallHeight): Wall elevation / first elevated layer.
   * - Layer 3, 4, ...: Infinite higher altitude layers.
   */
  static getEntityLayer(entity, wallHeight = 1) {
    const effectiveH = Math.max(
      0,
      entity.position.z,
      entity.supportingSurfaceHeight ?? 0,
      entity.standingWall ? wallHeight : 0
    );
    const safeWallH = Math.max(0.01, wallHeight);
    return Math.floor(effectiveH / safeWallH) + 1;
  }
  /** Update physics, gravity, friction, and ground/wall collision */
  updatePosition(dt, arena) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    if (this.isHeld) {
      return;
    }
    if (!this.hasRigidbody) {
      return;
    }
    if (this.isSleeping) {
      if (Math.abs(this.velocity.x) > 1e-3 || Math.abs(this.velocity.y) > 1e-3 || Math.abs(this.verticalVelocity) > 1e-3) {
        this.wakeUp();
      } else {
        return;
      }
    }
    this.isSweptActive = this.getEffectiveCollisionMode(dt) === "continuous";
    if (this.lastThrower) {
      const reach = ((_a = this.lastThrower.pickupModule) == null ? void 0 : _a.pickupReach) ?? 1.3;
      const throwerZ = Math.max(
        this.lastThrower.position.z,
        this.lastThrower.supportingSurfaceHeight ?? 0,
        this.lastThrower.standingWall ? arena.wallHeight : 0
      );
      const myZ = Math.max(
        this.position.z,
        this.supportingSurfaceHeight ?? 0,
        this.standingWall ? arena.wallHeight : 0
      );
      const dist3D = Math.hypot(
        this.position.x - this.lastThrower.position.x,
        this.position.y - this.lastThrower.position.y,
        myZ - throwerZ
      );
      if (dist3D > reach || this.isRestingOnSurface) {
        this.lastThrower = null;
      }
    }
    if (this.isInFlight && (this.isRestingOnSurface || this.isHeld)) {
      this.isInFlight = false;
    }
    if (!this.hasVerticalPosition) {
      this.position.z = 0;
      this.verticalVelocity = 0;
      this.supportingSurfaceHeight = 0;
    }
    let surfaceHeight = 0;
    if (this.hasCollider && this.hasVerticalPosition && arena.walls.length > 0) {
      const isAtWallLayer = this.position.z >= arena.wallHeight - 0.05 || this.supportingSurfaceHeight >= arena.wallHeight - 0.05 && this.position.z >= arena.wallHeight - 0.2 || this.standingWall !== null;
      if (isAtWallLayer) {
        const char2 = this.isCharacter ? this : null;
        const isDismountFalling = Boolean(((_b = char2 == null ? void 0 : char2.climbingModule) == null ? void 0 : _b.isDismountFreefall) || ((_c = char2 == null ? void 0 : char2.climbingModule) == null ? void 0 : _c.climbSuppressedUntilRePress));
        if (isDismountFalling) {
          this.standingWall = null;
          surfaceHeight = 0;
        } else if (!this.isCharacter) {
          const supportingWall = arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius);
          if (supportingWall) {
            this.standingWall = supportingWall;
            surfaceHeight = supportingWall.wallHeight;
          } else {
            this.standingWall = null;
            surfaceHeight = 0;
          }
        } else if (this.standingWall) {
          const wallStillExists = arena.walls.find((w) => w.id === this.standingWall.id);
          const supportRadius = this.colliderRadius;
          const touchesCurrent = wallStillExists ? arena.testWallOverlap(this.position.x, this.position.y, supportRadius, wallStillExists) : false;
          if (touchesCurrent && wallStillExists) {
            this.standingWall = wallStillExists;
            surfaceHeight = wallStillExists.wallHeight;
          } else if (wallStillExists && ((_d = char2 == null ? void 0 : char2.climbingModule) == null ? void 0 : _d.dismountSuppressedUntilRelease)) {
            this.standingWall = wallStillExists;
            surfaceHeight = wallStillExists.wallHeight;
          } else {
            let nextSupport = null;
            if (wallStillExists) {
              for (const wall of arena.walls) {
                if (arena.areWallsContiguous(wallStillExists, wall) && arena.testWallOverlap(this.position.x, this.position.y, supportRadius, wall)) {
                  nextSupport = wall;
                  break;
                }
              }
            } else {
              nextSupport = arena.getSupportingWall(this.position.x, this.position.y, supportRadius);
            }
            if (nextSupport) {
              this.standingWall = nextSupport;
              surfaceHeight = nextSupport.wallHeight;
            } else {
              this.standingWall = null;
              surfaceHeight = 0;
              if (char2 == null ? void 0 : char2.climbingModule) {
                char2.climbingModule.isDismountFreefall = true;
              }
            }
          }
        } else {
          if (!this.isClimbing && this.verticalVelocity <= 0.5 && (this.position.z >= arena.wallHeight - 0.05 || this.supportingSurfaceHeight >= arena.wallHeight - 0.05)) {
            const wall = arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius);
            if (wall) {
              this.standingWall = wall;
              surfaceHeight = wall.wallHeight;
            }
          }
        }
      } else {
        this.standingWall = null;
      }
    } else {
      this.standingWall = null;
      surfaceHeight = 0;
    }
    if (this.isClimbing) {
      surfaceHeight = Math.max(surfaceHeight, this.position.z);
      this.verticalVelocity = 0;
    }
    this.supportingSurfaceHeight = surfaceHeight;
    if (this.hasGravity && this.hasVerticalVelocity) {
      if (this.position.z > surfaceHeight || this.verticalVelocity !== 0) {
        this.verticalVelocity -= arena.gravity * dt;
        this.position.z += this.verticalVelocity * dt;
        if (this.position.z <= surfaceHeight) {
          this.position.z = surfaceHeight;
          const bounceThreshold = Math.max(0.25, 1.25 * arena.gravity * dt);
          if (!this.isCharacter && this.hasVerticalBounce && this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > bounceThreshold) {
            const impactVz = Math.abs(this.verticalVelocity);
            this.verticalVelocity = -this.verticalVelocity * this.bounceMod;
            if (this.hasFriction && this.rollModule && this.rollModule.enabled) {
              const roll = this.rollModule;
              const R = this.colliderRadius > 0 ? this.colliderRadius : 0.3;
              const beta = 0.4;
              const e = this.bounceMod;
              const normalImpulse = (1 + e) * this.mass * impactVz;
              const muBounce = arena.frictionCoeff * this.dynamicGroundFrictionMod * 0.05;
              const vSlipX = this.velocity.x - roll.angularVelocity.y * R;
              const vSlipY = this.velocity.y + roll.angularVelocity.x * R;
              const slipSpeed = Math.hypot(vSlipX, vSlipY);
              if (slipSpeed > 1e-3 && muBounce > 0) {
                const maxFricImpulse = muBounce * normalImpulse;
                const stickImpulse = slipSpeed * this.mass / (1 + 1 / beta);
                const actualImpulse = Math.min(stickImpulse, maxFricImpulse);
                const impX = vSlipX / slipSpeed * actualImpulse;
                const impY = vSlipY / slipSpeed * actualImpulse;
                this.velocity.x -= impX / this.mass;
                this.velocity.y -= impY / this.mass;
                roll.angularVelocity.y += impX / (beta * this.mass * R);
                roll.angularVelocity.x -= impY / (beta * this.mass * R);
              }
              const spinDamp = Math.max(0.65, 1 - (1 - e) * 0.35);
              roll.angularVelocity.x *= spinDamp;
              roll.angularVelocity.y *= spinDamp;
              roll.angularVelocity.z *= spinDamp;
            }
          } else {
            this.verticalVelocity = 0;
          }
        }
      }
    } else {
      if (this.hasVerticalVelocity && this.verticalVelocity !== 0) {
        this.position.z += this.verticalVelocity * dt;
        if (this.position.z <= surfaceHeight) {
          this.position.z = surfaceHeight;
          const bounceThreshold = Math.max(0.25, 1.25 * arena.gravity * dt);
          if (this.hasVerticalBounce && this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > bounceThreshold) {
            this.verticalVelocity = -this.verticalVelocity * this.bounceMod;
          } else {
            this.verticalVelocity = 0;
          }
        }
      }
    }
    const restVzThreshold = Math.max(0.05, 1.1 * arena.gravity * dt);
    const isResting = Math.abs(this.position.z - surfaceHeight) <= 0.02 && Math.abs(this.verticalVelocity) <= restVzThreshold;
    if (isResting && this.hasFriction) {
      const hasActiveWalkingModule = this.isCharacter && ((_e = this.walkingModule) == null ? void 0 : _e.enabled);
      if (!hasActiveWalkingModule) {
        if (this.rollModule && this.rollModule.enabled) {
          const roll = this.rollModule;
          const R = this.colliderRadius > 0 ? this.colliderRadius : 0.3;
          const muG = arena.frictionCoeff * this.dynamicGroundFrictionMod;
          const beta = 0.4;
          const vSlipX = this.velocity.x - roll.angularVelocity.y * R;
          const vSlipY = this.velocity.y + roll.angularVelocity.x * R;
          const slipSpeed = Math.hypot(vSlipX, vSlipY);
          if (muG > 0 && slipSpeed > 1e-3) {
            const maxSlipDelta = muG * (1 + 1 / beta) * dt;
            if (slipSpeed <= maxSlipDelta) {
              const totalMomX = this.velocity.x + beta * roll.angularVelocity.y * R;
              const totalMomY = this.velocity.y - beta * roll.angularVelocity.x * R;
              const rollVx = totalMomX / (1 + beta);
              const rollVy = totalMomY / (1 + beta);
              this.velocity.x = rollVx;
              this.velocity.y = rollVy;
              roll.angularVelocity.y = rollVx / R;
              roll.angularVelocity.x = -rollVy / R;
            } else {
              const fx = vSlipX / slipSpeed * muG * dt;
              const fy = vSlipY / slipSpeed * muG * dt;
              this.velocity.x -= fx;
              this.velocity.y -= fy;
              roll.angularVelocity.y += fx / (beta * R);
              roll.angularVelocity.x -= fy / (beta * R);
            }
          }
          const speed = Math.hypot(this.velocity.x, this.velocity.y);
          if (speed > 0) {
            if (roll.rollResistance > 0) {
              const decel = roll.rollResistance * dt;
              const newSpeed = Math.max(0, speed - decel);
              if (newSpeed < 5e-3) {
                this.velocity.x = 0;
                this.velocity.y = 0;
                roll.angularVelocity.x = 0;
                roll.angularVelocity.y = 0;
              } else {
                const ratio = newSpeed / speed;
                this.velocity.x *= ratio;
                this.velocity.y *= ratio;
                roll.angularVelocity.x *= ratio;
                roll.angularVelocity.y *= ratio;
              }
            }
          } else {
            const spinSpeed = Math.hypot(roll.angularVelocity.x, roll.angularVelocity.y);
            if (spinSpeed > 0 && muG > 0) {
              const spinDecel = muG / (beta * R) * dt;
              const newSpin = Math.max(0, spinSpeed - spinDecel);
              const ratio = spinSpeed > 0 ? newSpin / spinSpeed : 0;
              roll.angularVelocity.x *= ratio;
              roll.angularVelocity.y *= ratio;
            }
          }
          if (Math.abs(roll.angularVelocity.z) > 1e-3) {
            if (roll.rollResistance > 0) {
              const zDecel = roll.rollResistance / (beta * R) * dt;
              const signZ = Math.sign(roll.angularVelocity.z);
              const magZ = Math.abs(roll.angularVelocity.z);
              roll.angularVelocity.z = magZ <= zDecel ? 0 : signZ * (magZ - zDecel);
            }
          }
          roll.updateVisualPhase(dt);
        } else {
          const speed = Math.hypot(this.velocity.x, this.velocity.y);
          if (speed > 0) {
            const staticThreshold = arena.staticFrictionThreshold * this.staticGroundFrictionMod;
            if (speed < staticThreshold) {
              this.velocity.x = 0;
              this.velocity.y = 0;
            } else {
              const frictionForce = arena.frictionCoeff * this.dynamicGroundFrictionMod * dt;
              const newSpeed = Math.max(0, speed - frictionForce);
              const ratio = newSpeed / speed;
              this.velocity.x *= ratio;
              this.velocity.y *= ratio;
            }
          }
        }
      }
    } else {
      if (this.rollModule && this.rollModule.enabled) {
        this.rollModule.updateVisualPhase(dt);
      }
    }
    const char = this.isCharacter ? this : null;
    const edgeMod = (char == null ? void 0 : char.wallEdgeAssistModule) ?? (char == null ? void 0 : char.climbingModule);
    const isStandingOnWallTop = Boolean(
      char && !this.isClimbing && this.standingWall !== null && Math.abs(this.position.z - this.standingWall.wallHeight) <= 0.01 && Math.abs(this.supportingSurfaceHeight - this.standingWall.wallHeight) <= 0.01 && this.isRestingOnSurface
    );
    const hangDistance = Math.max(0.01, (edgeMod == null ? void 0 : edgeMod.hangDistance) ?? 0.1);
    if (edgeMod) {
      if (!isStandingOnWallTop) {
        edgeMod.isAssistClampArmed = false;
        edgeMod.hasLeftClampZoneSinceDismount = true;
      } else if (this.standingWall) {
        const standing = this.standingWall;
        const platformWalls = [standing];
        for (const w of arena.walls) {
          if (w.id !== standing.id && arena.areWallsContiguous(standing, w)) {
            platformWalls.push(w);
          }
        }
        let distToPlatform = Infinity;
        for (const w of platformWalls) {
          const cx = Math.max(w.x, Math.min(this.position.x, w.x + w.width));
          const cy = Math.max(w.y, Math.min(this.position.y, w.y + w.height));
          const d = Math.hypot(this.position.x - cx, this.position.y - cy);
          if (d < distToPlatform) distToPlatform = d;
        }
        const isInsideClampZone = distToPlatform <= hangDistance + 1e-3;
        if (isInsideClampZone) {
          if (edgeMod.hasLeftClampZoneSinceDismount) {
            edgeMod.isAssistClampArmed = true;
          }
        } else {
          edgeMod.hasLeftClampZoneSinceDismount = true;
          edgeMod.isAssistClampArmed = false;
        }
        if (!edgeMod.hasMovedOntoWall) {
          const distMoved = Math.hypot(this.position.x - edgeMod.mountStartX, this.position.y - edgeMod.mountStartY);
          let centerInsideWall = false;
          for (const w of platformWalls) {
            if (this.position.x >= w.x && this.position.x <= w.x + w.width && this.position.y >= w.y && this.position.y <= w.y + w.height) {
              centerInsideWall = true;
              break;
            }
          }
          if (distMoved >= 0.2 || centerInsideWall) {
            edgeMod.hasMovedOntoWall = true;
          }
        }
      }
    }
    const isPreventWalkOffActive = Boolean(
      isStandingOnWallTop && (edgeMod == null ? void 0 : edgeMod.enabled) && (edgeMod == null ? void 0 : edgeMod.preventWalkOff) && (edgeMod == null ? void 0 : edgeMod.isAssistClampArmed)
    );
    const deltaX = this.velocity.x * dt;
    const deltaY = this.velocity.y * dt;
    const moveDist = Math.hypot(deltaX, deltaY);
    if (moveDist > 1e-4) {
      if (isPreventWalkOffActive) {
        let currentWall = this.standingWall;
        const candidateX = this.position.x + deltaX;
        const candidateY = this.position.y + deltaY;
        const platformWalls = [];
        if (currentWall) {
          platformWalls.push(currentWall);
          for (const w of arena.walls) {
            if (w.id !== currentWall.id && arena.areWallsContiguous(currentWall, w)) {
              platformWalls.push(w);
            }
          }
        }
        let supportedWall = null;
        for (const w of platformWalls) {
          if (arena.testWallOverlap(candidateX, candidateY, hangDistance, w)) {
            supportedWall = w;
            break;
          }
        }
        if (supportedWall) {
          this.position.x = candidateX;
          this.position.y = candidateY;
          this.standingWall = supportedWall;
        } else if (platformWalls.length > 0) {
          let bestDistSq = Infinity;
          let closest = null;
          for (const wall of platformWalls) {
            const cx = Math.max(wall.x, Math.min(candidateX, wall.x + wall.width));
            const cy = Math.max(wall.y, Math.min(candidateY, wall.y + wall.height));
            const dx = candidateX - cx;
            const dy = candidateY - cy;
            const distSq = dx * dx + dy * dy;
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              closest = { wall, closestX: cx, closestY: cy, dist: Math.sqrt(distSq), dx, dy };
            }
          }
          if (closest && closest.dist > 0) {
            const normalX = closest.dx / closest.dist;
            const normalY = closest.dy / closest.dist;
            const outwardVel = this.velocity.x * normalX + this.velocity.y * normalY;
            const moveInput = (char == null ? void 0 : char.movementInput) ?? { x: 0, y: 0 };
            const outwardInput = moveInput.x * normalX + moveInput.y * normalY;
            const isPushingAgainstGuardrail = outwardVel > 1e-3 || outwardInput > 0.05;
            const canDismount = !edgeMod || edgeMod.hasMovedOntoWall;
            if (isPushingAgainstGuardrail && (char == null ? void 0 : char.isClimbInputHeld) && canDismount) {
              if (edgeMod) {
                edgeMod.isAssistClampArmed = false;
                edgeMod.hasLeftClampZoneSinceDismount = false;
              }
              this.position.x = candidateX;
              this.position.y = candidateY;
            } else {
              if (outwardVel > 0) {
                this.velocity.x -= outwardVel * normalX;
                this.velocity.y -= outwardVel * normalY;
              }
              const maxAllowedDist = hangDistance - 2e-3;
              if (closest.dist > maxAllowedDist) {
                this.position.x = closest.closestX + normalX * maxAllowedDist;
                this.position.y = closest.closestY + normalY * maxAllowedDist;
              } else {
                this.position.x = candidateX;
                this.position.y = candidateY;
              }
              const newSupport = arena.testWallOverlap(this.position.x, this.position.y, hangDistance, closest.wall) ? closest.wall : platformWalls.find((w) => arena.testWallOverlap(this.position.x, this.position.y, hangDistance, w));
              if (newSupport) {
                this.standingWall = newSupport;
              }
            }
          } else {
            this.velocity.x = 0;
            this.velocity.y = 0;
          }
        }
      } else {
        const stepSize = 0.01;
        const numSteps = Math.max(1, Math.ceil(moveDist / stepSize));
        const stepDx = deltaX / numSteps;
        const stepDy = deltaY / numSteps;
        let currentWall = this.standingWall ?? (isStandingOnWallTop ? arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius) : null);
        let hasDismountedIntoGap = false;
        const canDismount = !edgeMod || edgeMod.hasMovedOntoWall;
        for (let s = 1; s <= numSteps; s++) {
          let candX = this.position.x + stepDx;
          let candY = this.position.y + stepDy;
          if (currentWall) {
            let nextSupport = null;
            if (arena.testWallOverlap(candX, candY, this.colliderRadius, currentWall)) {
              nextSupport = currentWall;
            } else {
              for (const w of arena.walls) {
                if (arena.areWallsContiguous(currentWall, w) && arena.testWallOverlap(candX, candY, this.colliderRadius, w)) {
                  nextSupport = w;
                  break;
                }
              }
            }
            if (nextSupport) {
              currentWall = nextSupport;
              this.standingWall = nextSupport;
            } else if (canDismount) {
              hasDismountedIntoGap = true;
              currentWall = null;
              this.standingWall = null;
              this.supportingSurfaceHeight = 0;
              if (char == null ? void 0 : char.climbingModule) {
                char.climbingModule.isDismountFreefall = true;
              }
            } else {
              candX = this.position.x;
              candY = this.position.y;
            }
          }
          this.position.x = candX;
          this.position.y = candY;
          const isFallingInGap = !this.isClimbing && (hasDismountedIntoGap || !this.standingWall && Boolean(((_f = char == null ? void 0 : char.climbingModule) == null ? void 0 : _f.isDismountFreefall) || ((_g = char == null ? void 0 : char.climbingModule) == null ? void 0 : _g.climbSuppressedUntilRePress)));
          if (isFallingInGap && this.hasCollider) {
            for (const wall of arena.walls) {
              if (this.position.z <= wall.wallHeight) {
                const apexZ = this.hasGravity && this.hasVerticalVelocity ? this.position.z + this.verticalVelocity * this.verticalVelocity / (2 * arena.gravity) : this.position.z;
                const isAscendingJump = (this.isCharacter || Boolean(this.lastThrower) || this.isInFlight) && this.verticalVelocity > 0 && apexZ >= wall.wallHeight - 0.05;
                this.resolveWallCollision(wall, isAscendingJump);
              }
            }
          }
        }
      }
    }
    if (this.hasCollider) {
      const r = this.colliderRadius;
      const minX = r;
      const maxX = arena.width - r;
      const minY = r;
      const maxY = arena.height - r;
      const bRestitution = this.isCharacter ? 0 : this.hasBounce && this.bounceMod !== null ? this.bounceMod : 0;
      if (this.position.x < minX) {
        this.position.x = minX;
        this.lastContactPoint = { x: 0, y: this.position.y };
        this.lastContactNormal = { x: 1, y: 0 };
        this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
        this.lastCollisionTime = performance.now();
        this.resolveWallImpact(1, 0, bRestitution);
      } else if (this.position.x > maxX) {
        this.position.x = maxX;
        this.lastContactPoint = { x: arena.width, y: this.position.y };
        this.lastContactNormal = { x: -1, y: 0 };
        this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
        this.lastCollisionTime = performance.now();
        this.resolveWallImpact(-1, 0, bRestitution);
      }
      if (this.position.y < minY) {
        this.position.y = minY;
        this.lastContactPoint = { x: this.position.x, y: 0 };
        this.lastContactNormal = { x: 0, y: 1 };
        this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
        this.lastCollisionTime = performance.now();
        this.resolveWallImpact(0, 1, bRestitution);
      } else if (this.position.y > maxY) {
        this.position.y = maxY;
        this.lastContactPoint = { x: this.position.x, y: arena.height };
        this.lastContactNormal = { x: 0, y: -1 };
        this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
        this.lastCollisionTime = performance.now();
        this.resolveWallImpact(0, -1, bRestitution);
      }
      const isDismountFallingNow = Boolean(((_h = char == null ? void 0 : char.climbingModule) == null ? void 0 : _h.isDismountFreefall) || ((_i = char == null ? void 0 : char.climbingModule) == null ? void 0 : _i.climbSuppressedUntilRePress));
      for (const wall of arena.walls) {
        if (this.position.z <= wall.wallHeight) {
          const isAtWallTop = this.position.z >= wall.wallHeight - 0.05 && !isDismountFallingNow;
          if (isAtWallTop && (((_j = this.standingWall) == null ? void 0 : _j.id) === wall.id || arena.testWallOverlap(this.position.x, this.position.y, this.colliderRadius, wall))) {
            continue;
          }
          if (this.position.z < wall.wallHeight - 0.05 || isDismountFallingNow || this.standingWall === null) {
            if (this.standingWall && (this.standingWall.id === wall.id || arena.areWallsContiguous(this.standingWall, wall))) {
              continue;
            }
            const apexZ = this.hasGravity && this.hasVerticalVelocity ? this.position.z + this.verticalVelocity * this.verticalVelocity / (2 * arena.gravity) : this.position.z;
            const isAscendingJump = (this.isCharacter || Boolean(this.lastThrower) || this.isInFlight) && this.verticalVelocity > 0 && apexZ >= wall.wallHeight - 0.05;
            this.resolveWallCollision(wall, isAscendingJump);
          }
        }
      }
    }
    const maxLinearSpeed = 16;
    const currentSpeed = Math.hypot(this.velocity.x, this.velocity.y);
    if (currentSpeed > maxLinearSpeed) {
      const scale = maxLinearSpeed / currentSpeed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
    }
    if (this.rollModule && this.rollModule.enabled) {
      const maxAngSpeed = 35;
      const currentAngSpeed = this.rollModule.angularSpeed;
      if (currentAngSpeed > maxAngSpeed) {
        const scale = maxAngSpeed / currentAngSpeed;
        this.rollModule.angularVelocity.x *= scale;
        this.rollModule.angularVelocity.y *= scale;
        this.rollModule.angularVelocity.z *= scale;
      }
    }
    if (this.verticalPositionModule) {
      this.verticalPositionModule.z = this.position.z;
    }
    if (!this.isCharacter && !this.isHeld && this.heldBy === null) {
      const speed = Math.hypot(this.velocity.x, this.velocity.y);
      const angSpeed = this.rollModule && this.rollModule.enabled ? this.rollModule.angularSpeed : 0;
      const isResting2 = this.isRestingOnSurface;
      if (isResting2 && speed < 0.02 && Math.abs(this.verticalVelocity) < 0.01 && angSpeed < 0.05) {
        this.sleepTimer++;
        if (this.sleepTimer >= 15) {
          this.putToSleep();
        }
      } else {
        this.sleepTimer = 0;
      }
    }
  }
  /**
   * Finds the closest point on any wall footprint in the arena to (x, y),
   * along with distance and normal vector components.
   */
  static getClosestWallPoint(x, y, arena) {
    if (!arena.walls || arena.walls.length === 0) return null;
    let bestDistSq = Infinity;
    let bestResult = null;
    for (const wall of arena.walls) {
      const cx = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const cy = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestResult = {
          wall,
          closestX: cx,
          closestY: cy,
          dist: Math.sqrt(distSq),
          dx,
          dy
        };
      }
    }
    return bestResult;
  }
  /**
   * Applies realistic wall/boundary impact dynamics
   */
  resolveWallImpact(normalX, normalY, restitution) {
    this.lastThrower = null;
    const dot = this.velocity.x * normalX + this.velocity.y * normalY;
    if (dot >= 0) return;
    const normalVel = dot;
    if (restitution > 0 && this.hasMass) {
      this.velocity.x -= (1 + restitution) * normalVel * normalX;
      this.velocity.y -= (1 + restitution) * normalVel * normalY;
    } else {
      this.velocity.x -= normalVel * normalX;
      this.velocity.y -= normalVel * normalY;
    }
    if (this.hasFriction && this.rollModule && this.rollModule.enabled) {
      const roll = this.rollModule;
      const R = this.colliderRadius > 0 ? this.colliderRadius : 0.3;
      const beta = 0.4;
      const muWall = 0.35;
      const tangentX = -normalY;
      const tangentY = normalX;
      const tangentVel = this.velocity.x * tangentX + this.velocity.y * tangentY;
      const normalImpulse = -(1 + restitution) * this.mass * normalVel;
      const vContactT = tangentVel - roll.angularVelocity.z * R;
      const stickImpulse = Math.abs(vContactT) * this.mass / (1 + 1 / beta);
      const maxFricImpulse = muWall * normalImpulse;
      const fricImpulseMag = Math.min(stickImpulse, maxFricImpulse);
      const fricImpulse = -Math.sign(vContactT) * fricImpulseMag;
      const oldTangentVel = tangentVel;
      const proposedTangentVel = oldTangentVel + fricImpulse / this.mass;
      const actualDeltaVt = Math.abs(proposedTangentVel) <= Math.abs(oldTangentVel) + 0.01 ? proposedTangentVel - oldTangentVel : -oldTangentVel * 0.1;
      this.velocity.x += actualDeltaVt * tangentX;
      this.velocity.y += actualDeltaVt * tangentY;
      const actualFricImpulse = actualDeltaVt * this.mass;
      const deltaWz = -actualFricImpulse / (beta * this.mass * R);
      roll.angularVelocity.z += deltaWz;
      roll.angularVelocity.z = Math.max(-30, Math.min(30, roll.angularVelocity.z));
      roll.angularVelocity.y = this.velocity.x / R;
      roll.angularVelocity.x = -this.velocity.y / R;
    }
  }
  /** Resolves 2D circle-AABB wall collision on the ground plane */
  resolveWallCollision(wall, isAscendingJump = false) {
    if (!this.hasCollider) return;
    const r = this.colliderRadius;
    const closestX = Math.max(wall.x, Math.min(this.position.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(this.position.y, wall.y + wall.height));
    const dx = this.position.x - closestX;
    const dy = this.position.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < r * r) {
      this.lastThrower = null;
      const dist = Math.sqrt(distSq);
      let normalX = 0;
      let normalY = 0;
      let overlap = 0;
      if (dist === 0) {
        const leftDist = Math.abs(this.position.x - wall.x);
        const rightDist = Math.abs(wall.x + wall.width - this.position.x);
        const topDist = Math.abs(this.position.y - wall.y);
        const bottomDist = Math.abs(wall.y + wall.height - this.position.y);
        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
        if (minDist === leftDist) {
          normalX = -1;
          overlap = leftDist + r;
        } else if (minDist === rightDist) {
          normalX = 1;
          overlap = rightDist + r;
        } else if (minDist === topDist) {
          normalY = -1;
          overlap = topDist + r;
        } else {
          normalY = 1;
          overlap = bottomDist + r;
        }
      } else {
        overlap = r - dist;
        normalX = dx / dist;
        normalY = dy / dist;
      }
      this.position.x += normalX * overlap;
      this.position.y += normalY * overlap;
      this.lastContactPoint = { x: closestX, y: closestY };
      this.lastContactNormal = { x: normalX, y: normalY };
      this.lastCollisionType = this.isSweptActive ? "continuous_swept" : "discrete_toi";
      this.lastCollisionTime = performance.now();
      if (!isAscendingJump) {
        const restitution = this.isCharacter ? 0 : this.hasBounce && this.bounceMod !== null ? this.bounceMod : 0;
        this.resolveWallImpact(normalX, normalY, restitution);
      }
    }
  }
}
class WalkingModule {
  constructor(options) {
    __publicField(this, "id", "walking");
    __publicField(this, "name", "Walking Module");
    __publicField(this, "enabled", true);
    // Maximum propulsion / braking force exerted by the character's legs (in Newtons / Force units)
    __publicField(this, "maxWalkForce", 35);
    // Maximum physical leg stride / cadence speed cap (u/s)
    __publicField(this, "maxWalkSpeed", 5.2);
    // Drag damping factor for backwards compatibility / reference
    __publicField(this, "dragDamping", 8.01);
    // When enabled, walking force applies in the air, granting air control / steering
    __publicField(this, "walkInAir", true);
    // Air friction multiplier applied when airborne (floating friction to stay still)
    __publicField(this, "airFriction", 1);
    if ((options == null ? void 0 : options.maxWalkForce) !== void 0) this.maxWalkForce = options.maxWalkForce;
    if ((options == null ? void 0 : options.maxWalkSpeed) !== void 0) this.maxWalkSpeed = options.maxWalkSpeed;
    if ((options == null ? void 0 : options.dragDamping) !== void 0) this.dragDamping = options.dragDamping;
    if ((options == null ? void 0 : options.walkInAir) !== void 0) this.walkInAir = options.walkInAir;
    if ((options == null ? void 0 : options.airFriction) !== void 0) this.airFriction = options.airFriction;
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  /**
   * Symmetrical Force-Based Locomotion & Air Friction:
   * - Accelerating and stopping step toward target velocity at symmetrical rate:
   *   maxAccel = (maxWalkForce * strength / totalMass) * grip.
   * - On ground, grip scales by ground friction. In air, airFriction applies floating friction to stay still.
   * - Carrying heavy objects increases totalMass, reducing acceleration and smoothly lowering top speed.
   * - When not standing on something (airborne), max speed is not clamped to effective walking speed,
   *   preserving high velocity capacity from launches and jumps while allowing steering and floating friction braking.
   */
  update(character, inputVector, dt, arena) {
    var _a;
    const isAirborne = !character.isRestingOnSurface;
    if (!this.enabled || isAirborne && !this.walkInAir || character.isClimbing) {
      character.isActivelyWalking = false;
      return;
    }
    if (!character.hasMass || !character.hasStrength || character.strength <= 0) {
      character.isActivelyWalking = false;
      return;
    }
    if (!isAirborne && (!character.hasFriction || !((_a = character.frictionModule) == null ? void 0 : _a.enabled) || character.dynamicGroundFrictionMod <= 1e-3)) {
      character.isActivelyWalking = false;
      return;
    }
    const inputMag = Math.hypot(inputVector.x, inputVector.y);
    const isMoving = inputMag > 0.05;
    character.isActivelyWalking = isMoving;
    const totalMass = character.hasMass ? Math.max(0.2, character.mass) : 1;
    if (totalMass <= 0.01) return;
    const grip = isAirborne ? this.airFriction : character.dynamicGroundFrictionMod * (arena.frictionCoeff / 10);
    if (grip <= 1e-3) {
      return;
    }
    const carriedMass = character.carriedMass;
    const loadFactor = carriedMass / (Math.max(0.1, character.strength) * 8);
    const sprintFactor = character.isSprinting ? 1.55 : 1;
    const effectiveSpeed = this.maxWalkSpeed * sprintFactor / (1 + loadFactor);
    let targetVx = 0;
    let targetVy = 0;
    if (isMoving) {
      const dirX = inputVector.x / inputMag;
      const dirY = inputVector.y / inputMag;
      if (isAirborne) {
        const currentSpeed2 = Math.hypot(character.velocity.x, character.velocity.y);
        const airTargetSpeed = Math.max(effectiveSpeed, currentSpeed2);
        targetVx = dirX * airTargetSpeed;
        targetVy = dirY * airTargetSpeed;
      } else {
        targetVx = dirX * effectiveSpeed;
        targetVy = dirY * effectiveSpeed;
      }
    }
    const diffX = targetVx - character.velocity.x;
    const diffY = targetVy - character.velocity.y;
    const diffSpeed = Math.hypot(diffX, diffY);
    if (diffSpeed < 1e-3) {
      character.velocity.x = targetVx;
      character.velocity.y = targetVy;
      return;
    }
    const currentSpeed = Math.hypot(character.velocity.x, character.velocity.y);
    const staticThreshold = Math.max(0.02, arena.staticFrictionThreshold * character.staticGroundFrictionMod);
    const effectiveWalkForce = character.isSprinting ? this.maxWalkForce * 1.5 : this.maxWalkForce;
    const maxAccel = effectiveWalkForce * character.strength / totalMass * grip;
    const maxStep = maxAccel * dt;
    if (diffSpeed <= maxStep || !isAirborne && !isMoving && currentSpeed < staticThreshold) {
      character.velocity.x = targetVx;
      character.velocity.y = targetVy;
    } else {
      const stepRatio = maxStep / diffSpeed;
      character.velocity.x += diffX * stepRatio;
      character.velocity.y += diffY * stepRatio;
    }
  }
}
class PickupModule {
  constructor() {
    __publicField(this, "id", "pickup");
    __publicField(this, "name", "Pickup Ability");
    __publicField(this, "enabled", true);
    __publicField(this, "pickupReach", 1.3);
    // 3D radius in units to reach and pick up freebodies (~1.3 wall tiles)
    __publicField(this, "crossLayerReachRatio", 1);
  }
  // Deprecated: single 3D pickup range now governs reach across all layers
  /**
   * Returns true if the object is within the character's physical grab reach using true 3D math.
   * Gets the delta magnitude of the 3D positions (dx, dy, dz) and forces the character
   * to be within a single pickup range.
   */
  isObjectInReach(character, obj, wallHeight = 1) {
    if (!this.enabled || obj === character || obj.isHeld || obj.isCharacter) return false;
    if (obj.lastThrower === character) return false;
    const charZ = Math.max(
      character.position.z,
      character.supportingSurfaceHeight ?? 0,
      character.standingWall ? wallHeight : 0
    );
    const objZ = Math.max(
      obj.position.z,
      obj.supportingSurfaceHeight ?? 0,
      obj.standingWall ? wallHeight : 0
    );
    const dx = obj.position.x - character.position.x;
    const dy = obj.position.y - character.position.y;
    const dz = objZ - charZ;
    const deltaMagnitude = Math.hypot(dx, dy, dz);
    return deltaMagnitude <= this.pickupReach;
  }
  /**
   * Finds the nearest grabbable object to the mouse/aim location within character reach
   */
  findTargetObject(character, targetX, targetY, objects, wallHeight = 1, maxSelectDistance = Infinity) {
    if (!this.enabled) return null;
    let bestCandidate = null;
    let shortestDist = Infinity;
    for (const obj of objects) {
      if (obj === character.heldObject || obj.isHeld) continue;
      if (!this.isObjectInReach(character, obj, wallHeight)) continue;
      const distToMouse = Math.hypot(obj.position.x - targetX, obj.position.y - targetY);
      if (distToMouse <= maxSelectDistance && distToMouse < shortestDist) {
        shortestDist = distToMouse;
        bestCandidate = obj;
      }
    }
    return bestCandidate;
  }
  /**
   * Picks up the specified object and transfers its incoming momentum/force to the character
   */
  pickup(character, target) {
    if (!this.enabled) return false;
    if (character.heldObject) return false;
    const objVx = target.velocity.x;
    const objVy = target.velocity.y;
    const momentumRatio = target.mass / Math.max(0.2, character.mass);
    character.velocity.x += objVx * momentumRatio;
    character.velocity.y += objVy * momentumRatio;
    if (character.isAboveGround && Math.abs(target.verticalVelocity) > 0.1) {
      character.verticalVelocity += target.verticalVelocity * momentumRatio;
    }
    character.heldObject = target;
    target.wakeUp();
    target.isHeld = true;
    target.heldBy = character;
    target.isInFlight = false;
    target.lastThrower = null;
    target.velocity.x = 0;
    target.velocity.y = 0;
    target.verticalVelocity = 0;
    if (target.rollModule) {
      target.rollModule.angularVelocity.x = 0;
      target.rollModule.angularVelocity.y = 0;
      target.rollModule.angularVelocity.z = 0;
    }
    target.position.z = target.hasVerticalPosition ? 0.45 : 0;
    return true;
  }
  /**
   * Drops the currently held object onto the ground, inheriting character velocity
   */
  drop(character) {
    if (!character.heldObject) return null;
    const dropped = character.heldObject;
    character.heldObject = null;
    dropped.wakeUp();
    dropped.isHeld = false;
    dropped.heldBy = null;
    dropped.lastThrower = null;
    dropped.isInFlight = false;
    dropped.velocity.x = character.velocity.x;
    dropped.velocity.y = character.velocity.y;
    dropped.verticalVelocity = character.isAboveGround ? character.verticalVelocity : 0;
    if (dropped.hasFriction && dropped.rollModule && dropped.rollModule.enabled) {
      const R = dropped.colliderRadius > 0 ? dropped.colliderRadius : 0.3;
      dropped.rollModule.angularVelocity.y = dropped.velocity.x / R;
      dropped.rollModule.angularVelocity.x = -dropped.velocity.y / R;
    }
    return dropped;
  }
  /**
   * Pickup and swap:
   * - If aimX/aimY provided, targets reachable object closest to the cursor.
   * - If holding an object and another reachable object is nearby, drops the held object and grabs the new one.
   * - If holding an object and no other object is nearby, drops the held object.
   * - If not holding an object, picks up the closest reachable object.
   */
  pickupAndSwap(character, objects, wallHeight, aimX, aimY) {
    if (!this.enabled) return false;
    let bestTarget = null;
    if (aimX !== void 0 && aimY !== void 0) {
      bestTarget = this.findTargetObject(character, aimX, aimY, objects, wallHeight);
    }
    if (!bestTarget) {
      let bestDist = Infinity;
      const charZ = Math.max(
        character.position.z,
        character.supportingSurfaceHeight ?? 0,
        character.standingWall ? wallHeight : 0
      );
      for (const obj of objects) {
        if (obj === character.heldObject || obj.isHeld) continue;
        if (this.isObjectInReach(character, obj, wallHeight)) {
          const objZ = Math.max(
            obj.position.z,
            obj.supportingSurfaceHeight ?? 0,
            obj.standingWall ? wallHeight : 0
          );
          const d = Math.hypot(
            obj.position.x - character.position.x,
            obj.position.y - character.position.y,
            objZ - charZ
          );
          if (d < bestDist) {
            bestDist = d;
            bestTarget = obj;
          }
        }
      }
    }
    if (character.heldObject) {
      if (bestTarget) {
        this.drop(character);
        return this.pickup(character, bestTarget);
      }
      return false;
    } else {
      if (bestTarget) {
        return this.pickup(character, bestTarget);
      }
    }
    return false;
  }
}
class ThrowModule {
  constructor() {
    __publicField(this, "id", "throw");
    __publicField(this, "name", "Throw Ability");
    __publicField(this, "enabled", true);
    // Tunable throw physics in wall-based units
    __publicField(this, "baseThrowForce", 7.6);
    // Base throw power in u/s
    __publicField(this, "maxThrowAimDistance", 13);
    // Max throw aim distance in units (~13 wall tiles)
    __publicField(this, "maxThrowHeight", 5);
  }
  // Max throw height reach in units above release point (~5 wall heights)
  /**
   * Helper: tests circle-AABB intersection with a wall tile (matching GameObject collision)
   */
  testWallIntersection(x, y, radius, wall) {
    const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy < radius * radius;
  }
  /**
   * Clamps an object's start position so that it does not overlap any wall if starting on the ground.
   * If overlapping, pushes it out to the closest valid position outside the wall.
   * Also exposes a near-wall check: if the clamped position is within `safeDistance` of any wall
   * face, the caller should pull the start back to the character's own position.
   */
  static clampStartOutsideWalls(x, y, radius, arena, charZ, charX, charY) {
    if (charZ >= arena.wallHeight) {
      return { x, y, nearWall: false };
    }
    let clampedX = x;
    let clampedY = y;
    const r = radius > 0 ? radius : 0.3;
    const requiredClearance = r + 0.04;
    const nearWallThreshold = r + 0.3;
    for (let iter = 0; iter < 3; iter++) {
      let collided = false;
      for (const wall of arena.walls) {
        const closestX = Math.max(wall.x, Math.min(clampedX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(clampedY, wall.y + wall.height));
        const dx = clampedX - closestX;
        const dy = clampedY - closestY;
        const distSq = dx * dx + dy * dy;
        if (distSq < requiredClearance * requiredClearance) {
          collided = true;
          const dist = Math.sqrt(distSq);
          if (dist > 1e-4) {
            const pushDist = requiredClearance + 0.01 - dist;
            clampedX += dx / dist * pushDist;
            clampedY += dy / dist * pushDist;
          } else {
            const cdx = charX - closestX;
            const cdy = charY - closestY;
            const cdist = Math.hypot(cdx, cdy);
            if (cdist > 1e-4) {
              clampedX = closestX + cdx / cdist * (requiredClearance + 0.01);
              clampedY = closestY + cdy / cdist * (requiredClearance + 0.01);
            } else {
              const dL = clampedX - wall.x;
              const dR = wall.x + wall.width - clampedX;
              const dT = clampedY - wall.y;
              const dB = wall.y + wall.height - clampedY;
              const minD = Math.min(dL, dR, dT, dB);
              if (minD === dL) clampedX = wall.x - requiredClearance - 0.01;
              else if (minD === dR) clampedX = wall.x + wall.width + requiredClearance + 0.01;
              else if (minD === dT) clampedY = wall.y - requiredClearance - 0.01;
              else clampedY = wall.y + wall.height + requiredClearance + 0.01;
            }
          }
        }
      }
      if (!collided) break;
    }
    let nearWall = false;
    for (const wall of arena.walls) {
      const closestX = Math.max(wall.x, Math.min(clampedX, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(clampedY, wall.y + wall.height));
      const dx = clampedX - closestX;
      const dy = clampedY - closestY;
      if (dx * dx + dy * dy < nearWallThreshold * nearWallThreshold) {
        nearWall = true;
        break;
      }
    }
    return { x: clampedX, y: clampedY, nearWall };
  }
  /**
   * Finds the entity directly under the aim target cursor (x, y), if any.
   * Excludes the thrower and the thrower's held object.
   * Checks both physical 2D ground footprint and pseudo-3D isometric visual position.
   */
  findHoveredEntity(aimX, aimY, arena, exclude, heldObject, entities, hoverScale, tolerance = 0.35) {
    var _a;
    const list = entities ?? arena.entities ?? [];
    const scale = hoverScale !== void 0 ? hoverScale : arena.visualAltitudeScale ?? 0.5;
    let bestEntity = null;
    let bestDist = Infinity;
    for (let i = list.length - 1; i >= 0; i--) {
      const ent = list[i];
      if (ent === exclude || ent === heldObject || ent.isHeld) continue;
      const r = ent.hasCollider ? ent.colliderRadius : ((_a = ent.colliderModule) == null ? void 0 : _a.radius) ?? 0.35;
      const effectiveR = r > 0 ? r : 0.35;
      const distGround = Math.hypot(ent.position.x - aimX, ent.position.y - aimY);
      const z = ent.position.z ?? 0;
      const visualY = ent.position.y - z * scale;
      const distVisual = Math.hypot(ent.position.x - aimX, visualY - aimY);
      const dist1to1 = Math.hypot(ent.position.x - aimX, ent.position.y - z - aimY);
      const minDist = Math.min(distGround, distVisual, dist1to1);
      if (minDist <= effectiveR + tolerance) {
        if (minDist < bestDist) {
          bestDist = minDist;
          bestEntity = ent;
        }
      }
    }
    return bestEntity;
  }
  /**
   * Helper: tests if (aimX, aimY) in screen space is over a wall's pseudo-3D roof or front face.
   * If found, maps the screen aim point back to physical 3D world coordinates (physX, physY)
   * on top of the wall so that rendering at (physX, physY - wallHeight * hoverScale) aligns
   * EXACTLY with (aimX, aimY) on screen!
   */
  static getWallUnderCursor(aimX, aimY, arena, hoverScale = 0) {
    const hScale = hoverScale > 0 ? hoverScale : 0;
    const sortedWalls = [...arena.walls].sort((a, b) => b.y - a.y);
    for (const wall of sortedWalls) {
      const roofTopY = wall.y - wall.wallHeight * hScale;
      const roofBottomY = wall.y + wall.height - wall.wallHeight * hScale;
      const baseBottomY = wall.y + wall.height;
      if (aimX >= wall.x - 0.05 && aimX <= wall.x + wall.width + 0.05) {
        if (aimY >= roofTopY && aimY <= roofBottomY) {
          const physX = Math.max(wall.x + 0.05, Math.min(wall.x + wall.width - 0.05, aimX));
          const physY = Math.max(wall.y + 0.05, Math.min(wall.y + wall.height - 0.05, aimY + wall.wallHeight * hScale));
          return { wall, physX, physY };
        }
        if (aimY > roofBottomY && aimY <= baseBottomY + 0.05) {
          const physX = Math.max(wall.x + 0.05, Math.min(wall.x + wall.width - 0.05, aimX));
          const physY = Math.max(wall.y + 0.05, Math.min(wall.y + wall.height - 0.05, wall.y + wall.height - 0.15));
          return { wall, physX, physY };
        }
        if (hScale === 0 && aimY >= wall.y && aimY <= wall.y + wall.height) {
          const physX = Math.max(wall.x + 0.05, Math.min(wall.x + wall.width - 0.05, aimX));
          const physY = Math.max(wall.y + 0.05, Math.min(wall.y + wall.height - 0.05, aimY));
          return { wall, physX, physY };
        }
      }
    }
    return null;
  }
  /**
   * Computes launch velocities vx, vy, vz given start position, target position, arena parameters, and strength.
   * Adjusts total flight time and launch angles so the object lands EXACTLY at the targeted position,
   * whether on the ground, on top of an elevated wall, or on the layer of a targeted object.
   * If autoLock is true (e.g. holding right click), locks 2D coordinates to the overlapped object center.
   */
  computeLaunchVelocity(startX, startY, startZ, targetX, targetY, arena, throwPower, hasGravity = true, hasVerticalVelocity = true, colliderRadius = 0.35, charVel, candidateEntities, hoverScale, thrower, heldObject, autoLock = false) {
    let hoveredEntity = null;
    let effectiveTargetX = targetX;
    let effectiveTargetY = targetY;
    let isLocked = false;
    let targetSurfaceHeight = 0;
    const scale = hoverScale !== void 0 ? hoverScale : arena.visualAltitudeScale ?? 0.5;
    if (autoLock) {
      hoveredEntity = this.findHoveredEntity(
        targetX,
        targetY,
        arena,
        thrower,
        heldObject,
        candidateEntities,
        hoverScale,
        Infinity
      );
      if (hoveredEntity) {
        effectiveTargetX = hoveredEntity.position.x;
        effectiveTargetY = hoveredEntity.position.y;
        isLocked = true;
        const entZ = Math.max(
          0,
          hoveredEntity.position.z ?? 0,
          hoveredEntity.supportingSurfaceHeight ?? 0,
          hoveredEntity.standingWall ? hoveredEntity.standingWall.wallHeight ?? arena.wallHeight : 0
        );
        targetSurfaceHeight = entZ;
      }
    }
    if (!isLocked) {
      const wallUnderCursor = ThrowModule.getWallUnderCursor(targetX, targetY, arena, scale);
      if (wallUnderCursor) {
        effectiveTargetX = wallUnderCursor.physX;
        effectiveTargetY = wallUnderCursor.physY;
        targetSurfaceHeight = wallUnderCursor.wall.wallHeight;
      } else {
        targetSurfaceHeight = arena.getSupportingSurfaceHeight(targetX, targetY);
      }
    }
    const effectiveMaxHeight = this.maxThrowHeight * ((thrower == null ? void 0 : thrower.strength) ?? 1);
    const maxAllowedTargetZ = startZ + effectiveMaxHeight;
    if (targetSurfaceHeight > maxAllowedTargetZ) {
      targetSurfaceHeight = maxAllowedTargetZ;
    }
    const dx = effectiveTargetX - startX;
    const dy = effectiveTargetY - startY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.1) return null;
    const actualDist = Math.min(dist, this.maxThrowAimDistance);
    const dirX = dx / dist;
    const dirY = dy / dist;
    const finalTargetX = startX + dirX * actualDist;
    const finalTargetY = startY + dirY * actualDist;
    if (actualDist < dist) {
      if (isLocked) {
        targetSurfaceHeight = startZ + (targetSurfaceHeight - startZ) * (actualDist / dist);
      } else {
        const clampedWall = arena.getSupportingWall(finalTargetX, finalTargetY, colliderRadius > 0 ? colliderRadius : 0.35);
        if (clampedWall) {
          targetSurfaceHeight = clampedWall.wallHeight;
        } else {
          targetSurfaceHeight = arena.getSupportingSurfaceHeight(finalTargetX, finalTargetY);
        }
      }
    }
    const vxChar = (charVel == null ? void 0 : charVel.x) ?? 0;
    const vyChar = (charVel == null ? void 0 : charVel.y) ?? 0;
    const vAlong = vxChar * dirX + vyChar * dirY;
    const vPerp = vxChar * -dirY + vyChar * dirX;
    const armAlongMax = Math.sqrt(Math.max(0.25, throwPower * throwPower - vPerp * vPerp));
    const maxForwardSpeed = Math.max(1.5, vAlong + armAlongMax);
    if (!hasGravity || !hasVerticalVelocity) {
      const totalTime2 = Math.max(0.14, actualDist / maxForwardSpeed);
      const vx2 = dirX * maxForwardSpeed;
      const vy2 = dirY * maxForwardSpeed;
      const vz2 = 0;
      return { vx: vx2, vy: vy2, vz: vz2, totalTime: totalTime2, finalTargetX, finalTargetY, targetSurfaceHeight: startZ, targetObject: hoveredEntity };
    }
    const deltaZ = targetSurfaceHeight - startZ;
    const minFlightTime = Math.max(0.14, actualDist / maxForwardSpeed);
    let totalTime = minFlightTime;
    if (deltaZ > 0) {
      totalTime = Math.max(totalTime, Math.sqrt(2 * deltaZ / arena.gravity));
    }
    const colliderRadiusCheck = colliderRadius > 0 ? colliderRadius : 0.35;
    const clearance = 0.25;
    const sampleRatios = [];
    for (let s = 5e-3; s < 0.1; s += 5e-3) {
      sampleRatios.push(s);
    }
    for (let i = 4; i <= 40; i++) {
      sampleRatios.push(i / 40);
    }
    for (const s of sampleRatios) {
      const sampleX = startX + (finalTargetX - startX) * s;
      const sampleY = startY + (finalTargetY - startY) * s;
      for (const wall of arena.walls) {
        if (this.testWallIntersection(sampleX, sampleY, colliderRadiusCheck, wall)) {
          const isTargetOnThisWall = (targetSurfaceHeight > 0 || hoveredEntity && hoveredEntity.standingWall === wall) && finalTargetX >= wall.x - 0.2 && finalTargetX <= wall.x + wall.width + 0.2 && finalTargetY >= wall.y - 0.2 && finalTargetY <= wall.y + wall.height + 0.2;
          if (isTargetOnThisWall && s > 0.65) {
            continue;
          }
          const baselineZ = (1 - s) * startZ + s * targetSurfaceHeight;
          const requiredHeight = wall.wallHeight + clearance;
          const requiredDeltaZ = requiredHeight - baselineZ;
          if (requiredDeltaZ > 0) {
            const denom = arena.gravity * s * (1 - s);
            if (denom > 1e-4) {
              const reqTimeSq = 2 * requiredDeltaZ / denom;
              if (reqTimeSq > 0) {
                const reqTime = Math.sqrt(reqTimeSq);
                if (reqTime > totalTime) {
                  totalTime = reqTime;
                }
              }
            }
          }
        }
      }
    }
    if (totalTime <= 0.05) return null;
    const vz = (deltaZ + 0.5 * arena.gravity * totalTime * totalTime) / totalTime;
    const horizontalSpeed = actualDist / totalTime;
    const vx = dirX * horizontalSpeed;
    const vy = dirY * horizontalSpeed;
    return { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight, targetObject: hoveredEntity, isAutoLocked: isLocked };
  }
  /**
   * Pre-calculates trajectory points for real-time visualization overlay
   */
  calculateTrajectory(character, aimTargetX, aimTargetY, arena, entities, hoverScale, autoLock = false) {
    if (!this.enabled || !character.heldObject) return null;
    const held = character.heldObject;
    let startX = held.position.x;
    let startY = held.position.y;
    let startZ = held.position.z;
    if (character.position.z < arena.wallHeight) {
      const clamped = ThrowModule.clampStartOutsideWalls(
        startX,
        startY,
        held.colliderRadius,
        arena,
        character.position.z,
        character.position.x,
        character.position.y
      );
      startX = clamped.x;
      startY = clamped.y;
      if (clamped.nearWall) {
        startZ = Math.max(startZ, arena.wallHeight + 0.05);
      }
    }
    const throwPower = this.baseThrowForce * character.strength;
    const canFlyVertically = held.hasGravity && held.hasVerticalVelocity;
    const charVel = {
      x: character.velocity.x,
      y: character.velocity.y,
      z: character.isAboveGround ? character.verticalVelocity : 0
    };
    const candidateEntities = entities ?? arena.entities;
    const scale = hoverScale !== void 0 ? hoverScale : arena.visualAltitudeScale ?? 0.5;
    const launch = this.computeLaunchVelocity(
      startX,
      startY,
      startZ,
      aimTargetX,
      aimTargetY,
      arena,
      throwPower,
      held.hasGravity,
      held.hasVerticalVelocity,
      held.colliderRadius,
      charVel,
      candidateEntities,
      scale,
      character,
      held,
      autoLock
    );
    if (!launch) return null;
    const { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight, targetObject, isAutoLocked } = launch;
    const steps = 90;
    const dtStep = totalTime / steps;
    const points = [];
    let isBlocked = false;
    let isLandingOnWallTop = targetSurfaceHeight > 0;
    let blockedWallId;
    let peakHeight = startZ;
    for (let step = 0; step <= steps; step++) {
      const t = step * dtStep;
      const currentX = step === steps ? finalTargetX : startX + vx * t;
      const currentY = step === steps ? finalTargetY : startY + vy * t;
      const calculatedZ = canFlyVertically ? startZ + vz * t - 0.5 * arena.gravity * t * t : startZ;
      const currentZ = canFlyVertically ? step === steps ? targetSurfaceHeight : step > steps - 3 ? Math.max(targetSurfaceHeight, calculatedZ) : Math.max(0, calculatedZ) : startZ;
      const currentVz = canFlyVertically ? vz - arena.gravity * t : 0;
      if (currentZ > peakHeight) {
        peakHeight = currentZ;
      }
      const couldClearWall = currentZ > arena.wallHeight;
      let isOverWall = false;
      let collidesWall = false;
      for (const wall of arena.walls) {
        if (this.testWallIntersection(currentX, currentY, held.colliderRadius, wall)) {
          isOverWall = true;
          if (currentZ <= wall.wallHeight + 1e-3) {
            const wasAbove = points.length > 0 && points[points.length - 1].z >= wall.wallHeight - 0.05;
            if (wasAbove && currentVz <= 0) {
              const isTargetedWall = targetSurfaceHeight > 0 && finalTargetX >= wall.x - 0.2 && finalTargetX <= wall.x + wall.width + 0.2 && finalTargetY >= wall.y - 0.2 && finalTargetY <= wall.y + wall.height + 0.2;
              if (isTargetedWall || targetSurfaceHeight > 0 && step >= steps - 3) {
                isLandingOnWallTop = true;
                break;
              } else if (targetSurfaceHeight === 0) {
                isLandingOnWallTop = true;
                collidesWall = true;
                isBlocked = true;
                blockedWallId = wall.id;
                break;
              }
            } else if (currentZ < wall.wallHeight - 0.05) {
              if (step > 1) {
                collidesWall = true;
                isBlocked = true;
                blockedWallId = wall.id;
                break;
              }
            }
          }
        }
      }
      points.push({
        x: currentX,
        y: currentY,
        z: currentZ,
        t,
        couldClearWall,
        isOverWall,
        collidesWall
      });
      if (collidesWall) {
        break;
      }
    }
    const lastPoint = points[points.length - 1];
    return {
      points,
      landPoint: {
        x: isBlocked ? lastPoint.x : finalTargetX,
        y: isBlocked ? lastPoint.y : finalTargetY,
        z: isBlocked ? lastPoint.z : targetSurfaceHeight
      },
      isBlockedByWall: isBlocked,
      isLandingOnWallTop: isBlocked ? isLandingOnWallTop : targetSurfaceHeight > 0,
      blockedAtWallId: blockedWallId,
      targetObject,
      targetSurfaceHeight,
      isAutoLocked,
      peakHeight,
      flightTime: totalTime,
      colliderRadius: held.colliderRadius,
      visualShape: held.visualShape
    };
  }
  /**
   * Executes the throw of the held object using the exact same launch parameters
   */
  throwHeldObject(character, aimTargetX, aimTargetY, arena, entities, hoverScale, autoLock = false) {
    if (!this.enabled || !character.heldObject) return null;
    const held = character.heldObject;
    let startX = held.position.x;
    let startY = held.position.y;
    let startZ = held.position.z;
    if (character.position.z < arena.wallHeight) {
      const clamped = ThrowModule.clampStartOutsideWalls(
        startX,
        startY,
        held.colliderRadius,
        arena,
        character.position.z,
        character.position.x,
        character.position.y
      );
      startX = clamped.x;
      startY = clamped.y;
      if (clamped.nearWall) {
        startZ = Math.max(startZ, arena.wallHeight + 0.05);
      }
    }
    const throwPower = this.baseThrowForce * character.strength;
    const charVel = {
      x: character.velocity.x,
      y: character.velocity.y,
      z: character.isAboveGround ? character.verticalVelocity : 0
    };
    const candidateEntities = entities ?? arena.entities;
    const scale = hoverScale !== void 0 ? hoverScale : arena.visualAltitudeScale ?? 0.5;
    const launch = this.computeLaunchVelocity(
      startX,
      startY,
      startZ,
      aimTargetX,
      aimTargetY,
      arena,
      throwPower,
      held.hasGravity,
      held.hasVerticalVelocity,
      held.colliderRadius,
      charVel,
      candidateEntities,
      scale,
      character,
      held,
      autoLock
    );
    if (!launch) return null;
    if (launch.isAutoLocked && launch.targetObject) {
      const dx = launch.targetObject.position.x - character.position.x;
      const dy = launch.targetObject.position.y - character.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        character.facingAngle = Math.atan2(dy, dx);
      }
    }
    held.isHeld = false;
    held.heldBy = null;
    held.lastThrower = character;
    held.isInFlight = true;
    held.wakeUp();
    held.position.x = startX;
    held.position.y = startY;
    held.velocity.x = launch.vx;
    held.velocity.y = launch.vy;
    held.verticalVelocity = launch.vz;
    held.position.z = held.hasVerticalPosition ? Math.max(startZ, held.position.z) : 0;
    if (held.hasFriction && held.rollModule && held.rollModule.enabled) {
      const R = held.colliderRadius > 0 ? held.colliderRadius : 0.3;
      held.rollModule.angularVelocity.y = launch.vx / R;
      held.rollModule.angularVelocity.x = -launch.vy / R;
    }
    const carriedMass = held.hasMass ? held.mass : 0;
    const charBaseMass = character.hasMass ? Math.max(0.2, character.baseMass) : 0;
    const recoilRatio = carriedMass > 0 && charBaseMass > 0 ? carriedMass / charBaseMass : 0;
    character.heldObject = null;
    const deltaVx = launch.vx - character.velocity.x;
    const deltaVy = launch.vy - character.velocity.y;
    character.velocity.x -= deltaVx * recoilRatio;
    character.velocity.y -= deltaVy * recoilRatio;
    if (character.isAboveGround && held.hasVerticalVelocity) {
      const deltaVz = launch.vz - character.verticalVelocity;
      character.verticalVelocity -= deltaVz * recoilRatio;
    }
    return held;
  }
}
class StrengthModule {
  constructor(options = {}) {
    __publicField(this, "id", "strength");
    __publicField(this, "name", "Strength Module");
    __publicField(this, "enabled", true);
    // Strength multiplier: governs physical exertion for walking under load, throwing power, and vertical climbing
    __publicField(this, "strength", 1);
    this.strength = options.strength ?? 1;
    this.enabled = options.enabled ?? true;
  }
}
class JumpModule {
  constructor(options) {
    __publicField(this, "id", "jump");
    __publicField(this, "name", "Jump Ability");
    __publicField(this, "enabled", true);
    /**
     * Jump strength (impulse in N·s).
     * Default 18.5 N·s provides enough propulsion to achieve the max takeoff speed (~9.67 u/s, 1.5 units height)
     * both unencumbered (1.2kg) and when holding the Light Blue Box (0.7kg, total 1.9kg).
     * When carrying the Heavy Red Box (2.6kg, total 3.8kg), takeoff speed drops to ~4.87 u/s (~0.39 units height).
     */
    __publicField(this, "jumpStrength", 18.5);
    /**
     * Maximum initial takeoff speed cap (in units per second).
     * 9.67 u/s achieves a peak ballistic jump height of ~1.5 units under gravity 30.0 u/s^2.
     */
    __publicField(this, "maxInitialSpeed", 9.67);
    if ((options == null ? void 0 : options.jumpStrength) !== void 0) this.jumpStrength = options.jumpStrength;
    if ((options == null ? void 0 : options.maxInitialSpeed) !== void 0) this.maxInitialSpeed = options.maxInitialSpeed;
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
  /**
   * Attempts to jump from the current supporting surface (ground or wall top).
   * Returns true if jump was initiated, false otherwise.
   */
  jump(character, _arena, _movementInput) {
    if (!this.enabled || !character.hasVerticalPosition) return false;
    if (character.isHeld) return false;
    const surfaceZ = character.supportingSurfaceHeight ?? 0;
    const isGrounded = character.isRestingOnSurface || Math.abs(character.position.z - surfaceZ) <= 0.08 && Math.abs(character.verticalVelocity) <= 0.8;
    if (!isGrounded) {
      return false;
    }
    const totalMass = Math.max(0.2, character.mass);
    const takeoffSpeed = Math.min(this.maxInitialSpeed, this.jumpStrength / totalMass);
    if (takeoffSpeed <= 0.01) return false;
    character.verticalVelocity = takeoffSpeed;
    character.position.z = Math.max(character.position.z, surfaceZ + 0.02);
    if (character.standingWall) {
      character.standingWall = null;
    }
    if (character.wallEdgeAssistModule) {
      character.wallEdgeAssistModule.isAssistClampArmed = false;
      character.wallEdgeAssistModule.hasLeftClampZoneSinceDismount = true;
    }
    return true;
  }
}
class WallEdgeAssistModule {
  constructor(options) {
    __publicField(this, "id", "wallEdgeAssist");
    __publicField(this, "name", "Wall Edge Assist");
    __publicField(this, "enabled", true);
    /**
     * Whether to prevent walking off elevated walls when walking on wall tops.
     */
    __publicField(this, "preventWalkOff", false);
    /**
     * Maximum distance the character is allowed to hang off of elevated walls
     * before the ledge guard clamps movement (in units).
     */
    __publicField(this, "hangDistance", 0.1);
    /** Whether the assist clamp (ledge guard) is currently active/armed */
    __publicField(this, "isAssistClampArmed", false);
    /** Tracks whether character has moved onto the wall top platform after mounting */
    __publicField(this, "hasMovedOntoWall", false);
    /** Tracks if character has moved outside the clamp zone (> 0.1u) after dismounting */
    __publicField(this, "hasLeftClampZoneSinceDismount", true);
    __publicField(this, "mountStartX", 0);
    __publicField(this, "mountStartY", 0);
    if ((options == null ? void 0 : options.preventWalkOff) !== void 0) this.preventWalkOff = options.preventWalkOff;
    if ((options == null ? void 0 : options.hangDistance) !== void 0) this.hangDistance = options.hangDistance;
    if ((options == null ? void 0 : options.enabled) !== void 0) this.enabled = options.enabled;
  }
}
class Character extends GameObject {
  constructor(options = {}) {
    const initialColor = options.color ?? "#f59e0b";
    super({
      id: options.id,
      name: options.name ?? `Player ${options.playerNumber ?? 1}`,
      position: { x: options.x ?? 5, y: options.y ?? 7, z: 0 },
      mass: options.mass ?? 1.2,
      colliderRadius: options.colliderRadius ?? 0.44,
      color: initialColor,
      bounceMod: 0.1
    });
    __publicField(this, "strengthModule");
    __publicField(this, "facingAngle");
    // Angle in radians
    __publicField(this, "lastMovementInputAngle", 0);
    // Most recent movement input angle in radians
    __publicField(this, "heldObject");
    __publicField(this, "isCharacter", true);
    __publicField(this, "isActivelyWalking", false);
    __publicField(this, "isClimbInputHeld", false);
    __publicField(this, "movementInput", { x: 0, y: 0 });
    __publicField(this, "isSprinting", false);
    __publicField(this, "onSprintChange");
    // Base mass when not carrying anything
    __publicField(this, "baseMass", 1.2);
    // Removable Modules
    __publicField(this, "walkingModule");
    __publicField(this, "pickupModule");
    __publicField(this, "throwModule");
    __publicField(this, "jumpModule");
    __publicField(this, "wallEdgeAssistModule");
    __publicField(this, "climbingModule");
    // Player identity & multiplayer slot
    __publicField(this, "playerId", "keyboard");
    __publicField(this, "playerNumber", 1);
    __publicField(this, "playerColor", "#f59e0b");
    __publicField(this, "hasCustomName", false);
    // Aiming state
    __publicField(this, "isAiming");
    __publicField(this, "aimTarget");
    __publicField(this, "activeTrajectory");
    this.playerId = options.playerId ?? "keyboard";
    this.playerNumber = options.playerNumber ?? 1;
    this.playerColor = initialColor;
    const isExplicitCustom = options.name ? !/^Player(\s+\d+)?$/i.test(options.name.trim()) && !/^Controller\s+#\d+$/i.test(options.name.trim()) : false;
    this.hasCustomName = options.hasCustomName ?? isExplicitCustom;
    this.baseMass = options.mass ?? 1.2;
    this.strength = options.strength ?? 1;
    this.facingAngle = 0;
    this.heldObject = null;
    this.isAiming = false;
    this.aimTarget = null;
    this.activeTrajectory = null;
    this.strengthModule = new StrengthModule({ strength: options.strength ?? 1 });
    this.walkingModule = new WalkingModule();
    this.pickupModule = new PickupModule();
    this.throwModule = new ThrowModule();
    this.jumpModule = new JumpModule();
    this.wallEdgeAssistModule = new WallEdgeAssistModule();
    this.climbingModule = null;
  }
  get hasStrength() {
    return Boolean(this.strengthModule && this.strengthModule.enabled && this.strengthModule.strength > 0);
  }
  get strength() {
    return this.hasStrength ? this.strengthModule.strength : 0;
  }
  set strength(val) {
    if (this.strengthModule) {
      this.strengthModule.strength = Math.max(0.1, val);
    } else {
      this.strengthModule = new StrengthModule({ strength: val });
    }
  }
  setSprinting(sprint) {
    var _a;
    if (this.isSprinting !== sprint) {
      this.isSprinting = sprint;
      (_a = this.onSprintChange) == null ? void 0 : _a.call(this, this.isSprinting);
    }
  }
  /**
   * Effective mass: base character mass plus the mass of any currently carried object.
   */
  get mass() {
    const base = this.hasMass ? this.baseMass : 0;
    const carried = this.heldObject && this.heldObject.hasMass ? this.heldObject.mass : 0;
    return base + carried;
  }
  set mass(val) {
    this.baseMass = Math.max(0.1, val);
    if (this.massModule) {
      this.massModule.mass = this.baseMass;
    }
  }
  get carriedMass() {
    return this.heldObject && this.heldObject.hasMass ? this.heldObject.mass : 0;
  }
  get hangDistance() {
    return this.wallEdgeAssistModule ? this.wallEdgeAssistModule.hangDistance : 0.1;
  }
  set hangDistance(val) {
    if (this.wallEdgeAssistModule) {
      this.wallEdgeAssistModule.hangDistance = Math.max(0, val);
    }
  }
  /**
   * Attempts to jump using the attached JumpModule.
   */
  jump(arena, movementInput) {
    if (this.jumpModule) {
      return this.jumpModule.jump(this, arena, movementInput);
    }
    return false;
  }
  /**
   * Safely releases any held objects, clears references, and dismounts
   * when this character is removed from the arena.
   */
  cleanupBeforeRemoval() {
    if (this.heldObject) {
      this.heldObject.isHeld = false;
      this.heldObject.heldBy = null;
      this.heldObject = null;
    }
    if (this.isHeld && this.heldBy) {
      if (this.heldBy instanceof Character && this.heldBy.heldObject === this) {
        this.heldBy.heldObject = null;
      }
      this.isHeld = false;
      this.heldBy = null;
    }
    this.activeTrajectory = null;
    this.isActivelyWalking = false;
    this.isSprinting = false;
  }
  /**
   * Updates character facing direction:
   * Faces in the direction the player is aiming. If not aiming (or no aim function),
   * faces in the direction the player INTENDS to move (movement input), not post-collision velocity.
   */
  updateFacingDirection(_isAimingInput, aimTargetPos, movementInput) {
    if (this.heldObject && aimTargetPos) {
      const dx = aimTargetPos.x - this.position.x;
      const dy = aimTargetPos.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }
    if (movementInput) {
      const inputMag = Math.hypot(movementInput.x, movementInput.y);
      if (inputMag > 0.05) {
        this.lastMovementInputAngle = Math.atan2(movementInput.y, movementInput.x);
        this.facingAngle = this.lastMovementInputAngle;
      }
    }
  }
  /**
   * Main character update tick
   */
  updateCharacter(dt, movementInput, isAimingInput, aimTargetPos, arena, isClimbInput = false, entities, autoLock = false) {
    var _a;
    this.movementInput.x = movementInput.x;
    this.movementInput.y = movementInput.y;
    this.isClimbInputHeld = isClimbInput;
    if (this.climbingModule) {
      this.climbingModule.update(this, movementInput, isClimbInput, dt, arena);
    }
    if (isClimbInput && !this.isClimbing && this.jumpModule && this.jumpModule.enabled) {
      this.jump(arena, movementInput);
    }
    if (this.walkingModule) {
      this.walkingModule.update(this, movementInput, dt, arena);
    }
    this.updatePosition(dt, arena);
    if (isClimbInput && !this.isClimbing && this.jumpModule && this.jumpModule.enabled) {
      this.jump(arena, movementInput);
    }
    let lockedTarget = null;
    if (autoLock && aimTargetPos && this.throwModule) {
      lockedTarget = this.throwModule.findHoveredEntity(
        aimTargetPos.x,
        aimTargetPos.y,
        arena,
        this,
        this.heldObject,
        entities ?? arena.entities,
        arena.visualAltitudeScale,
        Infinity
      );
    }
    if (lockedTarget) {
      const dx = lockedTarget.position.x - this.position.x;
      const dy = lockedTarget.position.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
      }
    } else {
      this.updateFacingDirection(isAimingInput, aimTargetPos, movementInput);
    }
    if (this.heldObject) {
      const heldPos = this.calculateHeldObjectPosition(arena);
      this.heldObject.position.x = heldPos.x;
      this.heldObject.position.y = heldPos.y;
      this.heldObject.position.z = heldPos.z;
      this.heldObject.velocity.x = this.velocity.x;
      this.heldObject.velocity.y = this.velocity.y;
      this.heldObject.verticalVelocity = 0;
    }
    this.isAiming = isAimingInput;
    this.aimTarget = isAimingInput ? aimTargetPos : null;
    if (this.heldObject && this.throwModule && isAimingInput && aimTargetPos) {
      this.activeTrajectory = this.throwModule.calculateTrajectory(
        this,
        aimTargetPos.x,
        aimTargetPos.y,
        arena,
        entities ?? arena.entities,
        arena.visualAltitudeScale,
        autoLock
      );
      if (((_a = this.activeTrajectory) == null ? void 0 : _a.isAutoLocked) && this.activeTrajectory.targetObject) {
        const dx = this.activeTrajectory.targetObject.position.x - this.position.x;
        const dy = this.activeTrajectory.targetObject.position.y - this.position.y;
        if (Math.hypot(dx, dy) > 0.05) {
          this.facingAngle = Math.atan2(dy, dx);
          if (this.heldObject) {
            const heldPos = this.calculateHeldObjectPosition(arena);
            this.heldObject.position.x = heldPos.x;
            this.heldObject.position.y = heldPos.y;
            this.heldObject.position.z = heldPos.z;
          }
        }
      }
    } else {
      this.activeTrajectory = null;
    }
  }
  /**
   * Calculates the physical position of an object held in the character's hands.
   * Naturally holds the object at defaultHandDist in front along facing angle.
   * If a wall is in front or adjacent, dynamically clamps the hold distance within
   * [0, defaultHandDist] (and pushes clear of walls) so the object never clips or hits
   * walls when held or thrown.
   */
  calculateHeldObjectPosition(arena) {
    if (!this.heldObject) {
      return { x: this.position.x, y: this.position.y, z: this.position.z };
    }
    const defaultHandDist = this.colliderRadius + this.heldObject.colliderRadius * 0.5 + 0.08;
    const dirX = Math.cos(this.facingAngle);
    const dirY = Math.sin(this.facingAngle);
    const heldZ = this.heldObject.hasVerticalPosition ? this.position.z + 0.45 : 0;
    if (!arena || this.position.z >= arena.wallHeight) {
      return {
        x: this.position.x + dirX * defaultHandDist,
        y: this.position.y + dirY * defaultHandDist,
        z: heldZ
      };
    }
    const objRadius = this.heldObject.colliderRadius > 0 ? this.heldObject.colliderRadius : 0.26;
    const safetyMargin = 0.12;
    const requiredClearance = objRadius + safetyMargin;
    const extraThrowClearback = 0.08;
    let minHitDistance = Infinity;
    for (const wall of arena.walls) {
      const x1 = wall.x;
      const x2 = wall.x + wall.width;
      const y1 = wall.y;
      const y2 = wall.y + wall.height;
      const R = requiredClearance;
      if (dirX > 1e-4 && this.position.x < x1 - R) {
        const t = (x1 - R - this.position.x) / dirX;
        if (t > 0 && t < minHitDistance) {
          const hitY = this.position.y + t * dirY;
          if (hitY >= y1 && hitY <= y2) minHitDistance = t;
        }
      }
      if (dirX < -1e-4 && this.position.x > x2 + R) {
        const t = (x2 + R - this.position.x) / dirX;
        if (t > 0 && t < minHitDistance) {
          const hitY = this.position.y + t * dirY;
          if (hitY >= y1 && hitY <= y2) minHitDistance = t;
        }
      }
      if (dirY > 1e-4 && this.position.y < y1 - R) {
        const t = (y1 - R - this.position.y) / dirY;
        if (t > 0 && t < minHitDistance) {
          const hitX = this.position.x + t * dirX;
          if (hitX >= x1 && hitX <= x2) minHitDistance = t;
        }
      }
      if (dirY < -1e-4 && this.position.y > y2 + R) {
        const t = (y2 + R - this.position.y) / dirY;
        if (t > 0 && t < minHitDistance) {
          const hitX = this.position.x + t * dirX;
          if (hitX >= x1 && hitX <= x2) minHitDistance = t;
        }
      }
      const corners = [
        { kx: x1, ky: y1, isExterior: (px, py) => px <= x1 && py <= y1 },
        { kx: x2, ky: y1, isExterior: (px, py) => px >= x2 && py <= y1 },
        { kx: x1, ky: y2, isExterior: (px, py) => px <= x1 && py >= y2 },
        { kx: x2, ky: y2, isExterior: (px, py) => px >= x2 && py >= y2 }
      ];
      for (const corner of corners) {
        const wx = this.position.x - corner.kx;
        const wy = this.position.y - corner.ky;
        const B = 2 * (dirX * wx + dirY * wy);
        const C_quad = wx * wx + wy * wy - R * R;
        const disc = B * B - 4 * C_quad;
        if (disc >= 0) {
          const sqrtDisc = Math.sqrt(disc);
          const t1 = (-B - sqrtDisc) * 0.5;
          if (t1 > 0 && t1 < minHitDistance) {
            const px = this.position.x + t1 * dirX;
            const py = this.position.y + t1 * dirY;
            if (corner.isExterior(px, py)) {
              minHitDistance = t1;
            }
          }
        }
      }
    }
    let safeDistance = defaultHandDist;
    if (minHitDistance < Infinity) {
      safeDistance = Math.max(0, Math.min(defaultHandDist, minHitDistance - extraThrowClearback));
    }
    let targetX = this.position.x + dirX * safeDistance;
    let targetY = this.position.y + dirY * safeDistance;
    for (let iter = 0; iter < 3; iter++) {
      let adjusted = false;
      for (const wall of arena.walls) {
        const closestX = Math.max(wall.x, Math.min(targetX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(targetY, wall.y + wall.height));
        const dx = targetX - closestX;
        const dy = targetY - closestY;
        const distSq = dx * dx + dy * dy;
        if (distSq < objRadius * objRadius) {
          adjusted = true;
          const dist = Math.sqrt(distSq);
          if (dist > 1e-4) {
            targetX += dx / dist * (objRadius + 0.02 - dist);
            targetY += dy / dist * (objRadius + 0.02 - dist);
          } else {
            targetX = this.position.x;
            targetY = this.position.y;
          }
        }
      }
      if (!adjusted) break;
    }
    return { x: targetX, y: targetY, z: heldZ };
  }
}
class CollisionResolver {
  /**
   * Resolves all pairwise freebody-to-freebody collisions across characters and dynamic objects.
   */
  static resolveEntityCollisions(entities, arena, dt, draggedEntity = null, globalMode = "dynamic") {
    const count = entities.length;
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const e = entities[i];
      e.isSweptActive = globalMode === "continuous" || globalMode !== "naive" && globalMode !== "discrete" && e.getEffectiveCollisionMode(dt) === "continuous";
      if (e.lastCollisionTime > 0 && now - e.lastCollisionTime > 1200) {
        e.lastCollisionType = "none";
      }
    }
    if (globalMode === "naive") {
      this.resolveNaiveIterative(entities, arena, draggedEntity);
      return;
    }
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = entities[i];
        const b = entities[j];
        if (a.isHeld || b.isHeld || a === draggedEntity || b === draggedEntity) continue;
        if (!a.hasCollider || !b.hasCollider) continue;
        if (a.isSleeping && b.isSleeping) continue;
        const layerA = GameObject.getEntityLayer(a, arena.wallHeight);
        const layerB = GameObject.getEntityLayer(b, arena.wallHeight);
        if (a.isRestingOnSurface && b.isRestingOnSurface && layerA !== layerB) {
          continue;
        }
        const charHeight = 0.9;
        const zMinA = a.isCharacter ? Math.max(0, a.position.z, a.supportingSurfaceHeight ?? 0) : Math.max(0, a.position.z - a.colliderRadius);
        const zMaxA = a.isCharacter ? zMinA + charHeight : Math.max(zMinA + 0.1, a.position.z + a.colliderRadius);
        const zMinB = b.isCharacter ? Math.max(0, b.position.z, b.supportingSurfaceHeight ?? 0) : Math.max(0, b.position.z - b.colliderRadius);
        const zMaxB = b.isCharacter ? zMinB + charHeight : Math.max(zMinB + 0.1, b.position.z + b.colliderRadius);
        if (zMaxA < zMinB || zMaxB < zMinA) {
          continue;
        }
        let useContinuous = false;
        if (globalMode === "continuous") {
          useContinuous = true;
        } else if (globalMode === "discrete") {
          useContinuous = false;
        } else {
          const modeA = a.getEffectiveCollisionMode(dt);
          const modeB = b.getEffectiveCollisionMode(dt);
          useContinuous = modeA === "continuous" || modeB === "continuous";
        }
        if (useContinuous) {
          this.resolvePairContinuousSwept(a, b, arena, dt);
        } else {
          this.resolvePairDiscreteTOI(a, b, arena, dt);
        }
      }
    }
  }
  /**
   * Discrete Time-of-Impact (TOI) Rollback:
   * Objects have stepped forward. If overlapping, rolls both bodies back along their travel paths
   * to the exact tangent contact point, applies mass/restitution impulses, then finishes the step.
   */
  static resolvePairDiscreteTOI(a, b, _arena, dt) {
    const minDist = a.colliderRadius + b.colliderRadius;
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist || distSq <= 1e-8) {
      return false;
    }
    if (a.isImmovable && b.isImmovable) {
      return false;
    }
    const dist = Math.sqrt(distSq);
    const overlap = minDist - dist;
    const normX = dx / dist;
    const normY = dy / dist;
    const relVx = (b.isImmovable ? 0 : b.velocity.x) - (a.isImmovable ? 0 : a.velocity.x);
    const relVy = (b.isImmovable ? 0 : b.velocity.y) - (a.isImmovable ? 0 : a.velocity.y);
    const velAlongNormal = relVx * normX + relVy * normY;
    const relSpeed = Math.hypot(relVx, relVy);
    let alpha = 0;
    if (relSpeed > 1e-4) {
      alpha = Math.min(1, Math.max(0, overlap / (relSpeed * dt)));
    }
    const rewindDt = alpha * dt;
    if (!a.isImmovable) {
      a.position.x -= a.velocity.x * rewindDt;
      a.position.y -= a.velocity.y * rewindDt;
    }
    if (!b.isImmovable) {
      b.position.x -= b.velocity.x * rewindDt;
      b.position.y -= b.velocity.y * rewindDt;
    }
    const contactDx = b.position.x - a.position.x;
    const contactDy = b.position.y - a.position.y;
    const contactDist = Math.hypot(contactDx, contactDy);
    if (contactDist < minDist && contactDist > 1e-5) {
      const penetration = minDist - contactDist;
      const cNormX = contactDx / contactDist;
      const cNormY = contactDy / contactDist;
      if (b.isImmovable) {
        a.position.x -= cNormX * penetration;
        a.position.y -= cNormY * penetration;
      } else if (a.isImmovable) {
        b.position.x += cNormX * penetration;
        b.position.y += cNormY * penetration;
      } else {
        const fix = penetration * 0.5;
        a.position.x -= cNormX * fix;
        a.position.y -= cNormY * fix;
        b.position.x += cNormX * fix;
        b.position.y += cNormY * fix;
      }
    }
    const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
    const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
    const restitution = Math.max(bounceA, bounceB);
    this.applyImpulseAtContact(a, b, normX, normY, velAlongNormal, restitution, "discrete_toi");
    const remDt = (1 - alpha) * dt;
    if (!a.isImmovable) {
      a.position.x += a.velocity.x * remDt;
      a.position.y += a.velocity.y * remDt;
    }
    if (!b.isImmovable) {
      b.position.x += b.velocity.x * remDt;
      b.position.y += b.velocity.y * remDt;
    }
    return true;
  }
  /**
   * Continuous Swept Circle Collision (CCD):
   * Tests swept trajectories of both bodies over dt. If they collide during the tick,
   * advances to exact time of impact, reflects velocities, and steps remainder.
   */
  static resolvePairContinuousSwept(a, b, _arena, dt) {
    const minDist = a.colliderRadius + b.colliderRadius;
    if (a.isImmovable && b.isImmovable) {
      return false;
    }
    const pA0x = a.isImmovable ? a.position.x : a.position.x - a.velocity.x * dt;
    const pA0y = a.isImmovable ? a.position.y : a.position.y - a.velocity.y * dt;
    const pB0x = b.isImmovable ? b.position.x : b.position.x - b.velocity.x * dt;
    const pB0y = b.isImmovable ? b.position.y : b.position.y - b.velocity.y * dt;
    const vAx = a.isImmovable ? 0 : a.velocity.x;
    const vAy = a.isImmovable ? 0 : a.velocity.y;
    const vBx = b.isImmovable ? 0 : b.velocity.x;
    const vBy = b.isImmovable ? 0 : b.velocity.y;
    const r0x = pB0x - pA0x;
    const r0y = pB0y - pA0y;
    const vRelX = vBx - vAx;
    const vRelY = vBy - vAy;
    const aQuad = vRelX * vRelX + vRelY * vRelY;
    const bQuad = 2 * (r0x * vRelX + r0y * vRelY);
    const cQuad = r0x * r0x + r0y * r0y - minDist * minDist;
    if (cQuad < -1e-4) {
      return this.resolvePairDiscreteTOI(a, b, _arena, dt);
    }
    if (aQuad < 1e-7) {
      return false;
    }
    const disc = bQuad * bQuad - 4 * aQuad * cQuad;
    if (disc < 0) {
      return false;
    }
    const tHit = Math.max(0, (-bQuad - Math.sqrt(Math.max(0, disc))) / (2 * aQuad));
    if (tHit > dt) {
      return false;
    }
    if (!a.isImmovable) {
      a.position.x = pA0x + a.velocity.x * tHit;
      a.position.y = pA0y + a.velocity.y * tHit;
    }
    if (!b.isImmovable) {
      b.position.x = pB0x + b.velocity.x * tHit;
      b.position.y = pB0y + b.velocity.y * tHit;
    }
    const contactDx = b.position.x - a.position.x;
    const contactDy = b.position.y - a.position.y;
    const contactDist = Math.hypot(contactDx, contactDy);
    const normX = contactDist > 1e-4 ? contactDx / contactDist : 1;
    const normY = contactDist > 1e-4 ? contactDy / contactDist : 0;
    const velAlongNormal = vRelX * normX + vRelY * normY;
    const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
    const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
    const restitution = Math.max(bounceA, bounceB);
    this.applyImpulseAtContact(a, b, normX, normY, velAlongNormal, restitution, "continuous_swept");
    const remDt = dt - tHit;
    if (!a.isImmovable) {
      a.position.x += a.velocity.x * remDt;
      a.position.y += a.velocity.y * remDt;
    }
    if (!b.isImmovable) {
      b.position.x += b.velocity.x * remDt;
      b.position.y += b.velocity.y * remDt;
    }
    return true;
  }
  /**
   * Resolves entity collision with an arena wall using discrete rollback or continuous sweep.
   */
  static resolveEntityWallCollision(entity, wall, _arena, dt, globalMode = "dynamic") {
    if (!entity.hasCollider) return false;
    if (entity.position.z > wall.wallHeight) return false;
    const r = entity.colliderRadius;
    const mode = globalMode === "naive" ? "naive" : globalMode === "continuous" ? "continuous" : globalMode === "discrete" ? "discrete" : entity.getEffectiveCollisionMode(dt);
    const cx = Math.max(wall.x, Math.min(entity.position.x, wall.x + wall.width));
    const cy = Math.max(wall.y, Math.min(entity.position.y, wall.y + wall.height));
    const dx = entity.position.x - cx;
    const dy = entity.position.y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq >= r * r) {
      return false;
    }
    const dist = Math.sqrt(distSq);
    const normX = dist > 1e-4 ? dx / dist : entity.velocity.x < 0 ? 1 : -1;
    const normY = dist > 1e-4 ? dy / dist : entity.velocity.y < 0 ? 1 : -1;
    const bRestitution = entity.isCharacter ? 0 : entity.hasBounce && entity.bounceMod !== null ? entity.bounceMod : 0;
    if (mode === "naive") {
      entity.position.x = cx + normX * r;
      entity.position.y = cy + normY * r;
      const vn2 = entity.velocity.x * normX + entity.velocity.y * normY;
      if (vn2 < 0) {
        entity.velocity.x -= (1 + bRestitution) * vn2 * normX;
        entity.velocity.y -= (1 + bRestitution) * vn2 * normY;
      }
      entity.lastCollisionType = "naive";
      return true;
    }
    const overlap = r - dist;
    const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
    let alpha = 0;
    if (speed > 1e-4) {
      alpha = Math.min(1, Math.max(0, overlap / (speed * dt)));
    }
    entity.position.x = cx + normX * (r + 1e-3);
    entity.position.y = cy + normY * (r + 1e-3);
    const vn = entity.velocity.x * normX + entity.velocity.y * normY;
    if (vn < 0) {
      entity.velocity.x -= (1 + bRestitution) * vn * normX;
      entity.velocity.y -= (1 + bRestitution) * vn * normY;
    }
    const remDt = (1 - alpha) * dt;
    entity.position.x += entity.velocity.x * remDt;
    entity.position.y += entity.velocity.y * remDt;
    const nowWall = performance.now();
    entity.lastCollisionType = mode === "continuous" ? "continuous_swept" : "discrete_toi";
    entity.lastContactPoint = { x: cx, y: cy };
    entity.lastContactNormal = { x: normX, y: normY };
    entity.lastCollisionTime = nowWall;
    return true;
  }
  /**
   * Applies impulse at contact point respecting the Massless vs Massive rule.
   */
  static applyImpulseAtContact(a, b, normX, normY, velAlongNormal, restitution, collisionType) {
    if (velAlongNormal >= 0) return;
    a.wakeUp();
    b.wakeUp();
    const isMasslessA = !a.hasMass;
    const isMasslessB = !b.hasMass;
    const now = performance.now();
    const midX = (a.position.x + b.position.x) * 0.5;
    const midY = (a.position.y + b.position.y) * 0.5;
    a.lastContactPoint = { x: midX, y: midY };
    b.lastContactPoint = { x: midX, y: midY };
    a.lastContactNormal = { x: -normX, y: -normY };
    b.lastContactNormal = { x: normX, y: normY };
    a.lastCollisionType = collisionType;
    b.lastCollisionType = collisionType;
    a.lastCollisionTime = now;
    b.lastCollisionTime = now;
    if (a.isImmovable && b.isImmovable) return;
    if (b.isImmovable) {
      if (isMasslessA) {
        const closingSpeed = Math.abs(velAlongNormal);
        a.velocity.x -= normX * closingSpeed * (1 + restitution);
        a.velocity.y -= normY * closingSpeed * (1 + restitution);
      } else {
        const mA2 = a.mass;
        const invMassA2 = 1 / mA2;
        const normalImpulse2 = -(1 + restitution) * velAlongNormal / invMassA2;
        a.velocity.x -= normalImpulse2 * invMassA2 * normX;
        a.velocity.y -= normalImpulse2 * invMassA2 * normY;
      }
      return;
    }
    if (a.isImmovable) {
      if (isMasslessB) {
        const closingSpeed = Math.abs(velAlongNormal);
        b.velocity.x += normX * closingSpeed * (1 + restitution);
        b.velocity.y += normY * closingSpeed * (1 + restitution);
      } else {
        const mB2 = b.mass;
        const invMassB2 = 1 / mB2;
        const normalImpulse2 = -(1 + restitution) * velAlongNormal / invMassB2;
        b.velocity.x += normalImpulse2 * invMassB2 * normX;
        b.velocity.y += normalImpulse2 * invMassB2 * normY;
      }
      return;
    }
    if (isMasslessA && isMasslessB) {
      const impulse = -velAlongNormal * 0.5 * (1 + restitution);
      a.velocity.x -= impulse * normX;
      a.velocity.y -= impulse * normY;
      b.velocity.x += impulse * normX;
      b.velocity.y += impulse * normY;
      return;
    }
    if (!isMasslessA && isMasslessB) {
      const closingSpeed = Math.abs(velAlongNormal);
      b.velocity.x += normX * closingSpeed * (1 + restitution);
      b.velocity.y += normY * closingSpeed * (1 + restitution);
      return;
    }
    if (isMasslessA && !isMasslessB) {
      const closingSpeed = Math.abs(velAlongNormal);
      a.velocity.x -= normX * closingSpeed * (1 + restitution);
      a.velocity.y -= normY * closingSpeed * (1 + restitution);
      return;
    }
    const mA = a.mass;
    const mB = b.mass;
    const invMassA = 1 / mA;
    const invMassB = 1 / mB;
    const invMassSum = invMassA + invMassB;
    const normalImpulse = -(1 + restitution) * velAlongNormal / invMassSum;
    a.velocity.x -= normalImpulse * invMassA * normX;
    a.velocity.y -= normalImpulse * invMassA * normY;
    b.velocity.x += normalImpulse * invMassB * normX;
    b.velocity.y += normalImpulse * invMassB * normY;
    const tangX = -normY;
    const tangY = normX;
    const relVx = b.velocity.x - a.velocity.x;
    const relVy = b.velocity.y - a.velocity.y;
    const relVt = relVx * tangX + relVy * tangY;
    if (Math.abs(relVt) > 1e-3) {
      const muObj = 0.35 * Math.sqrt(a.dynamicGroundFrictionMod * b.dynamicGroundFrictionMod);
      const beta = 0.4;
      const stickImpulse = Math.abs(relVt) / (invMassSum * (1 + 1 / beta));
      const maxFricImpulse = muObj * Math.abs(normalImpulse);
      const fricImpulse = Math.min(stickImpulse, maxFricImpulse) * Math.sign(relVt);
      a.velocity.x += fricImpulse * invMassA * tangX;
      a.velocity.y += fricImpulse * invMassA * tangY;
      b.velocity.x -= fricImpulse * invMassB * tangX;
      b.velocity.y -= fricImpulse * invMassB * tangY;
      if (a.rollModule && a.rollModule.enabled && a.colliderRadius > 0) {
        const spinImpulse = fricImpulse / (beta * a.mass * a.colliderRadius);
        a.rollModule.angularVelocity.z += spinImpulse;
        a.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, a.rollModule.angularVelocity.z));
      }
      if (b.rollModule && b.rollModule.enabled && b.colliderRadius > 0) {
        const spinImpulseB = fricImpulse / (beta * b.mass * b.colliderRadius);
        b.rollModule.angularVelocity.z -= spinImpulseB;
        b.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, b.rollModule.angularVelocity.z));
      }
    }
  }
  /**
   * Fallback naive iterative separation solver (Legacy baseline comparison).
   */
  static resolveNaiveIterative(entities, arena, draggedEntity) {
    const iterations = 3;
    const count = entities.length;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = entities[i];
          const b = entities[j];
          if (a.isHeld || b.isHeld || a === draggedEntity || b === draggedEntity) continue;
          if (!a.hasCollider || !b.hasCollider) continue;
          const layerA = GameObject.getEntityLayer(a, arena.wallHeight);
          const layerB = GameObject.getEntityLayer(b, arena.wallHeight);
          if (layerA !== layerB) continue;
          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dist2DSq = dx * dx + dy * dy;
          const minDist = a.colliderRadius + b.colliderRadius;
          if (dist2DSq < minDist * minDist && dist2DSq > 1e-6) {
            const dist = Math.sqrt(dist2DSq);
            const overlap = minDist - dist;
            const normX = dx / dist;
            const normY = dy / dist;
            const relVx = (b.isImmovable ? 0 : b.velocity.x) - (a.isImmovable ? 0 : a.velocity.x);
            const relVy = (b.isImmovable ? 0 : b.velocity.y) - (a.isImmovable ? 0 : a.velocity.y);
            const velAlongNormal = relVx * normX + relVy * normY;
            const nowNaive = performance.now();
            a.lastCollisionType = "naive";
            b.lastCollisionType = "naive";
            a.lastCollisionTime = nowNaive;
            b.lastCollisionTime = nowNaive;
            const midX = (a.position.x + b.position.x) * 0.5;
            const midY = (a.position.y + b.position.y) * 0.5;
            a.lastContactPoint = { x: midX, y: midY };
            b.lastContactPoint = { x: midX, y: midY };
            a.lastContactNormal = { x: -normX, y: -normY };
            b.lastContactNormal = { x: normX, y: normY };
            if (a.isImmovable && b.isImmovable) continue;
            if (b.isImmovable) {
              a.position.x -= normX * overlap;
              a.position.y -= normY * overlap;
              if (velAlongNormal < 0) {
                const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
                const restitution = bounceA;
                const closingSpeed = Math.abs(velAlongNormal);
                a.velocity.x -= normX * closingSpeed * (1 + restitution);
                a.velocity.y -= normY * closingSpeed * (1 + restitution);
              }
              continue;
            }
            if (a.isImmovable) {
              b.position.x += normX * overlap;
              b.position.y += normY * overlap;
              if (velAlongNormal < 0) {
                const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
                const restitution = bounceB;
                const closingSpeed = Math.abs(velAlongNormal);
                b.velocity.x += normX * closingSpeed * (1 + restitution);
                b.velocity.y += normY * closingSpeed * (1 + restitution);
              }
              continue;
            }
            const isMasslessA = !a.hasMass;
            const isMasslessB = !b.hasMass;
            if (isMasslessA && isMasslessB) {
              a.position.x -= normX * overlap * 0.5;
              a.position.y -= normY * overlap * 0.5;
              b.position.x += normX * overlap * 0.5;
              b.position.y += normY * overlap * 0.5;
              if (velAlongNormal < 0) {
                const impulse = -velAlongNormal * 0.5;
                a.velocity.x -= impulse * normX;
                a.velocity.y -= impulse * normY;
                b.velocity.x += impulse * normX;
                b.velocity.y += impulse * normY;
              }
              continue;
            }
            if (!isMasslessA && isMasslessB) {
              b.position.x += normX * overlap;
              b.position.y += normY * overlap;
              if (velAlongNormal < 0) {
                const closingSpeed = Math.abs(velAlongNormal);
                b.velocity.x += normX * closingSpeed;
                b.velocity.y += normY * closingSpeed;
              }
              continue;
            }
            if (isMasslessA && !isMasslessB) {
              a.position.x -= normX * overlap;
              a.position.y -= normY * overlap;
              if (velAlongNormal < 0) {
                const closingSpeed = Math.abs(velAlongNormal);
                a.velocity.x -= normX * closingSpeed;
                a.velocity.y -= normY * closingSpeed;
              }
              continue;
            }
            const mA = a.mass;
            const mB = b.mass;
            const totalM = mA + mB;
            const ratioA = mB / totalM;
            const ratioB = mA / totalM;
            a.position.x -= normX * overlap * ratioA;
            a.position.y -= normY * overlap * ratioA;
            b.position.x += normX * overlap * ratioB;
            b.position.y += normY * overlap * ratioB;
            if (velAlongNormal < 0) {
              const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
              const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
              const restitution = Math.max(bounceA, bounceB);
              const impulse = -(1 + restitution) * velAlongNormal / (1 / mA + 1 / mB);
              a.velocity.x -= impulse / mA * normX;
              a.velocity.y -= impulse / mA * normY;
              b.velocity.x += impulse / mB * normX;
              b.velocity.y += impulse / mB * normY;
            }
          }
        }
      }
    }
  }
}
class IslandManager {
  constructor() {
    __publicField(this, "islands", /* @__PURE__ */ new Map());
    __publicField(this, "entityToIsland", /* @__PURE__ */ new Map());
    __publicField(this, "nextIslandId", 1);
  }
  /**
   * Rebuilds the dynamic interaction graph for the current simulation frame.
   * Adjacency is formed by:
   * 1. Character holding an object (holder <-> heldObject).
   * 2. Recent contact between entities (lastContactPoint set & speed > 0).
   * 3. Proximity overlap between non-sleeping entities.
   */
  updateIslands(characters, objects, currentTick, arena) {
    var _a, _b, _c, _d;
    this.islands.clear();
    this.entityToIsland.clear();
    const allEntities = [...characters, ...objects];
    const visited = /* @__PURE__ */ new Set();
    const adj = /* @__PURE__ */ new Map();
    for (const e of allEntities) {
      adj.set(e.id, /* @__PURE__ */ new Set());
    }
    for (const char of characters) {
      if (char.heldObject) {
        (_a = adj.get(char.id)) == null ? void 0 : _a.add(char.heldObject);
        (_b = adj.get(char.heldObject.id)) == null ? void 0 : _b.add(char);
      }
    }
    const activeEntities = allEntities.filter((e) => !e.isSleeping || e.isCharacter);
    const activeCount = activeEntities.length;
    for (let i = 0; i < activeCount; i++) {
      for (let j = i + 1; j < activeCount; j++) {
        const a = activeEntities[i];
        const b = activeEntities[j];
        if (GameObject.getEntityLayer(a, arena.wallHeight) !== GameObject.getEntityLayer(b, arena.wallHeight)) {
          continue;
        }
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const distSq = dx * dx + dy * dy;
        const touchDist = a.colliderRadius + b.colliderRadius + 0.05;
        if (distSq <= touchDist * touchDist) {
          (_c = adj.get(a.id)) == null ? void 0 : _c.add(b);
          (_d = adj.get(b.id)) == null ? void 0 : _d.add(a);
        }
      }
    }
    for (const e of allEntities) {
      if (visited.has(e.id)) continue;
      const neighbors = adj.get(e.id);
      if (e.isSleeping && (!neighbors || neighbors.size === 0)) {
        visited.add(e.id);
        const dormantIsland = {
          id: `island-dormant-${e.id}`,
          entities: /* @__PURE__ */ new Set([e]),
          hasPlayer: false,
          lastActiveTick: currentTick
        };
        this.islands.set(dormantIsland.id, dormantIsland);
        this.entityToIsland.set(e.id, dormantIsland);
        continue;
      }
      const islandEntities = /* @__PURE__ */ new Set();
      const queue = [e];
      visited.add(e.id);
      let islandHasPlayer = false;
      while (queue.length > 0) {
        const curr = queue.shift();
        islandEntities.add(curr);
        if (curr.isCharacter) {
          islandHasPlayer = true;
        }
        const currNeighbors = adj.get(curr.id);
        if (currNeighbors) {
          for (const n of currNeighbors) {
            if (!visited.has(n.id)) {
              visited.add(n.id);
              queue.push(n);
            }
          }
        }
      }
      const island = {
        id: `island-${this.nextIslandId++}`,
        entities: islandEntities,
        hasPlayer: islandHasPlayer,
        lastActiveTick: currentTick
      };
      this.islands.set(island.id, island);
      for (const ent of islandEntities) {
        this.entityToIsland.set(ent.id, island);
      }
    }
  }
  /**
   * Retrieves the active island containing the specified entity.
   */
  getIslandForEntity(entityId) {
    return this.entityToIsland.get(entityId);
  }
  /**
   * Returns all entities in the island containing the specified character or entity.
   * If the entity is not found or isolated, returns a set containing just that entity.
   */
  getInfluencedEntities(entityId) {
    const island = this.entityToIsland.get(entityId);
    if (island) {
      return island.entities;
    }
    return /* @__PURE__ */ new Set();
  }
  /**
   * Returns statistics about the active islands.
   */
  getStats() {
    let activeIslands = 0;
    let sleepingCount = 0;
    let totalEntities = 0;
    for (const island of this.islands.values()) {
      totalEntities += island.entities.size;
      let allSleeping = true;
      for (const e of island.entities) {
        if (e.isSleeping) sleepingCount++;
        else allSleeping = false;
      }
      if (!allSleeping) {
        activeIslands++;
      }
    }
    return {
      totalIslands: this.islands.size,
      activeIslands,
      sleepingCount,
      totalEntities
    };
  }
}
class SnapshotManager {
  /**
   * Captures the physical state of all entities at the given simulation tick.
   * If quantize is true, numbers are rounded to 4 decimals for network packets;
   * otherwise, exact 64-bit IEEE floats are retained for local rollback determinism.
   */
  static capture(tick, characters, objects, quantize = false) {
    const all = [...characters, ...objects];
    const entities = all.map((e) => {
      const isChar = e.isCharacter;
      const char = isChar ? e : null;
      const roll = e.rollModule;
      return {
        id: e.id,
        name: e.name,
        x: quantize ? Number(e.position.x.toFixed(4)) : e.position.x,
        y: quantize ? Number(e.position.y.toFixed(4)) : e.position.y,
        z: quantize ? Number(e.position.z.toFixed(4)) : e.position.z,
        vx: quantize ? Number(e.velocity.x.toFixed(4)) : e.velocity.x,
        vy: quantize ? Number(e.velocity.y.toFixed(4)) : e.velocity.y,
        vz: quantize ? Number(e.verticalVelocity.toFixed(4)) : e.verticalVelocity,
        isHeld: e.isHeld,
        heldById: e.heldBy ? e.heldBy.id : null,
        isClimbing: e.isClimbing,
        isCharacter: isChar,
        facingAngle: char ? char.facingAngle : void 0,
        isSprinting: char ? char.isSprinting : void 0,
        standingWallId: e.standingWall ? e.standingWall.id : null,
        isSleeping: e.isSleeping,
        isInFlight: e.isInFlight,
        angX: roll && roll.enabled ? quantize ? Number(roll.angularVelocity.x.toFixed(4)) : roll.angularVelocity.x : void 0,
        angY: roll && roll.enabled ? quantize ? Number(roll.angularVelocity.y.toFixed(4)) : roll.angularVelocity.y : void 0,
        angZ: roll && roll.enabled ? quantize ? Number(roll.angularVelocity.z.toFixed(4)) : roll.angularVelocity.z : void 0
      };
    });
    return {
      tick,
      timestamp: performance.now(),
      entities
    };
  }
  /**
   * Restores entities to the exact state captured in a snapshot.
   * If filterEntities is provided, only restores entities present in that set (Phase 3 Island optimization).
   */
  static apply(snapshot, characters, objects, filterEntities) {
    const allMap = /* @__PURE__ */ new Map();
    for (const c of characters) {
      if (!filterEntities || filterEntities.has(c)) {
        allMap.set(c.id, c);
        c.heldObject = null;
      }
    }
    for (const o of objects) {
      if (!filterEntities || filterEntities.has(o)) {
        allMap.set(o.id, o);
      }
    }
    for (const snap of snapshot.entities) {
      const entity = allMap.get(snap.id);
      if (!entity) continue;
      entity.position.x = snap.x;
      entity.position.y = snap.y;
      entity.position.z = snap.z;
      entity.velocity.x = snap.vx;
      entity.velocity.y = snap.vy;
      entity.verticalVelocity = snap.vz;
      entity.isHeld = snap.isHeld;
      entity.isClimbing = snap.isClimbing;
      entity.isSleeping = snap.isSleeping ?? false;
      if (snap.isCharacter && entity.isCharacter) {
        const char = entity;
        if (snap.facingAngle !== void 0) char.facingAngle = snap.facingAngle;
        if (snap.isSprinting !== void 0) char.isSprinting = snap.isSprinting;
      }
      if (entity.rollModule && entity.rollModule.enabled && snap.angX !== void 0) {
        entity.rollModule.angularVelocity.x = snap.angX;
        entity.rollModule.angularVelocity.y = snap.angY ?? 0;
        entity.rollModule.angularVelocity.z = snap.angZ ?? 0;
      }
      if (snap.isInFlight !== void 0) {
        entity.isInFlight = snap.isInFlight;
      }
      if (snap.heldById) {
        const holder = allMap.get(snap.heldById);
        entity.heldBy = holder ?? null;
        if (holder && holder.heldObject !== void 0) {
          holder.heldObject = entity;
        }
      } else {
        entity.heldBy = null;
      }
    }
  }
  /**
   * Compares two snapshots and evaluates divergence.
   */
  static hasDivergence(a, b, posThreshold = 0.05, velThreshold = 0.1) {
    const mapB = new Map(b.entities.map((e) => [e.id, e]));
    let maxDeltaPos = 0;
    let maxDeltaVel = 0;
    let divergedEntityId;
    for (const entA of a.entities) {
      const entB = mapB.get(entA.id);
      if (!entB) continue;
      const dx = entA.x - entB.x;
      const dy = entA.y - entB.y;
      const dz = entA.z - entB.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > maxDeltaPos) maxDeltaPos = dist;
      const dvx = entA.vx - entB.vx;
      const dvy = entA.vy - entB.vy;
      const dvz = entA.vz - entB.vz;
      const velDiff = Math.hypot(dvx, dvy, dvz);
      if (velDiff > maxDeltaVel) maxDeltaVel = velDiff;
      if (!divergedEntityId && (dist > posThreshold || velDiff > velThreshold)) {
        divergedEntityId = entA.id;
      }
    }
    return {
      diverged: divergedEntityId !== void 0,
      entityId: divergedEntityId,
      deltaPos: maxDeltaPos,
      maxDeltaPos,
      maxDeltaVel
    };
  }
}
class RollModule {
  constructor(options = {}) {
    __publicField(this, "enabled", true);
    /** Dynamic angular velocity in 3 dimensions (rad/s around X, Y, Z axes) */
    __publicField(this, "angularVelocity", { x: 0, y: 0, z: 0 });
    /**
     * Roll resistance property: deceleration force (in u/s²) that opposes rolling.
     * If rollResistance === 0, the object has zero rolling resistance and will roll until it hits a wall!
     */
    __publicField(this, "rollResistance", 0.4);
    /** Animated phase accumulator (radians) used for rendering the rotating dotted oval */
    __publicField(this, "visualPhase", 0);
    var _a, _b, _c;
    this.enabled = options.enabled ?? true;
    this.angularVelocity = {
      x: ((_a = options.angularVelocity) == null ? void 0 : _a.x) ?? 0,
      y: ((_b = options.angularVelocity) == null ? void 0 : _b.y) ?? 0,
      z: ((_c = options.angularVelocity) == null ? void 0 : _c.z) ?? 0
    };
    this.rollResistance = options.rollResistance ?? 0.4;
  }
  /**
   * Total magnitude of 3D angular velocity (|ω| in rad/s)
   */
  get angularSpeed() {
    return Math.hypot(this.angularVelocity.x, this.angularVelocity.y, this.angularVelocity.z);
  }
  /**
   * Advance the visual rotation phase based on current angular velocity
   */
  updateVisualPhase(dt) {
    const speed = this.angularSpeed;
    if (speed > 1e-3) {
      this.visualPhase = (this.visualPhase + speed * dt) % (Math.PI * 2);
    }
  }
}
class PlayerJitterQueue {
  constructor(playerId, config) {
    __publicField(this, "playerId");
    __publicField(this, "targetDepth");
    __publicField(this, "maxCapacity");
    __publicField(this, "burstDrainThreshold");
    __publicField(this, "queue", []);
    __publicField(this, "lastConsumedTick", null);
    __publicField(this, "lastKnownInput", null);
    // Diagnostics counters
    __publicField(this, "starvations", 0);
    __publicField(this, "overflows", 0);
    __publicField(this, "duplicates", 0);
    __publicField(this, "burstDrains", 0);
    __publicField(this, "receivedCount", 0);
    __publicField(this, "consumedCount", 0);
    this.playerId = playerId;
    this.targetDepth = (config == null ? void 0 : config.targetDepth) ?? 2;
    this.maxCapacity = (config == null ? void 0 : config.maxCapacity) ?? 60;
    this.burstDrainThreshold = (config == null ? void 0 : config.burstDrainThreshold) ?? Math.max(4, this.targetDepth + 2);
  }
  /**
   * Current number of input packets waiting in the jitter buffer.
   */
  get length() {
    return this.queue.length;
  }
  /**
   * Enqueues an incoming input packet into the priority queue, sorted ascending by tick.
   * Drops duplicates and stale packets. Clamps at max capacity.
   *
   * @returns true if packet was enqueued, false if rejected (duplicate or stale).
   */
  push(packet) {
    if (packet.tick !== void 0) {
      if (this.lastConsumedTick !== null && packet.tick <= this.lastConsumedTick) {
        this.duplicates++;
        return false;
      }
      if (this.queue.some((p) => p.tick === packet.tick)) {
        this.duplicates++;
        return false;
      }
    }
    if (packet.tick !== void 0) {
      let insertIdx = 0;
      while (insertIdx < this.queue.length && (this.queue[insertIdx].tick ?? -Infinity) <= packet.tick) {
        insertIdx++;
      }
      this.queue.splice(insertIdx, 0, packet);
    } else {
      this.queue.push(packet);
    }
    if (this.queue.length > this.maxCapacity) {
      this.queue.shift();
      this.overflows++;
    }
    this.receivedCount++;
    return true;
  }
  /**
   * Consumes the next input packet for the current server simulation tick.
   *
   * - If queue has burst backlog exceeding target depth, excess intermediate packets
   *   are drained and returned in `drainedPackets` so the caller can apply fast-forward updates.
   * - If queue has available inputs, pops the oldest sorted packet.
   * - If queue is starved (empty), generates a safe neutral packet with zero movement
   *   to prevent runaway ghost overshoot while preserving last known aim direction.
   */
  consume(serverTick) {
    var _a, _b, _c;
    const drainedPackets = [];
    if (this.queue.length > this.burstDrainThreshold) {
      const excessCount = this.queue.length - (this.targetDepth + 1);
      for (let i = 0; i < excessCount; i++) {
        const excessPkt = this.queue.shift();
        if (excessPkt) {
          drainedPackets.push(excessPkt);
          this.consumedCount++;
          if (excessPkt.tick !== void 0) {
            this.lastConsumedTick = excessPkt.tick;
          }
          this.lastKnownInput = excessPkt;
          this.burstDrains++;
        }
      }
    }
    if (this.queue.length > 0) {
      const pkt = this.queue.shift();
      this.consumedCount++;
      if (pkt.tick !== void 0) {
        this.lastConsumedTick = pkt.tick;
      }
      this.lastKnownInput = pkt;
      return {
        packet: pkt,
        isStarved: false,
        drainedPackets
      };
    }
    this.starvations++;
    const neutralPacket = {
      playerId: this.playerId,
      tick: serverTick,
      moveX: 0,
      moveY: 0,
      isSprinting: false,
      isJumpHeld: false,
      isGrabHeld: false,
      isDrop: false,
      isThrow: false,
      isAiming: false,
      isLockHeld: false,
      // Retain last known aim coordinates so player orientation doesn't snap abruptly
      aimX: (_a = this.lastKnownInput) == null ? void 0 : _a.aimX,
      aimY: (_b = this.lastKnownInput) == null ? void 0 : _b.aimY,
      facingAngle: (_c = this.lastKnownInput) == null ? void 0 : _c.facingAngle
    };
    return {
      packet: neutralPacket,
      isStarved: true,
      drainedPackets
    };
  }
  /**
   * Peeks at the next packet in the queue without removing it.
   */
  peek() {
    return this.queue[0] ?? null;
  }
  /**
   * Resets the queue state.
   */
  clear() {
    this.queue = [];
    this.lastConsumedTick = null;
    this.lastKnownInput = null;
  }
  /**
   * Returns telemetry statistics for this jitter buffer queue.
   */
  getStats() {
    const oldestTick = this.queue.length > 0 ? this.queue[0].tick ?? null : null;
    const newestTick = this.queue.length > 0 ? this.queue[this.queue.length - 1].tick ?? null : null;
    return {
      playerId: this.playerId,
      currentDepth: this.queue.length,
      targetDepth: this.targetDepth,
      oldestTick,
      newestTick,
      lastConsumedTick: this.lastConsumedTick,
      starvations: this.starvations,
      overflows: this.overflows,
      duplicates: this.duplicates,
      burstDrains: this.burstDrains,
      receivedCount: this.receivedCount,
      consumedCount: this.consumedCount
    };
  }
  /**
   * Computes the adaptive time dilation factor to maintain steady target depth (Phase 6).
   * - Underflow (< 1 frame): 1.015 (speed up 1.5% to avoid starvation)
   * - Overflow (> 3 frames): 0.990 or 0.985 (slow down 1.0% to 1.5% to drain backlog)
   * - Steady (1 to 3 frames): 1.000 (steady cruise speed)
   * Clamped strictly between [0.98, 1.02].
   */
  computeDilationFactor() {
    const depth = this.queue.length;
    if (depth < 1) {
      return 1.015;
    } else if (depth > 3) {
      return depth >= 5 ? 0.985 : 0.99;
    }
    return 1;
  }
}
class ServerJitterBufferManager {
  constructor(config) {
    __publicField(this, "queues", /* @__PURE__ */ new Map());
    __publicField(this, "config");
    this.config = config;
  }
  /**
   * Retrieves or creates the jitter queue for the given player.
   */
  getQueue(playerId) {
    let queue = this.queues.get(playerId);
    if (!queue) {
      queue = new PlayerJitterQueue(playerId, this.config);
      this.queues.set(playerId, queue);
    }
    return queue;
  }
  /**
   * Enqueues an incoming input packet for its target player.
   */
  push(packet) {
    return this.getQueue(packet.playerId).push(packet);
  }
  /**
   * Consumes an input packet for a player on the current server tick.
   */
  consume(playerId, serverTick) {
    return this.getQueue(playerId).consume(serverTick);
  }
  /**
   * Evaluates the clock sync packet for a player at the current server tick (Phase 6).
   */
  evaluateClockSync(playerId, serverTick) {
    const queue = this.getQueue(playerId);
    const dilation = queue.computeDilationFactor();
    return {
      type: "clock_sync",
      serverTick,
      targetQueueDepth: queue.targetDepth,
      currentQueueDepth: queue.length,
      dilationFactor: dilation,
      playerId
    };
  }
  /**
   * Returns telemetry stats for a specific player's jitter buffer.
   */
  getStats(playerId) {
    const queue = this.queues.get(playerId);
    return queue ? queue.getStats() : null;
  }
  /**
   * Returns telemetry stats for all active player jitter queues.
   */
  getAllStats() {
    return Array.from(this.queues.values()).map((q) => q.getStats());
  }
  /**
   * Clears a specific player's queue or all queues.
   */
  clear(playerId) {
    var _a;
    if (playerId) {
      (_a = this.queues.get(playerId)) == null ? void 0 : _a.clear();
    } else {
      for (const queue of this.queues.values()) {
        queue.clear();
      }
      this.queues.clear();
    }
  }
}
class AuthoritativeSnapshotManager {
  constructor(config) {
    __publicField(this, "broadcastRateHz");
    __publicField(this, "keyframeIntervalTicks");
    __publicField(this, "deltaCompression");
    __publicField(this, "lastSentEntityStates", /* @__PURE__ */ new Map());
    __publicField(this, "lastBroadcastTick", 0);
    // Diagnostics metrics
    __publicField(this, "totalSnapshotsSent", 0);
    __publicField(this, "deltaSnapshotsSent", 0);
    __publicField(this, "keyframeSnapshotsSent", 0);
    __publicField(this, "totalEntitiesOmittedByDelta", 0);
    this.broadcastRateHz = (config == null ? void 0 : config.broadcastRateHz) ?? 60;
    this.keyframeIntervalTicks = (config == null ? void 0 : config.keyframeIntervalTicks) ?? 60;
    this.deltaCompression = (config == null ? void 0 : config.deltaCompression) ?? true;
  }
  /**
   * Evaluates if a snapshot broadcast is due on the given server simulation tick.
   * - 60Hz: broadcast on every tick.
   * - 30Hz: broadcast on every second tick (tick % 2 === 0).
   */
  isBroadcastDue(serverTick) {
    if (this.broadcastRateHz === 60) {
      return true;
    }
    const intervalTicks = Math.round(60 / this.broadcastRateHz);
    return serverTick % intervalTicks === 0;
  }
  /**
   * Compresses and quantizes an active entity state (3 decimal places for position, 2 for velocity).
   */
  static compressEntity(entity) {
    const isChar = entity instanceof Character;
    const isSleeping = !isChar && entity.isSleeping;
    const hasVz = entity.hasVerticalVelocity;
    const roll = !isChar && entity.rollModule ? entity.rollModule : null;
    let heldByStr = null;
    if (isChar && entity.heldObject) {
      heldByStr = entity.heldObject.id;
    } else if (!isChar && entity.heldBy) {
      heldByStr = entity.heldBy.playerId || entity.heldBy.id || "player";
    }
    return {
      id: isChar ? entity.playerId || entity.id : entity.id,
      x: Number(entity.position.x.toFixed(3)),
      y: Number(entity.position.y.toFixed(3)),
      z: Number(entity.position.z.toFixed(3)),
      vx: Number(entity.velocity.x.toFixed(2)),
      vy: Number(entity.velocity.y.toFixed(2)),
      vz: Number((hasVz ? entity.verticalVelocity : 0).toFixed(2)),
      angX: roll ? Number(roll.angularVelocity.x.toFixed(2)) : void 0,
      angY: roll ? Number(roll.angularVelocity.y.toFixed(2)) : void 0,
      angZ: roll ? Number(roll.angularVelocity.z.toFixed(2)) : void 0,
      heldBy: heldByStr,
      isClimbing: isChar ? entity.isClimbing : false,
      facingAngle: isChar ? Number(entity.facingAngle.toFixed(4)) : void 0,
      isSleeping
    };
  }
  /**
   * Generates an AuthoritativeWorldSnapshot from the server world entities.
   * Omits sleeping and stationary entities when delta compression is active.
   */
  createSnapshot(serverTick, characters, objects, lastProcessedInputTick, ackActionIds, clockSync, forceKeyframe = false) {
    const isKeyframe = forceKeyframe || !this.deltaCompression || serverTick % this.keyframeIntervalTicks === 0;
    const allCompressed = [];
    for (const char of characters) {
      allCompressed.push(AuthoritativeSnapshotManager.compressEntity(char));
    }
    for (const obj of objects) {
      allCompressed.push(AuthoritativeSnapshotManager.compressEntity(obj));
    }
    let entitiesToBroadcast = [];
    if (isKeyframe) {
      entitiesToBroadcast = allCompressed;
      for (const ent of allCompressed) {
        this.lastSentEntityStates.set(ent.id, ent);
      }
      this.keyframeSnapshotsSent++;
    } else {
      for (const ent of allCompressed) {
        const prev = this.lastSentEntityStates.get(ent.id);
        if (prev) {
          if (ent.isSleeping && prev.isSleeping) {
            this.totalEntitiesOmittedByDelta++;
            continue;
          }
          const isPosSame = Math.abs(ent.x - prev.x) < 1e-3 && Math.abs(ent.y - prev.y) < 1e-3 && Math.abs(ent.z - prev.z) < 1e-3;
          const isVelSame = Math.abs(ent.vx - prev.vx) < 0.01 && Math.abs(ent.vy - prev.vy) < 0.01 && Math.abs(ent.vz - prev.vz) < 0.01;
          const isHeldSame = ent.heldBy === prev.heldBy;
          const isClimbSame = ent.isClimbing === prev.isClimbing;
          const isAngleSame = ent.facingAngle === prev.facingAngle || ent.facingAngle !== void 0 && prev.facingAngle !== void 0 && Math.abs(ent.facingAngle - prev.facingAngle) < 0.01;
          const isSleepingSame = ent.isSleeping === prev.isSleeping;
          if (isPosSame && isVelSame && isAngleSame && isHeldSame && isClimbSame && isSleepingSame) {
            this.totalEntitiesOmittedByDelta++;
            continue;
          }
        }
        entitiesToBroadcast.push(ent);
        this.lastSentEntityStates.set(ent.id, ent);
      }
      this.deltaSnapshotsSent++;
    }
    this.totalSnapshotsSent++;
    this.lastBroadcastTick = serverTick;
    return {
      type: "world_snapshot",
      tick: serverTick,
      serverTime: performance.now(),
      lastProcessedInputTick,
      entities: entitiesToBroadcast,
      ackActionIds: ackActionIds && ackActionIds.length > 0 ? ackActionIds : void 0,
      clockSync,
      isDelta: !isKeyframe
    };
  }
  /**
   * Client-side helper: Merges a received delta snapshot into an accumulated entity state map.
   */
  static mergeSnapshot(currentState, snapshot) {
    if (!snapshot.isDelta) {
      currentState.clear();
    }
    for (const ent of snapshot.entities) {
      currentState.set(ent.id, ent);
    }
    return currentState;
  }
  /**
   * Resets internal snapshot reference state.
   */
  reset() {
    this.lastSentEntityStates.clear();
    this.lastBroadcastTick = 0;
  }
}
class ServerGameSimulation {
  constructor(config) {
    __publicField(this, "arena");
    __publicField(this, "characters", /* @__PURE__ */ new Map());
    __publicField(this, "objects", []);
    __publicField(this, "islandManager");
    __publicField(this, "currentTick", 0);
    __publicField(this, "fixedDt", 1 / 60);
    __publicField(this, "collisionMode", "dynamic");
    // Per-player input jitter buffer (Phase 5.2)
    __publicField(this, "jitterBuffer");
    // Adaptive Clock Sync & Time Dilation (Phase 6)
    __publicField(this, "latestClockSync", /* @__PURE__ */ new Map());
    __publicField(this, "clockSyncCheckInterval", 10);
    // Check every 10 ticks (6.1)
    // Authoritative Snapshot Broadcast & Delta Compression (Phase 7)
    __publicField(this, "snapshotManager");
    __publicField(this, "clientAckedTicks", /* @__PURE__ */ new Map());
    // Client confirmed server ticks (7.3)
    // Contested grab arbitration audit log
    __publicField(this, "contestedGrabEvents", []);
    // Reliable action deduplication & ACK tracking
    __publicField(this, "processedActionIds", /* @__PURE__ */ new Set());
    __publicField(this, "recentAckedActionIds", []);
    const width = (config == null ? void 0 : config.arenaWidth) ?? 20;
    const height = (config == null ? void 0 : config.arenaHeight) ?? 14;
    const wallH = (config == null ? void 0 : config.wallHeight) ?? 1;
    this.arena = new Arena(width, height, wallH);
    this.islandManager = new IslandManager();
    if (config == null ? void 0 : config.collisionMode) this.collisionMode = config.collisionMode;
    if (config == null ? void 0 : config.fixedDt) this.fixedDt = config.fixedDt;
    this.jitterBuffer = new ServerJitterBufferManager({
      targetDepth: (config == null ? void 0 : config.jitterTargetDepth) ?? 2,
      maxCapacity: 60
    });
    this.snapshotManager = new AuthoritativeSnapshotManager({
      broadcastRateHz: (config == null ? void 0 : config.broadcastRateHz) ?? 60,
      deltaCompression: (config == null ? void 0 : config.deltaCompression) ?? true
    });
  }
  get allCharacters() {
    return Array.from(this.characters.values());
  }
  /**
   * Initializes or syncs the server simulation world from the client arena and entities.
   */
  initializeFromWorld(clientArena, clientCharacters, clientObjects) {
    this.arena.width = clientArena.width;
    this.arena.height = clientArena.height;
    this.arena.tileSize = clientArena.tileSize;
    this.arena.setStandardWallHeight(clientArena.wallHeight);
    this.arena.tileGrid = clientArena.tileGrid.map((row) => [...row]);
    this.arena.rebuildWalls();
    this.characters.clear();
    for (const c of clientCharacters) {
      const serverChar = new Character({
        x: c.position.x,
        y: c.position.y,
        color: c.playerColor || c.color || "#f59e0b",
        colliderRadius: c.colliderRadius,
        mass: c.baseMass || 1.2,
        strength: c.strength,
        playerId: c.playerId || "keyboard",
        playerNumber: c.playerNumber || 1,
        name: c.name || "Server Character"
      });
      serverChar.position.z = c.position.z;
      serverChar.velocity.x = c.velocity.x;
      serverChar.velocity.y = c.velocity.y;
      serverChar.verticalVelocity = c.verticalVelocity;
      serverChar.facingAngle = c.facingAngle;
      serverChar.isClimbing = c.isClimbing;
      serverChar.isSprinting = c.isSprinting;
      this.characters.set(serverChar.playerId, serverChar);
    }
    this.objects = clientObjects.map((o) => {
      const serverObj = new GameObject({
        id: o.id,
        name: o.name,
        position: { x: o.position.x, y: o.position.y, z: o.position.z },
        velocity: { x: o.velocity.x, y: o.velocity.y },
        verticalVelocity: o.verticalVelocity,
        mass: o.mass,
        colliderRadius: o.colliderRadius,
        color: o.color,
        bounceMod: o.bounceMod,
        staticGroundFrictionMod: o.staticGroundFrictionMod,
        dynamicGroundFrictionMod: o.dynamicGroundFrictionMod,
        visualShape: o.visualShape,
        rollModule: o.rollModule ? new RollModule({
          rollResistance: o.rollModule.rollResistance,
          angularVelocity: { ...o.rollModule.angularVelocity }
        }) : void 0
      });
      serverObj.isSleeping = o.isSleeping;
      return serverObj;
    });
    for (const clientChar of clientCharacters) {
      if (clientChar.heldObject) {
        const sChar = this.characters.get(clientChar.playerId || "keyboard");
        const sObj = this.objects.find((o) => o.id === clientChar.heldObject.id);
        if (sChar && sObj) {
          sChar.heldObject = sObj;
          sObj.isHeld = true;
          sObj.heldBy = sChar;
        }
      }
    }
    this.arena.syncEntitiesWithWalls([...this.allCharacters, ...this.objects]);
    this.jitterBuffer.clear();
  }
  /**
   * Initializes default standard arena and freebodies if starting standalone without client.
   */
  initializeDefaultScenario() {
    this.arena.loadWallPreset("standard");
    const player1 = new Character({
      x: 4.8,
      y: 7,
      color: "#f59e0b",
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1,
      playerId: "player-1",
      playerNumber: 1,
      name: "Server Player 1"
    });
    this.characters.set(player1.playerId, player1);
    this.objects = [
      new GameObject({
        id: "stone-1",
        name: "Light Blue Box",
        position: { x: 6.8, y: 4.4, z: 0 },
        mass: 0.7,
        colliderRadius: 0.26,
        color: "#38bdf8",
        bounceMod: 0.25,
        visualShape: "box"
      }),
      new GameObject({
        id: "boulder-1",
        name: "Heavy Red Box",
        position: { x: 7, y: 9.2, z: 0 },
        mass: 2.6,
        colliderRadius: 0.4,
        color: "#f87171",
        bounceMod: 0.05,
        visualShape: "box"
      }),
      new GameObject({
        id: "bouncy-1",
        name: "Super Bouncy Ball",
        position: { x: 5.2, y: 3, z: 0.6 },
        mass: 0.5,
        colliderRadius: 0.24,
        color: "#4ade80",
        bounceMod: 0.85,
        verticalVelocity: 1
      }),
      new GameObject({
        id: "rolling-1",
        name: "Rolling Ball",
        position: { x: 13.6, y: 7, z: 0 },
        velocity: { x: 4.5, y: 1.5 },
        mass: 0.6,
        colliderRadius: 0.28,
        color: "#a855f7",
        bounceMod: 0.95,
        rollModule: new RollModule({
          rollResistance: 0,
          angularVelocity: { x: -1.5 / 0.28, y: 4.5 / 0.28, z: 0 }
        })
      })
    ];
    this.arena.syncEntitiesWithWalls([...this.allCharacters, ...this.objects]);
    this.jitterBuffer.clear();
  }
  /**
   * Enqueues an incoming input packet from a player into the server jitter buffer.
   * Also tracks client acknowledged server ticks (Phase 7.3).
   */
  queueInput(packet) {
    if (packet.lastReceivedServerTick !== void 0) {
      const cur = this.clientAckedTicks.get(packet.playerId) ?? 0;
      if (packet.lastReceivedServerTick > cur) {
        this.clientAckedTicks.set(packet.playerId, packet.lastReceivedServerTick);
      }
    }
    if (packet.playerId && !this.characters.has(packet.playerId)) {
      return false;
    }
    return this.jitterBuffer.push(packet);
  }
  /**
   * Retrieves the highest server tick confirmed acknowledged by a client (Phase 7.3).
   */
  getClientAckedTick(playerId) {
    return this.clientAckedTicks.get(playerId) ?? 0;
  }
  /**
   * Retrieves telemetry stats for a player's jitter buffer.
   */
  getJitterStats(playerId) {
    return this.jitterBuffer.getStats(playerId);
  }
  /**
   * Retrieves telemetry stats for all active jitter buffers.
   */
  getAllJitterStats() {
    return this.jitterBuffer.getAllStats();
  }
  /**
   * Evaluates jitter buffer depths and computes adaptive clock sync packets for all players (Phase 6).
   */
  evaluateClockSync() {
    for (const [pId] of this.characters) {
      const syncPacket = this.jitterBuffer.evaluateClockSync(pId, this.currentTick);
      this.latestClockSync.set(pId, syncPacket);
    }
    if (!this.characters.has("keyboard")) {
      const syncPacket = this.jitterBuffer.evaluateClockSync("keyboard", this.currentTick);
      this.latestClockSync.set("keyboard", syncPacket);
    }
  }
  /**
   * Retrieves the latest ClockSyncPacket for a player.
   */
  getLatestClockSync(playerId) {
    return this.latestClockSync.get(playerId) ?? null;
  }
  /**
   * Synchronizes server simulation objects from incoming client telemetry packets.
   * Synchronizes positions AND velocities, 3D roll angular velocity, and held/resting states
   * so the server runs physics independently with accurate momentum and coordinates.
   */
  syncObjectsFromPacket(clientObjects, senderClientId) {
    if (!clientObjects || clientObjects.length === 0) return;
    for (const cObj of clientObjects) {
      let sObj = this.objects.find((o) => o.id === cObj.id);
      if (!sObj) {
        sObj = new GameObject({
          id: cObj.id,
          name: cObj.name || "Object",
          position: { x: cObj.x, y: cObj.y, z: cObj.z },
          color: cObj.color || "#38bdf8",
          colliderRadius: cObj.radius || 0.35,
          visualShape: cObj.shape || "circle"
        });
        this.objects.push(sObj);
        this.arena.entities = [...this.allCharacters, ...this.objects];
      }
      if (cObj.isHeld) {
        const holderId = cObj.heldBy || senderClientId;
        const sChar = holderId ? this.characters.get(holderId) || this.allCharacters.find((c) => c.playerId === holderId || c.id === holderId) : null;
        if (sChar) {
          sObj.isHeld = true;
          sObj.heldBy = sChar;
          sChar.heldObject = sObj;
          const relPos = sChar.calculateHeldObjectPosition(this.arena);
          sObj.position.x = relPos.x;
          sObj.position.y = relPos.y;
          sObj.position.z = relPos.z;
          sObj.velocity.x = sChar.velocity.x;
          sObj.velocity.y = sChar.velocity.y;
          sObj.verticalVelocity = 0;
        }
        continue;
      } else if (sObj.isHeld) {
        const holderId = sObj.heldBy instanceof Character ? sObj.heldBy.playerId || sObj.heldBy.id : null;
        if (senderClientId && holderId && holderId !== senderClientId) {
          continue;
        }
        sObj.isHeld = false;
        if (sObj.heldBy && sObj.heldBy instanceof Character) {
          sObj.heldBy.heldObject = null;
        }
        sObj.heldBy = null;
      }
      continue;
    }
  }
  /**
   * Synchronizes all authoritative server characters from client telemetry packets.
   */
  syncCharactersFromPacket(clientChars) {
    if (!Array.isArray(clientChars) || clientChars.length === 0) return;
    for (const c of clientChars) {
      this.syncCharacterFromPacket(c);
    }
  }
  /**
   * Synchronizes the authoritative server character from client telemetry packets.
   * Updates velocity and coordinates directly so the server player ghost stays locked to the client.
   * If a character is not yet registered on the server, dynamically instantiates it.
   */
  syncCharacterFromPacket(clientChar) {
    if (!clientChar) return;
    const charId = clientChar.id || "keyboard";
    const sChar = this.characters.get(charId);
    if (!sChar) {
      return;
    }
    const now = performance.now();
    const hasRecentImpact = sChar.lastCollisionTime > 0 && now - sChar.lastCollisionTime < 400;
    const isClientMoving = Math.hypot(clientChar.vx, clientChar.vy) > 0.1;
    if (hasRecentImpact) {
      if (isClientMoving) {
        sChar.velocity.x += (clientChar.vx - sChar.velocity.x) * 0.3;
        sChar.velocity.y += (clientChar.vy - sChar.velocity.y) * 0.3;
      }
    } else {
      sChar.velocity.x = clientChar.vx;
      sChar.velocity.y = clientChar.vy;
    }
    if (sChar.hasVerticalVelocity && clientChar.vz !== void 0) {
      if (!hasRecentImpact || clientChar.vz > sChar.verticalVelocity) {
        sChar.verticalVelocity = clientChar.vz;
      }
    }
    const dx = clientChar.x - sChar.position.x;
    const dy = clientChar.y - sChar.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2.5) {
      sChar.position.x = clientChar.x;
      sChar.position.y = clientChar.y;
      sChar.position.z = clientChar.z;
    } else if (hasRecentImpact) {
      if (isClientMoving) {
        sChar.position.x += dx * 0.25;
        sChar.position.y += dy * 0.25;
      }
      sChar.position.z = clientChar.z;
    } else {
      sChar.position.x = clientChar.x;
      sChar.position.y = clientChar.y;
      sChar.position.z = clientChar.z;
    }
    if (clientChar.surfaceZ !== void 0) {
      sChar.supportingSurfaceHeight = clientChar.surfaceZ;
    }
    if (clientChar.isGrounded) {
      const surfaceZ = clientChar.surfaceZ ?? 0;
      if (sChar.position.z <= surfaceZ + 0.1) {
        sChar.position.z = surfaceZ;
        sChar.verticalVelocity = 0;
      }
    }
    if (clientChar.isClimbing !== void 0) {
      sChar.isClimbing = clientChar.isClimbing;
    }
    if (clientChar.facingAngle !== void 0) {
      sChar.facingAngle = clientChar.facingAngle;
    }
    if (clientChar.heldObjectId) {
      const sObj = this.objects.find((o) => o.id === clientChar.heldObjectId);
      if (sObj) {
        sChar.heldObject = sObj;
        sObj.isHeld = true;
        sObj.heldBy = sChar;
        const relPos = sChar.calculateHeldObjectPosition(this.arena);
        sObj.position.x = relPos.x;
        sObj.position.y = relPos.y;
        sObj.position.z = relPos.z;
        sObj.velocity.x = sChar.velocity.x;
        sObj.velocity.y = sChar.velocity.y;
        sObj.verticalVelocity = 0;
      }
    } else if (sChar.heldObject && clientChar.isHolding === false) {
      const sObj = sChar.heldObject;
      sObj.isHeld = false;
      sObj.heldBy = null;
      sChar.heldObject = null;
    }
  }
  /**
   * Authoritatively processes high-priority reliable action commands (pickup, drop, throw).
   * Idempotent: Deduplicates actions so retransmissions are acknowledged without re-executing.
   */
  processReliableActions(actions) {
    const newlyAcked = [];
    for (const act of actions) {
      newlyAcked.push(act.actionId);
      if (!this.recentAckedActionIds.includes(act.actionId)) {
        this.recentAckedActionIds.push(act.actionId);
        if (this.recentAckedActionIds.length > 100) {
          this.recentAckedActionIds.shift();
        }
      }
      if (this.processedActionIds.has(act.actionId)) {
        continue;
      }
      this.processedActionIds.add(act.actionId);
      if (this.processedActionIds.size > 2e3) {
        const first = this.processedActionIds.values().next().value;
        if (first) this.processedActionIds.delete(first);
      }
      let char = this.characters.get(act.playerId || "keyboard");
      if (!char && act.playerId) {
        char = this.allCharacters.find(
          (c) => c.playerId === act.playerId || c.playerId.endsWith(`:${act.playerId}`) || c.id === act.playerId
        );
      }
      if (!char) {
        char = this.allCharacters[0];
      }
      if (!char) continue;
      if (act.type === "pickup") {
        if (!char.heldObject && char.pickupModule && act.targetObjectId) {
          const target = this.objects.find((o) => o.id === act.targetObjectId);
          if (target && (!target.isHeld || target.heldBy === char)) {
            char.pickupModule.pickup(char, target);
          }
        }
      } else if (act.type === "drop") {
        let dropTarget = char.heldObject;
        if (!dropTarget && act.targetObjectId) {
          const candidate = this.objects.find((o) => o.id === act.targetObjectId);
          if (candidate && (!candidate.isHeld || candidate.heldBy === char)) {
            candidate.isHeld = true;
            candidate.heldBy = char;
            char.heldObject = candidate;
            dropTarget = candidate;
          }
        }
        if (dropTarget && char.pickupModule) {
          char.pickupModule.drop(char);
        }
      } else if (act.type === "throw") {
        let throwTarget = char.heldObject;
        if (!throwTarget && act.targetObjectId) {
          const candidate = this.objects.find((o) => o.id === act.targetObjectId);
          if (candidate && (!candidate.isHeld || candidate.heldBy === char)) {
            candidate.isHeld = true;
            candidate.heldBy = char;
            char.heldObject = candidate;
            throwTarget = candidate;
          }
        }
        if (throwTarget && char.throwModule) {
          const aimX = act.aimX ?? char.position.x + Math.cos(char.facingAngle) * 3;
          const aimY = act.aimY ?? char.position.y + Math.sin(char.facingAngle) * 3;
          char.throwModule.throwHeldObject(
            char,
            aimX,
            aimY,
            this.arena,
            void 0,
            void 0,
            act.isLockHeld ?? false
          );
        }
      }
    }
    return newlyAcked;
  }
  getRecentAckedActionIds() {
    return [...this.recentAckedActionIds];
  }
  /**
   * Resolves contested grabs when multiple characters attempt to grab the same object on this tick (Phase 4.3).
   */
  arbitrateContestedGrabs(grabRequests) {
    var _a, _b;
    const targetGroups = /* @__PURE__ */ new Map();
    for (const req of grabRequests) {
      const objId = req.target.id;
      let group = targetGroups.get(objId);
      if (!group) {
        group = [];
        targetGroups.set(objId, group);
      }
      group.push(req);
    }
    for (const [objId, requests] of targetGroups) {
      if (requests.length === 1) {
        const req = requests[0];
        (_a = req.char.pickupModule) == null ? void 0 : _a.pickup(req.char, req.target);
        continue;
      }
      requests.sort((a, b) => {
        if (Math.abs(b.char.strength - a.char.strength) > 1e-3) {
          return b.char.strength - a.char.strength;
        }
        const distA = Math.hypot(
          a.target.position.x - a.char.position.x,
          a.target.position.y - a.char.position.y,
          a.target.position.z - a.char.position.z
        );
        const distB = Math.hypot(
          b.target.position.x - b.char.position.x,
          b.target.position.y - b.char.position.y,
          b.target.position.z - b.char.position.z
        );
        if (Math.abs(distA - distB) > 1e-3) {
          return distA - distB;
        }
        return a.char.playerId.localeCompare(b.char.playerId);
      });
      const winner = requests[0];
      const losers = requests.slice(1);
      let reason = "id_priority";
      if (Math.abs(winner.char.strength - losers[0].char.strength) > 1e-3) {
        reason = "strength";
      } else {
        const distWin = Math.hypot(
          winner.target.position.x - winner.char.position.x,
          winner.target.position.y - winner.char.position.y,
          winner.target.position.z - winner.char.position.z
        );
        const distLose = Math.hypot(
          losers[0].target.position.x - losers[0].char.position.x,
          losers[0].target.position.y - losers[0].char.position.y,
          losers[0].target.position.z - losers[0].char.position.z
        );
        if (Math.abs(distWin - distLose) > 1e-3) {
          reason = "proximity";
        }
      }
      this.contestedGrabEvents.push({
        tick: this.currentTick,
        targetObjectId: objId,
        winnerPlayerId: winner.char.playerId,
        loserPlayerIds: losers.map((l) => l.char.playerId),
        reason
      });
      (_b = winner.char.pickupModule) == null ? void 0 : _b.pickup(winner.char, winner.target);
    }
  }
  /**
   * Advances the authoritative simulation by 1 fixed physics tick.
   * Deterministically applies player inputs, freebody updates, and collision resolution.
   */
  step(dt = this.fixedDt) {
    var _a, _b;
    this.currentTick++;
    this.arena.entities = [...this.allCharacters, ...this.objects];
    const grabRequests = [];
    for (const [pId, char] of this.characters) {
      const { packet: pkt, drainedPackets } = this.jitterBuffer.consume(pId, this.currentTick);
      for (const catchupPkt of drainedPackets) {
        char.updateCharacter(
          dt,
          { x: catchupPkt.moveX, y: catchupPkt.moveY },
          catchupPkt.isAiming,
          catchupPkt.aimX !== void 0 && catchupPkt.aimY !== void 0 ? { x: catchupPkt.aimX, y: catchupPkt.aimY } : null,
          this.arena,
          catchupPkt.isJumpHeld,
          this.arena.entities,
          catchupPkt.isLockHeld
        );
        if (((_a = char.activeTrajectory) == null ? void 0 : _a.isAutoLocked) && char.activeTrajectory.targetObject) {
          const dx = char.activeTrajectory.targetObject.position.x - char.position.x;
          const dy = char.activeTrajectory.targetObject.position.y - char.position.y;
          if (Math.hypot(dx, dy) > 0.05) {
            char.facingAngle = Math.atan2(dy, dx);
          }
        } else if (catchupPkt.facingAngle !== void 0) {
          char.facingAngle = catchupPkt.facingAngle;
        }
        if (char.heldObject) {
          const heldPos = char.calculateHeldObjectPosition(this.arena);
          char.heldObject.position.x = heldPos.x;
          char.heldObject.position.y = heldPos.y;
          char.heldObject.position.z = heldPos.z;
        }
      }
      if (pkt) {
        if (char.isSprinting !== pkt.isSprinting) {
          char.setSprinting(pkt.isSprinting);
        }
        const aimTarget = pkt.aimX !== void 0 && pkt.aimY !== void 0 ? { x: pkt.aimX, y: pkt.aimY } : null;
        if (pkt.isDrop && char.heldObject && char.pickupModule) {
          char.pickupModule.drop(char);
        }
        if (pkt.isThrow && char.heldObject && char.throwModule) {
          const aimX = aimTarget ? aimTarget.x : pkt.aimX !== void 0 ? pkt.aimX : char.position.x + Math.cos(char.facingAngle) * 3;
          const aimY = aimTarget ? aimTarget.y : pkt.aimY !== void 0 ? pkt.aimY : char.position.y + Math.sin(char.facingAngle) * 3;
          char.throwModule.throwHeldObject(
            char,
            aimX,
            aimY,
            this.arena,
            void 0,
            void 0,
            pkt.isLockHeld
          );
        }
        if (pkt.isGrabHeld && !char.heldObject && char.pickupModule) {
          const others = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
          let target = null;
          if (pkt.grabTargetObjectId !== void 0) {
            if (pkt.grabTargetObjectId !== null) {
              const explicitTarget = others.find((o) => o.id === pkt.grabTargetObjectId);
              if (explicitTarget) {
                const maxReach = char.pickupModule.pickupReach * 1.35;
                const charZ = Math.max(char.position.z, char.supportingSurfaceHeight ?? 0);
                const targetZ = Math.max(explicitTarget.position.z, explicitTarget.supportingSurfaceHeight ?? 0);
                const dist3D = Math.hypot(
                  explicitTarget.position.x - char.position.x,
                  explicitTarget.position.y - char.position.y,
                  targetZ - charZ
                );
                if (dist3D <= maxReach) {
                  target = explicitTarget;
                }
              }
            }
          } else {
            const grabAimX = aimTarget ? aimTarget.x : char.position.x;
            const grabAimY = aimTarget ? aimTarget.y : char.position.y;
            target = char.pickupModule.findTargetObject(char, grabAimX, grabAimY, others, this.arena.wallHeight);
          }
          if (target) {
            grabRequests.push({ char, target, pkt });
          }
        }
        char.updateCharacter(
          dt,
          { x: pkt.moveX, y: pkt.moveY },
          pkt.isAiming,
          aimTarget,
          this.arena,
          pkt.isJumpHeld,
          this.arena.entities,
          pkt.isLockHeld
        );
        if (((_b = char.activeTrajectory) == null ? void 0 : _b.isAutoLocked) && char.activeTrajectory.targetObject) {
          const dx = char.activeTrajectory.targetObject.position.x - char.position.x;
          const dy = char.activeTrajectory.targetObject.position.y - char.position.y;
          if (Math.hypot(dx, dy) > 0.05) {
            char.facingAngle = Math.atan2(dy, dx);
          }
        } else if (pkt.facingAngle !== void 0) {
          char.facingAngle = pkt.facingAngle;
        }
        if (char.heldObject) {
          const heldPos = char.calculateHeldObjectPosition(this.arena);
          char.heldObject.position.x = heldPos.x;
          char.heldObject.position.y = heldPos.y;
          char.heldObject.position.z = heldPos.z;
        }
      } else {
        char.updateCharacter(dt, { x: 0, y: 0 }, false, null, this.arena, false, this.arena.entities, false);
      }
    }
    if (grabRequests.length > 0) {
      this.arbitrateContestedGrabs(grabRequests);
    }
    for (const obj of this.objects) {
      if (obj.isHeld && obj.heldBy && obj.heldBy instanceof Character) {
        const relPos = obj.heldBy.calculateHeldObjectPosition(this.arena);
        obj.position.x = relPos.x;
        obj.position.y = relPos.y;
        obj.position.z = relPos.z;
        obj.velocity.x = obj.heldBy.velocity.x;
        obj.velocity.y = obj.heldBy.velocity.y;
        obj.verticalVelocity = 0;
        continue;
      }
      obj.updatePosition(dt, this.arena);
    }
    CollisionResolver.resolveEntityCollisions(
      [...this.allCharacters, ...this.objects],
      this.arena,
      dt,
      null,
      this.collisionMode
    );
    this.islandManager.updateIslands(this.allCharacters, this.objects, this.currentTick, this.arena);
    if (this.currentTick % this.clockSyncCheckInterval === 0) {
      this.evaluateClockSync();
    }
    return SnapshotManager.capture(this.currentTick, this.allCharacters, this.objects, false);
  }
  /**
   * Generates a quantized, delta-compressed AuthoritativeWorldSnapshot for network broadcast (Phase 7).
   */
  getAuthoritativeWorldSnapshot(forceKeyframe = false) {
    const lastProcessedInputTick = {};
    for (const [pId] of this.characters) {
      const stats = this.jitterBuffer.getStats(pId);
      if (stats && stats.lastConsumedTick !== null) {
        lastProcessedInputTick[pId] = stats.lastConsumedTick;
      }
    }
    const primaryChar = this.characters.get("keyboard") || this.allCharacters[0];
    const targetPId = primaryChar ? primaryChar.playerId : "keyboard";
    const clockSync = this.latestClockSync.get(targetPId) || this.latestClockSync.get("keyboard") || void 0;
    return this.snapshotManager.createSnapshot(
      this.currentTick,
      this.allCharacters,
      this.objects,
      lastProcessedInputTick,
      this.getRecentAckedActionIds(),
      clockSync,
      forceKeyframe
    );
  }
  /**
   * Produces a GhostSnapshot suitable for rendering or network broadcast.
   * Directly reflects the true physical state of the authoritative simulation.
   */
  getGhostSnapshot(rttMs = 0, forPlayerId) {
    const primaryChar = this.characters.get("keyboard") || this.allCharacters[0];
    const targetPId = forPlayerId || (primaryChar ? primaryChar.playerId : "keyboard");
    const clockSync = this.latestClockSync.get(targetPId) || this.latestClockSync.get("keyboard");
    const ghostChar = {
      id: primaryChar ? primaryChar.playerId : "player",
      x: primaryChar ? Number(primaryChar.position.x.toFixed(3)) : 0,
      y: primaryChar ? Number(primaryChar.position.y.toFixed(3)) : 0,
      z: primaryChar ? Number(primaryChar.position.z.toFixed(3)) : 0,
      vx: primaryChar ? Number(primaryChar.velocity.x.toFixed(3)) : 0,
      vy: primaryChar ? Number(primaryChar.velocity.y.toFixed(3)) : 0,
      vz: primaryChar ? Number((primaryChar.hasVerticalVelocity ? primaryChar.verticalVelocity : 0).toFixed(3)) : 0,
      surfaceZ: primaryChar ? Number((primaryChar.supportingSurfaceHeight ?? 0).toFixed(3)) : 0,
      isGrounded: primaryChar ? primaryChar.isRestingOnSurface || primaryChar.position.z <= 5e-3 : true,
      radius: primaryChar ? primaryChar.colliderRadius : 0.44,
      color: primaryChar ? primaryChar.playerColor || primaryChar.color : "#f59e0b",
      playerColor: primaryChar ? primaryChar.playerColor || primaryChar.color : "#f59e0b",
      playerNumber: primaryChar ? primaryChar.playerNumber : 1,
      isClimbing: primaryChar ? primaryChar.isClimbing : false,
      isAboveWalls: primaryChar ? primaryChar.isAboveWalls : false,
      facingAngle: primaryChar ? Number(primaryChar.facingAngle.toFixed(4)) : 0
    };
    const ghostObjects = this.objects.map((obj) => {
      const holder = (obj.heldBy instanceof Character ? obj.heldBy : null) || this.allCharacters.find((c) => c.heldObject === obj);
      let posX = obj.position.x;
      let posY = obj.position.y;
      let posZ = obj.position.z;
      if ((obj.isHeld || holder) && holder) {
        const relPos = holder.calculateHeldObjectPosition(this.arena);
        posX = relPos.x;
        posY = relPos.y;
        posZ = relPos.z;
      }
      return {
        id: obj.id,
        name: obj.name,
        x: Number(posX.toFixed(3)),
        y: Number(posY.toFixed(3)),
        z: Number(posZ.toFixed(3)),
        vx: Number(obj.velocity.x.toFixed(3)),
        vy: Number(obj.velocity.y.toFixed(3)),
        vz: Number((obj.hasVerticalVelocity ? obj.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((obj.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: obj.isRestingOnSurface || obj.position.z <= 5e-3,
        radius: obj.colliderRadius,
        color: obj.color,
        shape: obj.visualShape,
        isHeld: obj.isHeld || Boolean(holder),
        heldBy: holder ? holder.playerId || (holder === primaryChar ? "player" : holder.id) : obj.heldBy ? obj.heldBy.playerId || obj.heldBy.id : null,
        isAboveWalls: obj.isAboveWalls,
        angX: obj.rollModule ? Number(obj.rollModule.angularVelocity.x.toFixed(3)) : void 0,
        angY: obj.rollModule ? Number(obj.rollModule.angularVelocity.y.toFixed(3)) : void 0,
        angZ: obj.rollModule ? Number(obj.rollModule.angularVelocity.z.toFixed(3)) : void 0,
        isSleeping: obj.isSleeping
      };
    });
    const ghostCharacters = this.allCharacters.map((c) => ({
      id: c.playerId || c.id || "player",
      name: c.name,
      x: Number(c.position.x.toFixed(3)),
      y: Number(c.position.y.toFixed(3)),
      z: Number(c.position.z.toFixed(3)),
      vx: Number(c.velocity.x.toFixed(3)),
      vy: Number(c.velocity.y.toFixed(3)),
      vz: Number((c.hasVerticalVelocity ? c.verticalVelocity : 0).toFixed(3)),
      surfaceZ: Number((c.supportingSurfaceHeight ?? 0).toFixed(3)),
      isGrounded: c.isRestingOnSurface || c.position.z <= 5e-3,
      radius: c.colliderRadius,
      color: c.playerColor || c.color,
      playerColor: c.playerColor || c.color,
      playerNumber: c.playerNumber,
      isClimbing: c.isClimbing,
      isAboveWalls: c.isAboveWalls,
      facingAngle: Number(c.facingAngle.toFixed(4)),
      heldObjectId: c.heldObject ? c.heldObject.id : null,
      isHolding: Boolean(c.heldObject)
    }));
    return {
      seq: this.currentTick,
      sentAt: performance.now(),
      receivedAt: performance.now(),
      rttMs,
      character: ghostChar,
      characters: ghostCharacters,
      objects: ghostObjects,
      ackActionIds: this.getRecentAckedActionIds(),
      clockSync
    };
  }
}
const PLAYER_COLORS = [
  "#f59e0b",
  // P1: Amber Gold
  "#06b6d4",
  // P2: Cyan
  "#10b981",
  // P3: Emerald
  "#a855f7",
  // P4: Violet
  "#f43f5e",
  // P5: Rose
  "#3b82f6"
  // P6: Blue
];
if (typeof process !== "undefined" && process.env) {
  process.env.WS_NO_BUFFER_UTIL = "1";
  process.env.WS_NO_UTF_8_VALIDATE = "1";
}
const _UniversalRoomManager = class _UniversalRoomManager {
  constructor() {
    __publicField(this, "simulation");
    __publicField(this, "clients", /* @__PURE__ */ new Map());
    __publicField(this, "isRunning", false);
    __publicField(this, "needsMapReload", false);
    __publicField(this, "loopInterval", null);
    __publicField(this, "heartbeatInterval", null);
    __publicField(this, "lastTimeHr", process.hrtime.bigint());
    __publicField(this, "accumulator", 0);
    __publicField(this, "fixedDt", 1 / 60);
    this.simulation = new ServerGameSimulation({
      broadcastRateHz: 60,
      deltaCompression: false
    });
    this.simulation.initializeDefaultScenario();
  }
  static getInstance() {
    if (!_UniversalRoomManager.instance) {
      _UniversalRoomManager.instance = new _UniversalRoomManager();
      _UniversalRoomManager.instance.start();
    }
    return _UniversalRoomManager.instance;
  }
  /**
   * Attaches the WebSocket server to an existing Node.js HTTP server at path '/ws'.
   */
  static attach(httpServer) {
    const manager = _UniversalRoomManager.getInstance();
    const wss = new WebSocketServer({ noServer: true });
    httpServer.on("upgrade", (req, socket, head) => {
      try {
        const rawUrl = (req.url || "/").split("?")[0].replace(/\/+$/, "");
        const isWsPath = rawUrl === "/ws" || rawUrl.endsWith("/ws");
        if (isWsPath) {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
          });
        }
      } catch (err) {
        console.warn("[UniversalRoom] Upgrade error:", err);
      }
    });
    wss.on("connection", (ws, req) => {
      manager.handleConnection(ws, req);
    });
    console.log("🌐 [UniversalRoom] Attached WebSocket server at /ws");
    return manager;
  }
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimeHr = process.hrtime.bigint();
    this.accumulator = 0;
    this.loopInterval = setInterval(() => {
      this.tick();
    }, 4);
    this.heartbeatInterval = setInterval(() => {
      this.checkClientLiveness();
    }, 1e3);
    console.log(`🌐 [UniversalRoom] Authoritative 60Hz physics world active. Ticks: #${this.simulation.currentTick}`);
  }
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  /**
   * Drops dead / silent clients whose connection was abruptly terminated
   * without a clean WebSocket close frame (e.g. WiFi cut, laptop sleep, crashed tab).
   */
  checkClientLiveness() {
    const now = Date.now();
    const TIMEOUT_MS = 3500;
    for (const [clientId, client] of Array.from(this.clients.entries())) {
      if (now - client.lastSeen > TIMEOUT_MS) {
        console.warn(
          `⚠️ [UniversalRoom] Connection lost for client ${clientId} (silent for ${now - client.lastSeen}ms). Evicting character immediately.`
        );
        try {
          client.ws.terminate();
        } catch (_) {
        }
        this.handleDisconnection(clientId);
      }
    }
  }
  tick() {
    if (!this.isRunning) return;
    if (this.clients.size === 0) {
      this.lastTimeHr = process.hrtime.bigint();
      this.accumulator = 0;
      return;
    }
    const nowHr = process.hrtime.bigint();
    const elapsedSec = Number(nowHr - this.lastTimeHr) / 1e9;
    this.lastTimeHr = nowHr;
    this.accumulator += Math.min(0.2, elapsedSec);
    while (this.accumulator >= this.fixedDt) {
      this.simulation.step(this.fixedDt);
      this.accumulator -= this.fixedDt;
      this.broadcastSnapshot();
    }
  }
  broadcastSnapshot() {
    if (this.clients.size === 0) return;
    const worldSnapshot = this.simulation.getAuthoritativeWorldSnapshot();
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          const snapshot = this.simulation.getGhostSnapshot(client.lastPingMs || 0);
          const clockSync = this.simulation.getLatestClockSync(clientId);
          if (clockSync) {
            snapshot.clockSync = clockSync;
          }
          const payload = JSON.stringify({
            type: "pc_server_snapshot",
            snapshot,
            worldSnapshot,
            playerCount: this.simulation.characters.size
          });
          client.ws.send(payload);
        } catch (err) {
          console.warn(`[UniversalRoom] Failed to send snapshot to ${clientId}:`, err);
        }
      }
    }
  }
  allocatePlayerNumber() {
    const used = /* @__PURE__ */ new Set();
    for (const char of this.simulation.characters.values()) {
      if (char.playerNumber && char.playerNumber > 0) {
        used.add(char.playerNumber);
      }
    }
    for (let i = 1; i <= 16; i++) {
      if (!used.has(i)) return i;
    }
    return this.simulation.characters.size + 1;
  }
  resolveActionPlayerId(client, act, fallbackServerCharId) {
    if (!act.playerId) return fallbackServerCharId;
    for (const charEntry of client.characters.values()) {
      if (act.playerId === charEntry.serverCharId) {
        return charEntry.serverCharId;
      }
    }
    if (client.characters.has(act.playerId)) {
      return client.characters.get(act.playerId).serverCharId;
    }
    if (act.playerId.startsWith(`${client.id}:`)) {
      return act.playerId;
    }
    return fallbackServerCharId;
  }
  /**
   * Trashes any memory of the online map the moment no players are connected.
   */
  trashMapMemory() {
    console.log("🌐 [UniversalRoom] All players left. Trashing online map memory...");
    for (const obj of this.simulation.objects) {
      obj.isHeld = false;
      obj.heldBy = null;
    }
    for (const char of this.simulation.characters.values()) {
      char.cleanupBeforeRemoval();
    }
    this.simulation.characters.clear();
    this.simulation.objects = [];
    this.simulation.jitterBuffer.clear();
    this.simulation.arena.entities = [];
    this.accumulator = 0;
    this.needsMapReload = true;
    console.log("🌐 [UniversalRoom] Online map memory trashed cleanly.");
  }
  /**
   * Reloads the pristine default scenario when a player tries to connect to an empty room.
   */
  reloadMap() {
    console.log("🌐 [UniversalRoom] Player connecting. Reloading fresh online map...");
    this.simulation.initializeDefaultScenario();
    if (this.simulation.characters.has("player-1")) {
      const p1 = this.simulation.characters.get("player-1");
      p1 == null ? void 0 : p1.cleanupBeforeRemoval();
      this.simulation.characters.delete("player-1");
      this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    }
    this.lastTimeHr = process.hrtime.bigint();
    this.accumulator = 0;
    this.needsMapReload = false;
    console.log("🌐 [UniversalRoom] Fresh online map reloaded. Ready for players.");
  }
  registerCharacter(client, localPlayerId, name) {
    const existing = client.characters.get(localPlayerId);
    if (existing) {
      if (name && name.trim().length > 0 && !/^Player(\s+\d+)?$/i.test(name.trim()) && !/^Controller\s+#\d+$/i.test(name.trim())) {
        existing.name = name.trim();
        const sChar = this.simulation.characters.get(existing.serverCharId);
        if (sChar) {
          sChar.name = existing.name;
          sChar.hasCustomName = true;
        }
      }
      return existing;
    }
    const playerNumber = this.allocatePlayerNumber();
    const color = PLAYER_COLORS[(playerNumber - 1) % PLAYER_COLORS.length];
    const serverCharId = localPlayerId === "keyboard" ? client.id : `${client.id}:${localPlayerId}`;
    const isExplicitCustom = Boolean(
      name && name.trim().length > 0 && !/^Player(\s+\d+)?$/i.test(name.trim()) && !/^Controller\s+#\d+$/i.test(name.trim())
    );
    const charName = isExplicitCustom ? name.trim() : `Player ${playerNumber}`;
    const spawnX = 4.8 + (playerNumber - 1) % 4 * 1.6;
    const spawnY = 7 + Math.floor((playerNumber - 1) / 4) * 1.5;
    const character = new Character({
      x: spawnX,
      y: spawnY,
      color,
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1,
      playerId: serverCharId,
      playerNumber,
      name: charName,
      hasCustomName: isExplicitCustom
    });
    this.simulation.characters.set(serverCharId, character);
    this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    const entry = {
      localPlayerId,
      serverCharId,
      playerNumber,
      color,
      name: charName
    };
    client.characters.set(localPlayerId, entry);
    console.log(
      `🌐 [UniversalRoom] Acknowledged character: ${serverCharId} as P${playerNumber} (${color}, "${charName}") for client ${client.id}`
    );
    return entry;
  }
  unregisterCharacter(client, localPlayerId) {
    const entry = client.characters.get(localPlayerId);
    if (!entry) return;
    client.characters.delete(localPlayerId);
    const sChar = this.simulation.characters.get(entry.serverCharId);
    if (sChar) {
      if (sChar.heldObject) {
        sChar.heldObject.isHeld = false;
        sChar.heldObject.heldBy = null;
        sChar.heldObject.wakeUp();
        sChar.heldObject = null;
      }
      sChar.cleanupBeforeRemoval();
      this.simulation.characters.delete(entry.serverCharId);
      this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    }
    this.simulation.jitterBuffer.clear(entry.serverCharId);
    this.simulation.latestClockSync.delete(entry.serverCharId);
    this.simulation.clientAckedTicks.delete(entry.serverCharId);
    console.log(`🌐 [UniversalRoom] Character removed: ${entry.serverCharId} from client ${client.id}`);
    const leftPayload = JSON.stringify({
      type: "player_left",
      clientId: client.id,
      removedCharIds: [entry.serverCharId],
      playerCount: this.simulation.characters.size
    });
    for (const other of this.clients.values()) {
      if (other.ws.readyState === WebSocket.OPEN) {
        try {
          other.ws.send(leftPayload);
        } catch (_) {
        }
      }
    }
    this.broadcastSnapshot();
  }
  handleConnection(ws, _req) {
    if (this.needsMapReload || this.clients.size === 0) {
      this.reloadMap();
    }
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const client = {
      id: clientId,
      ws,
      characters: /* @__PURE__ */ new Map(),
      lastPingMs: 0,
      lastSeen: Date.now()
    };
    this.clients.set(clientId, client);
    console.log(`🌐 [UniversalRoom] Client connected: ${clientId} (Total clients in room: ${this.clients.size})`);
    if (this.simulation.characters.has("player-1")) {
      const p1 = this.simulation.characters.get("player-1");
      p1 == null ? void 0 : p1.cleanupBeforeRemoval();
      this.simulation.characters.delete("player-1");
    }
    const primaryEntry = this.registerCharacter(client, "keyboard");
    primaryEntry.isDefaultPlaceholder = true;
    ws.on("message", (raw) => {
      var _a;
      try {
        client.lastSeen = Date.now();
        const text = raw.toString();
        const data = JSON.parse(text);
        if (data.type === "leave_room") {
          this.handleDisconnection(clientId);
          try {
            ws.close();
          } catch (_) {
          }
          return;
        }
        if (data.type === "join_room") {
          if (Array.isArray(data.localPlayers) && data.localPlayers.length > 0) {
            const requestedLocalIds = new Set(data.localPlayers.map((lp) => lp.localPlayerId).filter(Boolean));
            for (const localId of Array.from(client.characters.keys())) {
              if (!requestedLocalIds.has(localId)) {
                this.unregisterCharacter(client, localId);
              }
            }
            for (const lp of data.localPlayers) {
              if (lp.localPlayerId) {
                const reg = this.registerCharacter(client, lp.localPlayerId, lp.name);
                if (lp.localPlayerId !== "keyboard") {
                  reg.isDefaultPlaceholder = false;
                }
              }
            }
          } else {
            if (!client.characters.has("keyboard")) {
              this.registerCharacter(client, "keyboard", data.name);
            } else if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
              const entry = client.characters.get("keyboard");
              if (!/^Player(\s+\d+)?$/i.test(data.name.trim()) && !/^Controller\s+#\d+$/i.test(data.name.trim())) {
                entry.name = data.name.trim();
                const sChar = this.simulation.characters.get(entry.serverCharId);
                if (sChar) {
                  sChar.name = entry.name;
                  sChar.hasCustomName = true;
                }
              }
            }
          }
          const primary = client.characters.get("keyboard") || client.characters.values().next().value || primaryEntry;
          ws.send(JSON.stringify({
            type: "room_joined",
            clientId,
            playerNumber: primary.playerNumber,
            name: primary.name,
            color: primary.color,
            registeredPlayers: Array.from(client.characters.values()),
            arena: {
              width: this.simulation.arena.width,
              height: this.simulation.arena.height,
              wallHeight: this.simulation.arena.wallHeight,
              tileGrid: this.simulation.arena.tileGrid
            },
            worldSnapshot: this.simulation.getAuthoritativeWorldSnapshot()
          }));
          return;
        }
        if (data.type === "add_player") {
          const localPlayerId = data.localPlayerId || `player-${client.characters.size + 1}`;
          const kbEntry = client.characters.get("keyboard");
          if (localPlayerId !== "keyboard" && kbEntry && kbEntry.isDefaultPlaceholder && !client.hasReceivedKeyboardInput && client.characters.size === 1) {
            console.log(`🌐 [UniversalRoom] Replacing unused default placeholder "keyboard" with first real player "${localPlayerId}" for client ${clientId}`);
            this.unregisterCharacter(client, "keyboard");
          }
          const entry = this.registerCharacter(client, localPlayerId, data.name);
          entry.isDefaultPlaceholder = false;
          ws.send(JSON.stringify({
            type: "player_added",
            localPlayerId: entry.localPlayerId,
            serverCharId: entry.serverCharId,
            playerNumber: entry.playerNumber,
            color: entry.color,
            name: entry.name
          }));
          return;
        }
        if (data.type === "remove_player") {
          const localPlayerId = data.localPlayerId;
          if (localPlayerId) {
            this.unregisterCharacter(client, localPlayerId);
            ws.send(JSON.stringify({
              type: "player_removed",
              localPlayerId
            }));
          }
          return;
        }
        if (data.type === "player_input" && data.packet) {
          const localPlayerId = data.localPlayerId || "keyboard";
          let charEntry = client.characters.get(localPlayerId);
          if (!charEntry) {
            if (client.characters.size === 0) {
              charEntry = this.registerCharacter(client, localPlayerId, (_a = data.character) == null ? void 0 : _a.name);
            } else {
              return;
            }
          }
          const serverCharId = charEntry.serverCharId;
          const pkt = data.packet;
          pkt.playerId = serverCharId;
          if (localPlayerId === "keyboard") {
            if (pkt.moveX !== 0 || pkt.moveY !== 0 || pkt.isJumpHeld || pkt.isGrabHeld || pkt.isAiming) {
              charEntry.isDefaultPlaceholder = false;
              client.hasReceivedKeyboardInput = true;
            }
          }
          const sChar = this.simulation.characters.get(serverCharId);
          if (sChar && pkt.playerName && pkt.playerName !== sChar.name) {
            if (!/^Player(\s+\d+)?$/i.test(pkt.playerName.trim()) && !/^Controller\s+#\d+$/i.test(pkt.playerName.trim())) {
              sChar.name = pkt.playerName.trim();
              sChar.hasCustomName = true;
              charEntry.name = pkt.playerName.trim();
            }
          }
          this.simulation.queueInput(pkt);
          if (Array.isArray(data.reliableActions) && data.reliableActions.length > 0) {
            for (const act of data.reliableActions) {
              act.playerId = this.resolveActionPlayerId(client, act, serverCharId);
            }
            this.simulation.processReliableActions(data.reliableActions);
          }
          if (data.character) {
            data.character.id = serverCharId;
            if (sChar) {
              data.character.name = sChar.name;
              data.character.color = sChar.color;
            }
            this.simulation.syncCharacterFromPacket(data.character);
          }
          if (Array.isArray(data.objects) && data.objects.length > 0) {
            this.simulation.syncObjectsFromPacket(data.objects, serverCharId);
          }
          return;
        }
        if (data.type === "reliable_action" && data.action) {
          const localPlayerId = data.localPlayerId || "keyboard";
          const charEntry = client.characters.get(localPlayerId);
          const fallbackServerCharId = charEntry ? charEntry.serverCharId : data.serverCharId || clientId;
          const act = data.action;
          act.playerId = this.resolveActionPlayerId(client, act, fallbackServerCharId);
          this.simulation.processReliableActions([act]);
          return;
        }
        if (data.type === "rename_player") {
          if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
            const trimmed = data.name.trim();
            const localPlayerId = data.localPlayerId || "keyboard";
            let charEntry = client.characters.get(localPlayerId);
            if (!charEntry) {
              charEntry = client.characters.get("keyboard") || client.characters.values().next().value;
            }
            if (charEntry) {
              charEntry.name = trimmed;
              const sChar = this.simulation.characters.get(charEntry.serverCharId);
              if (sChar) sChar.name = trimmed;
            } else if (data.serverCharId) {
              const sChar = this.simulation.characters.get(data.serverCharId);
              if (sChar) sChar.name = trimmed;
            }
            this.broadcastSnapshot();
          }
          return;
        }
        if (data.type === "ping") {
          if (typeof data.clientTimestamp === "number") {
            client.lastPingMs = Math.max(1, Math.round(performance.now() - data.clientTimestamp));
          }
          ws.send(JSON.stringify({
            type: "pong",
            clientTimestamp: data.clientTimestamp,
            serverTick: this.simulation.currentTick
          }));
          return;
        }
      } catch (err) {
        console.warn(`[UniversalRoom] Error handling packet from ${clientId}:`, err);
      }
    });
    ws.on("close", () => {
      this.handleDisconnection(clientId);
    });
    ws.on("error", (err) => {
      console.warn(`[UniversalRoom] Socket error for ${clientId}:`, err.message);
      this.handleDisconnection(clientId);
    });
    ws.send(JSON.stringify({
      type: "room_welcome",
      clientId,
      playerNumber: primaryEntry.playerNumber,
      name: primaryEntry.name,
      color: primaryEntry.color
    }));
  }
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;
    const removedCharIds = [];
    for (const entry of client.characters.values()) {
      removedCharIds.push(entry.serverCharId);
      const char = this.simulation.characters.get(entry.serverCharId);
      if (char) {
        if (char.heldObject) {
          char.heldObject.isHeld = false;
          char.heldObject.heldBy = null;
          char.heldObject.wakeUp();
          char.heldObject = null;
        }
        char.cleanupBeforeRemoval();
        this.simulation.characters.delete(entry.serverCharId);
      }
      this.simulation.jitterBuffer.clear(entry.serverCharId);
      this.simulation.latestClockSync.delete(entry.serverCharId);
      this.simulation.clientAckedTicks.delete(entry.serverCharId);
    }
    this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    this.clients.delete(clientId);
    console.log(
      `🌐 [UniversalRoom] Client disconnected: ${clientId} (Remaining clients: ${this.clients.size}, removed characters: ${removedCharIds.join(", ")})`
    );
    if (this.clients.size === 0) {
      this.trashMapMemory();
    } else {
      const leftPayload = JSON.stringify({
        type: "player_left",
        clientId,
        removedCharIds,
        playerCount: this.simulation.characters.size
      });
      for (const other of this.clients.values()) {
        if (other.ws.readyState === WebSocket.OPEN) {
          try {
            other.ws.send(leftPayload);
          } catch (_) {
          }
        }
      }
      this.broadcastSnapshot();
    }
  }
};
__publicField(_UniversalRoomManager, "instance", null);
let UniversalRoomManager = _UniversalRoomManager;
export {
  UniversalRoomManager
};
