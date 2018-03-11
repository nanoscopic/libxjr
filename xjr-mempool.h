// Copyright (C) 2018 David Helkowski

#ifndef __XJR_MEMPOOL_H
#define __XJR_MEMPOOL_H
typedef struct xjr_mempool_s xjr_mempool;
typedef struct xjr_mempage_s xjr_mempage;

struct xjr_mempage_s {
    xjr_mempage *next;
    void *data;
    int max;
    int pos;
};

struct xjr_mempool_s {
    xjr_mempage *first;
    xjr_mempage *last;
};

void *xjr_mempool__alloc( xjr_mempool *pool, int size );
xjr_mempage *xjr_mempage__new();
void xjr_mempool__delete( xjr_mempool *pool );
xjr_mempool *xjr_mempool__new();

#define xmalloc(pool,size) xjr_mempool__alloc(pool,size)

#endif