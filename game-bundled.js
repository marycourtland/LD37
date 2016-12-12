(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Settings = window.Settings;
var View = require('./view');

// view-independent modules
var Context = {
    // require stuff
    Player: require('./player'),
    Map: require('./map'),
    Room: require('./room')
}

window.game = {};

window.onload = function() {
    View.load(Context);
}

},{"./map":2,"./player":3,"./room":4,"./view":8}],2:[function(require,module,exports){
var xy = window.XY;
var Room = require('./room')
var TileSelection = require('./tile-selection')
window.ts = TileSelection

module.exports = Map = {};
window.m = Map;

// Tile keys
var tiles = {
    BLANK: 0,
    FLOOR: 1,
    BROWN: 2,
    DARK: 3,
    SELECTED: 4,
    WALL1100: 5,
    WALL0011: 6,
    WALL1010: 7,
    WALL0110: 8,
    WALL0101: 9,
    WALL1001: 10,
    WALL1000: 11,
    WALL0010: 12,
    WALL0100: 13,
    WALL0001: 14,
    WALL0000: 15,
    
    // fake tile index
    WALL: 999
}

Map.cells = null; 
Map.reload = false;
Map.diffs = [];

// initial bounds
Map.bounds = {
    // cardinal dirs
    w: -10,
    e: 10,
    n: -6,
    s: 6 
}

Map.size = function() {
    return xy(this.bounds.e - this.bounds.w, this.bounds.s - this.bounds.n)
}

Map.offset = function() {
    return xy(this.bounds.w, this.bounds.n)
}

Map.randomTile = function() {
    var x = utils.randInt(this.bounds.w, this.bounds.e);
    var y = utils.randInt(this.bounds.n, this.bounds.s);
    return xy(x, y);
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

    Room.on('build', 'build', function(data) {
        self.set(data.coords.x, data.coords.y, tiles.WALL);
    })

    TileSelection.on('select', 'select', function(data) {
        self.diffs.push(data.coords);
    })

    TileSelection.on('deselect', 'select', function(data) {
        self.diffs.push(data.coords);
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

Map.getWENS = function(p) {
    //West, East, North, South
    var coordsWENS = [
        xy(-1, 0),
        xy(1, 0),
        xy(0, -1),
        xy(0, 1),
    ]
    return coordsWENS.map(function(dp) {
        var p2 = dp.add(p);
        return Map.get(p2.x, p2.y);
    })
}

Map.getWallTile = function(p) {
    // only Room knows the real wall structure
    var neighborsWENS = Room.getAdjoiningCoordinatesWENS(p);
    return tiles['WALL' + neighborsWENS]
}

Map.isOOB = function(x, y) {
    return x <= this.bounds.w || x >= this.bounds.e || y < this.bounds.n || y >= this.bounds.s;
}

Map.getViewTile = function(p) {
    if (TileSelection.isSelected(p)) return tiles.SELECTED;
    var tile = this.get(p.x, p.y);
    if (tile === tiles.WALL) tile = Map.getWallTile(p);
    return tile;
}


Map.getCSV = function() {
    var self = this;
    var rows = [];
    self.iterY(function(y) {
        var row = [];
        self.iterX(function(x) {
            row.push(self.getViewTile(xy(x, y)));
        })
        rows.push(row);
    })
    window.csv = rows.map(function(row) { return row.join(',')}).join('\n')
    return window.csv;
}

Map.upToDate = function() {
    this.diffs = [];
    this.reload = false;
}

},{"./room":4,"./tile-selection":5}],3:[function(require,module,exports){
var Map = require('./map');
var Room = require('./room')
var xy = window.XY;

module.exports = Player = {};
window.p = Player;

// circumvent phaser to get shift+click to work
Player.shiftKey = false;

// Tile selection
Player.hoveredCoords = null;
Player.selectedCoords = null;
Player.selectedTileIndex = null;

Player.hovers = function(coords) {
    if (xy(coords).eq(this.hoveredCoords)) return; 
    this.hoveredCoords = coords;
    if (this.mode) this.modes[this.mode].onTileHover(coords)
}

Player.selects = function(coords) {
    if (xy(coords).eq(this.selectedCoords)) return; 

    if (this.mode) this.modes[this.mode].onTileSelect(coords)
}

Player.mode = null;
Player.modes = {}

Player.setMode = function(mode) {
    if (!(mode in this.modes)) return;
    if (this.mode) this.modes[this.mode].cleanup();
    this.modes[this.mode]
    this.mode = mode;
    this.modes[mode].start();
}

Player.modes.teardown = {
    // So far, the player can only tear down subsets of a single wall
    endpoints: [],
    walls: [],
    onTileSelect: function(coords) {
        // See if the player clicked a wall
        var walls = Room.getWallsContaining(coords);
        //console.log(!!wall, coords)
        if (walls.length > 0) {
            console.log(this.endpoints)
            // Player is selecting the first tile
            if (this.endpoints.length === 0) {
                this.endpoints.push(coords);
                TileSelection.select(coords);
                this.walls = this.walls.concat(walls);
            }

            // Player is selecting the second tile
            else if (this.endpoints.length === 1) {
                var wallMatches = false;
                this.walls.forEach(function(wall) { if (walls.indexOf(wall) > -1) wallMatches = true; })
                if (!wallMatches) return;

                this.endpoints.push(coords);
                this.finish();
            }
            //wall.iterCoords(function(p) { Map.set(p.x, p.y, 3)})

        }
        
    },
    finish: function() {
        // DO NOT CALL UNLESS ACTUALLY FINISHED.
        console.assert(this.endpoints.length === 2);
        Room.iterCoords(this.endpoints, function(p) {
            console.log('selecting:', p)
            TileSelection.select(p);

        })
        Player.modes.confirmTeardown.endpoints = this.endpoints;
        Player.setMode('confirmTeardown')
    },
    cleanup: function() {
        this.endpoints = [];
        this.wall = null;
    }
}

Player.modes.confirmTeardown = {
    endpoints: [],
    start: function() {
        // TODO: actually confirm
        this.doItNow();
    },
    doItNow: function() {
        Room.tearDown(this.endpoints[0], this.endpoints[1]);
        TileSelection.deselectAll();
        Player.setMode('teardown');
    },
    cleanup: function() {
        this.endpoints = []
    }

}

Player.modes.build = {
    hoveredTile: null,
    targetTile: null,
    wallCompletion: null,

    start: function() {
    
    },
    onTileHover: function(coords) {
        if (!!this.hoveredTile) TileSelection.deselect(this.hoveredTile);
        if (!!this.targetTile) TileSelection.deselect(this.targetTile);

        if (Player.shiftKey) {
            // SPECIAL CASE: Offer for the player to complete the wall
            wallCompletions = Room.getContainingAlignedEnds(coords);
            if (wallCompletions.length > 0) {
                this.wallCompletion = this.wallCompletions[0] // if there are multiple walls... then meh.
                this.wallCompletion.iterCoords(function(p) {
                    TileSelection.select(p);
                
                })

            }
            return;
        }
        else if (!!this.wallCompletion) {
            this.wallCompletion.iterCoords(function(p) { TileSelection.deselect(p); })
            this.wallCompletion = null;
        }

        var nearestEnd = Room.getNearestAlignedEnd(coords);
        if (!nearestEnd) {
            this.targetTile = null;
            return;
        }
        this.hoveredTile = coords;
        this.targetTile = nearestEnd;
        TileSelection.select(this.targetTile);
        TileSelection.select(this.hoveredTile);
    },
    onTileSelect: function(coords) {
        if (!this.targetTile) return;
        TileSelection.select(coords);
        
        Player.modes.confirmBuild.tile1 = this.targetTile;
        Player.modes.confirmBuild.tile2 = this.hoveredTile;
        Player.setMode('confirmBuild')
    },
    cleanup: function() {
        this.hoveredTile = null;
        this.targetTile = null;
        this.wallCompletions = [];
    }
}

Player.modes.confirmBuild = {
    tile1: null,
    tile2: null,
    start: function() {
        // TODO: confirm
        this.doItNow();
    },
    doItNow: function() {
        Room.build(this.tile1, this.tile2);
        TileSelection.deselect(this.tile1);
        TileSelection.deselect(this.tile2);
        Player.setMode('build');
    },
    cleanup: function() {
        this.tile1 = null;
        this.tile2 = null;
    }

}

var modeMethods = ['start', 'cleanup', 'onTileSelect', 'onTileHover']
for (var mode in Player.modes) {
    var mode = Player.modes[mode];
    modeMethods.forEach(function(method) {
        if (typeof mode[method] !== 'function') mode[method] = function() {};
    })
}



Player.mode = 'build'

},{"./map":2,"./room":4}],4:[function(require,module,exports){
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

},{"./utils":6,"./wall":14}],5:[function(require,module,exports){
var xy = window.XY;
var Events = window.Events;
module.exports = TileSelection = {};
Events.init(TileSelection);

// we don't expect huge numbers of tiles to be selected at any point
TileSelection.selected = [];

TileSelection.isSelected = function(coords) {
    coords = xy(coords);
    return this.selected.filter(function(coords2) {
        return coords.eq(coords2);
    }).length > 0;
}

TileSelection.select = function(coords) {
    if (!this.isSelected(coords)) {
        this.selected.push(coords); 
        this.emit('select', {coords: coords})
    }
}

TileSelection.deselect = function(coords) {
    var index = -1;
    for (var i = 0; i < this.selected.length; i++) {
        if (this.selected[i].eq(coords)) index = i;
    }
    if (index > -1) {
        var deselected = this.selected[index];
        //console.log('Deslecting:', i, deselected, coords)
        this.emit('deselect', {coords: this.selected[index]})
        this.selected.splice(index, 1);
    }

}

TileSelection.deselectAll = function(coords) {
    var self = this;
    this.selected.forEach(function(coords) {
        self.emit('deselect', {coords: coords})
    })
    this.selected = [];
}

},{}],6:[function(require,module,exports){

module.exports = utils = {};


utils.is = function(obj, Obj) {
    return obj.__proto__ === Obj.prototype;
}

utils.isCoords = function(obj) {
    return obj.hasOwnProperty('x') && obj.hasOwnProperty('y')
}

utils.isArray = function(obj) {
    return typeof obj['splice'] === 'function';
}

utils.randInt = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

},{}],7:[function(require,module,exports){
module.exports = AssetData = {
    tiles: {
        url: 'images/tiles.png' 
    },
    blob: {
        url: 'images/blob.png',
        frame_size: {x: 40, y: 40},
        num_frames: 26,
        sheet: true
    },
}

},{}],8:[function(require,module,exports){
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

},{"./states":11}],9:[function(require,module,exports){
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

},{"../asset_data":7}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
module.exports = GameStates = {
    Boot: require('./boot.js'),
    Menu: require('./menu.js'),
    Play: require('./play.js'),
    End:  require('./end.js'),
}

},{"./boot.js":9,"./end.js":10,"./menu.js":12,"./play.js":13}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
var xy = window.XY;
var Settings = window.Settings;
var Utils = require('../../utils') 
var AssetData = require('../asset_data');
var game;

var Context;

module.exports = Play = function (_game) { 
    game = _game;
};

Play.setContext = function(newContext) {
    // assert that the context has the right stuff 
    console.assert(!!newContext.Player);
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
        game.stage.backgroundColor = '#ffff88';
        refreshMap();

        var blobs = [];
        for (var i = 0; i < Settings.numBlobs; i++) {
            var p = Map.randomTile();
            var coords = getWorldCoordsFromMap(p); // meh
            blobs.push(this.createBlob(coords.x, coords.y));
        }

        this.createBlob(350, 100);
        this.createBlob(400, 100);
        this.createBlob(450, 100);
        this.createBlob(500, 100);

        // camera
        Play.cursorSprite = game.add.sprite(0, 0)
        game.camera.follow(Play.cursorSprite, Phaser.Camera.FOLLOW_LOCKON, 0.8, 0.8);

        // input
        game.input.onDown.add(onDown)

        // literally don't know how else to get Phaser to detect a solo shift key.
        window.addEventListener('keydown', function(e) {
            if (e.keyCode === Phaser.KeyCode.SHIFT) Player.shiftKey = true;
        })
        window.addEventListener('keyup', function(e) {
            if (e.keyCode === Phaser.KeyCode.SHIFT) Player.shiftKey = false;
        })
    },

    createBlob: function(x, y) {
        var fps = 50;
        var numFrames = 26;
        var blob = game.add.sprite(x, y, 'blob');
        blob.animations.add('blobbing');

        // delay by an integral number of frames
        var phase = Utils.randInt(0, numFrames);
        var t = 1000/fps;
        setTimeout(function() {
            blob.animations.play('blobbing', fps, true);
        }, phase * t)
    
    },

    update: function () {
        checkPlayerCursor();
        //checkCamera();
    },
    render: function () {
        //debugText();
    }
};


function debugText() {
    var lines = [
        'GAME',
        '  width:  ' + window.game.width,
        '  height: ' + window.game.height,
        JSON.stringify(xy(Play.cursorSprite.x, Play.cursorSprite.y)),
        JSON.stringify(Play.lastClickPre),
        JSON.stringify(Play.lastClick),
        JSON.stringify(Player.hoveredCoords)
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
            var tile = Context.Map.getViewTile(diff);
            var x = diff.x - Context.Map.offset().x;
            var y = diff.y - Context.Map.offset().y;
            Play.map.putTile(tile, x, y, Play.mapLayer )
        })
    }
    Context.Map.upToDate();
}

window.r = refreshMap;


function checkCamera() {
    var speed = 3;

    //camera deadzone
    var deadzone = (1 - Settings.cameraDeadzone)/2, w = game.width, h = game.height;
    var dx = game.input.activePointer.position.x / w;
    var dy = game.input.activePointer.position.y / h;

    if (dx > deadzone && dx < 1-deadzone) return;

    if (dx < deadzone) game.camera.x -= speed;
    if (dx > 1-deadzone) game.camera.x += speed;
    if (dy < deadzone) game.camera.y -= speed;
    if (dy > 1-deadzone) game.camera.y += speed;

    //game.camera.deadzone = Phaser.Rectangle(
    //    dz * w, (1 - dz) * w,
    //    dz * h, (1 - dz) * h
    //)
}

function checkPlayerCursor() {
    // Cursor sprite follows the pointer
    Play.cursorSprite.x = game.input.activePointer.position.x;
    Play.cursorSprite.y = game.input.activePointer.position.y;
    window.t = Play.map.getTileWorldXY(Play.cursorSprite.x, Play.cursorSprite.y)
    Player.hovers(getCoordsFromEntity(game.input.activePointer, true));
    refreshMap();
}

function onDown(pointer, event) {
    Play.lastClick = getCoordsFromEntity(game.input.activePointer);
    Context.Player.selects(Play.lastClick);
    refreshMap();
}

function getCoordsFromEntity(entity) {
    var offset = Context.Map.offset();
    return xy(
        Math.floor(entity.worldX / Settings.cellDims.x) + offset.x,
        Math.floor(entity.worldY / Settings.cellDims.y) + offset.y
    )
}

function getWorldCoordsFromMap(p) {
    var offset = Context.Map.offset();
    return xy(
        (p.x - offset.x) * Settings.cellDims.x,
        (p.y - offset.y) * Settings.cellDims.y
    )
}

},{"../../utils":6,"../asset_data":7}],14:[function(require,module,exports){
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
    if (!p2) {
        // just checking a single point
        return xy(p1).isBetween(this.end1, this.end2);
    }
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

WallSegment.prototype.getPreviousCoordinate = function(p) {
    // ASSUME THIS WALL CONTAINS P.
    p = xy(p);
    var d = this.d();
    var p_previous = p.subtract(d);
    if (this.end1.eq(p)) {
        if (!this.connection1) {
            p_previous = null;
        }
        else {
            // get p1 from the adjoining wall
            p_previous = this.connection1.getPreviousCoordinate(p);
        }
    }
    return p_previous;
}

WallSegment.prototype.getNextCoordinate = function(p) {
    // ASSUME THIS WALL CONTAINS P.
    p = xy(p);
    var d = this.d();
    var p_next = p.add(d);
    if (this.end2.eq(p)) {
        if (!this.connection2) {
            p_next = null;
        }
        else {
            // get p1 from the adjoining wall
            p_next = this.connection2.getNextCoordinate(p);
        }
    }
    return p_next;
}

WallSegment.prototype.getAdjoiningCoords = function(p) {
    var p1 = this.getPreviousCoordinate(p);
    var p2 = this.getNextCoordinate(p);
    var coords = [];
    if (p1) coords.push(p1);
    if (p2) coords.push(p2);
    return coords;
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
