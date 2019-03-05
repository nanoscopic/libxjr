// Copyright (C) 2018 David Helkowski

#ifndef __XJR_TREE_H
#define __XJR_TREE_H
#include "xjr-string-tree.h"
#include "xjr-mempool.h"
#include<stdlib.h>
#include<stdio.h>

typedef struct xjr_node_s xjr_node;
struct xjr_node_s {
    xjr_node *parent;
    xjr_node *next;
    char *name;
    int namelen;
    char *val;
    int vallen;
    string_tree *children;
    xjr_node *firstChild;
    xjr_node *lastChild;
    uint16_t flags;
};

#define DT_DIRECT 0

// Chain of void * pointers
#define DT_VOIDCHAIN 1
typedef struct dt_voidChain_s dt_voidChain;
struct dt_voidChain_s {
    void *data;
    dt_voidChain *next;
};
dt_voidChain *dt_voidChain__new( void *data );
void dt_voidChain__delete( dt_voidChain *self );

// Array of void * pointers
#define DT_VOIDARRAY 2
typedef struct dt_voidArray_s dt_voidArray;
struct dt_voidArray_s {
    void **data;
    char cnt;// count of allocated data pointers
    char max;// max of data pointers
};

void xjr_node__addchild( xjr_node *self, char *name, int namelen, xjr_node *child );
void xjr_node__dump_rbentry( void *rbentry );
xjr_node *xjr_node__new( xjr_mempool *pool, char *name, int namelen, xjr_node *parent );
void xjr_node__delete( xjr_node *node );
void xjr_node__remove( xjr_node *node );
void xjr_node__removeall( xjr_node *self, char *name, int namelen );
void xjr_node__dump( xjr_node *self, int depth );
void xjr_node__add( xjr_node *current, xjr_node *new );
xjr_node *xjr_node__get( xjr_node *self, char *name, int namelen );
xjr_arr *xjr_node__getarr( xjr_node *self, char *name, int namelen );
char *xjr_node__value( xjr_node *self, int *len );
char *xjr_node__name( xjr_node *self, int *len );
xjr_node *xjr_node__parent( xjr_node *self );
xjr_node *xjr_node__next( xjr_node *self );
xjr_node *xjr_node__firstChild( xjr_node *self );
void xjr_node__delete_snode_data( void *rbentry );
void xjr_node__disable_mempool();

typedef struct xml_page_s xml_page;
struct xml_page_s {
    xml_page *next;
    char *xml;
    int pos;
    int len;
};
xml_page *xml_page__new( int len );
void xml_page__delete( xml_page *self );

struct xml_output_s {
    int pageSize;
    int pageCount;
    xml_page *firstPage;
    xml_page *curPage;
};
typedef struct xml_output_s xml_output;
xml_output *xml_output__new();
void xml_output__delete( xml_output *self );

xml_output *xjr_node__tree( xjr_node *root );
xml_output *xjr_node__xml( xjr_node *root );
xml_output *xjr_node__outerxml( xjr_node *root );
xml_output *xjr_node__jsa( xjr_node *root, char ws );
void xml_output__addchar( xml_output *output, char let );
void xml_output__print( xml_output *self );
char *xml_output__flatten( xml_output *self, int *len );
int xml_output__flat_length( xml_output *self );
void xml_output__flatten_preallocated( xml_output *self, char *output );

xjr_key_arr *xjr_node__getkeys( xjr_node *self );

#endif