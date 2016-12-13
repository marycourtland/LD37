var xy = window.XY;
var Events = window.Events;
var WallSegment = require('./wall')
var utils = require('./utils')
window.wall = WallSegment;

var Map = null;

module.exports = Room = {};
window.room = Room;

Events.init(Room);

Room.walls = [];
Room.alignedEnds = {H: [], V: []} // horizontal, vertical

Room.stats = {
    closed: false,
    length: 0,
    enclosedTiles: [],
}

Room.init = function() {
    // meh
    Map = require('./map')

    // INIT WITH A 5x5 ROOM
    var wall1 = new WallSegment(xy(-2, -2), xy(-2, 2));
    var wall2 = new WallSegment(xy(-2, 2), xy(2, 2));
    var wall3 = new WallSegment(xy(2, 2), xy(2, -2));
    var wall4 = new WallSegment(xy(2, -2), xy(0, -2));

    wall1.connectTo(wall2).connectTo(wall3).connectTo(wall4);
    this.walls = [wall1, wall2, wall3, wall4]
    this.updateAlignedEnds();
    this.refreshStats();
}

Room.totalLength = function() {
    return this.walls.map(function(wall) { return wall.length}).reduce(function(a, b) { return a + b; })
}

Room.totalEnclosedArea = function() {
    // TODO: implement. This will be harder
}

Room.getCoords = function() {
    // For generating the map
    var coords = [];
    this.walls.forEach(function(wall) {
        wall.iterCoords(function(coord) { coords.push(coord); }, !!wall.connection2)
    })
    return coords;
}

Room.iterCoords = function(wall, callback) {
    // single wall
    if (utils.is(wall, WallSegment)) return wall.iterCoords(callback, true);

    // whole room: iterate through each wall
    if (utils.is(wall, Function)) {
        callback = wall;
        this.getCoords().forEach(callback);
    }

    // Un-initialized phantom wall segment. Meh alert
    if (utils.isArray(wall) && wall.length === 2 && utils.isCoords(wall[0]) && utils.isCoords(wall[1])) {
        var p1 = xy(wall[0]), p2 = xy(wall[1]);
        console.assert(p1.isAlignedTo(p2));
        var dp = p2.subtract(p1).unit();
        var end = p2.add(dp); // inclusive
        var iter = [];
        //console.log('iter:', JSON.stringify(p1), JSON.stringify(p2), JSON.stringify(end), JSON.stringify(dp))
        for (var p = p1; !p.eq(end); p = p.add(dp)) iter.push(p);
        iter.forEach(callback);
    }
}

Room.tearDown = function(p1, p2) {
    var wall = null;
    this.walls.forEach(function(w) { if (w.contains(p1, p2)) wall = w; })
    if (!wall) return null;

    console.group('DEBUG TEARDOWN')
    console.log('Pre teardown endpoints:', JSON.stringify(wall.end1), JSON.stringify(wall.end2))

    var newWall = wall.tearDown(p1, p2);
    if (newWall && newWall !== wall) this.walls.push(newWall);

    this.updateAlignedEnds();

    // make some noise
    var self = this;
    i = 0;
    this.iterCoords([p1, p2], function(p) {
        console.log('teardown', p.x, p.y)
        self.emit('teardown', {coords: p})
    })

    this.refreshStats();

    console.log('Tore down:', JSON.stringify(p1), JSON.stringify(p2))
    console.log('Old wall:')
    wall.iterCoords(f)
    if (wall !== newWall) {
        console.log('New wall:')
        newWall.iterCoords(f)
    }
    console.groupEnd();
}

Room.build = function(pWall, pNew, wallCompletion) {
    var walls = Room.getWallsContaining(pWall);
    console.assert(walls.length === 1);
    var oldWall = walls[0];
    
    // create the endpoints in the right order
    var newWall = (!oldWall.connection2) ? new WallSegment(pWall, pNew) : new WallSegment(pNew, pWall);
    oldWall.connectTo(newWall);

    if (!!wallCompletion) {
        newWall.connectTo(wallCompletion[1].wall);
    }

    var connection1 = newWall.connection1; // in case newWall gets collapsed
    this.walls.push(newWall);

    this.collapseWalls();
    this.updateAlignedEnds();

    if (newWall.destroyed) newWall = connection1;

    var self = this;
    newWall.iterCoords(function(p) {
        self.emit('build', {coords: p})
    })

    this.refreshStats();
}

Room.collapseWalls = function() {
    // If there are, say, 2 vertical walls in a row, then combine them into one.
    var collapses = this.walls.filter(function(w) { return w.isContinuation(); })

    collapses.forEach(function(w) {
        w.collapse();
    })

    this.walls = this.walls.filter(function(w) { return !w.destroyed; })
}

// There might be multiple walls containing the point
// (corners)
Room.getWallsContaining = function(p) { 
    var walls = [];
    this.walls.forEach(function(w) { if (w.contains(p)) walls.push(w); });
    return walls;
}

Room.getUnconnectedEnds = function() {
    var ends = [];
    this.walls.forEach(function(wall) {
        if (!wall.connection1) ends.push({wall: wall, end:wall.end1});
        if (!wall.connection2) ends.push({wall: wall, end:wall.end2});
    })
    return ends;
}

Room.getNearestUnconnectedEnd = function(p) {
    var ends = this.getUnconnectedEnds().map(function(item) {
        item.distance = item.end.distanceTo(p);
        return item;
    })
    if (ends.length < 1) return null;
    var nearest = ends[0];
    ends.forEach(function(end) {
        if (end.distance < nearest.distance) nearest = end;
    })
    return nearest.end;
}


Room.getNearestAlignedEnd = function(p) {
    var ends = this.getUnconnectedEnds().filter(function(item) {
        return item.end.isAlignedTo(p);
    }).map(function(item) {
        item.distance = item.end.distanceTo(p);
        return item;
    })
    if (ends.length < 1) return null;
    var nearest = ends[0];
    ends.forEach(function(end) {
        if (end.distance < nearest.distance) nearest = end;
    })
    return nearest.end;
}

Room.updateAlignedEnds = function() {
    this.alignedEnds.H = [];
    this.alignedEnds.V = [];
    var ends = this.getUnconnectedEnds();
    var X = {};
    var Y = {};
    var self = this;

    ends.forEach(function(item) {
        var e = item.end;
        // check vertical
        if (!(e.x in X)) { X[e.x] = [item]; }
        else {
            X[e.x].forEach(function(end2_item) { self.alignedEnds.V.push([item, end2_item]); })
            X[e.x].push(item);
        }

        // check horizontal
        if (!(e.y in Y)) { Y[e.y] = [item]; }
        else {
            Y[e.y].forEach(function(end2_item) { self.alignedEnds.H.push([item, end2_item]); })
            Y[e.y].push(item);
        }
    })
}

Room.getContainingAlignedEnds = function(p) {
    p = xy(p);
    var output = []; 
    this.alignedEnds.H.forEach(function(pair) {
        if (p.isBetween(pair[0].end, pair[1].end)) output.push(pair);
    })
   this.alignedEnds.V.forEach(function(pair) {
        if (p.isBetween(pair[0].end, pair[1].end)) output.push(pair);
    })

    // returns:
    // [
    //   [ {wall:_, end:_}, {wall:_, end:_}]
    // ]
    return output;
    
}

// returns 1000, 1010, etc.
Room.getAdjoiningCoordinatesWENS = function(p) {
    var walls = Room.getWallsContaining(p);
    if (walls.length === 0) return '0000'
    
    // !!! horrible code alert !!!

    var neighbors = walls[0].getAdjoiningCoords(p);
    var wens = [0,0,0,0];

    var coordsWENS = [ 
        xy(-1, 0), 
        xy(1, 0), 
        xy(0, -1),
        xy(0, 1), 
    ]
    var wens = coordsWENS.map(function(dp) {
        var p2 = dp.add(p);
        var isNeighbor = false;
        neighbors.forEach(function(n) { if (p2.eq(n)) { isNeighbor = true; }})
        return isNeighbor ? 1 : 0;
    }) 

    return wens.join('');
}

Room.isClosed = function() {
    return this.getUnconnectedEnds().length === 0;
}

Room.getEnclosedTiles = function() {
    if (!this.isClosed()) return [];

    var enclosed = [];
    for (var x = Map.bounds.w; x < Map.bounds.e; x++) {
        // Scan the column to get tiles in between the walls
        var inside = false;
        for (var y = Map.bounds.n; y < Map.bounds.s; y++) {
            var p = xy(x, y);
            var currentWalls = Room.getWallsContaining(p);
            var verticalWalls = currentWalls.filter(function(wall) { return wall.dir === 'VERTICAL'; })
            var horizontalWalls = currentWalls.filter(function(wall) { return wall.dir === 'HORIZONTAL'; })

            // this part functions to 'collapse' two horizontals into a single one, in a particular circumstance
            // NB: the check for end1 is so that we only ignore one of the horizontal adjoiners, not both
            var vwall = verticalWalls.length > 0 ? verticalWalls[0] : null;
            if (!!vwall && !p.eq(vwall.end1) && !vwall.isConcave()) {
                horizontalWalls = []; // fake it.
            }

            if (horizontalWalls.length > 0) inside = !inside;

            // now count the tile if it's inside, AND if there are no overlapping tiles.
            if (currentWalls.length === 0 && inside) {
                enclosed.push(p);
            }
        }
    }
    return enclosed;
}

Room.refreshStats = function() {
    var self = this;
    this.stats.enclosedTiles.forEach(function(p) {
        self.emit('release', {coords: p})
    })

    this.stats.closed = this.isClosed();
    this.stats.enclosedTiles = this.getEnclosedTiles();
    this.stats.length = this.totalLength();

    this.stats.enclosedTiles.forEach(function(p) {
        self.emit('enclose', {coords: p})
    })
}
