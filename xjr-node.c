// Copyright (C) 2018 David Helkowski

#include"xjr-node.h"
#include"xjr-machine.h"
#include"red_black_tree.h"
#include"xjr-mempool.h"
#include<assert.h>
#include<stdlib.h>
#include<string.h>

#define DEBUG

#ifdef DEBUG
#include<stdio.h>
#endif

int use_mempool = 1;

void xjr_node__disable_mempool() {
    use_mempool = 0;
}

xjr_node *xjr_node__new( xjr_mempool *pool, char *name, int namelen, xjr_node *parent ) {
    xjr_node *self = ( xjr_node * ) xmalloc( pool, sizeof( xjr_node ) );//calloc( 1, sizeof( xjr_node ) );
    self->name = name;
    self->namelen = namelen;
    //self->children = NULL;
    self->parent = parent;
    //self->flags = 0x00;
    //self->firstChild = NULL;
    //self->next = NULL;
    //self->val = NULL;
    //self->vallen = 0;
    if( parent ) xjr_node__addchild( parent, name, namelen, self );
    return self;
}

void xjr_node__delete( xjr_node *self ) {
    if( self->children ) {
        // Wipe the ordered node chain along with the xjr nodes themselves
        xjr_node *curChild = self->firstChild;
        while( curChild ) {
            xjr_node *nextChild = curChild->next;
            xjr_node__delete( curChild );
            curChild = nextChild;
        }
        
        // snodes are deleted automatically, but snode data is not
        TreeForEach( self->children->tree, xjr_node__delete_snode_data, NULL );
        
        string_tree__delete( self->children );
    }
    if( !use_mempool ) free( self );
}

void xjr_node__delete_snode_data( void *nodeV ) {
    //snode__delete( node );
    snode *node = ( snode * ) nodeV;
    while( node ) {
        //xjr_node__dump( (xjr_node*) node->data, 0 );
        char dataType = node->dataType;
        void *data = node->data;
        if( dataType == DT_VOIDCHAIN ) {
            dt_voidChain *cNode = ( dt_voidChain * ) data;
            dt_voidChain *next;
            while( cNode ) {
                next = cNode->next;
                dt_voidChain__delete( cNode );
                cNode = next;
            }
        }
        else if( dataType == DT_VOIDARRAY ) {
        }
        node = node->next;
    }
}

void xjr_node__remove( xjr_node *node ) {
    // Delete from the linked list of nodes parsed in order
    xjr_node *parent = node->parent;
    
    xjr_node *next;
    xjr_node *prev = NULL;
    xjr_node *curChild = parent->firstChild;
    while( curChild ) {
        next = curChild->next;
        if( curChild == node ) {
            if( prev ) { // deleting middle or last
                prev->next = next;
                if( !next ) { // deleting last
                    parent->lastChild = prev;
                }
            }
            else {
                parent->firstChild = next;
                if( !next ) { // deleting last without a previous
                    parent->lastChild = NULL;
                }
            }
            break;
        }
        prev = curChild;
        curChild = next;
    }
    // Delete the node from the string tree
    //string_tree__delkey_len( node->children, node->name, node->namelen );
    int dataType;
    void *data;
    //void *data = string_tree__get_len( node->children, node->name, node->namelen, &dataType );
    snode *snode = string_tree__rawget_len( node->children, node->name, node->namelen );
    dataType = snode->dataType;
    data = snode->data;
    if( dataType == DT_VOIDCHAIN ) {
        dt_voidChain *head = ( dt_voidChain * ) data;
        dt_voidChain *next;
        dt_voidChain *prev = NULL;
        dt_voidChain *curNode = head;
        while( curNode ) {
            next = curNode->next;
            if( curNode->data == node ) {
                dt_voidChain__delete( curNode );
                if( prev ) { // we are not at the head; just set prev to be equal to next
                    prev->next = next;
                }
                else { // we are the head; fixup the item pointed to by the snode
                    head = next ? next : NULL;
                }
                break;
            }
            prev = curNode;
            curNode = next;
        }
        snode->data = head;
    }
    else if( dataType == DT_VOIDARRAY ) {
    }
    
    // Delete the node itself
    xjr_node__delete( node );
}

void xjr_node__removeall( xjr_node *self, char *name, int namelen ) {
    if( self->children ) {
        // ******** Delete the item from the xjr_node chain ***********
        
        // Loop through nodes fixing up the linked list of nodes
        xjr_node *prev = NULL;
        xjr_node *curChild = self->firstChild;
        while( curChild ) {
            xjr_node *nextChild = curChild->next;
            if( curChild->namelen == namelen && !memcmp( curChild->name, name, namelen ) ) {
                #ifdef DEBUG
                printf("Found a child; deleting\n");
                #endif
                xjr_node__delete( curChild );
            }
            else {
                if( prev ) prev->next = curChild;
                else self->firstChild = curChild;
                prev = curChild;
            }
            curChild = nextChild;
        }
        if( prev ) {
            prev->next = NULL;
            self->lastChild = prev;
        }
        else {
            self->firstChild = NULL;
            self->lastChild = NULL;
        }
        
        // destroy the data nodes
        snode *snode = string_tree__rawget_len( self->children, name, namelen );
        char dataType = snode->dataType;
        void *data = snode->data;
        if( dataType == DT_VOIDCHAIN ) {
            dt_voidChain *curNode = ( dt_voidChain * ) data;
            dt_voidChain *next;
            while( curNode ) {
                next = curNode->next;
                dt_voidChain__delete( curNode );
                curNode = next;
            }
        }
        else if( dataType == DT_VOIDARRAY ) {
        }
        
        if( self->firstChild ) { // There are children remaining; selectively delete the ones we destroyed
            #ifdef DEBUG
            printf("Children remaining; selectively pruning\n");
            #endif
            // Delete the stuff from the string tree
            // The actual xjr_node nodes may be deleted already, but the snodes within the string tree still exist
            string_tree__delkey_len( self->children, name, namelen );
        }
        else { // There are no more children; wipe out the children tree entirely
            #ifdef DEBUG
            printf("Children all removed; deleting children tree\n");
            #endif
            string_tree__delete( self->children );
            self->children = NULL;
        }
    }
}

void xjr_node__addchild( xjr_node *self, char *name, int namelen, xjr_node *child ) {
    if( !self->children ) {
        self->children = string_tree__new();
        self->firstChild = self->lastChild = child;
    }
    else {
        self->lastChild->next = child;
        self->lastChild = child;
    }
    snode *snode = string_tree__rawget_len( self->children, name, namelen );
    if( !snode ) {
        dt_voidChain *chain = dt_voidChain__new( child );
        string_tree__store_len( self->children, name, namelen, chain, DT_VOIDCHAIN );
    }
    else {
        char dataType = snode->dataType;
        void *data = snode->data;
        if( dataType == DT_VOIDCHAIN ) {
            dt_voidChain *cNode = ( dt_voidChain * ) data;
            while( cNode->next ) {
                cNode = cNode->next;
            }
            dt_voidChain *newNode = dt_voidChain__new( child );
            cNode->next = newNode;
        }
        else if( dataType == DT_VOIDARRAY ) {
        }
    }
}
xjr_node *xjr_node__get( xjr_node *self, char *name, int namelen ) {
    if( !self->children ) return NULL;
    char dataType;
    void *data = string_tree__get_len( self->children, name, namelen, &dataType );
    if( !data ) return NULL;
    
    if( dataType == DT_VOIDCHAIN ) {
        dt_voidChain *cNode = ( dt_voidChain * ) data;
        return (xjr_node *) cNode->data;
    }
    else if( dataType == DT_VOIDARRAY ) {
    }
	return NULL;
}
char *xjr_node__value( xjr_node *self, int *len ) {
    *len = self->vallen;
    return self->val;
}
char *xjr_node__name( xjr_node *self, int *len ) {
    *len = self->namelen;
    return self->name;
}
xjr_node *xjr_node__parent( xjr_node *self ) {
    return self->parent;
}
xjr_node *xjr_node__next( xjr_node *self ) {
    return self->next;
}
xjr_node *xjr_node__firstChild( xjr_node *self ) {
    return self->firstChild;
}
xjr_arr *xjr_node__getarr( xjr_node *self, char *name, int namelen ) {
    if( !self->children ) return NULL;
    char dataType = 0;
    void *data = string_tree__get_len( self->children, name, namelen, &dataType );
    if( dataType == DT_VOIDCHAIN ) {
        dt_voidChain *cNode = ( dt_voidChain * ) data;
        
        xjr_arr *arr = xjr_arr__new();
        while( cNode ) {
            arr->items[ arr->count++ ] = cNode->data;
            if( arr->count >= arr->max ) xjr_arr__double( arr );
            cNode = cNode->next;
        }
        
        return arr;
    }
    else if( dataType == DT_VOIDARRAY ) {
    }
    return NULL;
	//return string_tree__getarr_len( self->children, name, namelen );
}

/*char isspace( char *val, int vallen ) {
    for( int i=0;i<vallen;i++ ) {
        char let = val[i];
        if( let != ' ' && let != '\n' ) return 0;
    }
    return 1;
}*/
int stripSpaces( char *val, int vallen, int *start, int *end ) {
    // find start
    *start = 0;
    for( ;*start<vallen;(*start)++ ) {
        char let = val[*start];
        if( let != ' ' && let != '\n' ) break;
    }
    if( *start == vallen ) {
        return 0;
    }
    // find end
    *end = vallen - 1;
    for( ;*end>=0;(*end)-- ) {
        char let = val[*end];
        if( let != ' ' && let != '\n' ) break;
    }
    
    return 1;
}
int needsCdata( char *val, int vallen ) {
    char map[255];
    for( int i=0;i<255;i++ ) {
        map[i] = 0x00;
    }
    map['<'] = 0x01;
    map['{'] = 0x01;
    char *ptr = val;
    for( int j=0;j<vallen;j++,ptr++ ) {
        if( map[ *ptr ] ) return 1;
    }
    return 0;
}
void xjr_node__dump( xjr_node *self, int depth ) {
    for( int i=0;i<depth;i++ ) { printf("  "); }
    int start;
    int end;
    if( self->val && stripSpaces( self->val, self->vallen, &start, &end ) ) {
        fprintf( stderr, "%.*s:%.*s\n", self->namelen, self->name, (end-start+1), &self->val[start] );
    }
    else {
        fprintf( stderr, "%.*s\n", self->namelen, self->name );
    }
    if( self->children ) {
        xjr_node *curChild = self->firstChild;
        while( curChild ) {
            xjr_node__dump( curChild, depth + 1 );
            curChild = curChild->next;
        }
        //string_tree__dump( self->children );
        //TreeForEach( self->children->tree, xjr_node__dump_rbentry, NULL );
    }
}

void xjr_node__xml_rec( xjr_node *self, int depth, xml_output *output );

xml_page *xml_page__new( int len ) {
    xml_page *self = ( xml_page * ) calloc( 1, sizeof( xml_page ) );
    self->len = len;
    self->xml = ( char * ) calloc( 1, len );
    return self;
}
void xml_page__delete( xml_page *self ) {
    if( self->xml ) free( self->xml );
    free( self );
}
int xml_page__addspaces( xml_page *page, int len ) {
    assert( page != NULL );
    
    if( len > ( page->len - page->pos ) ) return 0;
    int pos = page->pos;
    for( int i=0;i<len;i++ ) { page->xml[pos+i] = ' '; }
    page->pos += len;
    return 1;
}
void xml_output__addspaces( xml_output *output, int len ) {
    assert( output != NULL );
    
    if( !xml_page__addspaces( output->curPage, len ) ) {
        xml_page *newPage = xml_page__new( output->pageSize );
        output->curPage->next = newPage;
        output->curPage = newPage;
        xml_page__addspaces( newPage, len );
    }
}
int xml_page__addstr( xml_page *self, char *str, int len ) {
    assert( self != NULL );
    if( len > ( self->len - self->pos ) ) return 0;
    memcpy( &self->xml[self->pos], str, len );
    self->pos += len;
    return 1;
}
void xml_output__addstr( xml_output *output, char *str, int len ) {
    if( !xml_page__addstr( output->curPage, str, len ) ) {
        xml_page *newPage = xml_page__new( output->pageSize );
        output->curPage->next = newPage;
        output->curPage = newPage;
        xml_page__addstr( newPage, str, len );
    }
}
char *backtick_escape( char *str, int len, int *lenout ) {
    char *esc = malloc( len*2+1 );
    int offset = 0;
    for( int i=0;i<len;i++ ) {
        char let = str[i];
        if( let == '`' || let == '\\' ) {
            esc[i+offset] = '\\';
            esc[i+offset+1] = let;
            offset++;
            continue;
        }
        esc[i+offset] = let;
    }
    *lenout = len + offset;
    esc[ *lenout ] = 0x00; // not really needed
    return esc;
}
char *jsa_escape( char *str, int len, int *lenout ) {
    char *esc = malloc( len*2+1 );
    int offset = 0;
    for( int i=0;i<len;i++ ) {
        char let = str[i];
        if( let == '\'' || let == '\"' || let == '\\' ) {
            esc[i+offset] = '\\';
            esc[i+offset+1] = let;
            offset++;
            continue;
        }
        if( let == '\n' ) {
            esc[i+offset] = '\\';
            esc[i+offset+1] = 'n';
            offset++;
            continue;
        }
        esc[i+offset] = let;
    }
    *lenout = len + offset;
    esc[ *lenout ] = 0x00; // not really needed
    return esc;
}

void xml_output__attval( xml_output *output, char *str, int len ) {
    char hasSq = 0;
    char hasDq = 0;
    char hasSlash = 0;
    char hasTick = 0;
    for( int i=0;i<len;i++ ) {
        char let = str[i];
        if( let == '\'' ) { hasSq = 1; continue; }
        if( let == '"'  ) { hasDq = 1; continue; }
        if( let == '\\' ) { hasSlash = 1; continue; }
        if( let == '`'  ) { hasTick = 1; continue; }
    }
    if( !hasSq && !hasDq ) {
        xml_output__addchar( output, '"' );
        xml_output__addstr( output, str, len );
        xml_output__addchar( output, '"' );
        return;
    }
    if( hasSq && !hasDq ) {
        xml_output__addchar( output, '"' );
        xml_output__addstr( output, str, len );
        xml_output__addchar( output, '"' );
        return;
    }
    if( hasDq && !hasSq ) {
        xml_output__addchar( output, '\'' );
        xml_output__addstr( output, str, len );
        xml_output__addchar( output, '\'' );
        return;
    }
    // Must have both single and double quotes; escape with backticks
    xml_output__addchar( output, '`' );
    if( hasSlash || hasTick ) {
        int newlen;
        char *escaped_val = backtick_escape( str, len, &newlen );
        xml_output__addstr( output, escaped_val, newlen );
        free( escaped_val );
    }
    else { // doesn't need special processing
        xml_output__addstr( output, str, len );
    }
    //free( escaped_val );
    xml_output__addchar( output, '`' );
}
void xml_output__jsaval( xml_output *output, char *str, int len ) {
    // Must have both single and double quotes; escape with backticks
    xml_output__addchar( output, '\"' );
    int newlen;
    char *escaped_val = jsa_escape( str, len, &newlen );
    xml_output__addstr( output, escaped_val, newlen );
    free( escaped_val );

    //free( escaped_val );
    xml_output__addchar( output, '\"' );
}
void xml_output__bs( xml_output *output ) {
    xml_page *page = output->curPage;
    page->pos--;
}
void xml_output__addchar( xml_output *output, char let ) {
    xml_page *page = output->curPage;
    if( page->pos == page->len ) {
        xml_page *newPage = xml_page__new( output->pageSize );
        output->curPage->next = newPage;
        page = output->curPage = newPage;
    }
    page->xml[page->pos] = let;
    page->pos++;
}
xml_output *xml_output__new() {
    xml_output *output = (xml_output *) calloc( 1, sizeof( xml_output ) );
    output->pageSize = 1000;
    output->firstPage = output->curPage = xml_page__new( output->pageSize );
    return output;
}
void xml_output__delete( xml_output *self ) {
    xml_page *curPage = self->firstPage;
    while( curPage ) {
        xml_page *nextPage = curPage->next;
        xml_page__delete( curPage );
        curPage = nextPage;
    }
    free( self );
}

int xml_output__flat_length( xml_output *self ) {
    xml_page *curPage = self->firstPage;
    int totLen = 0;
    while( curPage ) {
        totLen += curPage->pos;
        curPage = curPage->next;
    }
    return totLen;
}

void xml_output__flatten_preallocated( xml_output *self, char *output ) {
    xml_page *curPage = self->firstPage;
    char *outPos = output;
    while( curPage ) {
        memcpy( outPos, curPage->xml, curPage->pos );
        outPos += curPage->pos;
        curPage = curPage->next;
    }
    *outPos = 0x00;
}

char *xml_output__flatten( xml_output *self, int *len ) {
    xml_page *curPage = self->firstPage;
    int totLen = 0;
    while( curPage ) {
        totLen += curPage->pos;
        curPage = curPage->next;
    }
    *len = totLen;
    char *output = malloc( totLen + 1 );
    output[ totLen ] = 0x00;
    char *outPos = output;
    curPage = self->firstPage;
    while( curPage ) {
        memcpy( outPos, curPage->xml, curPage->pos );
        outPos += curPage->pos;
        curPage = curPage->next;
    }
    return output;
}

void xml_page__print( xml_page *self ) {
    printf("%.*s",self->pos,self->xml);
}
void xml_output__print( xml_output *self ) {
    xml_page *curPage = self->firstPage;
    while( curPage ) {
        xml_page__print( curPage );
        curPage = curPage->next;
    }
}
/*void xml_output__print( xml_output *self ) {
    xml_page *curPage = self->firstPage;
    while( curPage ) {
        char *xml = curPage->xml;
        int len = curPage->pos;
        printf("%.*s", len, xml );
    }    
}*/

void xjr_node__tree_rec( xjr_node *self, int depth, xml_output *output );

xml_output *xjr_node__tree( xjr_node *root ) {
    xml_output *output = xml_output__new();
    assert( output != NULL );
    
    xjr_node__tree_rec( root, -1, output );
    return output;
}

void xjr_node__tree_rec( xjr_node *self, int depth, xml_output *output ) {
    assert( self != NULL );
    assert( output != NULL );
    
    if( depth >= 0 ) {
        xml_output__addspaces( output, depth*2 );
    
        int start;
        int end;
        if( self->val && stripSpaces( self->val, self->vallen, &start, &end ) ) {
            xml_output__addstr( output, self->name, self->namelen );
            xml_output__addchar( output, ':' );
            xml_output__addstr( output, &self->val[start], (end-start+1) );
            if( self->flags & FLAG_ATT ) {
                xml_output__addstr( output, " - ATT", 6 );
            }
            xml_output__addchar( output, '\n' );
            //printf( "%.*s:%.*s\n", self->namelen, self->name, (end-start+1), &self->val[start] );
        }
        else {
            xml_output__addstr( output, self->name, self->namelen );
            xml_output__addchar( output, '\n' );
            //printf( "%.*s\n", self->namelen, self->name );
        }
    }
    
    if( self->children ) {
        xjr_node *curChild = self->firstChild;
        while( curChild ) {
            xjr_node__tree_rec( curChild, depth + 1, output );
            curChild = curChild->next;
        }
    }
}

xml_output *xjr_node__xml( xjr_node *root ) {
    xml_output *output = xml_output__new();
    assert( output != NULL );
    
    xjr_node__xml_rec( root, -1, output );
    return output;
}

xml_output *xjr_node__outerxml( xjr_node *root ) {
    xml_output *output = xml_output__new();
    assert( output != NULL );
    
    xjr_node__xml_rec( root, 0, output );
    return output;
}

void xjr_node__xml_rec( xjr_node *self, int depth, xml_output *output ) {
    assert( self != NULL );
    assert( output != NULL );
    
    int start;
    int end;
    
    uint16_t flags = self->flags;
    if( flags & FLAG_CONTENTS ) {
        char *val = self->val;
        int vallen = self->vallen;
        if( val[0] == '\n' ) {
            val++;
            vallen--;
        }
        if( val[0] != ' ' ){
            if( depth ) xml_output__addspaces( output, depth*2 );
        }
        if( needsCdata( val, vallen ) ) {
            // Note this doesn't protect from ]]> within the string
            xml_output__addstr( output, "<![CDATA[", 9 );
            xml_output__addstr( output, val, vallen );
            xml_output__addstr( output, "]]>", 3 );
        }
        else {        
            xml_output__addstr( output, val, vallen );
        }
        
        return;
    }
    
    if( depth >= 0 ) {
        if( depth ) xml_output__addspaces( output, depth*2 );
        xml_output__addchar( output, '<' ); // <
        xml_output__addstr( output, self->name, self->namelen ); // <node
        
        int hasAtt = 0;
        xjr_node *curChild = self->firstChild;
        while( curChild ) {
            if( ( curChild->flags & FLAG_ATT ) && !curChild->children ) {
                curChild->flags |= FLAG_DONE;
                if( !hasAtt ) {
                    hasAtt = 1;
                }
                xml_output__addchar( output, ' ' );
                if( !curChild->val ) {
                    xml_output__addchar( output, '.' );
                }
                xml_output__addstr( output, curChild->name, curChild->namelen );
                
                if( curChild->val ) {
                    xml_output__addchar( output, '=' );
                    /*
                    xml_output__addchar( output, '"' );
                    if( curChild->val && stripSpaces( curChild->val, curChild->vallen, &start, &end ) ) {
                        xml_output__addstr( output, &curChild->val[start], end-start+1 );
                    }
                    xml_output__addchar( output, '"' );
                    */
                    xml_output__attval( output, curChild->val, curChild->vallen );
                }
            }    
            curChild = curChild->next;
        }
    }
        
    int innerOutput = 0;
    
    if( self->children ) {
        xjr_node *curChild = self->firstChild;
        while( curChild ) {
            if( curChild->flags & FLAG_DONE ) {
                curChild = curChild->next;
                continue;
            }
            if( !innerOutput && depth >= 0 ) {
                innerOutput = 1;
                xml_output__addchar( output, '>' ); // <node att=1>
                xml_output__addchar( output, '\n' );
            }
            xjr_node__xml_rec( curChild, depth + 1, output );
            curChild = curChild->next;
        }
    }
    
    if( depth >= 0 ) {
        int valOutput = 0;
        if( !innerOutput ) {
            if( self->val && stripSpaces( self->val, self->vallen, &start, &end ) ) {
                innerOutput = 1;
                valOutput = 1;
                xml_output__addchar( output, '>' );
                if( needsCdata( self->val, self->vallen ) ) {
                    // Note this doesn't protect from ]]> within the string
                    xml_output__addstr( output, "<![CDATA[", 9 );
                    xml_output__addstr( output, &self->val[start], end-start+1 );
                    xml_output__addstr( output, "]]>", 3 );
                }
                else {
                    xml_output__addstr( output, &self->val[start], end-start+1 );
                }
            }
        }
        
        if( !innerOutput ) {
            xml_output__addchar( output, '/' );
            xml_output__addchar( output, '>' ); // <node att=1>
            xml_output__addchar( output, '\n' );
        }
        else {
            if( !valOutput ) xml_output__addspaces( output, depth*2 );
            xml_output__addchar( output, '<' ); // <
            xml_output__addchar( output, '/' ); // </
            xml_output__addstr( output, self->name, self->namelen ); // </node
            xml_output__addchar( output, '>' );
            xml_output__addchar( output, '\n' );
        }
    }
}

void xjr_node__jsa_rec( xjr_node *self, int depth, xml_output *output, char ws );

xml_output *xjr_node__jsa( xjr_node *root, char ws ) {
    xml_output *output = xml_output__new();
    assert( output != NULL );
    
    xjr_node__jsa_rec( root, 0, output, ws );
    return output;
}

void xjr_node__jsa_rec( xjr_node *self, int depth, xml_output *output, char ws ) {
    assert( self != NULL );
    assert( output != NULL );
    
    int start;
    int end;
  
    //xml_output__addspaces( output, depth*2 );
    xml_output__addchar( output, '[' );
    if(ws) xml_output__addchar( output, '\n' );
    
    xjr_node *curChild = self->firstChild;
    while( curChild ) {
        if(ws) xml_output__addspaces( output, (depth+1)*2 );
        xml_output__addchar( output, '[' );
        if(ws) xml_output__addchar( output, '\n' );
    
        uint16_t flags = curChild->flags;
        
        // FLAGS
        if(ws) xml_output__addspaces( output, (depth+2)*2 );
        if( flags ) {
            char flagStr[7];
            snprintf( flagStr, 7, "%u", flags & 0xF0F );
            xml_output__addstr( output, flagStr, strlen( flagStr ) );
            xml_output__addchar( output, ',' );
        }
        else {
            xml_output__addstr( output, "0,", 2 );
        }
        if(ws) xml_output__addchar( output, '\n' );
        
        // NAME
        char *name = curChild->name;
        if(ws) xml_output__addspaces( output, (depth+2)*2 );
        if( name && name[0] != '_' ) {
            xml_output__addstr( output, "\"", 1 );
            xml_output__addstr( output, curChild->name, curChild->namelen );
            xml_output__addstr( output, "\",", 2 );
        }
        else {
            xml_output__addstr( output, "0,", 2 );
        }
        if(ws) xml_output__addchar( output, '\n' );
        
        // VALUE
        if(ws) xml_output__addspaces( output, (depth+2)*2 );
        if( curChild->val ) {
            //xml_output__addstr( output, "'", 1 );
            xml_output__jsaval( output, curChild->val, curChild->vallen );
            xml_output__addchar( output, ',' );
        }
        else {
            xml_output__addstr( output, "0,", 2 );
        }
        if(ws) xml_output__addchar( output, '\n' );
           
        // SUB
        if(ws) xml_output__addspaces( output, (depth+2)*2 );
        if( curChild->children ) {
            xjr_node__jsa_rec( curChild, depth + 2, output, ws );
        } 
        else {
            xml_output__addstr( output, "0", 1 );
        }
        curChild = curChild->next;
        
        if(ws) xml_output__addchar( output, '\n' );
        if(ws) xml_output__addspaces( output, (depth+1)*2 );
        xml_output__addstr( output, "],", 2 );
        if(ws) xml_output__addchar( output, '\n' );
    }
    
    xml_output__bs( output );
    if(ws) xml_output__bs( output );
    if(ws) xml_output__addchar( output, '\n' );
    if(ws) xml_output__addspaces( output, (depth)*2 );
    xml_output__addchar( output, ']' );

    //stripSpaces( self->val, self->vallen, &start, &end )
}

void xjr_node__dump_rbentry( void *rbentry ) {
    snode *node = (snode *) rbentry;
    while( node ) {
        xjr_node__dump( (xjr_node*) node->data, 0 );
        node = node->next;
    }
}

dt_voidChain *dt_voidChain__new( void *data ) {
    dt_voidChain *self = calloc( sizeof( dt_voidChain ), 1 );
    self->data = data;
    return self;
}

void dt_voidChain__delete( dt_voidChain *self ) {
    free( self );
}

xjr_key_arr *xjr_node__getkeys( xjr_node *self ) {
    if( !self->children ) return NULL;
    return string_tree__getkeys( self->children );
}