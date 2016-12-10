(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Settings = window.Settings;
var View = require('./view');

// view-independent modules
var Context = {
    // require stuff
    Map: require('./map')
}

window.game = {};

window.onload = function() {
    View.load(Context);
}

},{"./map":2,"./view":4}],2:[function(require,module,exports){
var xy = window.XY;

module.exports = Map = {};

window.m = Map;

Map.cells = null; 
Map.reload = false;
Map.diffs = [];

// INITIAL ROOM 5x5
Map.initialRoom = [
    xy(-2, -2), xy(-1, -2), xy(0, -2), xy(1, -2), xy(2, -2),
    xy(-2, -1), xy(2, -1),
    xy(-2, 0), xy(2, 0),
    xy(-2, 1), xy(2, 1),
    xy(-2, 2), xy(-1, 2), xy(0, 2), xy(1, 2), xy(2, 2),
]

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
            self.cells[x][y] = 0;
        })
    })
    

    self.initialRoom.forEach(function(xy) {
        self.cells[xy.x][xy.y] = 1;
    })

    self.reload = true;
}

Map.expand = function(direction) {
    var self = this;
    if (direction === 'w') {
        var newColumn = {};
        self.iterY(function(y) { newColumn[y] = 4; })
        self.bounds.w -= 1;
        self.cells[self.bounds.w] = newColumn;
    }
    if (direction === 'e') {
        var newColumn = {};
        self.iterY(function(y) { newColumn[y] = 4; })
        self.bounds.e += 1;
        self.cells[self.bounds.w] = newColumn;
    }
    if (direction === 'n') {
        self.bounds.n -= 1;
        self.iterX(function(x) {
            self.cells[x][self.bounds.n] = 4;
        })
    }
    if (direction === 's') {
        self.bounds.s += 1;
        self.iterX(function(x) {
            self.cells[x][self.bounds.s] = 4;
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

},{}],3:[function(require,module,exports){
module.exports = AssetData = {
    tiles: {
        url: 'images/tiles.png' 
    },
}

},{}],4:[function(require,module,exports){
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

},{"./states":7}],5:[function(require,module,exports){
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

},{"../asset_data":3}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
module.exports = GameStates = {
    Boot: require('./boot.js'),
    Menu: require('./menu.js'),
    Play: require('./play.js'),
    End:  require('./end.js'),
}

},{"./boot.js":5,"./end.js":6,"./menu.js":8,"./play.js":9}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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
    Context = newContext;
};

Play.map = null;
Play.mapLayer = null;
Play.cursorSprite = null;
Play.lastClick = null; // in map coordinates

Play.prototype = {
    preload: function() {
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

},{"../asset_data":3}]},{},[1]);
