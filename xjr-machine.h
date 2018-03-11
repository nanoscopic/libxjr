// Copyright (C) 2018 David Helkowski

#ifndef __MACHINE_H
#define __MACHINE_H
#include "xjr-node.h"

void *parse_full( xjr_mempool *pool, char *input, int len, xjr_node *root, int *endpos, int returnToRoot, int mixedMode );
void *parse_onto( xjr_mempool *pool, char *input, int len, xjr_node *root );
xjr_node *parse( xjr_mempool *pool, char *input, int len );

#define FLAG_FLAG 0x01
#define FLAG_TYPED 0x02
#define FLAG_ATT 0x04
#define FLAG_DONE 0x10
#define FLAG_JARRAY 0x100
#define FLAG_JHASH 0x200
#define FLAG_ISROOT 0x20
#define FLAG_DYNNAME 0x40
#define FLAG_DYNVAL 0x80
#define FLAG_CONTENTS 0x08

#endif