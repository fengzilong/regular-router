(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.regularRouter = factory());
}(this, (function () { 'use strict';

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var util = createCommonjsModule(function (module) {
var _ = module.exports = {};
var slice = [].slice, o2str = ({}).toString;


// merge o2's properties to Object o1. 
_.extend = function(o1, o2, override){
  for(var i in o2) { if(override || o1[i] === undefined){
    o1[i] = o2[i]
  } }
  return o1;
}



_.slice = function(arr, index){
  return slice.call(arr, index);
}

_.typeOf = function typeOf (o) {
  return o == null ? String(o) : o2str.call(o).slice(8, -1).toLowerCase();
}

//strict eql
_.eql = function(o1, o2){
  var t1 = _.typeOf(o1), t2 = _.typeOf(o2);
  if( t1 !== t2) { return false; }
  if(t1 === 'object'){
    var equal = true;
    // only check the first's propertie
    for(var i in o1){
      if( o1[i] !== o2[i] ) { equal = false; }
    }
    return equal;
  }
  return o1 === o2;
}


// small emitter 
_.emitable = (function(){
  function norm(ev){
    var eventAndNamespace = (ev||'').split(':');
    return {event: eventAndNamespace[0], namespace: eventAndNamespace[1]}
  }
  var API = {
    once: function(event, fn){
      var callback = function(){
        fn.apply(this, arguments)
        this.off(event, callback)
      }
      return this.on(event, callback)
    },
    on: function(event, fn) {
      var this$1 = this;

      if(typeof event === 'object'){
        for (var i in event) {
          this$1.on(i, event[i]);
        }
        return this;
      }
      var ne = norm(event);
      event=ne.event;
      if(event && typeof fn === 'function' ){
        var handles = this._handles || (this._handles = {}),
          calls = handles[event] || (handles[event] = []);
        fn._ns = ne.namespace;
        calls.push(fn);
      }
      return this;
    },
    off: function(event, fn) {
      var this$1 = this;

      var ne = norm(event); event = ne.event;
      if(!event || !this._handles) { this._handles = {}; }

      var handles = this._handles , calls;

      if (calls = handles[event]) {
        if (!fn && !ne.namespace) {
          handles[event] = [];
        }else{
          for (var i = 0, len = calls.length; i < len; i++) {
            if ( (!fn || fn === calls[i]) && (!ne.namespace || calls[i]._ns === ne.namespace) ) {
              calls.splice(i, 1);
              return this$1;
            }
          }
        }
      }
      return this;
    },
    emit: function(event){
      var this$1 = this;

      var ne = norm(event); event = ne.event;

      var args = _.slice(arguments, 1),
        handles = this._handles, calls;

      if (!handles || !(calls = handles[event])) { return this; }
      for (var i = 0, len = calls.length; i < len; i++) {
        var fn = calls[i];
        if( !ne.namespace || fn._ns === ne.namespace ) { fn.apply(this$1, args) }
      }
      return this;
    }
  }
  return function(obj){
      obj = typeof obj == "function" ? obj.prototype : obj;
      return _.extend(obj, API)
  }
})();



_.bind = function(fn, context){
  return function(){
    return fn.apply(context, arguments);
  }
}

var rDbSlash = /\/+/g, // double slash
  rEndSlash = /\/$/;    // end slash

_.cleanPath = function (path){
  return ("/" + path).replace( rDbSlash,"/" ).replace( rEndSlash, "" ) || "/";
}

// normalize the path
function normalizePath(path) {
  // means is from 
  // (?:\:([\w-]+))?(?:\(([^\/]+?)\))|(\*{2,})|(\*(?!\*)))/g
  var preIndex = 0;
  var keys = [];
  var index = 0;
  var matches = "";

  path = _.cleanPath(path);

  var regStr = path
    //  :id(capture)? | (capture)   |  ** | * 
    .replace(/\:([\w-]+)(?:\(([^\/]+?)\))?|(?:\(([^\/]+)\))|(\*{2,})|(\*(?!\*))/g, 
      function(all, key, keyformat, capture, mwild, swild, startAt) {
        // move the uncaptured fragment in the path
        if(startAt > preIndex) { matches += path.slice(preIndex, startAt); }
        preIndex = startAt + all.length;
        if( key ){
          matches += "(" + key + ")";
          keys.push(key)
          return "("+( keyformat || "[\\w-]+")+")";
        }
        matches += "(" + index + ")";

        keys.push( index++ );

        if( capture ){
           // sub capture detect
          return "(" + capture +  ")";
        } 
        if(mwild) { return "(.*)"; }
        if(swild) { return "([^\\/]*)"; }
    })

  if(preIndex !== path.length) { matches += path.slice(preIndex) }

  return {
    regexp: new RegExp("^" + regStr +"/?$"),
    keys: keys,
    matches: matches || path
  }
}

_.log = function(msg, type){
  typeof console !== "undefined" && console[type || "log"](msg)
}

_.isPromise = function( obj ){

  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';

}



_.normalize = normalizePath;
});

var _$1 = util;



function State$1(option){
  this._states = {};
  this._pending = false;
  this.visited = false;
  if(option) { this.config(option); }
}


//regexp cache
State$1.rCache = {};

_$1.extend( _$1.emitable( State$1 ), {
  
  state: function(stateName, config){
    var this$1 = this;

    if(_$1.typeOf(stateName) === "object"){
      for(var i in stateName){
        this$1.state(i, stateName[i])
      }
      return this;
    }
    var current, next, nextName, states = this._states, i=0;

    if( typeof stateName === "string" ) { stateName = stateName.split("."); }

    var slen = stateName.length, current = this;
    var stack = [];


    do{
      nextName = stateName[i];
      next = states[nextName];
      stack.push(nextName);
      if(!next){
        if(!config) { return; }
        next = states[nextName] = new State$1();
        _$1.extend(next, {
          parent: current,
          manager: current.manager || current,
          name: stack.join("."),
          currentName: nextName
        })
        current.hasNext = true;
        next.configUrl();
      }
      current = next;
      states = next._states;
    }while((++i) < slen )

    if(config){
       next.config(config);
       return this;
    } else {
      return current;
    }
  },

  config: function(configure){
    var this$1 = this;


    configure = this._getConfig(configure);

    for(var i in configure){
      var prop = configure[i];
      switch(i){
        case "url": 
          if(typeof prop === "string"){
            this$1.url = prop;
            this$1.configUrl();
          }
          break;
        case "events": 
          this$1.on(prop)
          break;
        default:
          this$1[i] = prop;
      }
    }
  },

  // children override
  _getConfig: function(configure){
    return typeof configure === "function"? {enter: configure} : configure;
  },

  //from url 

  configUrl: function(){
    var url = "" , base = this, currentUrl;
    var _watchedParam = [];

    while( base ){

      url = (typeof base.url === "string" ? base.url: (base.currentName || "")) + "/" + url;

      // means absolute;
      if(url.indexOf("^/") === 0) {
        url = url.slice(1);
        break;
      }
      base = base.parent;
    }
    this.pattern = _$1.cleanPath("/" + url);
    var pathAndQuery = this.pattern.split("?");
    this.pattern = pathAndQuery[0];
    // some Query we need watched

    _$1.extend(this, _$1.normalize(this.pattern), true);
  },
  encode: function(param){
    var state = this;
    param = param || {};
    
    var matched = "%";

    var url = state.matches.replace(/\(([\w-]+)\)/g, function(all, capture){
      var sec = param[capture] || "";
      matched+= capture + "%";
      return sec;
    }) + "?";

    // remained is the query, we need concat them after url as query
    for(var i in param) {
      if( matched.indexOf("%"+i+"%") === -1) { url += i + "=" + param[i] + "&"; }
    }
    return _$1.cleanPath( url.replace(/(?:\?|&)$/,"") )
  },
  decode: function( path ){
    var matched = this.regexp.exec(path),
      keys = this.keys;

    if(matched){

      var param = {};
      for(var i =0,len=keys.length;i<len;i++){
        param[keys[i]] = matched[i+1] 
      }
      return param;
    }else{
      return false;
    }
  },
  // by default, all lifecycle is permitted

  async: function(){
    throw new Error( 'please use option.async instead')
  }

})


var state = State$1;

var browser$1 = createCommonjsModule(function (module) {
var win = window, 
  doc = document;

var b = module.exports = {
  hash: "onhashchange" in win && (!doc.documentMode || doc.documentMode > 7),
  history: win.history && "onpopstate" in win,
  location: win.location,
  getHref: function(node){
    return "href" in node ? node.getAttribute("href", 2) : node.getAttribute("href");
  },
  on: "addEventListener" in win ?  // IE10 attachEvent is not working when binding the onpopstate, so we need check addEventLister first
      function(node,type,cb){return node.addEventListener( type, cb )}
    : function(node,type,cb){return node.attachEvent( "on" + type, cb )},
    
  off: "removeEventListener" in win ? 
      function(node,type,cb){return node.removeEventListener( type, cb )}
    : function(node,type,cb){return node.detachEvent( "on" + type, cb )}
}
});

// MIT
// Thx Backbone.js 1.1.2  and https://github.com/cowboy/jquery-hashchange/blob/master/jquery.ba-hashchange.js
// for iframe patches in old ie.

var browser = browser$1;
var _$2 = util;


// the mode const
var QUIRK = 3;
var HASH = 1;
var HISTORY = 2;



// extract History for test
// resolve the conficlt with the Native History
function Histery$1(options){
  options = options || {};

  // Trick from backbone.history for anchor-faked testcase 
  this.location = options.location || browser.location;

  // mode config, you can pass absolute mode (just for test);
  this.html5 = options.html5;
  this.mode = options.html5 && browser.history ? HISTORY: HASH; 
  if( !browser.hash ) { this.mode = QUIRK; }
  if(options.mode) { this.mode = options.mode; }

  // hash prefix , used for hash or quirk mode
  this.prefix = "#" + (options.prefix || "") ;
  this.rPrefix = new RegExp(this.prefix + '(.*)$');
  this.interval = options.interval || 66;

  // the root regexp for remove the root for the path. used in History mode
  this.root = options.root ||  "/" ;
  this.rRoot = new RegExp("^" +  this.root);

  this._fixInitState();

  this.autolink = options.autolink!==false;

  this.curPath = undefined;
}

_$2.extend( _$2.emitable(Histery$1), {
  // check the 
  start: function(){
    var path = this.getPath();
    this._checkPath = _$2.bind(this.checkPath, this);

    if( this.isStart ) { return; }
    this.isStart = true;

    if(this.mode === QUIRK){
      this._fixHashProbelm(path); 
    }

    switch ( this.mode ){
      case HASH: 
        browser.on(window, "hashchange", this._checkPath); 
        break;
      case HISTORY:
        browser.on(window, "popstate", this._checkPath);
        break;
      case QUIRK:
        this._checkLoop();
    }
    // event delegate
    this.autolink && this._autolink();

    this.curPath = path;

    this.emit("change", path);
  },
  // the history teardown
  stop: function(){

    browser.off(window, 'hashchange', this._checkPath)  
    browser.off(window, 'popstate', this._checkPath)  
    clearTimeout(this.tid);
    this.isStart = false;
    this._checkPath = null;
  },
  // get the path modify
  checkPath: function(ev){

    var path = this.getPath(), curPath = this.curPath;

    //for oldIE hash history issue
    if(path === curPath && this.iframe){
      path = this.getPath(this.iframe.location);
    }

    if( path !== curPath ) {
      this.iframe && this.nav(path, {silent: true});
      this.curPath = path;
      this.emit('change', path);
    }
  },
  // get the current path
  getPath: function(location){
    var location = location || this.location, tmp;
    if( this.mode !== HISTORY ){
      tmp = location.href.match(this.rPrefix);
      return tmp && tmp[1]? tmp[1]: "";

    }else{
      return _$2.cleanPath(( location.pathname + location.search || "" ).replace( this.rRoot, "/" ))
    }
  },

  nav: function(to, options ){

    var iframe = this.iframe;

    options = options || {};

    to = _$2.cleanPath(to);

    if(this.curPath == to) { return; }

    // pushState wont trigger the checkPath
    // but hashchange will
    // so we need set curPath before to forbit the CheckPath
    this.curPath = to;

    // 3 or 1 is matched
    if( this.mode !== HISTORY ){
      this._setHash(this.location, to, options.replace)
      if( iframe && this.getPath(iframe.location) !== to ){
        if(!options.replace) { iframe.document.open().close(); }
        this._setHash(this.iframe.location, to, options.replace)
      }
    }else{
      history[options.replace? 'replaceState': 'pushState']( {}, options.title || "" , _$2.cleanPath( this.root + to ) )
    }

    if( !options.silent ) { this.emit('change', to); }
  },
  _autolink: function(){
    if(this.mode!==HISTORY) { return; }
    // only in html5 mode, the autolink is works
    // if(this.mode !== 2) return;
    var prefix = this.prefix, self = this;
    browser.on( document.body, "click", function(ev){

      var target = ev.target || ev.srcElement;
      if( target.tagName.toLowerCase() !== "a" ) { return; }
      var tmp = (browser.getHref(target)||"").match(self.rPrefix);
      var hash = tmp && tmp[1]? tmp[1]: "";

      if(!hash) { return; }
      
      ev.preventDefault && ev.preventDefault();
      self.nav( hash )
      return (ev.returnValue = false);
    } )
  },
  _setHash: function(location, path, replace){
    var href = location.href.replace(/(javascript:|#).*$/, '');
    if (replace){
      location.replace(href + this.prefix+ path);
    }
    else { location.hash = this.prefix+ path; }
  },
  // for browser that not support onhashchange
  _checkLoop: function(){
    var self = this; 
    this.tid = setTimeout( function(){
      self._checkPath();
      self._checkLoop();
    }, this.interval );
  },
  // if we use real url in hash env( browser no history popstate support)
  // or we use hash in html5supoort mode (when paste url in other url)
  // then , histery should repara it
  _fixInitState: function(){
    var pathname = _$2.cleanPath(this.location.pathname), hash, hashInPathName;

    // dont support history popstate but config the html5 mode
    if( this.mode !== HISTORY && this.html5){

      hashInPathName = pathname.replace(this.rRoot, "")
      if(hashInPathName) { this.location.replace(this.root + this.prefix + hashInPathName); }

    }else if( this.mode === HISTORY /* && pathname === this.root*/){

      hash = this.location.hash.replace(this.prefix, "");
      if(hash) { history.replaceState({}, document.title, _$2.cleanPath(this.root + hash)) }

    }
  },
  // Thanks for backbone.history and https://github.com/cowboy/jquery-hashchange/blob/master/jquery.ba-hashchange.js
  // for helping stateman fixing the oldie hash history issues when with iframe hack
  _fixHashProbelm: function(path){
    var iframe = document.createElement('iframe'), body = document.body;
    iframe.src = 'javascript:;';
    iframe.style.display = 'none';
    iframe.tabIndex = -1;
    iframe.title = "";
    this.iframe = body.insertBefore(iframe, body.firstChild).contentWindow;
    this.iframe.document.open().close();
    this.iframe.location.hash = '#' + path;
  }
  
})





var histery = Histery$1;

var State = state;
var Histery = histery;
var _ = util;
var baseTitle = document.title;
var stateFn = State.prototype.state;


function StateMan$1(options){

  if(this instanceof StateMan$1 === false){ return new StateMan$1(options)}
  options = options || {};
  // if(options.history) this.history = options.history;

  this._states = {};
  this._stashCallback = [];
  this.strict = options.strict;
  this.current = this.active = this;
  this.title = options.title;
  this.on("end", function(){
    var cur = this.current,title;
    while( cur ){
      title = cur.title;
      if(title) { break; } 
      cur = cur.parent;
    }
    document.title = typeof title === "function"? cur.title(): String( title || baseTitle ) ;
  })

}


_.extend( _.emitable( StateMan$1 ), {
    // keep blank
    name: '',

    state: function(stateName, config){

      var active = this.active;
      if(typeof stateName === "string" && active){
         stateName = stateName.replace("~", active.name)
         if(active.parent) { stateName = stateName.replace("^", active.parent.name || ""); }
      }
      // ^ represent current.parent
      // ~ represent  current
      // only 
      return stateFn.apply(this, arguments);

    },
    start: function(options){

      if( !this.history ) { this.history = new Histery(options); } 
      if( !this.history.isStart ){
        this.history.on("change", _.bind(this._afterPathChange, this));
        this.history.start();
      } 
      return this;

    },
    stop: function(){
      this.history.stop();
    },
    // @TODO direct go the point state
    go: function(state$$1, option, callback){
      option = option || {};
      if(typeof state$$1 === "string") { state$$1 = this.state(state$$1); }

      if(!state$$1) { return; }

      if(typeof option === "function"){
        callback = option;
        option = {};
      }

      if(option.encode !== false){
        var url = state$$1.encode(option.param)
        option.path = url;
        this.nav(url, {silent: true, replace: option.replace});
      }

      this._go(state$$1, option, callback);

      return this;
    },
    nav: function(url, options, callback){
      if(typeof options === "function"){
        callback = options;
        options = {};
      }
      options = options || {};

      options.path = url;

      this.history.nav( url, _.extend({silent: true}, options));
      if(!options.silent) { this._afterPathChange( _.cleanPath(url) , options , callback) }

      return this;
    },
    decode: function(path){

      var pathAndQuery = path.split("?");
      var query = this._findQuery(pathAndQuery[1]);
      path = pathAndQuery[0];
      var state$$1 = this._findState(this, path);
      if(state$$1) { _.extend(state$$1.param, query); }
      return state$$1;

    },
    encode: function(stateName, param){
      var state$$1 = this.state(stateName);
      return state$$1? state$$1.encode(param) : '';
    },
    // notify specify state
    // check the active statename whether to match the passed condition (stateName and param)
    is: function(stateName, param, isStrict){
      if(!stateName) { return false; }
      var stateName = (stateName.name || stateName);
      var current = this.current, currentName = current.name;
      var matchPath = isStrict? currentName === stateName : (currentName + ".").indexOf(stateName + ".")===0;
      return matchPath && (!param || _.eql(param, this.param)); 
    },
    // after pathchange changed
    // @TODO: afterPathChange need based on decode
    _afterPathChange: function(path, options ,callback){

      this.emit("history:change", path);

      var found = this.decode(path);

      options = options || {};

      options.path = path;

      if(!found){
        // loc.nav("$default", {silent: true})
        return this._notfound(options);
      }

      options.param = found.param;

      this._go( found, options, callback );
    },
    _notfound: function(options){

      // var $notfound = this.state("$notfound");

      // if( $notfound ) this._go($notfound, options);

      return this.emit("notfound", options);
    },
    // goto the state with some option
    _go: function(state$$1, option, callback){

      var over;

      // if(typeof state === "string") state = this.state(state);

      // if(!state) return _.log("destination is not defined")

      if(state$$1.hasNext && this.strict) { return this._notfound({name: state$$1.name}); }

      // not touch the end in previous transtion

      // if( this.pending ){
      //   var pendingCurrent = this.pending.current;
      //   this.pending.stop();
      //   _.log("naving to [" + pendingCurrent.name + "] will be stoped, trying to ["+state.name+"] now");
      // }
      // if(this.active !== this.current){
      //   // we need return
      //   _.log("naving to [" + this.current.name + "] will be stoped, trying to ["+state.name+"] now");
      //   this.current = this.active;
      //   // back to before
      // }
      option.param = option.param || {};

      var current = this.current,
        baseState = this._findBase(current, state$$1),
        prepath = this.path,
        self = this;


      if( typeof callback === "function" ) { this._stashCallback.push(callback); }
      // if we done the navigating when start
      function done(success){
        over = true;
        if( success !== false ) { self.emit("end"); }
        self.pending = null;
        self._popStash(option);
      }
      
      option.previous = current;
      option.current = state$$1;

      if(current !== state$$1){
        option.stop = function(){
          done(false);
          self.nav( prepath? prepath: "/", {silent:true});
        }
        self.emit("begin", option);

      }
      // if we stop it in 'begin' listener
      if(over === true) { return; }

      if(current !== state$$1){
        // option as transition object.

        option.phase = 'permission';
        this._walk(current, state$$1, option, true , _.bind( function( notRejected ){

          if( notRejected===false ){
            // if reject in callForPermission, we will return to old 
            prepath && this.nav( prepath, {silent: true})

            done(false, 2)

            return this.emit('abort', option);

          } 

          // stop previous pending.
          if(this.pending) { this.pending.stop() } 
          this.pending = option;
          this.path = option.path;
          this.current = option.current;
          this.param = option.param;
          this.previous = option.previous;
          option.phase = 'navigation';
          this._walk(current, state$$1, option, false, _.bind(function( notRejected ){

            if( notRejected === false ){
              this.current = this.active;
              done(false)
              return this.emit('abort', option);
            }


            this.active = option.current;

            option.phase = 'completion';
            return done()

          }, this) )

        }, this) )

      }else{
        self._checkQueryAndParam(baseState, option);
        this.pending = null;
        done();
      }
      
    },
    _popStash: function(option){
      var this$1 = this;


      var stash = this._stashCallback, len = stash.length;

      this._stashCallback = [];

      if(!len) { return; }

      for(var i = 0; i < len; i++){
        stash[i].call(this$1, option)
      }
    },

    // the transition logic  Used in Both canLeave canEnter && leave enter LifeCycle

    _walk: function(from, to, option, callForPermit , callback){

      // nothing -> app.state
      var parent = this._findBase(from , to);


      option.basckward = true;
      this._transit( from, parent, option, callForPermit , _.bind( function( notRejected ){

        if( notRejected === false ) { return callback( notRejected ); }

        // only actual transiton need update base state;
        if( !callForPermit )  { this._checkQueryAndParam(parent, option) }

        option.basckward = false;
        this._transit( parent, to, option, callForPermit,  callback)

      }, this) )

    },

    _transit: function(from, to, option, callForPermit, callback){
      //  touch the ending
      if( from === to ) { return callback(); }

      var back = from.name.length > to.name.length;
      var method = back? 'leave': 'enter';
      var applied;

      // use canEnter to detect permission
      if( callForPermit) { method = 'can' + method.replace(/^\w/, function(a){ return a.toUpperCase() }); }

      var loop = _.bind(function( notRejected ){


        // stop transition or touch the end
        if( applied === to || notRejected === false ) { return callback(notRejected); }

        if( !applied ) {

          applied = back? from : this._computeNext(from, to);

        }else{

          applied = this._computeNext(applied, to);
        }

        if( (back && applied === to) || !applied ){ return callback( notRejected ) }

        this._moveOn( applied, method, option, loop );

      }, this);

      loop();
    },

    _moveOn: function( applied, method, option, callback){

      var isDone = false;
      var isPending = false;

      option.async = function(){

        isPending = true;

        return done;
      }

      function done( notRejected ){
        if( isDone ) { return; }
        isPending = false;
        isDone = true;
        callback( notRejected );
      }

      

      option.stop = function(){
        done( false );
      }


      this.active = applied;
      var retValue = applied[method]? applied[method]( option ): true;

      if(method === 'enter') { applied.visited = true; }
      // promise
      // need breadk , if we call option.stop first;

      if( _.isPromise(retValue) ){

        return this._wrapPromise(retValue, done); 

      }

      // if haven't call option.async yet
      if( !isPending ) { done( retValue ) }

    },


    _wrapPromise: function( promise, next ){

      return promise.then( next, function(){next(false)}) ;

    },

    _computeNext: function( from, to ){

      var fname = from.name;
      var tname = to.name;

      var tsplit = tname.split('.')
      var fsplit = fname.split('.')

      var tlen = tsplit.length;
      var flen = fsplit.length;

      if(fname === '') { flen = 0; }
      if(tname === '') { tlen = 0; }

      if( flen < tlen ){
        fsplit[flen] = tsplit[flen];
      }else{
        fsplit.pop();
      }

      return this.state(fsplit.join('.'))

    },

    _findQuery: function(querystr){

      var queries = querystr && querystr.split("&"), query= {};
      if(queries){
        var len = queries.length;
        var query = {};
        for(var i =0; i< len; i++){
          var tmp = queries[i].split("=");
          query[tmp[0]] = tmp[1];
        }
      }
      return query;

    },
    _findState: function(state$$1, path){
      var this$1 = this;

      var states = state$$1._states, found, param;

      // leaf-state has the high priority upon branch-state
      if(state$$1.hasNext){
        for(var i in states) { if(states.hasOwnProperty(i)){
          found = this$1._findState( states[i], path );
          if( found ) { return found; }
        } }
      }
      // in strict mode only leaf can be touched
      // if all children is don. will try it self
      param = state$$1.regexp && state$$1.decode(path);
      if(param){
        state$$1.param = param;
        return state$$1;
      }else{
        return false;
      }
    },
    // find the same branch;
    _findBase: function(now, before){

      if(!now || !before || now == this || before == this) { return this; }
      var np = now, bp = before, tmp;
      while(np && bp){
        tmp = bp;
        while(tmp){
          if(np === tmp) { return tmp; }
          tmp = tmp.parent;
        }
        np = np.parent;
      }
    },
    // check the query and Param
    _checkQueryAndParam: function(baseState, options){

      var from = baseState;
      while( from !== this ){
        from.update && from.update(options);
        from = from.parent;
      }

    }

}, true)



var stateman = StateMan$1;

var StateMan = stateman;
StateMan.Histery = histery;
StateMan.util = util;
StateMan.State = state;

var index = StateMan;

// import CircularJSON from '../utils/circular-json';

var view = function (Component) {
	var RouterView = Component.extend( {
		name: 'router-view',
		template: "\n\t\t\t<i ref=\"v\"></i>\n\t\t",
		config: function config() {
			this._commentInserted = false;

			var $router = this.$router;
			var name = this.data.name || 'default';

			$router.emit( 'add-router-view', {
				phase: this.$root.__phase__,
				key: name,
				value: this
			} );

			// console.log( '>', name, CircularJSON.parse( CircularJSON.stringify( $router.current ) ) );

			this.$mute( true );
		},
		init: function init() {
			if( !this._comment ) {
				this._comment = document.createComment( 'router-view' );
			}
		},
		clear: function clear() {
			if( this._prevcomponent ) {
				this._prevcomponent.$inject( false );
				this._prevcomponent.destroy();
			}
		},
		update: function update() {
			var prevComponent = this._prevcomponent;
			if ( prevComponent ) {
				if (
					prevComponent.route &&
					typeof prevComponent.route.update === 'function'
				) {
					prevComponent.route.update.call( prevComponent );
				}
				prevComponent.$update();
			}
		},
		render: function render( component ) {
			var comment = this._comment;
			if ( !this._commentInserted ) {
				insertAfter( comment, this.$refs.v );
				this._commentInserted = true;
			}

			if ( this.$refs.v && this.$refs.v.parentNode ) {
				this.$refs.v.parentNode.removeChild( this.$refs.v );
				delete this.$refs.v;
			}

			if ( !component ) {
				// this.clear();
				return;
			}
			if ( comment.parentNode ) {
				component.$inject( comment, 'after' );
			}

			this._prevcomponent = component;
		}
	} );
}

function insertAfter( node, refer ) {
	var next = refer.nextSibling;

	if( next ){
		next.parentNode.insertBefore( node, next );
	} else {
		refer.parentNode.appendChild( node );
	}
}

var link = function (Regular) {
	Regular.extend({
		name: 'router-link',
		template: "\n\t\t\t<a href=\"{ to }\">{#inc this.$body}</a>\n\t\t"
	});
}

// maybe Regular or extended from Regular, either is ok
var _Component;

var setCtor = function (Component) {
	_Component = Component;
};

var getCtor = function () {
	return _Component;
};

function each( obj, fn ) {
	var keys = Object.keys( obj );
	for ( var i = 0, len = keys.length; i < len; i++ ) {
		var key = keys[ i ];
		fn( obj[ key ], key, obj );
	}
}

var id = 0;
function walk( obj, fn, name ) {
	each( obj, function (v) {
		var currentName = v.name || ("annoymous_" + (id++));
		var path = name ? (name + "." + currentName) : currentName;
		fn( v, path );
		if ( v.children ) {
			walk( v.children, fn, path );
		}
	} );
}

function digestComponentDeps( routes ) {
	var Component = getCtor();
	var dirty = false;
	var ttl = 20;

	// handle components deps
	function walkComponents( extendOptions ) {
		// first and no deps
		if ( !extendOptions.components && !extendOptions._Ctor ) {
			extendOptions._Ctor = Component.extend( extendOptions );
			return;
		}

		var cps = extendOptions.components;

		// deps are ready
		var isReady = true;
		for ( var i in cps ) {
			if ( !cps[ i ]._Ctor ) {
				isReady = false;
				break;
			}
		}

		if ( isReady ) {
			var Ctor = Component.extend( extendOptions );
			// register component on Ctor
			for ( var i$1 in cps ) {
				Ctor.component( i$1, cps[ i$1 ]._Ctor )
			}
			extendOptions._Ctor = Ctor;
			return;
		}

		// if exists deps, and deps are not ready, mark as dirty, wait for next digest
		dirty = true;

		for ( var i$2 in cps ) {
			walkComponents( cps[ i$2 ] );
		}
	}

	function digestOne() {
		// reset
		dirty = false;

		walk( routes, function( route ) {
			var components = route.components || {};
			// combine
			if ( route.component ) {
				components[ 'default' ] = route.component;
			}
			for ( var i in components ) {
				walkComponents( components[ i ] );
			}
		} );

		ttl--;

		if ( !ttl ) {
			// error
			throw new Error( "components dependencies parse failed" );
		}

		if ( dirty && ttl ) {
			// next digest
			digestOne();
		}
	}

	digestOne();
}

var checkPurview = function ( e, hookName, components, cb ) {
	var done = e.async();
	var current = e.current;
	var go = e.go;

	var len = Object.keys( components ).length;

	function next() {
		len--;

		if( len === 0 ) {
			done();
			cb && cb();
		}
	}

	for ( var i in components ) {
		var component = components[ i ];
		var canTransition = component.route && component.route[ hookName ];
		if ( !canTransition ) {
			next();
		} else {
			canTransition( {
				route: current,
				redirect: go,
				next: next
			} );
		}
	}
};

var Router = function Router( options ) {
	// directly call
	if ( !( this instanceof Router ) ) {
		setCtor( options );
		return;
	}

	// new
	this._options = options;
};
Router.prototype.start = function start ( selector ) {
	var rootNode =
		( selector && document.querySelector( selector ) ) ||
		document.body;
	var Component = getCtor();

	if ( !Component ) {
		throw new Error( 'regular-router not initialized yet' );
	}

	// make stateman avaiable for all Regular instances
	var stateman = new index();
	Component.implement({
		$router: stateman
	});

	// register helper components
	Component.use( view );
	Component.use( link );

	// get routes from options.routes
	var ref = this._options;
		var routes = ref.routes;

	// flat
	var routeMap = {};
	walk( routes, function( route, name ) {
		if ( !~name.indexOf( '.' ) ) {
			route.isRootRoute = true;
		}
		routeMap[ name ] = route;
	} );

	// digest components dependencies
	digestComponentDeps( routes );

	var routerViewStack = {};
	stateman.on( {
		'add-router-view': function( ref ) {
				var phase = ref.phase;
				var key = ref.key;
				var value = ref.value;

			routerViewStack[ phase ] = routerViewStack[ phase ] || {};
			routerViewStack[ phase ][ key ] = value;
		},
		// 'purge-router-view': function( { phase } ) {
		// routerViewStack[ phase ] = {};
		// }
	} );

	// transform routes
	var transformedRoutes = {};
	var loop = function ( name ) {
		var route = routeMap[ name ];
		var parentName = name.split( '.' ).slice( 0, -1 ).join( '.' );
		var component = route.component;
		var components = route.components || {};
		var CtorMap = {};

		// combine
		if ( !components[ 'default' ] && component ) {
			components[ 'default' ] = component;
		}

		// fallback to route.url
		var url = route.path;
		if ( typeof url === 'undefined' ) {
			url = route.url;
		}

		transformedRoutes[ name ] = {
			url: url,
			update: function update( e ) {
				console.log( '@@route', name, 'update' );

				var current = e.current;
				var routerViews = routerViewStack[ parentName ];

				// update router-view
				if ( routerViews ) {
					for ( var i in routerViews ) {
						var routerView = routerViews[ i ];
						routerView.update();
					}
				}
			},
			enter: function enter( e ) {
				console.log( '@@route', name, 'enter' );

				var current = e.current;
				var instanceMap = {};

				// initialize component ctors
				CtorMap[ name ] = {};

				for ( var i in components ) {
					var cp = components[ i ];
					CtorMap[ name ][ i ] = cp._Ctor;
				}

				// get instances, and routerViews will be mounted
				for ( var i$1 in CtorMap[ name ] ) {
					instanceMap[ i$1 ] = new CtorMap[ name ][ i$1 ]({
						__phase__: name,
						__view__: i$1
					});
				}

				var routerViews = routerViewStack[ parentName ];

				// render router-view
				if ( routerViews ) {
					for ( var i$2 in routerViews ) {
						var routerView = routerViews[ i$2 ];
						routerView.render( instanceMap[ i$2 ] );
					}
				}

				if ( route.isRootRoute ) {
					instanceMap[ 'default' ] && instanceMap[ 'default' ].$inject( rootNode );
				}
			},
			canEnter: function canEnter( e ) {
				checkPurview( e, 'canEnter', components );
			},
			canLeave: function canLeave( e ) {
				checkPurview( e, 'canLeave', components );
			},
			leave: function leave( e ) {
				console.log( '@@route', name, 'leave' );

				var current = e.current;
				var routerViews = routerViewStack[ parentName ];

				// clean router-view
				if ( routerViews ) {
					for ( var i in routerViews ) {
						var routerView = routerViews[ i ];
						routerView.clear();
					}
				}
			}
		};
	};

		for ( var name in routeMap ) loop( name );

	stateman.state( transformedRoutes );

	stateman.start( {
		prefix: '!'
	} );
};

return Router;

})));
