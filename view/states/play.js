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

// UI
Play.message = null; // larger at top
Play.message = null; // smaller at bottom

Play.prototype = {
    preload: function() {},

    create: function () {
        Context.Player.init();
        Context.Room.init();
        Context.Map.init();

        console.log('Game state: Play');
        game.stage.backgroundColor = '#ffff88';
        refreshMap();

        var blobs = [];
        for (var i = 0; i < Settings.numBlobs; i++) {
            var p = Map.randomTile();
            var coords = getWorldCoordsFromMap(p); // meh
            blobs.push(this.createBlob(coords.x, coords.y));
        }

        showInfo('Click to extend walls. Shift+click to complete a wall.')
        showMessage('')

        // camera
        Play.cursorSprite = game.add.sprite(0, 0)
        game.camera.follow(Play.cursorSprite, Phaser.Camera.FOLLOW_LOCKON, 0.8, 0.8);

        // input
        game.input.onDown.add(onDown)

        // literally don't know how else to get Phaser to detect a solo shift key.
        window.addEventListener('keydown', function(e) {
            if (e.keyCode === Phaser.KeyCode.SHIFT) {
                Player.shiftKey = true;
                Player.justShifted = true;
            }
        })
        window.addEventListener('keyup', function(e) {
            if (e.keyCode === Phaser.KeyCode.SHIFT) {
                Player.shiftKey = false;
                Player.justShifted = true;
            }
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


function clearInfo() {
    if (Play.info) Play.info.destroy();
}

function showInfo(text) {
    clearInfo();
    Play.info = game.add.text(game.world.centerX, game.world.height - 20, text, {
        font: '12px Arial',
        fill: '#000',
        align: 'center'
    });
    Play.info.anchor.set(0.5, 1);

}

function clearMessage() {
    if (Play.message) Play.message.destroy();
}

function showMessage(text) {
    clearMessage();
    Play.message = game.add.text(game.world.centerX, 20, text, {
        font: '16px Arial',
        fill: '#000',
        align: 'center'
    });
    Play.message.anchor.set(0.5, 0);
}

function showStats() {
    showMessage([
        'THE ROOM IS CLOSED',
        'Area: ' +  Room.stats.enclosedTiles.length,
        'Wall length: ' +  Room.stats.length
    ].join(' - '));
}

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
    if (Player.done) {
        showStats();
    }
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
