var parse = require('css-parse');

var Handle = function (css) {
    this.styleSheet = parse(css);
    this.handles = [];
    this.finalHandle = new Function();
};


Handle.prototype.use = function (properties, func) {
    if (arguments.length == 1) {
        this.handles.push({
            properties: '*',
            func: arguments[0]
        });
        return;
    }

    this.handles.push(
        {
            properties: properties,
            func: func
        }
    );
};

Handle.prototype.parseRules = function (json, rules) {
    var self = this;
    json = json || {};
    (rules || []).forEach(function (rule) {
        if(rule.type === 'media') {
            json['@media' + rule.media] = json['@media' + rule.media] || {};
            self.parseRules(json['@media' + rule.media], rule.rules);
        } else if(rule.type === 'rule') {
            rule.selectors.forEach(function (selector) {
                var styles, selectorArr;
                selector = selector.replace(/\.|#/g, '');
                selectorArr = selector.split(/\s+/);

                if(selectorArr.length > 1) {
                    /**
                     * transform {"a b": 1} to {a: { b: 1}}
                     */
                    styles = json;
                    selectorArr.forEach(function (key, index) {
                        if(!styles[key]) {
                            styles[key] = {};
                        }
                        styles = styles[key];
                    });
                } else {
                    styles = (json[selector] = json[selector] || {});
                }

                rule.declarations.forEach(function (declaration) {
                    if (declaration.type !== 'declaration') return;
                    var keys = [{
                        key: declaration.property,
                        value: declaration.value
                    }];

                    for (var i = 0; i < self.handles.length; i++) {
                        var properties = self.handles[i].properties;
                        if (properties == "*") {
                            self.handles[i].func(keys);
                        }
                        if (_indexOf(declaration.property, properties)) {
                            keys = self.handles[i].func(keys);
                        }
                    }
                    self.finalHandle(styles, keys);

                });
            });
        }
    });
    return json;
};

Handle.prototype.do = function () {
    var json = {};

    this.parseRules(json, this.styleSheet.stylesheet.rules);
    return JSON.stringify(json, null, 4);
};

Handle.prototype.final = function (func) {
    this.finalHandle = func;
};

function _indexOf(value, arr) {
    var flag = false;
    for (var i = 0; i < arr.length; i++) {
        if (value === arr[i]) {
            return true
        }
    }
    return flag;
}

module.exports = Handle;
