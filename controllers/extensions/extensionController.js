var events = require('events');

module.exports = class {
    constructor(){
        this.messageListener = new events.EventEmitter();
    };
}