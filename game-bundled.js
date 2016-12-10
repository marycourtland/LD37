(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Settings = window.Settings;
var View = require('./view');

// view-independent modules
var Context = {
    // require stuff
}

window.game = {};

window.onload = function() {
    View.load(Context);
}

},{"./view":3}],2:[function(require,module,exports){
// Tree sprites are from
// http://opengameart.org/content/tree-collection-v26-bleeds-game-art
// Bleed - http://remusprites.carbonmade.com/

module.exports = AssetData = {
    black: {
        url:     'images/black.png',
    },
    white: {
        url:     'images/white.png',
    },
    blue: {
        url:     'images/blue.png',
    },
    red: {
        url:     'images/red.png',
    },
    green: {
        url:     'images/green.png',
    }
}

},{}],3:[function(require,module,exports){
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

},{"./states":6}],4:[function(require,module,exports){
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

},{"../asset_data":2}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
module.exports = GameStates = {
    Boot: require('./boot.js'),
    Menu: require('./menu.js'),
    Play: require('./play.js'),
    End:  require('./end.js'),
}

},{"./boot.js":4,"./end.js":5,"./menu.js":7,"./play.js":8}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
var XY = window.XY;
var Settings = window.Settings;
var AssetData = require('../asset_data');
var game;

var Context;

module.exports = Play = function (_game) { 
    game = _game;
};

Play.setContext = function(newContext) {
    // assert that the context has the right stuff 
    // console.assert(!!newContext.Map);
    Context = newContext;
};

Play.prototype = {
    preload: function() {
        // init any non-view modules from Context
    },

    create: function () {
        console.log('Game state: Play');
        //game.add.tileSprite(0, 0, Settings.gameDims.x, Settings.gameDims.y, 'background');
    },

    update: function () {
        checkPlayerInput();
    },
    render: function () {
        debugText();
    }
};

function debugText() {
    var lines = [
        'GAME',
        '  width:  ' + window.game.width,
        '  height: ' + window.game.height
    ]

    var color = "#FFF";
    var lineheight = 14;
    var line = 1;
    for (var line = 0; line < lines.length; line++) {
        game.debug.text(lines[line], 2, (line + 1) * lineheight, color)
    }
}
function checkPlayerInput() {
}


},{"../asset_data":2}]},{},[1]);
