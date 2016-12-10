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

