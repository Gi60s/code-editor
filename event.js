'use strict';
(function() {

    const handlers = {};

    this.CodeEditorEvent = {

        on: function(name, callback) {
            if (!handlers[name]) handlers[name]
        }

    };

}).call(this);