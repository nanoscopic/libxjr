#ifndef __XJR_HELPERS_H
#define __XJR_HELPERS_H
#include "xjr-mempool.h"
#include "xjr-node.h"
xjr_node *parse_file( xjr_mempool *pool, char *filename, char **bufferPtr );
char *xjr_node__get_valuez( xjr_node *self, char *name, int nameLen );
#endif