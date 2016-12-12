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
