// Super basic event-triggering mixin thing
window.Events = {};

Events.init = function(obj) {
    var methods= ['on', 'off', 'emit']
    methods.forEach(function(method) {
        // Protect against collisions
        console.assert(!(method in obj) || obj[method] === Events[method], 'Collision with Events.' + method);

        obj[method] = Events[method];
    })
    
    return obj;
}

Events.on = function(event, callback_id, callback) {
    Events._ensureEvent(this, event);
    this.callbacks[event][callback_id] = callback; 
}

Events.off = function(event, callback_id) {
    Events._ensureEvent(this, event);
    delete this.callbacks[event][callback_id];
}

Events.emit = function(event, data) {
    Events._ensureEvent(this, event);
    if (Object.keys(this.callbacks[event]).length > 0) {
        for (var cb in this.callbacks[event]) {
            this.callbacks[event][cb](data);
        }
    }
}

Events._ensureEvent = function(obj, evt) {
    if (!obj.callbacks) obj.callbacks = {};
    if (!(evt in obj.callbacks)) obj.callbacks[evt] = {};
}
