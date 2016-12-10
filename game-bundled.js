(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Settings = window.Settings;
var View = require('./view');

// view-independent modules
var Context = {
    // require stuff
    Map: require('./map'),
    Room: require('./room')
}

window.game = {};

window.onload = function() {
    View.load(Context);
}

},{"./map":2,"./room":3,"./view":5}],2:[function(require,module,exports){
var xy = window.XY;
var Room = require('./room')

module.exports = Map = {};
window.m = Map;

// Tile keys
var tiles = {
    BLANK: 0,
    WALL: 1,
    MISC: 4
}

Map.cells = null; 
Map.reload = false;
Map.diffs = [];

// initial bounds
Map.bounds = {
    // cardinal dirs
    w: -15,
    e: 15,
    n: -5,
    s: 5
}

Map.size = function() {
    return xy(this.bounds.e - this.bounds.w, this.bounds.s - this.bounds.n)
}

Map.offset = function() {
    return xy(this.bounds.w, this.bounds.n)
}

Map.init = function() {
    var self = this;
    self.cells = {}; 
    self.iterX(function(x) {
        self.cells[x] = {};
        self.iterY(function(y) {
            self.cells[x][y] = tiles.BLANK;
        })
    })

    Room.getCoords().forEach(function(p) {
        self.set(p.x, p.y, tiles.WALL)
    })

    // Subscribe to room changes
    Room.on('teardown', 'teardown', function(data) {
        self.set(data.coords.x, data.coords.y, tiles.BLANK);
    })

    self.reload = true;
}

Map.expand = function(direction) {
    var self = this;
    if (direction === 'w') {
        var newColumn = {};
        self.iterY(function(y) { newColumn[y] = tiles.BLANK; })
        self.bounds.w -= 1;
        self.cells[self.bounds.w] = newColumn;
    }
    if (direction === 'e') {
        var newColumn = {};
        self.iterY(function(y) { newColumn[y] = tiles.BLANK; })
        self.bounds.e += 1;
        self.cells[self.bounds.w] = newColumn;
    }
    if (direction === 'n') {
        self.bounds.n -= 1;
        self.iterX(function(x) {
            self.cells[x][self.bounds.n] = tiles.BLANK;
        })
    }
    if (direction === 's') {
        self.bounds.s += 1;
        self.iterX(function(x) {
            self.cells[x][self.bounds.s] = tiles.BLANK;
        })
    }
    self.reload = true;
}

Map.iterY = function(callback) {
    for (var y = this.bounds.n; y < this.bounds.s; y++) {
        callback(y);
    }
}

Map.iterX = function(callback) {
    for (var x = this.bounds.w; x < this.bounds.e; x++) {
        callback(x);
    }
}

Map.set = function(x, y, index) {
    if (this.isOOB(x, y)) return null;
    this.cells[x][y] = index;
    this.diffs.push({x:x, y:y})
}

Map.get = function(x, y) {
    if (this.isOOB(x, y)) return null;
    return this.cells[x][y];
}

Map.isOOB = function(x, y) {
    return x < this.bounds.w || x > this.bounds.e || y < this.bounds.n || y > this.bounds.s;
}


Map.getCSV = function() {
    var self = this;
    var rows = [];
    self.iterY(function(y) {
        var row = [];
        self.iterX(function(x) {
            row.push(self.cells[x][y]);
        })
        rows.push(row);
    })
    return rows.map(function(row) { return row.join(',')}).join('\n')
}

Map.upToDate = function() {
    this.diffs = [];
    this.reload = false;
}

},{"./room":3}],3:[function(require,module,exports){
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

},{"./wall":11}],4:[function(require,module,exports){
module.exports = AssetData = {
    tiles: {
        url: 'images/tiles.png' 
    },
}

},{}],5:[function(require,module,exports){
module.exports = basic = {};

basic.load = function(Context) {
    var GameStates = require('./states');

    window.game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, 'game', null, true, false);

    for (var stateName in GameStates) {
        var state = GameStates[stateName];
        if (typeof state.setContext === 'function') state.setContext(Context);
        game.state.add(stateName, state);
    }


    game.state.start('Boot');
}

},{"./states":8}],6:[function(require,module,exports){
var Settings = window.Settings;
var AssetData = require('../asset_data');

var game;

module.exports = Boot = function (_game) { 
    game = _game;
};

Boot.prototype = {
    preload: function () {
        for (var sprite_id in AssetData) {
            var data = AssetData[sprite_id];
            if (data.sheet) {
                game.load.spritesheet(sprite_id, data.url, data.frame_size.x, data.frame_size.y, data.num_frames);
            }
            else {
                game.load.image(sprite_id, data.url);
            }
        }

        game.world.setBounds(0, 0, Settings.gameDims.x, Settings.gameDims.y);

        game.physics.startSystem(Phaser.Physics.P2JS);
    },

    create: function() {
        console.log('Game state: Boot');
        game.state.start('Menu');
    }
}

},{"../asset_data":4}],7:[function(require,module,exports){
var game;

module.exports = End = function (_game) { 
    game = _game;
};

End.prototype = {
    create: function () {
        console.log('Game state: End');
        // Todo :)

        game.state.start('Menu');
    },
};

},{}],8:[function(require,module,exports){
module.exports = GameStates = {
    Boot: require('./boot.js'),
    Menu: require('./menu.js'),
    Play: require('./play.js'),
    End:  require('./end.js'),
}

},{"./boot.js":6,"./end.js":7,"./menu.js":9,"./play.js":10}],9:[function(require,module,exports){
var game;

module.exports = Menu = function (_game) { 
    game = _game;
};

Menu.prototype = {
    create: function () {
        console.log('Game state: Menu');
        // Todo :)

        game.state.start('Play');
    },
};

},{}],10:[function(require,module,exports){
var xy = window.XY;
var Settings = window.Settings;
var AssetData = require('../asset_data');
var game;

var Context;

module.exports = Play = function (_game) { 
    game = _game;
};

Play.setContext = function(newContext) {
    // assert that the context has the right stuff 
    console.assert(!!newContext.Map);
    console.assert(!!newContext.Room);
    Context = newContext;
};

Play.map = null;
Play.mapLayer = null;
Play.cursorSprite = null;
Play.lastClick = null; // in map coordinates

Play.prototype = {
    preload: function() {
        Context.Room.init();
        Context.Map.init();
    },

    create: function () {
        console.log('Game state: Play');
        refreshMap();
        Play.cursorSprite = game.add.sprite(0, 0)
        window.c = Play.cursorSprite;
        game.camera.follow(Play.cursorSprite, Phaser.Camera.FOLLOW_LOCKON, 0.8, 0.8);
        game.input.onDown.add(onDown)

    },

    update: function () {
        checkPlayerCursor();
    },
    render: function () {
        debugText();
    }
};

function debugText() {
    var lines = [
        'GAME',
        '  width:  ' + window.game.width,
        '  height: ' + window.game.height,
        JSON.stringify(xy(Play.cursorSprite.x, Play.cursorSprite.y)),
        JSON.stringify(Play.lastClickPre),
        JSON.stringify(Play.lastClick)
    ]

    var color = "#FFF";
    var lineheight = 14;
    var line = 1;
    for (var line = 0; line < lines.length; line++) {
        game.debug.text(lines[line], 2, (line + 1) * lineheight, color)
    }
}

function refreshMap() {
    if (Context.Map.reload) {
        if (Play.map) Play.map.destroy();
        if (Play.mapLayer) Play.mapLayer.destroy();

        var size = Context.Map.size();
        game.cache.addTilemap('map', null, Context.Map.getCSV(), Phaser.Tilemap.CSV);
        Play.map = game.add.tilemap('map', Settings.cellDims.x, Settings.cellDims.y);
        Play.map.addTilesetImage('tiles');

        Play.mapLayer = Play.map.createLayer(0);
        Play.mapLayer.resizeWorld();
    }
    else {
        Context.Map.diffs.forEach(function(diff) {
            var tile = Context.Map.get(diff.x, diff.y);
            var x = diff.x - Context.Map.offset().x;
            var y = diff.y - Context.Map.offset().y;
            Play.map.putTile(tile, x, y, Play.mapLayer )
        })
    }
    Context.Map.upToDate();
}

window.r = refreshMap;

function checkPlayerCursor() {
    // Cursor sprite follows the pointer
    Play.cursorSprite.x = game.input.activePointer.position.x;
    Play.cursorSprite.y = game.input.activePointer.position.y;
    window.t = Play.map.getTileWorldXY(Play.cursorSprite.x, Play.cursorSprite.y)
}

function onDown(pointer, event) {
    // convert to pixels and factor in camera 
    var dims = Settings.cellDims;
    var offset = Context.Map.offset();
    offset.x *= dims.x;
    offset.y *= dims.y;
    offset.x += game.camera.view.x;
    offset.y += game.camera.view.y;

    Play.lastClick = xy(
        Math.floor((pointer.position.x + offset.x) / dims.x),
        Math.floor((pointer.position.y + offset.y) / dims.y)
    )

    onTileSelect(Play.lastClick);
}

function onTileSelect(coords) {
    Context.Map.set(coords.x, coords.y, 2);
    refreshMap();
}

},{"../asset_data":4}],11:[function(require,module,exports){
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

},{}]},{},[1]);
