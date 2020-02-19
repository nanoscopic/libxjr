// Copyright (C) 2018 David Helkowski

#include"xjr-string-tree.h"
#include"xjr-machine.h"
#include<string.h>
#include<stdio.h>
#include<stdlib.h>
#include"xjr-node.h"
#include"xjr-mempool.h"

//#define DEBUG

void escape_inplace( char *str, int len, int *outlen ) {
  int offset = 0;
  int i=0;
  for(i=0;i<len;i++) {
      if( str[i] == '\\' ) break;
  }
  if( i==len ) {
    *outlen = len;
    return;
  }
  for( ;i<len;i++ ) {
    char let = str[i];
    if( let == '\\' ) {
      str[i-offset] = str[i+1];
      offset++;
      i++;
      continue;
    }
    str[i-offset] = let;
  }
  *outlen = len - offset;
  str[ *outlen ] = 0x00;
}

%%{
    machine foo;

    j_number = [0-9]+;
    
    j_bool = "true" | "false";
    
    action JNullExit {
        #ifdef DEBUG
        printf("JNull\n");
        #endif
        curnode->val = "null";
        curnode->vallen = 4;
    }
    j_null = "null" %JNullExit;
    
    j_att_val = ( j_number | j_bool | j_null );
    
    action NodeContentsEntry {
        content = p;
    }
    action NodeContentsExit {
        contentlen = p-content;
        #ifdef DEBUG
        
        printf("NodeContents: [%.*s]\n", contentlen, content);
        #endif
        if( mixedMode ) {
            xjr_node *valNode = xjr_node__new( pool, "_", 1, curnode );
            valNode->flags |= FLAG_CONTENTS;
            valNode->val = content;
            valNode->vallen = contentlen;
        }
        else {
            curnode->val = content;
            curnode->vallen = contentlen;
        }
    }
    #node_contents = [^<\0] [^<\0]** >NodeContentsEntry @NodeContentsExit;
    #node_contents = ( any -- [<] -- 0 )++ >NodeContentsEntry %NodeContentsExit;
    node_contents = ( [^<\0]+ - space+ ) >NodeContentsEntry %NodeContentsExit "<" @{fhold;};
    space_node = space+ "<" @{fhold;};
    
    Ti8 = "i8";
    Ti16 = "i16";
    Ti32 = "i32";
    Tu8 = "u8";
    Tu16 = "u16";
    Tu32 = "u32";
    Tbool = "b";
    Thex = "x";
    Tuuid = "uu";
    Tchar = "c";
    Tvalue = "v";
    # direct value ( string )
    Tref = "\\";
    # reference to another xml node
    Tdollars = "$";
    # number with cents ( ex: 4.30 )
    node_types = ( Ti8 | Ti16 | Tu8 | Tu16 | Tbool | Thex | Tuuid | Tchar | Tvalue | Tref | Tdollars );
    
    Farray = "R";
    # only an array allowed here ( of type if specified )
    node_flags = ( Farray );
    
    node_type = "-" ( node_types | node_flags ) ( "," ( node_types | node_flags ) )* ";";
    
    action NodeNameEntry {
        nodename = p;
        blind_node = 0;
    }
    action NodeNameExit {
        int namelen = p-nodename;
        #ifdef DEBUG
        printf("Node name: [%.*s]\n", namelen, nodename );
        #endif
        if( nodename[0] == '@' ) {
            curnode = xjr_node__new( pool, nodename+1, namelen-1, curnode );
            curnode->flags |= FLAG_ATT;
        }
        else {
            curnode = xjr_node__new( pool, nodename, namelen, curnode );
        }
    }
    
    start_node_name = node_type? ( print -- space -- [\-;!>{/=,\]] -- "[" )+ >NodeNameEntry %NodeNameExit;
    
    action EndNodeNameEntry { nodename = p; }
    action EndNodeNameExit {
        int namelen = p-nodename;
        #ifdef DEBUG
        printf("End Node name: [%.*s]\n", namelen, nodename );
        #endif
        //if( curnode )
        curnode = curnode->parent;
    }
    end_node_name = ( print -- space -- [!>{/=] -- "[" )+  >EndNodeNameEntry %EndNodeNameExit;
    
    action ImmedValueEntry {
        content = p;
    }
    action ImmedValueExit {
        contentlen = p-content;
        #ifdef DEBUG
        printf("Immedvalue: [%.*s]\n", contentlen, content);
        #endif
        curnode->val = content;
        curnode->vallen = contentlen;
    }
    immed_value = [^>]+ >ImmedValueEntry %ImmedValueExit;
    
    # There are a number of situations in which a j_array can start
    # 1. The first is when an attribute value is an array of the form att=[]
    #    When this happens we can simply continue appending values from commas
    # 2. The second is when a node is set directly to an array of the form <node=[] />
    #    This is basically equal to the first situation since a node has just been
    #    created and the parser doesn't really differentiate nodes from attributes
    # 3. The third is when a j hash value is an array. Of the form {jkey:[]}
    #    This is equivalent to 1 and 2; because a node is created when a key is used
    # 4. The fourth is when a j array has another j array inside of it as a member.
    #    This situation is unequal and must be handled in a special way.
    #    The way to detect this situation is that we have to know if we are at the first
    #    element of a j_array or a continuing one. The moment we set something a node
    #    to be a j_array we ought to mark the node as being a j_array.
    j_array = "[" @{ fcall j_array_within; };
    
    j_hash = "{" @{ fcall j_hash_within; };
    
    #unquoted_value = ( print -- ["'`/>] -- space )+;
    
    action UnQuotedValueExit {
        int attvaluelen = p-attvalue;
        #ifdef DEBUG
        printf("Double Quoted Value: [%.*s]\n", attvaluelen, attvalue );
        #endif
        //if( curnode ) {
            curnode->val = attvalue;
            curnode->vallen = attvaluelen;
        //}
    }
    
    unquoted_value = j_att_val %UnQuotedValueExit;
    
    action SimpleAttValueExit {
        int attvaluelen = p-attvalue;
        #ifdef DEBUG
        printf("Att Value: [%.*s]\n", attvaluelen, attvalue );
        #endif
        //if( curnode ) {
            curnode->val = attvalue + 1;
            curnode->vallen = attvaluelen - 2;
        //}
    }
    
    action JSimpleAttValueExit {
        jvallen = p-jval;
        #ifdef DEBUG
        printf("Att Value: [%.*s]\n", jvallen, jval );
        #endif
        jval = jval + 1;
        jvallen = jvallen - 2;
    }
    
    action BacktickQuoteValueExit {
        int attvaluelen = p-attvalue;
        #ifdef DEBUG
        printf("Double Quoted Value: [%.*s]\n", attvaluelen, attvalue );
        #endif
        //if( curnode ) {
            curnode->val = attvalue + 1;
            int newlen;
            escape_inplace( attvalue + 1, attvaluelen - 2, &newlen );
            curnode->vallen = newlen;
        //}
    }
    
    action JBacktickQuoteValueExit {
        jvallen = p-jval;
        #ifdef DEBUG
        printf("Double Quoted Value: [%.*s]\n", jvallen, jval );
        #endif
        jval = attvalue + 1;
        int newlen;
        escape_inplace( jval, jvallen - 2, &newlen );
        jvallen = newlen;
    }
    
    single_quoted_value = "'" [^']* "'" %SimpleAttValueExit;
    
    #double_quoted_value = '"' ( [^"\\] | ( "\\" any ) )* '"' %SimpleAttValueExit;
    double_quoted_value = '"' [^"]* '"' %SimpleAttValueExit;
    
    #backtick_quoted_value = "`" [^`]* "`" %BacktickQuoteValueExit;
    backtick_quoted_value = "`" ( [^`\\] | ( "\\" any ) )* "`" %BacktickQuoteValueExit;
    
    j_single_quoted_value = "'" [^']* "'" %JSimpleAttValueExit;
    j_double_quoted_value = '"' [^"]* '"' %JSimpleAttValueExit;
    j_backtick_quoted_value = "`" ( [^`\\] | ( "\\" any ) )* "`" %JBacktickQuoteValueExit;
    
    action AttValueEntry {
        attvalue = p;
    }
    
    action AttValueExit {
        //if( curnode ) {
            //curnode->val = attvalue;
            //curnode->vallen = p-attvalue;
            curnode = curnode->parent;
        //}
    }
    att_value = ( unquoted_value | single_quoted_value | double_quoted_value | backtick_quoted_value ) >AttValueEntry %AttValueExit;
    
    action AttNameEntry {
        attname = p;
    }
    action AttNameExit {
        int attnamelen = p-attname;
        #ifdef DEBUG
        printf("Att name: [%.*s]\n", attnamelen, attname );
        #endif
        curnode = xjr_node__new( pool, attname, attnamelen, curnode );
        curnode->flags |= FLAG_ATT;
    }
    att_name = ( print -- space -- [=/>\.] )+ >AttNameEntry %AttNameExit;
       
    #att_array = "[" space* att_value space* ("," space* att_value space* )* "]"
    
    action AttJHashExit {
        //curnode = curnode->parent;
    }
    att_j_hash = j_hash %AttJHashExit;
    
    att = att_name . space* . "=" . (space*) . ( att_value | j_array | att_j_hash );
    
    action FlagDone {
        curnode->flags |= FLAG_FLAG;
        curnode = curnode->parent;
        #ifdef DEBUG
        printf("Flag\n");
        #endif
    }
    flag = ( "." att_name ) %FlagDone; 
    
    action SelfCloseDone {
        #ifdef DEBUG
        printf("Ascend3\n");
        //printf("from here:%s",p);
        #endif
        if( curnode ) curnode = curnode->parent;
    }
    self_closing_node = "<" space* start_node_name ( space+ ( att | flag ) )* space* ( "/" . immed_value? ) ">" @SelfCloseDone;
    
    action BlindContentStart {
        content = p;
    }
    action BlindContentMark {
        contentlen = p-content-1;
    }
    action BlindEndStart {
        endname = p;
    }
    action BlindEndDone {
        int endlen = p-endname;
        #ifdef DEBUG
        printf("Comparing - %.*s - %.*s\n", curnode->namelen, curnode->name, endlen, endname );
        #endif
        if( strncmp( nodename, endname, endlen ) ) {
           fgoto blind_content;
        }
        else {
            #ifdef DEBUG
            printf("Blind End Done - Cur node: %p\n", curnode );
            #endif
            curnode->val = content;
            curnode->vallen = contentlen;
            curnode = curnode->parent;
        }
    }
    blind_contents := [^<] >BlindContentStart blind_content: [^<]*
        "</" >BlindContentMark ( print -- space -- [!>{/=] -- "[" )+ >BlindEndStart %BlindEndDone ">" @{fret;};
        
    action NodeStartDone {
        #ifdef DEBUG
        printf("Node start done\n");
        printf("  Cur node: %p\n", curnode );
        #endif
        if( blind_node ) {
            fcall blind_contents;
        }
    }
    action BlindNodeMark {
        blind_node = 1;
    }
    #node_start = "<" space* start_node_name ( space+ ( att | flag ) )* space* ">" @NodeStartDone;
    node_start = "<" start_node_name ( "-" >BlindNodeMark )?  ( space+ ( att | flag ) )* ">" @NodeStartDone;
    
    node_end = "</" space* end_node_name? space* ">";
    #node_end = "</" [^>]+ ">";
    
    action CommentEntry {
        comval = p;
        curnode = xjr_node__new( pool, "_comment", 8, curnode );
    }
    action CommentExit {
        int comlen = p-comval;
        #ifdef DEBUG
        printf("Comment Value: [%.*s]\n", comlen - 1, comval );
        #endif
        curnode->val = comval;
        curnode->vallen = comlen - 1;
        if( curnode ) curnode = curnode->parent;
    }
    
    comment = "<!--" ( ( any* -- "-->" ) "-" ) >CommentEntry %CommentExit "->";
    
    action CDataEntry {
        cdval = p;
    }
    action CDataExit {
        int cdlen = p-cdval;
        #ifdef DEBUG
        printf("CData Value: [%.*s]\n", cdlen - 1, cdval );
        #endif
        curnode->val = cdval;
        curnode->vallen = cdlen - 1;
    }
    cdata = "<![CDATA[" ( ( any* -- "]]>" ) "]" ) >CDataEntry %CDataExit "]>";
    
    cdata_short = "<[[" ( ( any* -- "]]>" ) "]" ) >CDataEntry %CDataExit "]>";
    
    action PiEntry {
        comval = p;
    }
    action PiExit {
        #ifdef DEBUG
        int comlen = p-comval;
        printf("Pi Value: [%.*s]\n", comlen - 1, comval );
        #endif
    }
    pi = "<?" ( ( any* -- "?>" ) "?" ) >PiEntry %PiExit ">";
    
    j_str = j_single_quoted_value | j_double_quoted_value | j_backtick_quoted_value;
    
    action JValEntry {
        jval = p;
    }
    action JValSet {
        jvallen = p-jval;
    }
    action JValExit {
        #ifdef DEBUG
        printf("JVal: [%.*s]\n", jvallen, jval );
        #endif
        curnode->val = jval;
        curnode->vallen = jvallen;
    }
    j_val_basic = ( j_number %JValSet | j_str | j_bool %JValSet | "null" %JValSet ) >JValEntry %JValExit;
    
    j_to_x = "<" @{ fhold; fcall x_callable; };
    
    j_val = ( j_val_basic | j_array | j_hash | j_to_x );
    
    action HashElNameStart {
        nodename = p;
    }
    action HashElNameExit {
        int namelen = p-nodename;
        #ifdef DEBUG
        printf("Hash el name: [%.*s]\n", namelen, nodename );
        #endif
        curnode = xjr_node__new( pool, nodename, namelen, curnode );
    }
    
    j_hash_el_name_double_quoted = '"' ( [^"]* ) >HashElNameStart %HashElNameExit '"';
    
    j_hash_el_name_unquoted = ( ( print -- space -- [:"] )+ ) >HashElNameStart %HashElNameExit;
    
    j_hash_el_name = j_hash_el_name_double_quoted | j_hash_el_name_unquoted;
    
    
    action HashValExit {
        //curnode = curnode->parent;
    }
    action JHashBegin {
        curnode->flags |= FLAG_JHASH;
    }
    j_hash_el2 = j_hash_el_name space* ":" space* j_val %HashValExit;
    j_hash_el = j_hash_el2 >JHashBegin;
    
    action ExtraArrayValueStart {
        #ifdef DEBUG
        printf("Adding another node named %.*s\n", curnode->namelen, curnode->name );
        #endif
        //if( curnode ) {
            curnode = xjr_node__new( pool, curnode->name, curnode->namelen, curnode->parent );
            curnode->flags |= FLAG_JARRAY;
        //}
    }
    action ArrayExit {
        #ifdef DEBUG
        printf("JArray Exit\n");
        printf("from here:%s\n\n",p);
        #endif
        //if( curnode ) 
        curnode = curnode->parent;
    }
    action JArrayBegin {
        #ifdef DEBUG
        printf("JArray Begin\n");
        printf("from here:%s\n\n",p);
        #endif
        if( curnode->flags & FLAG_JARRAY ) { // We are already in an array!
            #ifdef DEBUG
            printf("Within an array\n");
            #endif
            // Make a dummy node so as to preserve the ability to render to XML
            curnode = xjr_node__new( pool, "@", 1, curnode );
        }
        curnode->flags |= FLAG_JARRAY;
    }
    first_j_val = j_val >JArrayBegin;
    j_array_within := space* first_j_val? space* ( "," space* j_val >ExtraArrayValueStart space*)* space* "]" >ArrayExit @{fret;};
    
    action ExtraHashValue {
        curnode = curnode->parent;
    }
    action HashExit {
        curnode = curnode->parent;
    }
    j_hash_within := space* j_hash_el? ( space* "," space* j_hash_el >ExtraHashValue )* space* "}" >HashExit @{fret;};
    
    action XToJArrayExit {
        //#ifdef DEBUG
        //printf("Ascend2\n");
        //#endif
        //if( curnode ) curnode = curnode->parent;
    }
    x_to_j_array = "<" space* start_node_name space* "=" space* ( j_val_basic | j_array | j_hash ) space* ("/")? ">" @XToJArrayExit;
    
    x_to_j_hash = "<" j_hash space* ("/")? ">";
    
    xml_stuffs = ( cdata | cdata_short | node_start | node_end | self_closing_node | comment );
    
    root_context = ( xml_stuffs | space_node| node_contents | x_to_j_hash | x_to_j_array );
    
    action XMLStuff {
        #ifdef DEBUG
        printf("XML Stuff\n");
        printf("from here:%s\n\n",p);
        #endif
    }
    x_callable := root_context+ @XMLStuff "<" space* ( "," | "]" ) @{fhold; fret;};
    
    main := root_context @{ fbreak; };
    
    write data;
}%%

// Basic parse function; simple and easy to call
xjr_node *parse( xjr_mempool *pool, char *input, int len ) { 
    return parse_onto( pool, input, len, 0 );
}

// Parse function exposing a root object to append stuff to
void *parse_onto( xjr_mempool *pool, char *input, int len, xjr_node *root ) {
    return parse_full( pool, input, len, root, 0, 0, 0 );
}

// Parse function exposing the full set of options
void *parse_full( xjr_mempool *pool, char *input, int len, xjr_node *root, int *endpos, int returnToRoot, int mixedMode ) {
    int cs, res = 0;
    int top = 0;
    int stack[100];
    int startcs;
    int lastpos = 0;
    char *p = input;
    char *pe = input + len;
    char *eof = pe;
    
    char *nodename;
    char *endname;
    char *attname;
    char *attvalue;
    char *comval;
    char *cdval;
    char *content;
    char *jval;
    
    int contentlen;
    int jvallen;
    char blind_node = 0;
    
    if( !root ) {
        root = xjr_node__new( pool, "root", 4, NULL );
    }
    xjr_node *curnode = root;
    
    %% write init;
    
    startcs = cs;
    int loop_forever = endpos ? 0 : 1;
    while(1) {
        #ifdef DEBUG
        printf( "Attempting to parse:[%s] len=%li\n", p, pe-p+1 );
        //printf("Input length: %i\n", len );
        #endif
                
        %% write init nocs;
        %% write exec noend;
        
        int pos = p - input;
        
        #ifdef DEBUG
        printf("cs = %i, res = %i, pos = %i\n", cs, res, p - input );
        #endif
        if( pos == lastpos || pos > len || pe == p ) {
            break;
        }
        cs = startcs;
        top = 0;
        lastpos = pos;
        if( !loop_forever ) {
            if( !returnToRoot ) break;
            if( curnode == root ) break;
        }
    }
    
    if( endpos ) {
        *endpos = p - input;
    }
    
    return root;
}