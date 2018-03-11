# libxjr
XMLish JSONish Ragel powered parser

LibXJR is a parsing library that can parse a mixture of XML-like and JSON-like notation. It does not adhere to either
standard directly, and so it cannot be strictly called either XML or JSON. The XML notation notably does not have any
of the standard complexities of XML. It is XML-like in appearance only and intentionally so.

It is implemented using a Ragel state machine definition with C code at state transitions. It creates a connected tree
of C structured nodes that can be navigated in a DOM like fashion.

The notation/syntax of XJR was created to make a concise easy to use syntax for defining HTML-like layout. It's
purpose is to create a layout language with many more standard interactive widgets than HTML contains, so that a full
interface definition can be created that does not need any custom JS code created.

This new layout language using XJR syntax is called Lumith Layout Language. It is the layout language meant to be
used with the Lumith ECM system. XJR syntax is turned into a recursive JSON structure capable of being parsed by
current browsers using LibJSA. JSA syntax is then passed into a modified DomCascade library for rendering into
usable widgets.

Portions of the XML-Bare C library have been utilized for the base tree used in the library.

A precompiled WebAssembly version of the library has been included in the wasm directory for convenience, along
with the shellscript/command used to generate it. The WebAssembly generated JS has been included in a prettified
format as well as a compressed form generated via uglifyjs.