// Convention: methods beginning with $ mutate the object. Otherwise, spawn new objects.

window.XY = function(x, y) {
    if (typeof x === 'object' && x.hasOwnProperty('x') && x.hasOwnProperty('y')) {
        y = x.y;
        x = x.x;
    }
    return new _XY(x, y);
}

window.xy = window.XY // Meh.

var _XY = function(x, y) {
    this.x = x;
    this.y = y;
}

_XY.prototype = {};

_XY.prototype.clone = function() { return XY(this.x, this.y); }

_XY.prototype.eq = function(xy2) {
    return this.x === xy2.x && this.y === xy2.y
}

_XY.prototype.unit = function() {
    var u = XY(this.x / Math.abs(this.x), this.y / Math.abs(this.y))
    if (isNaN(u.x)) u.x = 0;
    if (isNaN(u.y)) u.y = 0;
    return u;
}

_XY.prototype.$add = function(xy2) { 
    this.x += xy2.x; 
    this.y += xy2.y; 
    return this;
}

_XY.prototype.$subtract = function(xy2) { 
    this.x -= xy2.x; 
    this.y -= xy2.y; 
    return this;
}

Object.keys(_XY.prototype).forEach(function(prop) {
    if (prop.match(/^\$/) && typeof _XY.prototype[prop] === 'function') {
        var fn = _XY.prototype[prop];
        newProp = prop.replace(/^\$/, '');
        _XY.prototype[newProp] = function() {
            var clone = this.clone();
            return fn.apply(clone, arguments);
        }
    }
})
