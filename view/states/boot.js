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
