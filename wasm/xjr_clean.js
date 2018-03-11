// Copyright (C) 2018 David Helkowski

function globalEval(x) {
    eval.call(null, x);
}

function assert(e, t) {
    e || abort("Assertion failed: " + t);
}

function getCFunc(ident) {
    var func = Module["_" + ident];
    if (!func) try {
        func = eval("_" + ident);
    } catch (e) {}
    return assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)"), func;
}

function setValue(e, t, n, r) {
    n = n || "i8", n.charAt(n.length - 1) === "*" && (n = "i32");
    switch (n) {
      case "i1":
        HEAP8[e >> 0] = t;
        break;
      case "i8":
        HEAP8[e >> 0] = t;
        break;
      case "i16":
        HEAP16[e >> 1] = t;
        break;
      case "i32":
        HEAP32[e >> 2] = t;
        break;
      case "i64":
        tempI64 = [ t >>> 0, (tempDouble = t, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], HEAP32[e >> 2] = tempI64[0], HEAP32[e + 4 >> 2] = tempI64[1];
        break;
      case "float":
        HEAPF32[e >> 2] = t;
        break;
      case "double":
        HEAPF64[e >> 3] = t;
        break;
      default:
        abort("invalid type for setValue: " + n);
    }
}

function getValue(e, t, n) {
    t = t || "i8", t.charAt(t.length - 1) === "*" && (t = "i32");
    switch (t) {
      case "i1":
        return HEAP8[e >> 0];
      case "i8":
        return HEAP8[e >> 0];
      case "i16":
        return HEAP16[e >> 1];
      case "i32":
        return HEAP32[e >> 2];
      case "i64":
        return HEAP32[e >> 2];
      case "float":
        return HEAPF32[e >> 2];
      case "double":
        return HEAPF64[e >> 3];
      default:
        abort("invalid type for setValue: " + t);
    }
    return null;
}

function allocate(e, t, n, r) {
    var i, s;
    typeof e == "number" ? (i = !0, s = e) : (i = !1, s = e.length);
    var o = typeof t == "string" ? t : null, u;
    n == ALLOC_NONE ? u = r : u = [ typeof _malloc == "function" ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc ][n === undefined ? ALLOC_STATIC : n](Math.max(s, o ? 1 : t.length));
    if (i) {
        var r = u, a;
        assert((u & 3) == 0), a = u + (s & -4);
        for (; r < a; r += 4) HEAP32[r >> 2] = 0;
        a = u + s;
        while (r < a) HEAP8[r++ >> 0] = 0;
        return u;
    }
    if (o === "i8") return e.subarray || e.slice ? HEAPU8.set(e, u) : HEAPU8.set(new Uint8Array(e), u), u;
    var f = 0, l, c, h;
    while (f < s) {
        var p = e[f];
        typeof p == "function" && (p = Runtime.getFunctionIndex(p)), l = o || t[f];
        if (l === 0) {
            f++;
            continue;
        }
        l == "i64" && (l = "i32"), setValue(u + f, p, l), h !== l && (c = Runtime.getNativeTypeSize(l), h = l), f += c;
    }
    return u;
}

function getMemory(e) {
    return staticSealed ? runtimeInitialized ? _malloc(e) : Runtime.dynamicAlloc(e) : Runtime.staticAlloc(e);
}

function Pointer_stringify(e, t) {
    if (t === 0 || !e) return "";
    var n = 0, r, i = 0;
    for (;;) {
        r = HEAPU8[e + i >> 0], n |= r;
        if (r == 0 && !t) break;
        i++;
        if (t && i == t) break;
    }
    t || (t = i);
    var s = "";
    if (n < 128) {
        var o = 1024, u;
        while (t > 0) u = String.fromCharCode.apply(String, HEAPU8.subarray(e, e + Math.min(t, o))), s = s ? s + u : u, e += o, t -= o;
        return s;
    }
    return Module.UTF8ToString(e);
}

function AsciiToString(e) {
    var t = "";
    for (;;) {
        var n = HEAP8[e++ >> 0];
        if (!n) return t;
        t += String.fromCharCode(n);
    }
}

function stringToAscii(e, t) {
    return writeAsciiToMemory(e, t, !1);
}

function UTF8ArrayToString(e, t) {
    var n = t;
    while (e[n]) ++n;
    if (n - t > 16 && e.subarray && UTF8Decoder) return UTF8Decoder.decode(e.subarray(t, n));
    var r, i, s, o, u, a, f = "";
    for (;;) {
        r = e[t++];
        if (!r) return f;
        if (!(r & 128)) {
            f += String.fromCharCode(r);
            continue;
        }
        i = e[t++] & 63;
        if ((r & 224) == 192) {
            f += String.fromCharCode((r & 31) << 6 | i);
            continue;
        }
        s = e[t++] & 63, (r & 240) == 224 ? r = (r & 15) << 12 | i << 6 | s : (o = e[t++] & 63, (r & 248) == 240 ? r = (r & 7) << 18 | i << 12 | s << 6 | o : (u = e[t++] & 63, (r & 252) == 248 ? r = (r & 3) << 24 | i << 18 | s << 12 | o << 6 | u : (a = e[t++] & 63, r = (r & 1) << 30 | i << 24 | s << 18 | o << 12 | u << 6 | a)));
        if (r < 65536) f += String.fromCharCode(r); else {
            var l = r - 65536;
            f += String.fromCharCode(55296 | l >> 10, 56320 | l & 1023);
        }
    }
}

function UTF8ToString(e) {
    return UTF8ArrayToString(HEAPU8, e);
}

function stringToUTF8Array(e, t, n, r) {
    if (r > 0) {
        var i = n, s = n + r - 1;
        for (var o = 0; o < e.length; ++o) {
            var u = e.charCodeAt(o);
            u >= 55296 && u <= 57343 && (u = 65536 + ((u & 1023) << 10) | e.charCodeAt(++o) & 1023);
            if (u <= 127) {
                if (n >= s) break;
                t[n++] = u;
            } else if (u <= 2047) {
                if (n + 1 >= s) break;
                t[n++] = 192 | u >> 6, t[n++] = 128 | u & 63;
            } else if (u <= 65535) {
                if (n + 2 >= s) break;
                t[n++] = 224 | u >> 12, t[n++] = 128 | u >> 6 & 63, t[n++] = 128 | u & 63;
            } else if (u <= 2097151) {
                if (n + 3 >= s) break;
                t[n++] = 240 | u >> 18, t[n++] = 128 | u >> 12 & 63, t[n++] = 128 | u >> 6 & 63, t[n++] = 128 | u & 63;
            } else if (u <= 67108863) {
                if (n + 4 >= s) break;
                t[n++] = 248 | u >> 24, t[n++] = 128 | u >> 18 & 63, t[n++] = 128 | u >> 12 & 63, t[n++] = 128 | u >> 6 & 63, t[n++] = 128 | u & 63;
            } else {
                if (n + 5 >= s) break;
                t[n++] = 252 | u >> 30, t[n++] = 128 | u >> 24 & 63, t[n++] = 128 | u >> 18 & 63, t[n++] = 128 | u >> 12 & 63, t[n++] = 128 | u >> 6 & 63, t[n++] = 128 | u & 63;
            }
        }
        return t[n] = 0, n - i;
    }
    return 0;
}

function stringToUTF8(e, t, n) {
    return stringToUTF8Array(e, HEAPU8, t, n);
}

function lengthBytesUTF8(e) {
    var t = 0;
    for (var n = 0; n < e.length; ++n) {
        var r = e.charCodeAt(n);
        r >= 55296 && r <= 57343 && (r = 65536 + ((r & 1023) << 10) | e.charCodeAt(++n) & 1023), r <= 127 ? ++t : r <= 2047 ? t += 2 : r <= 65535 ? t += 3 : r <= 2097151 ? t += 4 : r <= 67108863 ? t += 5 : t += 6;
    }
    return t;
}

function demangle(e) {
    var t = Module.___cxa_demangle || Module.__cxa_demangle;
    if (t) {
        try {
            var n = e.substr(1), r = lengthBytesUTF8(n) + 1, i = _malloc(r);
            stringToUTF8(n, i, r);
            var s = _malloc(4), o = t(i, 0, 0, s);
            if (getValue(s, "i32") === 0 && o) return Pointer_stringify(o);
        } catch (u) {} finally {
            i && _free(i), s && _free(s), o && _free(o);
        }
        return e;
    }
    return Runtime.warnOnce("warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling"), e;
}

function demangleAll(e) {
    var t = /__Z[\w\d_]+/g;
    return e.replace(t, function(e) {
        var t = demangle(e);
        return e === t ? e : e + " [" + t + "]";
    });
}

function jsStackTrace() {
    var e = new Error;
    if (!e.stack) {
        try {
            throw new Error(0);
        } catch (t) {
            e = t;
        }
        if (!e.stack) return "(no stack trace available)";
    }
    return e.stack.toString();
}

function stackTrace() {
    var e = jsStackTrace();
    return Module.extraStackTrace && (e += "\n" + Module.extraStackTrace()), demangleAll(e);
}

function alignUp(e, t) {
    return e % t > 0 && (e += t - e % t), e;
}

function updateGlobalBuffer(e) {
    Module.buffer = buffer = e;
}

function updateGlobalBufferViews() {
    Module.HEAP8 = HEAP8 = new Int8Array(buffer), Module.HEAP16 = HEAP16 = new Int16Array(buffer), Module.HEAP32 = HEAP32 = new Int32Array(buffer), Module.HEAPU8 = HEAPU8 = new Uint8Array(buffer), Module.HEAPU16 = HEAPU16 = new Uint16Array(buffer), Module.HEAPU32 = HEAPU32 = new Uint32Array(buffer), Module.HEAPF32 = HEAPF32 = new Float32Array(buffer), Module.HEAPF64 = HEAPF64 = new Float64Array(buffer);
}

function abortOnCannotGrowMemory() {
    abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ");
}

function enlargeMemory() {
    abortOnCannotGrowMemory();
}

function getTotalMemory() {
    return TOTAL_MEMORY;
}

function callRuntimeCallbacks(e) {
    while (e.length > 0) {
        var t = e.shift();
        if (typeof t == "function") {
            t();
            continue;
        }
        var n = t.func;
        typeof n == "number" ? t.arg === undefined ? Module.dynCall_v(n) : Module.dynCall_vi(n, t.arg) : n(t.arg === undefined ? null : t.arg);
    }
}

function preRun() {
    if (Module.preRun) {
        typeof Module["preRun"] == "function" && (Module.preRun = [ Module.preRun ]);
        while (Module.preRun.length) addOnPreRun(Module.preRun.shift());
    }
    callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
    if (runtimeInitialized) return;
    runtimeInitialized = !0, callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
    callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__), runtimeExited = !0;
}

function postRun() {
    if (Module.postRun) {
        typeof Module["postRun"] == "function" && (Module.postRun = [ Module.postRun ]);
        while (Module.postRun.length) addOnPostRun(Module.postRun.shift());
    }
    callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(e) {
    __ATPRERUN__.unshift(e);
}

function addOnInit(e) {
    __ATINIT__.unshift(e);
}

function addOnPreMain(e) {
    __ATMAIN__.unshift(e);
}

function addOnExit(e) {
    __ATEXIT__.unshift(e);
}

function addOnPostRun(e) {
    __ATPOSTRUN__.unshift(e);
}

function intArrayFromString(e, t, n) {
    var r = n > 0 ? n : lengthBytesUTF8(e) + 1, i = new Array(r), s = stringToUTF8Array(e, i, 0, i.length);
    return t && (i.length = s), i;
}

function intArrayToString(e) {
    var t = [];
    for (var n = 0; n < e.length; n++) {
        var r = e[n];
        r > 255 && (r &= 255), t.push(String.fromCharCode(r));
    }
    return t.join("");
}

function writeStringToMemory(e, t, n) {
    Runtime.warnOnce("writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!");
    var r, i;
    n && (i = t + lengthBytesUTF8(e), r = HEAP8[i]), stringToUTF8(e, t, Infinity), n && (HEAP8[i] = r);
}

function writeArrayToMemory(e, t) {
    HEAP8.set(e, t);
}

function writeAsciiToMemory(e, t, n) {
    for (var r = 0; r < e.length; ++r) HEAP8[t++ >> 0] = e.charCodeAt(r);
    n || (HEAP8[t >> 0] = 0);
}

function addRunDependency(e) {
    runDependencies++, Module.monitorRunDependencies && Module.monitorRunDependencies(runDependencies);
}

function removeRunDependency(e) {
    runDependencies--, Module.monitorRunDependencies && Module.monitorRunDependencies(runDependencies);
    if (runDependencies == 0) {
        runDependencyWatcher !== null && (clearInterval(runDependencyWatcher), runDependencyWatcher = null);
        if (dependenciesFulfilled) {
            var t = dependenciesFulfilled;
            dependenciesFulfilled = null, t();
        }
    }
}

function integrateWasmJS(Module) {
    function lookupImport(e, t) {
        var n = info;
        if (e.indexOf(".") < 0) n = (n || {})[e]; else {
            var r = e.split(".");
            n = (n || {})[r[0]], n = (n || {})[r[1]];
        }
        return t && (n = (n || {})[t]), n === undefined && abort("bad lookupImport to (" + e + ")." + t), n;
    }
    function mergeMemory(e) {
        var t = Module.buffer;
        e.byteLength < t.byteLength && Module.printErr("the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here");
        var n = new Int8Array(t), r = new Int8Array(e);
        memoryInitializer || n.set(r.subarray(Module.STATIC_BASE, Module.STATIC_BASE + Module.STATIC_BUMP), Module.STATIC_BASE), r.set(n), updateGlobalBuffer(e), updateGlobalBufferViews();
    }
    function fixImports(e) {
        return e;
    }
    function getBinary() {
        try {
            var e;
            if (Module.wasmBinary) e = Module.wasmBinary, e = new Uint8Array(e); else {
                if (!Module.readBinary) throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
                e = Module.readBinary(wasmBinaryFile);
            }
            return e;
        } catch (t) {
            abort(t);
        }
    }
    function getBinaryPromise() {
        return !Module.wasmBinary && typeof fetch == "function" ? fetch(wasmBinaryFile, {
            credentials: "same-origin"
        }).then(function(e) {
            if (!e.ok) throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
            return e.arrayBuffer();
        }) : new Promise(function(e, t) {
            e(getBinary());
        });
    }
    function doJustAsm(global, env, providedBuffer) {
        if (typeof Module.asm != "function" || Module.asm === methodHandler) Module.asmPreload ? Module.asm = Module.asmPreload : eval(Module.read(asmjsCodeFile));
        return typeof Module["asm"] != "function" ? (Module.printErr("asm evalling did not set the module properly"), !1) : Module.asm(global, env, providedBuffer);
    }
    function doNativeWasm(e, t, n) {
        function r(e) {
            exports = e.exports, exports.memory && mergeMemory(exports.memory), Module.asm = exports, Module.usingWasm = !0, removeRunDependency("wasm-instantiate");
        }
        if (typeof WebAssembly != "object") return Module.printErr("no native wasm support detected"), !1;
        if (Module.wasmMemory instanceof WebAssembly.Memory) {
            t.memory = Module.wasmMemory, info.global = {
                NaN: NaN,
                Infinity: Infinity
            }, info["global.Math"] = e.Math, info.env = t, addRunDependency("wasm-instantiate");
            if (Module.instantiateWasm) try {
                return Module.instantiateWasm(info, r);
            } catch (i) {
                return Module.printErr("Module.instantiateWasm callback failed with error: " + i), !1;
            }
            return getBinaryPromise().then(function(e) {
                return WebAssembly.instantiate(e, info);
            }).then(function(e) {
                r(e.instance);
            }).catch(function(e) {
                Module.printErr("failed to asynchronously prepare wasm: " + e), abort(e);
            }), {};
        }
        return Module.printErr("no native wasm Memory in use"), !1;
    }
    function doWasmPolyfill(e, t, n, r) {
        if (typeof WasmJS != "function") return Module.printErr("WasmJS not detected - polyfill not bundled?"), !1;
        var i = WasmJS({});
        i.outside = Module, i.info = info, i.lookupImport = lookupImport, assert(n === Module.buffer), info.global = e, info.env = t, assert(n === Module.buffer), t.memory = n, assert(t.memory instanceof ArrayBuffer), i.providedTotalMemory = Module.buffer.byteLength;
        var s;
        r === "interpret-binary" ? s = getBinary() : s = Module.read(r == "interpret-asm2wasm" ? asmjsCodeFile : wasmTextFile);
        var o;
        if (r == "interpret-asm2wasm") o = i._malloc(s.length + 1), i.writeAsciiToMemory(s, o), i._load_asm2wasm(o); else if (r === "interpret-s-expr") o = i._malloc(s.length + 1), i.writeAsciiToMemory(s, o), i._load_s_expr2wasm(o); else {
            if (r !== "interpret-binary") throw "what? " + r;
            o = i._malloc(s.length), i.HEAPU8.set(s, o), i._load_binary2wasm(o, s.length);
        }
        return i._free(o), i._instantiate(o), Module.newBuffer && (mergeMemory(Module.newBuffer), Module.newBuffer = null), exports = i.asmExports, exports;
    }
    var method = Module.wasmJSMethod || "native-wasm";
    Module.wasmJSMethod = method;
    var wasmTextFile = Module.wasmTextFile || "xjr.wast", wasmBinaryFile = Module.wasmBinaryFile || "xjr.wasm", asmjsCodeFile = Module.asmjsCodeFile || "xjr.temp.asm.js";
    typeof Module["locateFile"] == "function" && (wasmTextFile = Module.locateFile(wasmTextFile), wasmBinaryFile = Module.locateFile(wasmBinaryFile), asmjsCodeFile = Module.locateFile(asmjsCodeFile));
    var wasmPageSize = 65536, asm2wasmImports = {
        "f64-rem": function(e, t) {
            return e % t;
        },
        "f64-to-int": function(e) {
            return e | 0;
        },
        "i32s-div": function(e, t) {
            return (e | 0) / (t | 0) | 0;
        },
        "i32u-div": function(e, t) {
            return (e >>> 0) / (t >>> 0) >>> 0;
        },
        "i32s-rem": function(e, t) {
            return (e | 0) % (t | 0) | 0;
        },
        "i32u-rem": function(e, t) {
            return (e >>> 0) % (t >>> 0) >>> 0;
        },
        "debugger": function() {
            debugger;
        }
    }, info = {
        global: null,
        env: null,
        asm2wasm: asm2wasmImports,
        parent: Module
    }, exports = null, WasmTypes = {
        none: 0,
        i32: 1,
        i64: 2,
        f32: 3,
        f64: 4
    };
    Module.asmPreload = Module.asm;
    var asmjsReallocBuffer = Module.reallocBuffer, wasmReallocBuffer = function(e) {
        var t = Module.usingWasm ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
        e = alignUp(e, t);
        var n = Module.buffer, r = n.byteLength;
        if (!Module.usingWasm) return exports.__growWasmMemory((e - r) / wasmPageSize), Module.buffer !== n ? Module.buffer : null;
        try {
            var i = Module.wasmMemory.grow((e - r) / wasmPageSize);
            return i !== -1 ? Module.buffer = Module.wasmMemory.buffer : null;
        } catch (s) {
            return null;
        }
    };
    Module.reallocBuffer = function(e) {
        return finalMethod === "asmjs" ? asmjsReallocBuffer(e) : wasmReallocBuffer(e);
    };
    var finalMethod = "";
    Module.asm = function(e, t, n) {
        e = fixImports(e), t = fixImports(t);
        if (!t.table) {
            var r = Module.wasmTableSize;
            r === undefined && (r = 1024);
            var i = Module.wasmMaxTableSize;
            typeof WebAssembly == "object" && typeof WebAssembly.Table == "function" ? i !== undefined ? t.table = new WebAssembly.Table({
                initial: r,
                maximum: i,
                element: "anyfunc"
            }) : t.table = new WebAssembly.Table({
                initial: r,
                element: "anyfunc"
            }) : t.table = new Array(r), Module.wasmTable = t.table;
        }
        t.memoryBase || (t.memoryBase = Module.STATIC_BASE), t.tableBase || (t.tableBase = 0);
        var s, o = method.split(",");
        for (var u = 0; u < o.length; u++) {
            var a = o[u];
            finalMethod = a;
            if (a === "native-wasm") {
                if (s = doNativeWasm(e, t, n)) break;
            } else if (a === "asmjs") {
                if (s = doJustAsm(e, t, n)) break;
            } else if (a === "interpret-asm2wasm" || a === "interpret-s-expr" || a === "interpret-binary") {
                if (s = doWasmPolyfill(e, t, n, a)) break;
            } else abort("bad method: " + a);
        }
        if (!s) throw "no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods";
        return s;
    };
    var methodHandler = Module.asm;
}

function ___assert_fail(e, t, n, r) {
    throw ABORT = !0, "Assertion failed: " + Pointer_stringify(e) + ", at: " + [ t ? Pointer_stringify(t) : "unknown filename", n, r ? Pointer_stringify(r) : "unknown function" ] + " at " + stackTrace();
}

function ___setErrNo(e) {
    return Module.___errno_location && (HEAP32[Module.___errno_location() >> 2] = e), e;
}

function ___lock() {}

function _emscripten_memcpy_big(e, t, n) {
    return HEAPU8.set(HEAPU8.subarray(t, t + n), e), e;
}

function __exit(e) {
    Module.exit(e);
}

function _exit(e) {
    __exit(e);
}

function ___syscall140(e, t) {
    SYSCALLS.varargs = t;
    try {
        var n = SYSCALLS.getStreamFromFD(), r = SYSCALLS.get(), i = SYSCALLS.get(), s = SYSCALLS.get(), o = SYSCALLS.get(), u = i;
        return FS.llseek(n, u, o), HEAP32[s >> 2] = n.position, n.getdents && u === 0 && o === 0 && (n.getdents = null), 0;
    } catch (a) {
        return (typeof FS == "undefined" || !(a instanceof FS.ErrnoError)) && abort(a), -a.errno;
    }
}

function ___syscall146(e, t) {
    SYSCALLS.varargs = t;
    try {
        var n = SYSCALLS.get(), r = SYSCALLS.get(), i = SYSCALLS.get(), s = 0;
        ___syscall146.buffer || (___syscall146.buffers = [ null, [], [] ], ___syscall146.printChar = function(e, t) {
            var n = ___syscall146.buffers[e];
            assert(n), t === 0 || t === 10 ? ((e === 1 ? Module.print : Module.printErr)(UTF8ArrayToString(n, 0)), n.length = 0) : n.push(t);
        });
        for (var o = 0; o < i; o++) {
            var u = HEAP32[r + o * 8 >> 2], a = HEAP32[r + (o * 8 + 4) >> 2];
            for (var f = 0; f < a; f++) ___syscall146.printChar(n, HEAPU8[u + f]);
            s += a;
        }
        return s;
    } catch (l) {
        return (typeof FS == "undefined" || !(l instanceof FS.ErrnoError)) && abort(l), -l.errno;
    }
}

function ___syscall54(e, t) {
    SYSCALLS.varargs = t;
    try {
        return 0;
    } catch (n) {
        return (typeof FS == "undefined" || !(n instanceof FS.ErrnoError)) && abort(n), -n.errno;
    }
}

function ___unlock() {}

function ___syscall6(e, t) {
    SYSCALLS.varargs = t;
    try {
        var n = SYSCALLS.getStreamFromFD();
        return FS.close(n), 0;
    } catch (r) {
        return (typeof FS == "undefined" || !(r instanceof FS.ErrnoError)) && abort(r), -r.errno;
    }
}

function invoke_ii(e, t) {
    try {
        return Module.dynCall_ii(e, t);
    } catch (n) {
        if (typeof n != "number" && n !== "longjmp") throw n;
        Module.setThrew(1, 0);
    }
}

function invoke_iiii(e, t, n, r) {
    try {
        return Module.dynCall_iiii(e, t, n, r);
    } catch (i) {
        if (typeof i != "number" && i !== "longjmp") throw i;
        Module.setThrew(1, 0);
    }
}

function invoke_iii(e, t, n) {
    try {
        return Module.dynCall_iii(e, t, n);
    } catch (r) {
        if (typeof r != "number" && r !== "longjmp") throw r;
        Module.setThrew(1, 0);
    }
}

function invoke_vi(e, t) {
    try {
        Module.dynCall_vi(e, t);
    } catch (n) {
        if (typeof n != "number" && n !== "longjmp") throw n;
        Module.setThrew(1, 0);
    }
}

function ExitStatus(e) {
    this.name = "ExitStatus", this.message = "Program terminated with exit(" + e + ")", this.status = e;
}

function run(e) {
    function t() {
        if (Module.calledRun) return;
        Module.calledRun = !0;
        if (ABORT) return;
        ensureInitRuntime(), preMain(), Module.onRuntimeInitialized && Module.onRuntimeInitialized(), Module._main && shouldRunNow && Module.callMain(e), postRun();
    }
    e = e || Module.arguments, preloadStartTime === null && (preloadStartTime = Date.now());
    if (runDependencies > 0) return;
    preRun();
    if (runDependencies > 0) return;
    if (Module.calledRun) return;
    Module.setStatus ? (Module.setStatus("Running..."), setTimeout(function() {
        setTimeout(function() {
            Module.setStatus("");
        }, 1), t();
    }, 1)) : t();
}

function exit(e, t) {
    if (t && Module.noExitRuntime) return;
    Module.noExitRuntime || (ABORT = !0, EXITSTATUS = e, STACKTOP = initialStackTop, exitRuntime(), Module.onExit && Module.onExit(e)), ENVIRONMENT_IS_NODE && process.exit(e), Module.quit(e, new ExitStatus(e));
}

function abort(e) {
    Module.onAbort && Module.onAbort(e), e !== undefined ? (Module.print(e), Module.printErr(e), e = JSON.stringify(e)) : e = "", ABORT = !0, EXITSTATUS = 1;
    var t = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.", n = "abort(" + e + ") at " + stackTrace() + t;
    throw abortDecorators && abortDecorators.forEach(function(t) {
        n = t(n, e);
    }), n;
}

var Module;

Module || (Module = (typeof Module != "undefined" ? Module : null) || {});

var moduleOverrides = {};

for (var key in Module) Module.hasOwnProperty(key) && (moduleOverrides[key] = Module[key]);

var ENVIRONMENT_IS_WEB = !1, ENVIRONMENT_IS_WORKER = !1, ENVIRONMENT_IS_NODE = !1, ENVIRONMENT_IS_SHELL = !1;

if (Module.ENVIRONMENT) if (Module.ENVIRONMENT === "WEB") ENVIRONMENT_IS_WEB = !0; else if (Module.ENVIRONMENT === "WORKER") ENVIRONMENT_IS_WORKER = !0; else if (Module.ENVIRONMENT === "NODE") ENVIRONMENT_IS_NODE = !0; else {
    if (Module.ENVIRONMENT !== "SHELL") throw new Error("The provided Module['ENVIRONMENT'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.");
    ENVIRONMENT_IS_SHELL = !0;
} else ENVIRONMENT_IS_WEB = typeof window == "object", ENVIRONMENT_IS_WORKER = typeof importScripts == "function", ENVIRONMENT_IS_NODE = typeof process == "object" && typeof require == "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER, ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
    Module.print || (Module.print = console.log), Module.printErr || (Module.printErr = console.warn);
    var nodeFS, nodePath;
    Module.read = function(t, n) {
        nodeFS || (nodeFS = require("fs")), nodePath || (nodePath = require("path")), t = nodePath.normalize(t);
        var r = nodeFS.readFileSync(t);
        return n ? r : r.toString();
    }, Module.readBinary = function(t) {
        var n = Module.read(t, !0);
        return n.buffer || (n = new Uint8Array(n)), assert(n.buffer), n;
    }, Module.load = function(t) {
        globalEval(read(t));
    }, Module.thisProgram || (process.argv.length > 1 ? Module.thisProgram = process.argv[1].replace(/\\/g, "/") : Module.thisProgram = "unknown-program"), Module.arguments = process.argv.slice(2), typeof module != "undefined" && (module.exports = Module), process.on("uncaughtException", function(e) {
        if (!(e instanceof ExitStatus)) throw e;
    }), Module.inspect = function() {
        return "[Emscripten Module object]";
    };
} else if (ENVIRONMENT_IS_SHELL) Module.print || (Module.print = print), typeof printErr != "undefined" && (Module.printErr = printErr), typeof read != "undefined" ? Module.read = read : Module.read = function() {
    throw "no read() available";
}, Module.readBinary = function(t) {
    if (typeof readbuffer == "function") return new Uint8Array(readbuffer(t));
    var n = read(t, "binary");
    return assert(typeof n == "object"), n;
}, typeof scriptArgs != "undefined" ? Module.arguments = scriptArgs : typeof arguments != "undefined" && (Module.arguments = arguments), typeof quit == "function" && (Module.quit = function(e, t) {
    quit(e);
}); else {
    if (!ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER) throw "Unknown runtime environment. Where are we?";
    Module.read = function(t) {
        var n = new XMLHttpRequest;
        return n.open("GET", t, !1), n.send(null), n.responseText;
    }, ENVIRONMENT_IS_WORKER && (Module.readBinary = function(t) {
        var n = new XMLHttpRequest;
        return n.open("GET", t, !1), n.responseType = "arraybuffer", n.send(null), new Uint8Array(n.response);
    }), Module.readAsync = function(t, n, r) {
        var i = new XMLHttpRequest;
        i.open("GET", t, !0), i.responseType = "arraybuffer", i.onload = function() {
            i.status == 200 || i.status == 0 && i.response ? n(i.response) : r();
        }, i.onerror = r, i.send(null);
    }, typeof arguments != "undefined" && (Module.arguments = arguments);
    if (typeof console != "undefined") Module.print || (Module.print = function(t) {
        console.log(t);
    }), Module.printErr || (Module.printErr = function(t) {
        console.warn(t);
    }); else {
        var TRY_USE_DUMP = !1;
        Module.print || (Module.print = TRY_USE_DUMP && typeof dump != "undefined" ? function(e) {
            dump(e);
        } : function(e) {});
    }
    ENVIRONMENT_IS_WORKER && (Module.load = importScripts), typeof Module["setWindowTitle"] == "undefined" && (Module.setWindowTitle = function(e) {
        document.title = e;
    });
}

!Module.load && Module.read && (Module.load = function(t) {
    globalEval(Module.read(t));
}), Module.print || (Module.print = function() {}), Module.printErr || (Module.printErr = Module.print), Module.arguments || (Module.arguments = []), Module.thisProgram || (Module.thisProgram = "./this.program"), Module.quit || (Module.quit = function(e, t) {
    throw t;
}), Module.print = Module.print, Module.printErr = Module.printErr, Module.preRun = [], Module.postRun = [];

for (var key in moduleOverrides) moduleOverrides.hasOwnProperty(key) && (Module[key] = moduleOverrides[key]);

moduleOverrides = undefined;

var Runtime = {
    setTempRet0: function(e) {
        return tempRet0 = e, e;
    },
    getTempRet0: function() {
        return tempRet0;
    },
    stackSave: function() {
        return STACKTOP;
    },
    stackRestore: function(e) {
        STACKTOP = e;
    },
    getNativeTypeSize: function(e) {
        switch (e) {
          case "i1":
          case "i8":
            return 1;
          case "i16":
            return 2;
          case "i32":
            return 4;
          case "i64":
            return 8;
          case "float":
            return 4;
          case "double":
            return 8;
          default:
            if (e[e.length - 1] === "*") return Runtime.QUANTUM_SIZE;
            if (e[0] === "i") {
                var t = parseInt(e.substr(1));
                return assert(t % 8 === 0), t / 8;
            }
            return 0;
        }
    },
    getNativeFieldSize: function(e) {
        return Math.max(Runtime.getNativeTypeSize(e), Runtime.QUANTUM_SIZE);
    },
    STACK_ALIGN: 16,
    prepVararg: function(e, t) {
        return t === "double" || t === "i64" ? e & 7 && (assert((e & 7) === 4), e += 4) : assert((e & 3) === 0), e;
    },
    getAlignSize: function(e, t, n) {
        return !!n || e != "i64" && e != "double" ? e ? Math.min(t || (e ? Runtime.getNativeFieldSize(e) : 0), Runtime.QUANTUM_SIZE) : Math.min(t, 8) : 8;
    },
    dynCall: function(e, t, n) {
        return n && n.length ? Module["dynCall_" + e].apply(null, [ t ].concat(n)) : Module["dynCall_" + e].call(null, t);
    },
    functionPointers: [],
    addFunction: function(e) {
        for (var t = 0; t < Runtime.functionPointers.length; t++) if (!Runtime.functionPointers[t]) return Runtime.functionPointers[t] = e, 2 * (1 + t);
        throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.";
    },
    removeFunction: function(e) {
        Runtime.functionPointers[(e - 2) / 2] = null;
    },
    warnOnce: function(e) {
        Runtime.warnOnce.shown || (Runtime.warnOnce.shown = {}), Runtime.warnOnce.shown[e] || (Runtime.warnOnce.shown[e] = 1, Module.printErr(e));
    },
    funcWrappers: {},
    getFuncWrapper: function(e, t) {
        assert(t), Runtime.funcWrappers[t] || (Runtime.funcWrappers[t] = {});
        var n = Runtime.funcWrappers[t];
        return n[e] || (t.length === 1 ? n[e] = function() {
            return Runtime.dynCall(t, e);
        } : t.length === 2 ? n[e] = function(r) {
            return Runtime.dynCall(t, e, [ r ]);
        } : n[e] = function() {
            return Runtime.dynCall(t, e, Array.prototype.slice.call(arguments));
        }), n[e];
    },
    getCompilerSetting: function(e) {
        throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work";
    },
    stackAlloc: function(e) {
        var t = STACKTOP;
        return STACKTOP = STACKTOP + e | 0, STACKTOP = STACKTOP + 15 & -16, t;
    },
    staticAlloc: function(e) {
        var t = STATICTOP;
        return STATICTOP = STATICTOP + e | 0, STATICTOP = STATICTOP + 15 & -16, t;
    },
    dynamicAlloc: function(e) {
        var t = HEAP32[DYNAMICTOP_PTR >> 2], n = (t + e + 15 | 0) & -16;
        HEAP32[DYNAMICTOP_PTR >> 2] = n;
        if (n >= TOTAL_MEMORY) {
            var r = enlargeMemory();
            if (!r) return HEAP32[DYNAMICTOP_PTR >> 2] = t, 0;
        }
        return t;
    },
    alignMemory: function(e, t) {
        var n = e = Math.ceil(e / (t ? t : 16)) * (t ? t : 16);
        return n;
    },
    makeBigInt: function(e, t, n) {
        var r = n ? +(e >>> 0) + +(t >>> 0) * 4294967296 : +(e >>> 0) + +(t | 0) * 4294967296;
        return r;
    },
    GLOBAL_BASE: 1024,
    QUANTUM_SIZE: 4,
    __dummy__: 0
};

Module.Runtime = Runtime;

var ABORT = 0, EXITSTATUS = 0, cwrap, ccall;

(function() {
    function parseJSFunc(e) {
        var t = e.toString().match(sourceRegex).slice(1);
        return {
            arguments: t[0],
            body: t[1],
            returnValue: t[2]
        };
    }
    function ensureJSsource() {
        if (!JSsource) {
            JSsource = {};
            for (var e in JSfuncs) JSfuncs.hasOwnProperty(e) && (JSsource[e] = parseJSFunc(JSfuncs[e]));
        }
    }
    var JSfuncs = {
        stackSave: function() {
            Runtime.stackSave();
        },
        stackRestore: function() {
            Runtime.stackRestore();
        },
        arrayToC: function(e) {
            var t = Runtime.stackAlloc(e.length);
            return writeArrayToMemory(e, t), t;
        },
        stringToC: function(e) {
            var t = 0;
            if (e !== null && e !== undefined && e !== 0) {
                var n = (e.length << 2) + 1;
                t = Runtime.stackAlloc(n), stringToUTF8(e, t, n);
            }
            return t;
        }
    }, toC = {
        string: JSfuncs.stringToC,
        array: JSfuncs.arrayToC
    };
    ccall = function(t, n, r, i, s) {
        var o = getCFunc(t), u = [], a = 0;
        if (i) for (var f = 0; f < i.length; f++) {
            var l = toC[r[f]];
            l ? (a === 0 && (a = Runtime.stackSave()), u[f] = l(i[f])) : u[f] = i[f];
        }
        var c = o.apply(null, u);
        n === "string" && (c = Pointer_stringify(c));
        if (a !== 0) {
            if (s && s.async) {
                EmterpreterAsync.asyncFinalizers.push(function() {
                    Runtime.stackRestore(a);
                });
                return;
            }
            Runtime.stackRestore(a);
        }
        return c;
    };
    var sourceRegex = /^function\s*[a-zA-Z$_0-9]*\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/, JSsource = null;
    cwrap = function cwrap(ident, returnType, argTypes) {
        argTypes = argTypes || [];
        var cfunc = getCFunc(ident), numericArgs = argTypes.every(function(e) {
            return e === "number";
        }), numericRet = returnType !== "string";
        if (numericRet && numericArgs) return cfunc;
        var argNames = argTypes.map(function(e, t) {
            return "$" + t;
        }), funcstr = "(function(" + argNames.join(",") + ") {", nargs = argTypes.length;
        if (!numericArgs) {
            ensureJSsource(), funcstr += "var stack = " + JSsource.stackSave.body + ";";
            for (var i = 0; i < nargs; i++) {
                var arg = argNames[i], type = argTypes[i];
                if (type === "number") continue;
                var convertCode = JSsource[type + "ToC"];
                funcstr += "var " + convertCode.arguments + " = " + arg + ";", funcstr += convertCode.body + ";", funcstr += arg + "=(" + convertCode.returnValue + ");";
            }
        }
        var cfuncname = parseJSFunc(function() {
            return cfunc;
        }).returnValue;
        funcstr += "var ret = " + cfuncname + "(" + argNames.join(",") + ");";
        if (!numericRet) {
            var strgfy = parseJSFunc(function() {
                return Pointer_stringify;
            }).returnValue;
            funcstr += "ret = " + strgfy + "(ret);";
        }
        return numericArgs || (ensureJSsource(), funcstr += JSsource.stackRestore.body.replace("()", "(stack)") + ";"), funcstr += "return ret})", eval(funcstr);
    };
})(), Module.ccall = ccall, Module.cwrap = cwrap, Module.setValue = setValue, Module.getValue = getValue;

var ALLOC_NORMAL = 0, ALLOC_STACK = 1, ALLOC_STATIC = 2, ALLOC_DYNAMIC = 3, ALLOC_NONE = 4;

Module.ALLOC_NORMAL = ALLOC_NORMAL, Module.ALLOC_STACK = ALLOC_STACK, Module.ALLOC_STATIC = ALLOC_STATIC, Module.ALLOC_DYNAMIC = ALLOC_DYNAMIC, Module.ALLOC_NONE = ALLOC_NONE, Module.allocate = allocate, Module.getMemory = getMemory, Module.Pointer_stringify = Pointer_stringify, Module.AsciiToString = AsciiToString, Module.stringToAscii = stringToAscii;

var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;

Module.UTF8ArrayToString = UTF8ArrayToString, Module.UTF8ToString = UTF8ToString, Module.stringToUTF8Array = stringToUTF8Array, Module.stringToUTF8 = stringToUTF8, Module.lengthBytesUTF8 = lengthBytesUTF8;

var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : undefined;

Module.stackTrace = stackTrace;

var WASM_PAGE_SIZE = 65536, ASMJS_PAGE_SIZE = 16777216, HEAP, buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64, STATIC_BASE, STATICTOP, staticSealed, STACK_BASE, STACKTOP, STACK_MAX, DYNAMIC_BASE, DYNAMICTOP_PTR;

STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0, staticSealed = !1;

var TOTAL_STACK = Module.TOTAL_STACK || 5242880, TOTAL_MEMORY = Module.TOTAL_MEMORY || 16777216;

TOTAL_MEMORY < TOTAL_STACK && Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")"), Module.buffer ? buffer = Module.buffer : typeof WebAssembly == "object" && typeof WebAssembly.Memory == "function" ? (Module.wasmMemory = new WebAssembly.Memory({
    initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
    maximum: TOTAL_MEMORY / WASM_PAGE_SIZE
}), buffer = Module.wasmMemory.buffer) : buffer = new ArrayBuffer(TOTAL_MEMORY), updateGlobalBufferViews(), HEAP32[0] = 1668509029, HEAP16[1] = 25459;

if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99) throw "Runtime error: expected the system to be little-endian!";

Module.HEAP = HEAP, Module.buffer = buffer, Module.HEAP8 = HEAP8, Module.HEAP16 = HEAP16, Module.HEAP32 = HEAP32, Module.HEAPU8 = HEAPU8, Module.HEAPU16 = HEAPU16, Module.HEAPU32 = HEAPU32, Module.HEAPF32 = HEAPF32, Module.HEAPF64 = HEAPF64;

var __ATPRERUN__ = [], __ATINIT__ = [], __ATMAIN__ = [], __ATEXIT__ = [], __ATPOSTRUN__ = [], runtimeInitialized = !1, runtimeExited = !1;

Module.addOnPreRun = addOnPreRun, Module.addOnInit = addOnInit, Module.addOnPreMain = addOnPreMain, Module.addOnExit = addOnExit, Module.addOnPostRun = addOnPostRun, Module.intArrayFromString = intArrayFromString, Module.intArrayToString = intArrayToString, Module.writeStringToMemory = writeStringToMemory, Module.writeArrayToMemory = writeArrayToMemory, Module.writeAsciiToMemory = writeAsciiToMemory;

if (!Math.imul || Math.imul(4294967295, 5) !== -5) Math.imul = function(t, n) {
    var r = t >>> 16, i = t & 65535, s = n >>> 16, o = n & 65535;
    return i * o + (r * o + i * s << 16) | 0;
};

Math.imul = Math.imul;

if (!Math.fround) {
    var froundBuffer = new Float32Array(1);
    Math.fround = function(e) {
        return froundBuffer[0] = e, froundBuffer[0];
    };
}

Math.fround = Math.fround, Math.clz32 || (Math.clz32 = function(e) {
    e >>>= 0;
    for (var t = 0; t < 32; t++) if (e & 1 << 31 - t) return t;
    return 32;
}), Math.clz32 = Math.clz32, Math.trunc || (Math.trunc = function(e) {
    return e < 0 ? Math.ceil(e) : Math.floor(e);
}), Math.trunc = Math.trunc;

var Math_abs = Math.abs, Math_cos = Math.cos, Math_sin = Math.sin, Math_tan = Math.tan, Math_acos = Math.acos, Math_asin = Math.asin, Math_atan = Math.atan, Math_atan2 = Math.atan2, Math_exp = Math.exp, Math_log = Math.log, Math_sqrt = Math.sqrt, Math_ceil = Math.ceil, Math_floor = Math.floor, Math_pow = Math.pow, Math_imul = Math.imul, Math_fround = Math.fround, Math_round = Math.round, Math_min = Math.min, Math_clz32 = Math.clz32, Math_trunc = Math.trunc, runDependencies = 0, runDependencyWatcher = null, dependenciesFulfilled = null;

Module.addRunDependency = addRunDependency, Module.removeRunDependency = removeRunDependency, Module.preloadedImages = {}, Module.preloadedAudios = {};

var memoryInitializer = null;

integrateWasmJS(Module);

var ASM_CONSTS = [];

STATIC_BASE = Runtime.GLOBAL_BASE, STATICTOP = STATIC_BASE + 20864, __ATINIT__.push(), memoryInitializer = Module.wasmJSMethod.indexOf("asmjs") >= 0 || Module.wasmJSMethod.indexOf("interpret-asm2wasm") >= 0 ? "xjr.js.mem" : null;

var STATIC_BUMP = 20864;

Module.STATIC_BASE = STATIC_BASE, Module.STATIC_BUMP = STATIC_BUMP;

var tempDoublePtr = STATICTOP;

STATICTOP += 16, Module._sbrk = _sbrk, Module._memset = _memset, Module._memcpy = _memcpy, Module._llvm_bswap_i32 = _llvm_bswap_i32;

var SYSCALLS = {
    varargs: 0,
    get: function(e) {
        SYSCALLS.varargs += 4;
        var t = HEAP32[SYSCALLS.varargs - 4 >> 2];
        return t;
    },
    getStr: function() {
        var e = Pointer_stringify(SYSCALLS.get());
        return e;
    },
    get64: function() {
        var e = SYSCALLS.get(), t = SYSCALLS.get();
        return e >= 0 ? assert(t === 0) : assert(t === -1), e;
    },
    getZero: function() {
        assert(SYSCALLS.get() === 0);
    }
};

__ATEXIT__.push(function() {
    var e = Module._fflush;
    e && e(0);
    var t = ___syscall146.printChar;
    if (!t) return;
    var n = ___syscall146.buffers;
    n[1].length && t(1, 10), n[2].length && t(2, 10);
}), DYNAMICTOP_PTR = allocate(1, "i32", ALLOC_STATIC), STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP), STACK_MAX = STACK_BASE + TOTAL_STACK, DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX), HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE, staticSealed = !0, Module.wasmTableSize = 20, Module.wasmMaxTableSize = 20, Module.asmGlobalArg = {
    Math: Math,
    Int8Array: Int8Array,
    Int16Array: Int16Array,
    Int32Array: Int32Array,
    Uint8Array: Uint8Array,
    Uint16Array: Uint16Array,
    Uint32Array: Uint32Array,
    Float32Array: Float32Array,
    Float64Array: Float64Array,
    NaN: NaN,
    Infinity: Infinity
}, Module.asmLibraryArg = {
    abort: abort,
    assert: assert,
    enlargeMemory: enlargeMemory,
    getTotalMemory: getTotalMemory,
    abortOnCannotGrowMemory: abortOnCannotGrowMemory,
    invoke_ii: invoke_ii,
    invoke_iiii: invoke_iiii,
    invoke_iii: invoke_iii,
    invoke_vi: invoke_vi,
    ___assert_fail: ___assert_fail,
    ___lock: ___lock,
    ___syscall6: ___syscall6,
    ___setErrNo: ___setErrNo,
    ___syscall140: ___syscall140,
    _emscripten_memcpy_big: _emscripten_memcpy_big,
    ___syscall54: ___syscall54,
    ___unlock: ___unlock,
    _exit: _exit,
    __exit: __exit,
    ___syscall146: ___syscall146,
    DYNAMICTOP_PTR: DYNAMICTOP_PTR,
    tempDoublePtr: tempDoublePtr,
    ABORT: ABORT,
    STACKTOP: STACKTOP,
    STACK_MAX: STACK_MAX
};

var asm = Module.asm(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

Module.asm = asm;

var _malloc = Module._malloc = function() {
    return Module.asm._malloc.apply(null, arguments);
}, getTempRet0 = Module.getTempRet0 = function() {
    return Module.asm.getTempRet0.apply(null, arguments);
}, _fflush = Module._fflush = function() {
    return Module.asm._fflush.apply(null, arguments);
}, _main = Module._main = function() {
    return Module.asm._main.apply(null, arguments);
}, setTempRet0 = Module.setTempRet0 = function() {
    return Module.asm.setTempRet0.apply(null, arguments);
}, establishStackSpace = Module.establishStackSpace = function() {
    return Module.asm.establishStackSpace.apply(null, arguments);
}, stackSave = Module.stackSave = function() {
    return Module.asm.stackSave.apply(null, arguments);
}, _memset = Module._memset = function() {
    return Module.asm._memset.apply(null, arguments);
}, _sbrk = Module._sbrk = function() {
    return Module.asm._sbrk.apply(null, arguments);
}, _emscripten_get_global_libc = Module._emscripten_get_global_libc = function() {
    return Module.asm._emscripten_get_global_libc.apply(null, arguments);
}, _memcpy = Module._memcpy = function() {
    return Module.asm._memcpy.apply(null, arguments);
}, ___errno_location = Module.___errno_location = function() {
    return Module.asm.___errno_location.apply(null, arguments);
}, setThrew = Module.setThrew = function() {
    return Module.asm.setThrew.apply(null, arguments);
}, _free = Module._free = function() {
    return Module.asm._free.apply(null, arguments);
}, stackAlloc = Module.stackAlloc = function() {
    return Module.asm.stackAlloc.apply(null, arguments);
}, stackRestore = Module.stackRestore = function() {
    return Module.asm.stackRestore.apply(null, arguments);
}, _llvm_bswap_i32 = Module._llvm_bswap_i32 = function() {
    return Module.asm._llvm_bswap_i32.apply(null, arguments);
}, runPostSets = Module.runPostSets = function() {
    return Module.asm.runPostSets.apply(null, arguments);
}, dynCall_ii = Module.dynCall_ii = function() {
    return Module.asm.dynCall_ii.apply(null, arguments);
}, dynCall_iiii = Module.dynCall_iiii = function() {
    return Module.asm.dynCall_iiii.apply(null, arguments);
}, dynCall_iii = Module.dynCall_iii = function() {
    return Module.asm.dynCall_iii.apply(null, arguments);
}, dynCall_vi = Module.dynCall_vi = function() {
    return Module.asm.dynCall_vi.apply(null, arguments);
};

Runtime.stackAlloc = Module.stackAlloc, Runtime.stackSave = Module.stackSave, Runtime.stackRestore = Module.stackRestore, Runtime.establishStackSpace = Module.establishStackSpace, Runtime.setTempRet0 = Module.setTempRet0, Runtime.getTempRet0 = Module.getTempRet0, Module.asm = asm;

if (memoryInitializer) {
    typeof Module["locateFile"] == "function" ? memoryInitializer = Module.locateFile(memoryInitializer) : Module.memoryInitializerPrefixURL && (memoryInitializer = Module.memoryInitializerPrefixURL + memoryInitializer);
    if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
        var data = Module.readBinary(memoryInitializer);
        HEAPU8.set(data, Runtime.GLOBAL_BASE);
    } else {
        addRunDependency("memory initializer");
        var applyMemoryInitializer = function(e) {
            e.byteLength && (e = new Uint8Array(e)), HEAPU8.set(e, Runtime.GLOBAL_BASE), Module.memoryInitializerRequest && delete Module.memoryInitializerRequest.response, removeRunDependency("memory initializer");
        };
        function doBrowserLoad() {
            Module.readAsync(memoryInitializer, applyMemoryInitializer, function() {
                throw "could not load memory initializer " + memoryInitializer;
            });
        }
        if (Module.memoryInitializerRequest) {
            function useRequest() {
                var e = Module.memoryInitializerRequest;
                if (e.status !== 200 && e.status !== 0) {
                    console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " + e.status + ", retrying " + memoryInitializer), doBrowserLoad();
                    return;
                }
                applyMemoryInitializer(e.response);
            }
            Module.memoryInitializerRequest.response ? setTimeout(useRequest, 0) : Module.memoryInitializerRequest.addEventListener("load", useRequest);
        } else doBrowserLoad();
    }
}

ExitStatus.prototype = new Error, ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop, preloadStartTime = null, calledMain = !1;

dependenciesFulfilled = function runCaller() {
    Module.calledRun || run(), Module.calledRun || (dependenciesFulfilled = runCaller);
}, Module.callMain = Module.callMain = function(t) {
    function r() {
        for (var e = 0; e < 3; e++) i.push(0);
    }
    t = t || [], ensureInitRuntime();
    var n = t.length + 1, i = [ allocate(intArrayFromString(Module.thisProgram), "i8", ALLOC_NORMAL) ];
    r();
    for (var s = 0; s < n - 1; s += 1) i.push(allocate(intArrayFromString(t[s]), "i8", ALLOC_NORMAL)), r();
    i.push(0), i = allocate(i, "i32", ALLOC_NORMAL);
    try {
        var o = Module._main(n, i, 0);
        exit(o, !0);
    } catch (u) {
        if (u instanceof ExitStatus) return;
        if (u == "SimulateInfiniteLoop") {
            Module.noExitRuntime = !0;
            return;
        }
        var a = u;
        u && typeof u == "object" && u.stack && (a = [ u, u.stack ]), Module.printErr("exception thrown: " + a), Module.quit(1, u);
    } finally {
        calledMain = !0;
    }
}, Module.run = Module.run = run, Module.exit = Module.exit = exit;

var abortDecorators = [];

Module.abort = Module.abort = abort;

if (Module.preInit) {
    typeof Module["preInit"] == "function" && (Module.preInit = [ Module.preInit ]);
    while (Module.preInit.length > 0) Module.preInit.pop()();
}

var shouldRunNow = !0;

Module.noInitialRun && (shouldRunNow = !1), run();