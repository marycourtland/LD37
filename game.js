var Settings = window.Settings;
var View = require('./view');

// view-independent modules
var Context = {
    // require stuff
    Map: require('./map'),
    Room: require('./room')
}

window.game = {};

window.onload = function() {
    View.load(Context);
}
