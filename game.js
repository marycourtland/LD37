var Settings = window.Settings;
var View = require('./view');

// view-independent modules
var Context = {
    // require stuff
    Map: require('./map')
}

window.game = {};

window.onload = function() {
    View.load(Context);
}
