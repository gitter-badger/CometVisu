/* templateengine.js (c) 2010 by Christian Mayer [CometVisu at ChristianMayer dot de]
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 3 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
*/

var design = new VisuDesign_Custom();

var mappings = {}; // store the mappings
var stylings = {}; // store the stylings

var ga_list = [];

var main_scroll;
var old_scroll = '';

visu = new CometVisu('/cgi-bin/');//{};
visu.update = function( json ) // overload the handler
{
  for( key in json )
  {
    var GA = 'GA' + key.split('/').join('_');
    var elements = $( '.' + GA );
    for( i = 0; i < elements.length; i++ )
    {
      var element = $( elements[i] );
      var value = decodeDPT( json[key], element.data('datatype') );
      element.data( 'value', value );
      $('.value', element).text( map( value, element ) );

      var styling = element.data('styling');
      if( styling && stylings[styling] && (stylings[styling][value] || stylings[styling]['range']) )
      {
        if( stylings[styling]['range'] ) value = parseFloat( value );
        element.removeClass();
        if( stylings[styling][value] )
        {
          element.addClass( 'actor ' + GA + ' ' + stylings[styling][value] );
        } else {
          var range = stylings[styling]['range'];
          var not_found = true;
          for( var min in range )
          {
            if( min > value ) continue;
            if( range[min][0] < value ) continue; // check max
            element.addClass( 'actor ' + GA + ' ' + range[min][1] );
            not_found = false;
            break;
          }
          if( not_found ) element.addClass( 'actor ' + GA );
        }
      }
      switch( element.data( 'type' ) )
      { 
        case 'toggle':
          element.removeClass( value == '0' ? 'switchPressed' : 'switchUnpressed' );
          element.addClass(    value == '0' ? 'switchUnpressed' : 'switchPressed' );
          break;
        case 'slide':
        case 'dim':
          element.slider( 'value', value ); // only update when necessary
      }
    }
  }
}
visu.user = 'demo_user'; // example for setting a user

$.extend({
  getUrlVars: function(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});

var configSuffix = "";
if ($.getUrlVar("config")) {
    configSuffix = "_" + $.getUrlVar("config");
}

$(document).ready(function() {
  // get the data once the page was loaded
  $.ajaxSetup({cache: false});
  window.setTimeout("$.get( 'visu_config" + configSuffix + ".xml', setup_page );", 200);

  // disable text selection - it's annoying on a touch screen!
  if($.browser.mozilla)
  {//Firefox
      $('body').css('MozUserSelect','none');
  } else if($.browser.msie) {//IE
      $(document).bind('selectstart',function(){return false;});
  } else {//Opera, etc.
      $(document).mousedown(function(){return false;});
  }
} );

$(window).unload(function() {
  visu.stop();
});

function map( value, element )
{
  var map = element.data('mapping');
  if( map && mappings[map] && (mappings[map][value] || mappings[map]['range']) )
  {
    if( mappings[map]['range'] ) value = parseFloat( value );
    if( mappings[map][value] ) return mappings[map][value];

    var range = mappings[map]['range'];
    for( var min in range )
    {
      if( min > value ) continue;
      if( range[min][0] < value ) continue; // check max
      return range[min][1];
    }
  }
  return value;
}

/**
 * Make sure everything looks right when the window gets resized.
 * This is necessary as the scroll effect requires a fixed element size
 */
function handleResize()
{
  var uagent = navigator.userAgent.toLowerCase();

  if (/(android|blackberry|iphone|ipod|series60|symbian|windows ce|palm)/i.test(uagent)) {
      var width = $( window ).width();
      $( '#main' ).css( 'width', width );
      $( 'head' ).append( '<style type="text/css">.page{width:' + (width-0) + 'px;}</style>' );
      // do nothing
  } else {
  var width = $( window ).width();
  var height = $( window ).height() - $( '#top' ).outerHeight(true) - $( '#bottom' ).outerHeight(true) - 2;
  $( '#main' ).css( 'width', width ).css( 'height', height );
  $( 'head' ).append( '<style type="text/css">.page{width:' + (width-0) + 'px;height:' + height + 'px;}</style>' );  

  }
  main_scroll != undefined && main_scroll.seekTo( main_scroll.getIndex(), 0 ); // fix scroll
}
$( window ).bind( 'resize', handleResize );

function setup_page( xml )
{
  // erst mal den Cache für AJAX-Requests wieder aktivieren
  $.ajaxSetup({cache: true});

  var design = $( 'pages', xml ).attr('design');
  $( 'head' ).append( '<link rel="stylesheet" type="text/css" href="designs/' + design + '/basic.css" />' );
  $( 'head' ).append( '<link rel="stylesheet" type="text/css" href="designs/' + design + '/mobile.css" media="only screen and (max-device-width: 480px)" />' );

  // start with the plugins
  $( 'meta > plugins plugin', xml ).each( function(i){
    var name = $(this).attr('name');
    $( 'head' ).append( '<script src="plugins/' + name + '/structure_plugin.js" type="text/javascript"></script>' );
  } );

  // then the mappings
  $( 'meta > mappings mapping', xml ).each( function(i){
    var name = $(this).attr('name');
    mappings[ name ] = {};
    $(this).find('entry').each( function(){
      if( $(this).attr('value') )
      {
        mappings[ name ][ $(this).attr('value') ] = $(this).text();
      } else {
        if( ! mappings[ name ][ 'range' ] ) mappings[ name ][ 'range' ] = {};
        mappings[ name ][ 'range' ][ parseFloat($(this).attr('range_min')) ] =
          [ parseFloat( $(this).attr('range_max') ), $(this).text() ];
      }
    });
  });

  // then the stylings
  $( 'meta > stylings styling', xml ).each( function(i){
    var name = $(this).attr('name');
    stylings[ name ] = {};
    $(this).find('entry').each( function(){
      if( $(this).attr('value') )
      {
        stylings[ name ][ $(this).attr('value') ] = $(this).text();
      } else { // a range
        if( ! stylings[ name ][ 'range' ] ) stylings[ name ][ 'range' ] = {};
        stylings[ name ][ 'range' ][ parseFloat($(this).attr('range_min')) ] =
          [ parseFloat( $(this).attr('range_max') ), $(this).text() ];
      }
    });
  });

  // then the status bar
  $( 'meta > statusbar status', xml ).each( function(i){
    var type      = $(this).attr('type');
    var condition = $(this).attr('condition');
    var sPath = window.location.pathname;
    var sPage = sPath.substring(sPath.lastIndexOf('/') + 1);
    var editMode = 'edit_config.html' == sPage;
    if( editMode  && '!edit' == condition ) return;
    if( !editMode && 'edit'  == condition ) return;
    //$('.footer').append( $(this.textContent) );
    $('.footer').html( $('.footer').html() + this.textContent );
  });

  // adapt width for pages to show
  handleResize();

  // and now setup the pages
  var page = $( 'pages > page', xml )[0]; // only one page element allowed...

  create_pages( page, '0' );

  // setup the scrollable
  main_scroll = $('#main').scrollable({keyboard: false, touch: false}).data('scrollable');
  main_scroll.onSeek( updateTopNavigation );

  $('.fast').bind('click', function(){
    main_scroll.seekTo( $(this).text() );
  });

  visu.subscribe( ga_list );
  $("#pages").triggerHandler("done");
}

function create_pages( page, path )
{
  var retval;
  retval = design.creators[ page.nodeName ].create( page, path );

    node = $(page).get(0);
    var attributes = {};
    if (typeof node.attributes != "undefined") {
        for(var i=0; i<node.attributes.length; i++)  {
            if(node.attributes.item(i).specified) {
                attributes[node.attributes.item(i).nodeName]=node.attributes.item(i).nodeValue
            }
        }
    } else {
        $.extend(attributes, node);
    }

  retval.data("attributes", attributes)
        .data("path", path)
        .data("nodeName", page.nodeName)
        .data("textContent", page.textContent);
  return retval;
}

function scrollToPage( page_id )
{
  $('#'+page_id).css( 'display', '' );                         // show new page
  main_scroll.seekTo( $('.page').index( $('#'+page_id)[0] ) ); // scroll to it
}

function updateTopNavigation()
{
  var path = $('.page').eq( this.getIndex() ).attr('id').split( '_' );
  var id = ''; //path[0];
  var nav = '';
  for( var i = 0; i < path.length; i++ )
  {
    id  += path[i];
    nav += (0==i ? '' : ' &#x25ba; ')
        +  '<a href="javascript:scrollToPage(\'' +id+ '\')">'
        + $('#' + id + ' h1').text() + '</a>';
    id  += '_';
  }
  $('.nav_path').html( nav );
  var new_array = path;
  var old_array = old_scroll;
  old_scroll = path;
  path = path.join('_');
  for( var i = new_array.length; i < old_array.length; i++ )
  {
    path += '_' + old_array[i]; // reuse of path...
    $('#'+path).css('display','none');
  }
}

/****************************************************************************/
/* FIXME - Question: should this belong to the VisuDesign object so that it */
/* is possible to overload?!?                                               */
/****************************************************************************/
function switchAction()
{
  var data = $(this).data();
  visu.write( data.GA, data.value=='1' ? '0' : '1', data.datatype ); 
}

function triggerAction()
{
  var data = $(this).data();
  visu.write( data.GA, data.sendValue, data.datatype );
}

function refreshAction( target, src )
{
  target.src = src + '&' + new Date().getTime();
}
function setupRefreshAction()
{
  var refresh = $(this).data('refresh');
  if( refresh && refresh > 0 )
  {
    var target = $('img', $(this) )[0];
    var src = target.src;
    if( src.indexOf('?') < 0 ) src += '?';
    $(this).data('interval', setInterval( function(){refreshAction(target, src);}, refresh ) );
  }
}

/**
 * The update thread to send the slider position to the bus
 */
function slideUpdate(actor)
{
  var data = actor.data();
  visu.write( data.GA, actor.slider('value'), data.datatype );
}

/**
 * Start a thread that regularily sends the silder position to the bus
 */
function slideStart(event,ui)
{
  var actor = $( '.actor', $(this).parent() );
  actor.data( 'updateFn', setInterval( function(){slideUpdate(actor);}, 250 ) ); // update KNX every 250 ms 
}

/**
 * Delete the update thread and send the final value of the slider to the bus
 */
function slideChange(event,ui)
{
  var data = $( '.actor', $(this).parent() ).data();
  var actor = $( '.actor', $(this).parent() );

  clearInterval( data.updateFn, ui.value);

  if( data.value != ui.value )
    visu.write( data.GA, ui.value, data.datatype );
}
