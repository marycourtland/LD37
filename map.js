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
