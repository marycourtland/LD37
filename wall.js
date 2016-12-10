var xy = window.XY;

var VERTICAL = 'VERTICAL';
var HORIZONTAL = 'HORIZONTAL';

module.exports = WallSegment = function(p1, p2) {
    // they should line up either horizontally or vertically
    console.assert(p1.x === p2.x || p1.y === p2.y)

    this.end1 = xy(p1);
    this.end2 = xy(p2);
    this.connection1 = null;
    this.connection2 = null;
    this.dir = (p1.x == p2.x) ? VERTICAL : HORIZONTAL;
    this.destroyed = false;
    this.refreshLength();
}

WallSegment.prototype = {};

WallSegment.prototype.isEnd = function() { return !this.connection1 || !this.connection2; }
WallSegment.prototype.isFloating = function() { return !this.connection1 && !this.connection2; }

WallSegment.prototype.contains = function(p1, p2) {
    if (this.dir === VERTICAL) {
        return p1.x === this.end1.x && p1.x === p2.x;
    }
    if (this.dir === HORIZONTAL) {
        return p1.y === this.end1.y && p1.y === p2.y;
    }
}

WallSegment.prototype.refreshLength = function() {
    // In order to not double-count corners, do not count end2 unless it's disconnected
    if (this.destroyed) return 0;
    if (this.dir === HORIZONTAL) this.length = Math.abs(this.end2.x - this.end1.x);
    if (this.dir === VERTICAL) this.length = Math.abs(this.end2.y - this.end1.y);
    if (!this.connection2) this.length += 1; // counting the endpoint at end2
    return this.length;
}

WallSegment.prototype.connectTo = function(otherSegment) {
    if (!otherSegment) return null;
    // the two segments should share a point
    // TODO: what if the new segment extends this one?
    var eq = function(p1, p2) { return p1.x === p2.x && p1.y == p2.y; }
    var eq12 = this.end1.eq(otherSegment.end2)
    var eq12 = eq(this.end1, otherSegment.end2);
    var eq21= eq(this.end2, otherSegment.end1);
    console.assert(eq12 || eq21);

    if (eq12) {
        this.connection1 = otherSegment;
        otherSegment.connection2 = this;
    }

    if (eq21) {
        this.connection2 = otherSegment;
        otherSegment.connection1 = this;
    }

    this.refreshLength();
    otherSegment.refreshLength();
    return otherSegment;
}

// Splits this segment into 2 parts, discarding the section from p1 to p2 (inclusive)
WallSegment.prototype.tearDown = function(p1, p2) {
    // p1 and p2 should be on this segment
    console.assert(this.contains(p1, p2));
    var d = this.d();

    // sort (p1, p2) to the same order as this segment's endpoints
    var d2 = this.d(p1, p2);
    if (!d.eq(d2)) {
        // swaperoo
        var __p2 = p2;
        p2 = p1;
        p1 = __p2;
    }

    // tearing down this whole segment.
    if (this.end1.eq(p1) && this.end2.eq(p2)) {
        return this.destroy();
    }

    // tearing down a strict subset
    if (!this.end1.eq(p1) && !this.end2.eq(p2)) {
        var _cnxn2 = this.connection2;
        var newSegment = new WallSegment(p2, this.end2);
        this.connection2 = null;
        this.end2 = p1;
        newSegment.connectTo(_cnxn2);
    }

    // Turn this current segment into the new one attached to cnxn2
    else if (this.end1.eq(p1)) {
        var _p2 = p2.add(d); // tear down (p1, p2) inclusively
        this.end1 = _p2;
        if (this.connection1) {
            // we also have to tell connection1 that its endpoint is now torn down
            var d = this.connection1.d();
            this.connection1.end2 = this.connection1.end2.subtract(d);
            this.connection1.connection2 = null;
            this.connection1.refreshLength();
            this.connection1 = null;
        }
        newSegment = this;
    }

    
    // Turn this current segment into the new one attached to cnxn1
    else if (this.end2.eq(p2)) {
        var _p1 = p1.subtract(d); // tear down (p1, p2) inclusively
        this.end2 = _p1;
        if (this.connection2) {
            // we also have to tell connection2 that its endpoint is now torn down
            var d = this.connection2.d();
            this.connection2.end1 = this.connection2.end1.add(d);
            this.connection2.connection1 = null;
            this.connection2.refreshLength();
            this.connection2 = null;
        }
        newSegment = this;
    }

    this.refreshLength();
    return newSegment;
}


WallSegment.prototype.destroy = function() {
    this.destroyed = true;
    this.refreshLength();
    if (this.connection1) {
        this.connection1.connection2 = null;
        this.connection1.refreshLength();
    }
    if (this.connection2) {
        this.connection2.connection2 = null;
        this.connection2.refreshLength();
    }
    return this;
}

WallSegment.prototype.iterCoords = function(callback, ignoreEnd2) {
    if (this.destroyed) return;
    if (this.end1.eq(this.end2)) { callback(this.end1); return; }
    var d = this.d();
    if (this.dir === VERTICAL) {
        var y1 = this.end1.y, y2 = this.end2.y;
        if (ignoreEnd2) y2 -= d.y;
        for (var y = y1; y !== y2+d.y; y += d.y) { callback(xy(this.end1.x, y)); }
    }
    if (this.dir === HORIZONTAL) {
        var x1 = this.end1.x, x2 = this.end2.x;
        if (ignoreEnd2) x2 -= d.x;
        for (var x = x1; x !== x2+d.x; x += d.x) { callback(xy(x, this.end1.y)); }
    }
}

WallSegment.prototype.d = function(p1, p2) {
    // Meh.
    if (!p1 || !p2) {
        p1 = this.end1;
        p2 = this.end2;
    }
    if (this.dir === VERTICAL) {
        var dy = (p2.y - p1.y);
        dy = dy / Math.abs(dy);
        return xy(0, dy);
    }
    if (this.dir === HORIZONTAL) {
        var dx = (p2.x - p1.x);
        dx = dx / Math.abs(dx);
        return xy(dx, 0);
    }
}
