// Copyright (C) 2018 David Helkowski

#include"xjr-mempool.h"
#include<stdlib.h>

void *xjr_mempool__alloc( xjr_mempool *pool, int size ) {
    if( !pool ) { return calloc( size, 1 ); }
    xjr_mempage *page = pool->last;
    if( size > (page->max-page->pos) ) {
        xjr_mempage *newpage = xjr_mempage__new();
        page->next = newpage;
        pool->last = newpage;
        page = newpage;
    }
    void *res = page->data+page->pos;
    page->pos += size;
    return res;
}

xjr_mempage *xjr_mempage__new() {
    xjr_mempage *res = calloc( sizeof( xjr_mempage ), 1 );
    res->data = calloc( 30000, 1 );
    res->max = 30000;
    //res->pos = 0;
    //res->next = NULL;
    return res;
}

void xjr_mempool__delete( xjr_mempool *pool ) {
    xjr_mempage *curpage = pool->first;
    while( curpage ) {
        xjr_mempage *next = curpage->next;
        free( curpage->data );
        free( curpage );
        curpage = next;
    }
    free( pool );
}

xjr_mempool *xjr_mempool__new() {
    xjr_mempool *self = malloc( sizeof( xjr_mempool ) );
    xjr_mempage *page = xjr_mempage__new();
    self->first = self->last = page;
    return self;
}