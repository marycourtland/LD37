// not included in browserify bundle
window.Settings = {};

// ok this could go in a lib somewhere
function getUrlParam(key) {
    var match = window.location.search.match(new RegExp(key + '=([^?&]*)', 'i'));
    if (match && match[1]) return match[1];
    else return null;
}

Settings.mode = getUrlParam('mode') || 'default';

// === Game settings
Settings.mapSize = {x: 60, y:60}; // measured in game cells
Settings.gameAnchor = [0.5, -0.5];
Settings.gameAnchor = [0.5, 0.5];
Settings.gameDims = {x: 4000, y: 4000}; // pixels
Settings.cellDims = {x: 40, y:40}; //pixels per cell
Settings.cameraDeadzone = 0.4;

Settings.numBlobs = 20;

// TEST SETTINGS - smaller map etc
if (Settings.mode === 'test') {
    Settings.mapSize = {x: 20, y:20};
    Settings.gameAnchor = [0.5, 0.2];
    Settings.gameDims = {x: 1000, y: 1000};
}
