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
