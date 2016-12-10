var xy = window.XY;
var Events = window.Events;
var WallSegment = require('./wall')
window.wall = WallSegment;

module.exports = Room = {};
window.room = Room;

Events.init(Room);

// for debugging
window.f = function (xy) { console.log(JSON.stringify(xy)); }

Room.walls = [];

Room.init = function() {
    // INIT WITH A 5x5 ROOM
    var wall1 = new WallSegment(xy(-2, -2), xy(-2, 2));
    var wall2 = new WallSegment(xy(-2, 2), xy(2, 2));
    var wall3 = new WallSegment(xy(2, 2), xy(2, -2));
    var wall4 = new WallSegment(xy(2, -2), xy(-2, -2));

    wall1.connectTo(wall2).connectTo(wall3).connectTo(wall4).connectTo(wall1)
    this.walls = [wall1, wall2, wall3, wall4]
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
    if (is(wall, WallSegment)) return wall.iterCoords(callback, true);

    // whole room: iterate through each wall
    if (is(wall, Function)) {
        callback = wall;
        this.getCoords().forEach(callback);
    }

    // Un-initialized phantom wall segment. Meh alert
    if (isArray(wall) && wall.length === 2 && isCoords(wall[0]) && isCoords(wall[1])) {
        var p1 = xy(wall[0]), p2 = xy(wall[1]);
        console.assert(p1.x === p2.x || p1.y === p2.y);
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


// THE MEH AREA

function is(obj, Obj) {
    return obj.__proto__ === Obj.prototype;
}

function isCoords(obj) {
    return obj.hasOwnProperty('x') && obj.hasOwnProperty('y')
}

function isArray(obj) {
    return typeof obj['splice'] === 'function';
}
