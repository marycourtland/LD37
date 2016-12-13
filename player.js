var Map = require('./map');
var Room = require('./room')
var xy = window.XY;

module.exports = Player = {};
window.p = Player;

Player.init = function() {
    Player.done = false;
    Player.enclosedTiles = [];

    // circumvent phaser to get shift+click to work
    Player.shiftKey = false;
    Player.justShifted = false;

    // Tile selection
    Player.hoveredCoords = null;
    Player.selectedCoords = null;
    Player.selectedTileIndex = null;
}

Player.hovers = function(coords) {
    if (!this.justShifted && xy(coords).eq(this.hoveredCoords)) return; 
    this.justShifted = false;
    this.hoveredCoords = coords;
    if (this.mode) this.modes[this.mode].onTileHover(coords)
}

Player.selects = function(coords) {
    if (!this.justShifted && xy(coords).eq(this.selectedCoords)) return; 
    this.justShifted = false;
    this.selectedCoords = coords;
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

        var nearestEnd = Room.getNearestAlignedEnd(coords);
        if (!nearestEnd) {
            this.targetTile = null;
            return;
        }
        this.hoveredTile = coords;
        this.targetTile = nearestEnd;

        if (Player.shiftKey) {
            // SPECIAL CASE: Offer for the player to complete the wall
            wallCompletions = Room.getContainingAlignedEnds(coords);
            if (wallCompletions.length > 0) {
                this.wallCompletion = wallCompletions[0] // if there are multiple walls... then meh.
                var coords = [this.wallCompletion[0].end, this.wallCompletion[1].end]
                Room.iterCoords(coords, function(p) {
                    TileSelection.select(p);
                })
            }
            return;
        }
        else if (!!this.wallCompletion) {
            var coords = [this.wallCompletion[0].end, this.wallCompletion[1].end]
            Room.iterCoords(coords, function(p) { TileSelection.deselect(p); })
            this.wallCompletion = null;
        }

        TileSelection.select(this.targetTile);
        TileSelection.select(this.hoveredTile);
    },
    onTileSelect: function(coords) {
        if (Player.shiftKey && !!this.wallCompletion) {
            Player.modes.confirmBuild.tile1 = this.wallCompletion[0].end;
            Player.modes.confirmBuild.tile2 = this.wallCompletion[1].end;
            Player.modes.confirmBuild.wallCompletion = this.wallCompletion;
        }
        else {
            if (!this.targetTile) return;
            TileSelection.select(coords);
            Player.modes.confirmBuild.tile1 = this.targetTile;
            Player.modes.confirmBuild.tile2 = this.hoveredTile;
            Player.modes.confirmBuild.wallCompletion = null;
        }
        
        Player.setMode('confirmBuild')
    },
    cleanup: function() {
        this.hoveredTile = null;
        this.targetTile = null;
        this.wallCompletion = null;
    }
}

Player.modes.confirmBuild = {
    tile1: null,
    tile2: null,
    wallCompletion: null,
    start: function() {
        // TODO: confirm
        this.doItNow();
    },
    doItNow: function() {
        Room.build(this.tile1, this.tile2, this.wallCompletion);
        TileSelection.deselectAll();

        // Check for closed room 
        if (Room.isClosed()) {
            Player.done = true;
            //Room.stats.enclosedTiles.forEach(function(t) { TileSelection.select(t); });
        }

        Player.setMode('build');


    },
    cleanup: function() {
        this.tile1 = null;
        this.tile2 = null;
        this.wallCompletion = null;
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
