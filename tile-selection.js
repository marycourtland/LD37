var xy = window.XY;
var Events = window.Events;
module.exports = TileSelection = {};
Events.init(TileSelection);

// we don't expect huge numbers of tiles to be selected at any point
TileSelection.selected = [];

TileSelection.isSelected = function(coords) {
    coords = xy(coords);
    return this.selected.filter(function(coords2) {
        return coords.eq(coords2);
    }).length > 0;
}

TileSelection.select = function(coords) {
    if (!this.isSelected(coords)) {
        this.selected.push(coords); 
        this.emit('select', {coords: coords})
    }
}

TileSelection.deselect = function(coords) {
    var index = -1;
    for (var i = 0; i < this.selected.length; i++) {
        if (this.selected[i].eq(coords)) index = i;
    }
    if (index > -1) {
        var deselected = this.selected[index];
        //console.log('Deslecting:', i, deselected, coords)
        this.emit('deselect', {coords: this.selected[index]})
        this.selected.splice(index, 1);
    }

}

TileSelection.deselectAll = function(coords) {
    var self = this;
    this.selected.forEach(function(coords) {
        self.emit('deselect', {coords: coords})
    })
    this.selected = [];
}
