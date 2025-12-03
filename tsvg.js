(function(global,undefined){
  // usually aliased as $v in global namespace
  // depending on parameters, either
  // a) generates a 2d vector
  // b) generates or updates SVG element
  var XLINKNS="http://www.w3.org/1999/xlink"
  var has=(obj,prop)=>obj.hasOwnProperty(prop) // or (prop in obj) for inherited
  var isNumber=v=>'number'===typeof v
  var isObject=v=>'object'==typeof v &&!!v
  var isPtArray=a=>Array.isArray(a) && 2==a.length && isNumber(a[0]) && isNumber(a[1])
  var isPtObj=a=>'object'===typeof a && has(a,'x') && has(a,'y')
  function planeLib(...args) {
    var pt
    if( pt=tryPoint(args) ?? tryPoint(args[0]) ) return pt
    var a1=args[0]
    var tag
    if( 'string'===typeof a1 ) {
      tag=document.createElementNS('http://www.w3.org/2000/svg',a1);
      if( 'svg'===a1 ) {
        tag.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", XLINKNS);
      }
    } else if( isObject(a1) ) {
      tag=a1
    }
    // fill attributes
    Object.entries(args[1]).forEach(([k,v])=>{
      //console.log('k=',k,'v=',v)
      // arrays are assumed list of tokens and are unfolded to strings
      if( Array.isArray(v) ) v=pathString(v)
      // assignment
      if('href'==k) tag.setAttributeNS(XLINKNS, "href", v);
      else if( 'xlink:'===k.substr(0,6) ) tag.setAttributeNS(XLINKNS, k.substr(6), v);
      else if( 'on'===k.substr(0,2) && 'function'===typeof v ) tag.addEventListener(k.substr(2),v)
      else tag.setAttribute(k,v)
    })
    args.slice(2).forEach((arg,i)=>{
      // console.log(i,'-th:',typeof(arg))
      if( Array.isArray(arg) ) {
        planeLib.apply(this,[tag,{},...arg])
      } else if( !isObject(arg)) {
        if( 'undefined'!==typeof arg)
          tag.appendChild(document.createTextNode(arg))
      } else {
        tag.appendChild(arg)
      }
    })
    return tag
  }

  function tryPoint(pt) {
    if(isPtArray(pt)) return new Vector2D(pt[0],pt[1])
    if(isPtObj(pt)) return new Vector2D(pt.x,pt.y)
    if(isObject(pt) && has(pt,'r') && has(pt,'phi') ) return planeLib.polar(pt.r,pt.phi)
    return null
  }

var Vector2D=function V2D(x,y) {
  this.x=parseFloat(x)||0
  this.y=parseFloat(y)||0
}

// f is a function which takes Vector2D argument
// this operator converts 1 object, 1 array or 2 numbers to Vector2D and passes
// it onto f
function acceptsvector(f)
{
  return function(...args) {
    var pt
    if( pt=tryPoint(args) ?? tryPoint(args[0]) ) return f.call(this,pt)
    throw new Error(args.length+" arguments, possibly wrong type")
  }
}

var RFD=180/Math.PI;
function dfr(rad){return rad*RFD}
function rfd(deg){return deg/RFD}

Object.assign(Vector2D.prototype,{
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
      if(Array.isArray(xname) ) return this.rename.apply(this,xname)
      else yname=xname.replace("x","y") // need "g"?
    var r={}
    r[xname]=this.x
    r[yname]=this.y
    return r
  }
});

// method aliases
[
  ['scale','mul'],
  ['direction','argument'],
  ['dir','argument'],
  ['ren','rename']
].forEach(p=>Vector2D.prototype[p[0]]=Vector2D.prototype[p[1]]);


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
  var ho=opt=>has(options,opt)
  if( ho('from') ) { options.from=tryPoint(options.from) }
  if( ho('to') ) { options.to=tryPoint(options.to) }
  // angular options without suffix -d have priority if conflict
  ['a1','a2','aspan','minspan'].forEach(name=>{
    if( ho(name+'d') && !ho(name) )
      options[name]=rfd(options[name+'d'])
  })
  if(!ho('aspan') && ho('a1') && ho('a2')) {
    options.aspan=options.a2-options.a1
  }
  options={minspan:MINARCSPAN,...options}
  var aspan=options.aspan
  // alternative center specification (if conflicts, center is priority)
  if( ho('cx') && ho('cy') && !ho('center') ) options.center=new Vector2D(options.cx,options.cy);

  // mode 0: center, radius, start angle, end angle
  if( ho('center') && ( !ho('from') || !ho('to')) ) {
    var c=tryPoint(options.center);
    options.from=c.add(new Vector2D(options.r,0).rotate(options.a1))
    options.to  =c.add(new Vector2D(options.r,0).rotate(options.a2))
  }
  if( Math.abs(aspan)<=options.minspan ) {
    var v=options.to.sub(options.from).mul(1/(3*Math.pow(Math.cos(aspan/4),2)))
    return [[options.from,options.from.add(v.rotate(-aspan/2)),options.to.sub(v.rotate(aspan/2)),options.to]]
  } else if(ho('center')) {
    var o={center:options.center,r:options.r,a1:options.a1,a2:options.a2}
    return arcBezier({...o,a2:options.a1+aspan/2}).concat(arcBezier({...o,a1:options.a2-aspan/2}))
  } else {
    var o={from:options.from,to:options.to,aspan:aspan/2}
    // height of an circular segment is |to-from|*tan(aspan/4)
    // midpoint is from+(to-from)/2+rot(90,to-from)*tan(aspan/4)
    // when aspan is negative, its tan is also negative
    var mid=options.to.sub(options.from).rotate($v.rfd(-90)).mul(0.5*Math.tan(aspan/4));
    mid=options.to.add(options.from).mul(0.5).add(mid)
    return arcBezier({...o,to:mid}).concat(arcBezier({...o,from:mid}))
    
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
  if( 1!=arguments.length ) return pathString(Array.from(arguments))
  else return arr.reduce((path,item)=>{

    if( isNumber(item) ) item=roundnumber(item)
    else if( !item ) item=''
    else if( Array.isArray(item) ) item=pathString(item)
    else if( !isObject(item) ) item=item.toString()
    else if( has(item,'x') && has(item,'y') ) item=roundnumber(item.x)+' '+roundnumber(item.y)

    return path+((isdigitat(path,-1) && isdigitat(item,0))?' ':'')+item
  },'')
}

  Object.assign(planeLib,{
    // TODO:change name, "normalize" is not descriptive
    normalize:acceptsvector
    //,acceptsvector:acceptsvector
    ,path:pathString
    ,string:pathString
    ,rfd:rfd
    ,dfr:dfr
    ,tryPoint:tryPoint

    // $v.arcpath('M',{arcoptions}) for first: includes starting point of an
    //          arc in the resulting path with a given prefix ('M' or 'L')
    // $v.arcpath({arcoptions}) for rest: does not include intial point of the
    //          arc, resulting path starts with 'C' ...
    ,arcpath:function(initial,arcoptions) {
      // join complete bezier segments possibly including intial element
      var r=[]
      var segments
      var options
      if( 'string'===typeof initial ) {
        segments=arcBezier(arcoptions)
        r.push(initial,segments[0][0])
      } else if( isObject(initial) && 1==arguments.length ) {
        segments=arcBezier(initial)
      } else return;
      segments.forEach(seg=>r.push('C',seg.slice(1))) // full segment definition
      return r
    }
    // apply trns to all 2d-vertex-like elements of list at all depths
    // undefined trns means no tranform (identity)
    ,transform:function(list,trns) {
      if(!trns) return list
      var pt
      if(pt=tryPoint(list)) return trns(pt)
      if( Array.isArray(list) ) return list.map(el=>planeLib.transform(el,trns))
      return list
    }
    ,polar:function(r,phi) {
      return new Vector2D(r*Math.cos(phi),r*Math.sin(phi))
    }
  })
  planeLib.Vector2D=Vector2D
  global.planeLib=planeLib
  global.$v=planeLib
})(this)
