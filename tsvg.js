(function(global,undefined){
  // usually aliased as $v in global namespace
  // depending on parameters, either
  // a) generates a 2d vector
  // b) generates or updates SVG element
  var XLINKNS="http://www.w3.org/1999/xlink"
  function planeLib(a1,a2) {
    if(1==arguments.length ) {
      if( _.isArray(a1) && 2==a1.length) {
        return makePoint(a1[0],a1[1])
      } else if( _.isObject(a1) && _.has(a1,'x') && _.has(a1,'y') ) {
        return makePoint(a1.x,a1.y)
      } else {
        return planeLib(a1,{})
      }
    } else if( 2==arguments.length && !_.isObject(a1) && !_.isObject(a2) ) {
      return makePoint(a1,a2)
    }
    var tag
    if( _.isString(a1) ) {
      tag=document.createElementNS('http://www.w3.org/2000/svg',a1);
      if( 'svg'===a1 ) {
        tag.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", XLINKNS);
      }
    } else if( _.isObject(a1) ) {
      tag=a1
    }
    // fill attributes
    _.each(a2,function(v,k){
      //console.log('k=',k,'v=',v)
      // arrays are assumed list of tokens and are unfolded to strings
      if( _.isArray(v) ) v=pathString(v)
      // assignment
      if('href'==k) tag.setAttributeNS(XLINKNS, "href", v);
      else if( 'xlink:'===k.substr(0,6) ) tag.setAttributeNS(XLINKNS, k.substr(6), v);
      else if( 'on'===k.substr(0,2) && _.isFunction(v) ) tag.addEventListener(k.substr(2),v)
      else tag.setAttribute(k,v)
    })
    for( var i=2; i<arguments.length; ++i ) {
      // console.log(i,'-th:',typeof(arguments[i]))
      if( _.isArray(arguments[i] ) ) {
        arguments.callee.apply(this,[tag,{}].concat(arguments[i]))
      } else if( !_.isObject(arguments[i])) {
        if( !_.isUndefined(arguments[i]) )
          tag.appendChild(document.createTextNode(arguments[i]))
      } else {
        tag.appendChild(arguments[i])
      }
    }
    return tag
  }

  function makePoint(x,y) {
    return new Vector2D(x,y)
  }

// can be initialized with another 2D vector, 2 element array or explicit x and
// y coordinates
var Vector2D=function V2D(x,y)
{
  if( _.has(x,'x') && _.has(x,'y') ) {
    this.x=x.x
    this.y=x.y
  } else if( _.isArray(x) && 2==x.length ) {
    this.x=x[0]
    this.y=x[1]
  } else {
    this.x=x
    this.y=y
  }
  this.x=parseFloat(this.x)||0
  this.y=parseFloat(this.y)||0
}

// f is a function which takes Vector2D argument
// this operator converts 1 object, 1 array or 2 numbers to Vector2D and passes
// it onto f
function acceptsvector(f)
{
  return function(arg,argopt) {
  if( 1==arguments.length ) {
    if( _.isArray(arg) ) return f.call(this,new Vector2D(arg[0],arg[1]))
    else if( _.isObject(arg) ) return f.call(this,arg) 
  } else
  if( 2==arguments.length && !_.isObject(arg) && !_.isObject(argopt) ) return f.call(this,new Vector2D(arg,argopt))
  throw new Error(arguments.length+" arguments, possibly wrong type")
  }
}

var RFD=180/Math.PI;
function dfr(rad){return rad*RFD}
function rfd(deg){return deg/RFD}

_.extend(Vector2D.prototype,{
  toString:function(){return '$v('+this.x+','+this.y+')'},
  add:acceptsvector(function(v){return new Vector2D(this.x+v.x,this.y+v.y)}),
  sub:acceptsvector(function(v){return new Vector2D(this.x-v.x,this.y-v.y)}),
  dot:acceptsvector(function(v){return this.x*v.x+this.y*v.y}),
  mul:function(s,sy=s){return new Vector2D(this.x*s,this.y*sy)},
  length:function(){return Math.sqrt(this.x*this.x+this.y*this.y)},
  argument:function(){return Math.atan2(this.y,this.x)},
  rotate:function(a){
  // positive direction is clockwise because Y axis is downward
    var ca=Math.cos(a)
    var sa=Math.sin(a)
    return new Vector2D(this.x*ca-this.y*sa,this.x*sa+this.y*ca)
  },
  rename:function(xname,yname) {
    if( 0==arguments.length ) return [this.x,this.y];
    if( 1==arguments.length )
      if(_.isArray(xname) ) return this.rename.apply(this,xname)
      else yname=xname.replace("x","y") // need "g"?
    var r={}
    r[xname]=this.x
    r[yname]=this.y
    return r
  }
});

// method aliases
_.each([
  ['scale','mul'],
  ['direction','argument'],
  ['dir','argument'],
  ['ren','rename']
],function(p){Vector2D.prototype[p[0]]=Vector2D.prototype[p[1]]});


var MINARCSPAN=Math.PI/4;

// basic bezier arc from point to point with a given angular span
// aspan=0 gets straight line
// aspan>0 arc curves in positive direction
// aspan<0 arc curves in negative direction
// all ther modes of arcs are coerced to this case
// from and to are 2d vectors, aspan is in radians
function arcBezier0(from,to,aspan,minspan) {
    var v=to.sub(options.from).mul(1/(3*Math.pow(Math.cos(aspan/4),2)))
    return [
      [from,from.add(v.rotate(-aspan/2)),to.sub(v.rotate(aspan/2)),to]
    ]
}

// return array of 4-pt arrays, each array being complete bezier segment
// it is up to a caller to chain them together into a valid path commands
//
// options -- any sufficient combination of
// cx cy -- center
// center -- center V2D
// r -- radius
// from to -- start and end of an arc, V2D
// a1 a2 -- angular start/end
// aspan -- angular extent of an arc
// a1d a2d aspand -- same in degrees
// return array of 4-pt arrays, each array being complete bezier segment
// center,r,a1,a2
// center,from,a2
// r=|from-center|
// r=|to-center|
// a1=(from-center).argument()
// a2=(to-center).argument()
// aspan=a2-a1
// center=f(from,a1,to,a2)
// center=f(from,to,aspan)
// center=from - (r,0).rotate(a1)
function arcBezier(options)
{
  // have: from to aspan
  var ho=function(opt) { return _.has(options,opt) }
  if( ho('from') ) { options.from=new Vector2D(options.from) }
  if( ho('to') ) { options.to=new Vector2D(options.to) }
  // angular options without suffix -d have priority if conflict
  _.each(['a1','a2','aspan','minspan'],function(name){
    if( ho(name+'d') && !ho(name) )
      options[name]=rfd(options[name+'d'])
  })
  if(!ho('aspan') && ho('a1') && ho('a2')) {
    options.aspan=options.a2-options.a1
  }
  _.defaults(options,{minspan:MINARCSPAN})
  var aspan=options.aspan
  // alternative center specification (if conflicts, center is priority)
  if( ho('cx') && ho('cy') && !ho('center') ) options.center=new Vector2D(options.cx,options.cy);

  // mode 0: center, radius, start angle, end angle
  if( ho('center') && ( !ho('from') || !ho('to')) ) {
    var c=new Vector2D(options.center);
    options.from=c.add(new Vector2D(options.r).rotate(options.a1))
    options.to  =c.add(new Vector2D(options.r).rotate(options.a2))
  }
  if( Math.abs(aspan)<=options.minspan ) {
    var v=options.to.sub(options.from).mul(1/(3*Math.pow(Math.cos(aspan/4),2)))
    return [[options.from,options.from.add(v.rotate(-aspan/2)),options.to.sub(v.rotate(aspan/2)),options.to]]
  } else if(_.has(options,'center')) {
    var o={center:options.center,r:options.r,a1:options.a1,a2:options.a2}
    return arcBezier(_.extend({},o,{a2:options.a1+aspan/2})).concat(arcBezier(_.extend({},o,{a1:options.a2-aspan/2})))
  } else {
    var o={from:options.from,to:options.to,aspan:aspan/2}
    // height of an circular segment is |to-from|*tan(aspan/4)
    // midpoint is from+(to-from)/2+rot(90,to-from)*tan(aspan/4)
    // when aspan is negative, its tan is also negative
    var mid=options.to.sub(options.from).rotate($v.rfd(-90)).mul(0.5*Math.tan(aspan/4));
    mid=options.to.add(options.from).mul(0.5).add(mid)
    return arcBezier(_.extend({},o,{to:mid})).concat(arcBezier(_.extend({},o,{from:mid})))
    
  }
  // TODO: detect other insufficient cases
  // console.assert(false, 'Not implemented branch of arcBezier');
  // TODO: parse other possible cases and convert them to c,r,a1,a2 or
  // from,to,aspan
  // TODO: c,from,aspan  c,to,aspan  c,from,a2  c,to,a1
  // TODO: tangents: from,r,toward (toward cannot be inside the circle
}

// pos can be 0 or -1
function isdigitat(str,pos) {
  return str.length>0 && 0<="0123456789".indexOf(str.substr(pos,1))
}

var MODULO=1000
function roundnumber(n)
{
  n=parseFloat(n)
  return (Math.round(n*MODULO)/MODULO).toString()
}

function pathString(arr) {
  if( 1!=arguments.length ) return pathString(_.toArray(arguments))
  else return _.foldl(arr,function(path,item){

    if( _.isNumber(item) ) item=roundnumber(item)
    else if( _.isUndefined(item) ) item=''
    else if( _.isArray(item) ) item=pathString(item)
    else if( !_.isObject(item) ) item=item.toString()
    else if( _.has(item,'x') && _.has(item,'y') ) item=roundnumber(item.x)+' '+roundnumber(item.y)

    return path+((isdigitat(path,-1) && isdigitat(item,0))?' ':'')+item
  },'')
}
  _.extend(planeLib,{
    // TODO:change name, "normalize" is not descriptive
    normalize:acceptsvector
    //,acceptsvector:acceptsvector
    ,path:pathString
    ,string:pathString
    ,rfd:rfd
    ,dfr:dfr

    // $v.arcpath('M',{arcoptions}) for first
    // $v.arcpath({arcoptions}) for rest
    ,arcpath:function(initial,arcoptions) {
      // join complete bezier segments possibly including intial element
      var r=[]
      var segments
      var options
      if( _.isString(initial) ) {
        segments=arcBezier(arcoptions)
        r.push(initial,segments[0][0])
      } else if( _.isObject(initial) && 1==arguments.length ) {
        segments=arcBezier(initial)
      } else return;
      _.each(segments,function(seg) {
        r.push('C',seg.slice(1)) // full segment definition
        // r.push('S',seg.slice(2)) // shortcut because symmetric, sometimes not right
      })
      return r
    }
    // apply trns to all 2d-vertex-like elements of list at all depths
    // undefined trns means no tranform (identity)
    ,transform:function(list,trns) {
      if(!trns) return list
      if( _.isArray(list) && list.length==2 && _.isNumber(list[0]) && _.isNumber(list[1])) return trns(makePoint(list[0],list[1]))

      if( _.isObject(list) && _.has(list,'x') && _.has(list,'y')) return trns(makePoint(list.x,list.y))
      if( _.isArray(list) ) return list.map(el=>planeLib.transform(el,trns))
      return list
    }
    ,polar:function(r,phi) {
      return new Vector2D(r*Math.cos(phi),r*Math.sin(phi))
    }
  })
  global.planeLib=planeLib
  global.$v=planeLib
})(this)

