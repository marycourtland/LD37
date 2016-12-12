var xy = window.XY;
var Events = window.Events;
var WallSegment = require('./wall')
var utils = require('./utils')
window.wall = WallSegment;

module.exports = Room = {};
window.room = Room;

Events.init(Room);

// for debugging
window.f = function (xy) { console.log(JSON.stringify(xy)); }

Room.walls = [];

Room.alignedEnds = {H: [], V: []} // horizontal, vertical

Room.init = function() {
    // INIT WITH A 5x5 ROOM
    var wall1 = new WallSegment(xy(-2, -2), xy(-2, 2));
    var wall2 = new WallSegment(xy(-2, 2), xy(2, 2));
    var wall3 = new WallSegment(xy(2, 2), xy(2, -2));
    var wall4 = new WallSegment(xy(2, -2), xy(0, -2));

    wall1.connectTo(wall2).connectTo(wall3).connectTo(wall4);
    this.walls = [wall1, wall2, wall3, wall4]
    this.updateAlignedEnds();
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

    console.group()
    console.log('DEBUG TEARDOWN')
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

    console.log('Tore down:', JSON.stringify(p1), JSON.stringify(p2))
    console.log('Old wall:')
    wall.iterCoords(f)
    if (wall !== newWall) {
        console.log('New wall:')
        newWall.iterCoords(f)
    }
    console.groupEnd();
}

Room.build = function(pWall, pNew) {
    var walls = Room.getWallsContaining(pWall);
    console.assert(walls.length === 1);
    var oldWall = walls[0];
    
    // create the endpoints in the right order
    var newWall = (!oldWall.connection2) ? new WallSegment(pWall, pNew) : new WallSegment(pNew, pWall);
    oldWall.connectTo(newWall);
    this.walls.push(newWall);

    this.updateAlignedEnds();

    var self = this;
    newWall.iterCoords(function(p) {
        self.emit('build', {coords: p})
    })
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
    var ends = this.getUnconnectedEnds().map(function(item) { return item.end; })
    var X = {};
    var Y = {};
    var self = this;

    ends.forEach(function(e) {
        // check vertical
        if (!(e.x in X)) { X[e.x] = [e]; }
        else {
            X[e.x].forEach(function(end2) { self.alignedEnds.V.push([e, end2]); })
            X[e.x].push(e);
        }

        // check horizontal
        if (!(e.y in Y)) { Y[e.y] = [e]; }
        else {
            Y[e.y].forEach(function(end2) { self.alignedEnds.H.push([e, end2]); })
            Y[e.y].push(e);
        }
    })
}

Room.getContainingAlignedEnds = function(p) {
    p = xy(p);
    var ouput = []; 
    this.alignedEnds.H.forEach(function(pair) {
        if (p.isBetween(pair[0], pair[1])) output.push(pair);
    })
    this.alignedEnds.V.forEach(function(pair) {
        if (p.isBetween(pair[0], pair[1])) output.push(pair);
    })
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
