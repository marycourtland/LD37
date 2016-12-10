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
