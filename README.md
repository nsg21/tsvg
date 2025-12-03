Trivial SVG library
===========================

`tsvg.js` is a minimalistic SVG generation library.
It facilitates creation of arbitrary SVG elements and subelements and provides
small set of helper function that manipulate 2D vectors and allow their use in
SVG's `<path>` element.

Installation
------------

`tsvg.js` depends on `underscore.js`. Include lines

```javascript
<script src="path_to_underscore/underscore-min.js"></script>
<script src="path_to_tsvg/tsvg.min.js"></script>
```

to use `tsvg.js` in your project.

Description
-----------

Library creates a global `$v` which provides single entry point intferace for both element and 2D vector manipulation.

### SVG elements creation

```
var svg_el=$v('tag'[,{attributes},child1,child2,...])
```

Creates element 'tag' in svg namespace, fills out attributes from an object and populates children.

```
var svg_el=$v(svgelement,{attributes}[,child1,child2,...])
```

Modfies/adds attributes for an existing element.

### 2D vectors creation and manipulation

Create 2d vector:
```
$v(n1,n2)
$v([n1,n2])
$v({x:n1,y:n2}) 
```

Vector operations:

```
v1=$v(3,4)
v2=$v.polar(5,$v.rfd(45))
```
Create vectors from rectangular or polar coordinates


```
v1.add(v2) // addition
v1.sub(v2) // subtraction
v1.add(-1,1) // accept direct coordinates
v1.add([-1,1]) // or vector-like objects
v1.dot(v2) // scalar product
```
Linear operations.

```
v1.mul(5) // multiplication by a scalar
v1.mul(1,2) // separate scaling on x and y
```

### Special format for path

Vectors can be used to construct a path. Path is a list of vectors, vector-like
objects, strings. Path may contain subpaths.
Path may be converted to a string suitable for `d` attribute of a `path`
element with `$v.pathString(path)` or `$v.string(path)`
When SVG element is created with an attribute where value is a list, this list is converted to string with `$v.pathString` first

### Bezier approximation for a circular arc
```
$v.arcpath('M',{arcoptions})
$v.arcpath({arcoptions})
```
Example
-------


Author
------
nsg

