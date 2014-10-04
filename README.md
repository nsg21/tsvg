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

###SVG elements creation

```
var svg_el=$v('tag'[,{attributes},child1,child2,...])
```

Creates element 'tag' in svg namespace, fills out attributes from an object and populates children.

```
var svg_el=$v(svgelement,{attributes}[,child1,child2,...])
```

Modfies/adds attributes for an existing element.


###2D vectors creation and manipulation

```
$v(n1,n2) -- $v.Vector2D
$v([n1,n2]) -- $v.Vector2D
```


Author
------
nsg

