AM_CFLAGS = -g -O3
lib_LTLIBRARIES = libxjr.la
libxjr_la_SOURCES = xjr-machine.c red_black_tree.c xjr-string-tree.c stack.c misc.c xjr-node.c red_black_tree.h stack.h misc.h xjr-mempool.c
include_HEADERS = xjr-string-tree.h xjr-node.h xjr-machine.h xjr-mempool.h
ACLOCAL_AMFLAGS = -I m4
dist_noinst_SCRIPTS = autogen.sh
pkgconfig_DATA = libxjr.pc
EXTRA_DIST = machine.rl


xjr-machine.c: xjr-machine.rl
	ragel xjr-machine.rl -G2
	
CLEANFILES = xjr-machine.c