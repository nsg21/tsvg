(function(global,undefined){
  // usually aliased as $v in global namespace
  // depending on parameters, either
  // a) generates a 2d vector
  // b) generates or updates SVG element
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
        tag.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
      }
    } else if( _.isObject(a1) ) {
      tag=a1
    }
    // fill attributes
    _.each(a2,function(v,k){
      //console.log('k=',k,'v=',v)
      tag.setAttribute(k,v)
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
function Vector2D(x,y)
{
  if( _.has(x,'x') && _.has(x,'y') ) {
    this.x=x.x
    this.y=x.y
  } else if( _.isArray(x) && 2==x.length ) {
    this.x=x[0]
    this.y=x[1]
  } else {
    this.x=x || 0
    this.y=y || 0
  }
}

function normalize(f)
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

function dfr(rad){return rad*180/Math.PI}
function rfd(deg){return deg*Math.PI/180}

_.extend(Vector2D.prototype,{
  add:normalize(function(v){return new Vector2D(this.x+v.x,this.y+v.y)}),
  sub:normalize(function(v){return new Vector2D(this.x-v.x,this.y-v.y)}),
  dot:normalize(function(v){return this.x*v.x+this.y*v.y}),
  mul:function(s){return new Vector2D(this.x*s,this.y*s)},
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
Vector2D.prototype.scale=Vector2D.prototype.mul
Vector2D.prototype.direction=Vector2D.prototype.argument
Vector2D.prototype.dir=Vector2D.prototype.argument
Vector2D.prototype.ren=Vector2D.prototype.rename

var MINARCSPAN=Math.PI/4;

// options -- any sufficient combination of
// cx cy -- center
// center -- center V2D
// r -- radius
// from to -- start and end of an arc, V2D
// afrom ato -- angular start/end
// aspan -- angular extent of an arc
// afromd atod aspand -- same in degrees
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
  var from,to
  if( _.has(options,'from') ) { from=new Vector2D(options.from) }
  if( _.has(options,'to') ) { to=new Vector2D(options.to) }
  _.each(['a1','a2','aspan','minspan'],function(name){
    if( _.has(options,name+'d') && !_.has(options,name) )
      options[name]=rfd(options[name+'d'])
  })
  if(!_.has(options,'aspan') && _.has(options,'a1') && _.has(options,'a2')) {
    options.aspan=options.a2-options.a1
  }
  _.defaults(options,{minspan:MINARCSPAN})
  var aspan=options.aspan
  if( !_.has(options,'from') || !_.has(options,'to') ) {
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
  } else console.assert(false, 'Not implemented branch of arcBezier');
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
  return _.foldl(arr,function(path,item){

    if( _.isNumber(item) ) item=roundnumber(item)
    else if( !_.isObject(item) ) item=item.toString()
    else if( _.isArray(item) ) item=pathString(item)
    else if( _.has(item,'x') && _.has(item,'y') ) item=roundnumber(item.x)+' '+roundnumber(item.y)

    return path+((isdigitat(path,-1) && isdigitat(item,0))?' ':'')+item
  },'')
}
  _.extend(planeLib,{
    normalize:normalize
    ,path:pathString
    ,string:pathString
    ,rfd:rfd
    ,dfr:dfr
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
    ,polar:function(r,phi) {
      return new Vector2D(r*Math.cos(phi),r*Math.sin(phi))
    }
  })
  global.planeLib=planeLib
  global.$v=planeLib
})(this)

