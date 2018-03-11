#!/bin/sh
emcc -O2 -s WASM=1 -o xjr.js xjr/main.c xjr/misc.c xjr/stack.c xjr/red_black_tree.c xjr/xjr-machine.c xjr/xjr-mempool.c xjr/xjr-node.c xjr/xjr-string-tree.c
#emcc -Os -s WASM=1 -s SIDE_MODULE=1 -o xjrs.wasm xjr/main.c xjr/misc.c xjr/stack.c xjr/red_black_tree.c xjr/xjr-machine.c xjr/xjr-mempool.c xjr/xjr-node.c xjr/xjr-string-tree.c