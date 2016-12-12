
module.exports = utils = {};


utils.is = function(obj, Obj) {
    return obj.__proto__ === Obj.prototype;
}

utils.isCoords = function(obj) {
    return obj.hasOwnProperty('x') && obj.hasOwnProperty('y')
}

utils.isArray = function(obj) {
    return typeof obj['splice'] === 'function';
}

utils.randInt = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
