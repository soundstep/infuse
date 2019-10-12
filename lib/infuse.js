(function(infuse) {

    'use strict';

    var FN_ARGS_FUNCTION = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    var FN_ARGS_CLASS = /(?!function)\s*constructor\s*[^\(|function]*\(\s*([^\)]*)\)\s*{/m;
    var FN_ARG_SPLIT = /,/;
    var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

    function contains(arr, value) {
        var i = arr.length;
        while (i--) {
            if (arr[i] === value) {
                return true;
            }
        }
        return false;
    }

    infuse.errors = {
        MAPPING_BAD_PROP: '[Error Injector.MAPPING_BAD_PROP] The first parameter is invalid, a string is expected.',
        MAPPING_BAD_VALUE: '[Error Injector.MAPPING_BAD_VALUE] The second parameter is invalid, it can\'t null or undefined, with property: ',
        MAPPING_BAD_CLASS: '[Error Injector.MAPPING_BAD_CLASS] The second parameter is invalid, a function is expected, with property: ',
        MAPPING_BAD_SINGLETON: '[Error Injector.MAPPING_BAD_SINGLETON] The third parameter is invalid, a boolean is expected, with property: ',
        MAPPING_ALREADY_EXISTS: '[Error Injector.MAPPING_ALREADY_EXISTS] This mapping already exists, with property: ',
        CREATE_INSTANCE_INVALID_PARAM: '[Error Injector.CREATE_INSTANCE_INVALID_PARAM] Invalid parameter, a function is expected.',
        NO_MAPPING_FOUND: '[Error Injector.NO_MAPPING_FOUND] No mapping found',
        INJECT_INSTANCE_IN_ITSELF_PROPERTY: '[Error Injector.INJECT_INSTANCE_IN_ITSELF_PROPERTY] A matching property has been found in the target, you can\'t inject an instance in itself.',
        INJECT_INSTANCE_IN_ITSELF_CONSTRUCTOR: '[Error Injector.INJECT_INSTANCE_IN_ITSELF_CONSTRUCTOR] A matching constructor parameter has been found in the target, you can\'t inject an instance in itself.',
        DEPENDENCIES_MISSING_IN_STRICT_MODE: '[Error Injector.DEPENDENCIES_MISSING_IN_STRICT_MODE] An "inject" property (array) that describes the dependencies is missing in strict mode.',
        DEPENDENCIES_MISSING_IN_STRICT_MODE_CONSTRUCTOR_INJECTION: '[Error Injector.DEPENDENCIES_MISSING_IN_STRICT_MODE_CONSTRUCTOR_INJECTION] An "inject" property (array) that describes the dependencies of constructor is missing in strict mode.',
        DEPENDENCIES_INVALID_TARGET: '[Error Injector.DEPENDENCIES_INVALID_TARGET] Invalid target, a function or a class is expected (arrow function cannot be instantiated).'
    };

    var MappingVO = function(prop, value, cl, singleton) {
        this.prop = prop;
        this.value = value;
        this.cl = cl;
        this.singleton = singleton || false;
    };

    var validateProp = function(prop) {
        if (typeof prop !== 'string') {
            throw new Error(infuse.errors.MAPPING_BAD_PROP);
        }
    };

    var validateValue = function(prop, val) {
        if (val === undefined || val === null) {
            throw new Error(infuse.errors.MAPPING_BAD_VALUE + prop);
        }
    };

    var validateClass = function(prop, val) {
        if (typeof val !== 'function') {
            throw new Error(infuse.errors.MAPPING_BAD_CLASS + prop);
        }
    };

    var validateBooleanSingleton = function(prop, singleton) {
        if (typeof singleton !== 'boolean') {
            throw new Error(infuse.errors.MAPPING_BAD_SINGLETON + prop);
        }
    };

    var validateConstructorInjectionLoop = function(name, cl) {
        var params = infuse.getDependencies(cl);
        if (contains(params, name)) {
            throw new Error(infuse.errors.INJECT_INSTANCE_IN_ITSELF_CONSTRUCTOR);
        }
    };

    var validatePropertyInjectionLoop = function(name, target) {
        if (target.hasOwnProperty(name)) {
            throw new Error(infuse.errors.INJECT_INSTANCE_IN_ITSELF_PROPERTY);
        }
    };

    var formatMappingError = function(propName, className) {
        var nameInfo = propName !== undefined ? ' for the injection name: "' + propName + '"' : '';
        var classInfo = className !== undefined ? ' when instantiating: "' + className + '"' : '';
        return infuse.errors.NO_MAPPING_FOUND + nameInfo + classInfo + '.';
    };

    infuse.Injector = function() {
        this.mappings = {};
        this.parent = null;
        this.strictMode = false;
        this.strictModeConstructorInjection = false;
        this.throwOnMissing = true;
    };

    infuse.getDependencies = function(cl) {
        var args = [];
        var deps;

        function extractName(all, underscore, name) {
            args.push(name);
        }

        if (cl.hasOwnProperty('inject') && Object.prototype.toString.call(cl.inject) === '[object Array]' && cl.inject.length > 0) {
            deps = cl.inject;
        }

        var clStr = cl.toString().replace(STRIP_COMMENTS, '');

        var argsFlat;

        if (clStr.indexOf('class') === 0) {
            argsFlat = clStr.replace(/function constructor/g, '').match(FN_ARGS_CLASS);
        }
        else if (clStr.indexOf('function') === 0) {
            argsFlat = clStr.match(FN_ARGS_FUNCTION);
        }
        else {
            throw new Error(infuse.errors.DEPENDENCIES_INVALID_TARGET);
        }

        if (argsFlat) {
            var spl = argsFlat[1].split(FN_ARG_SPLIT);
            for (var i=0, l=spl.length; i<l; i++) {
                // removes default es6 values
                var cArg = spl[i].split('=')[0].replace(/\s/g, '');
                // Only override arg with non-falsey deps value at same key
                var arg = (deps && deps[i]) ? deps[i] : cArg;
                arg.replace(FN_ARG, extractName);
            }
        }

        return args;
    };

    infuse.Injector.prototype = {

        createChild: function() {
            var injector = new infuse.Injector();
            injector.parent = this;
            injector.strictMode = this.strictMode;
            injector.strictModeConstructorInjection = this.strictModeConstructorInjection;
            injector.throwOnMissing = this.throwOnMissing;
            return injector;
        },

        getMappingVo: function(prop) {
            if (!this.mappings) {
                return null;
            }
            if (this.mappings[prop]) {
                return this.mappings[prop];
            }
            if (this.parent) {
                return this.parent.getMappingVo(prop);
            }
            return null;
        },

        mapValue: function(prop, val) {
            if (this.mappings[prop]) {
                throw new Error(infuse.errors.MAPPING_ALREADY_EXISTS + prop);
            }
            validateProp(prop);
            validateValue(prop, val);
            this.mappings[prop] = new MappingVO(prop, val, undefined, undefined);
            return this;
        },

        mapClass: function(prop, cl, singleton) {
            if (this.mappings[prop]) {
                throw new Error(infuse.errors.MAPPING_ALREADY_EXISTS + prop);
            }
            validateProp(prop);
            validateClass(prop, cl);
            if (singleton) {
                validateBooleanSingleton(prop, singleton);
            }
            this.mappings[prop] = new MappingVO(prop, null, cl, singleton);
            return this;
        },

        removeMapping: function(prop) {
            this.mappings[prop] = null;
            delete this.mappings[prop];
            return this;
        },

        hasMapping: function(prop) {
            return !!this.mappings[prop];
        },

        hasInheritedMapping: function(prop) {
            return !!this.getMappingVo(prop);
        },

        getMapping: function(value) {
            for (var name in this.mappings) {
                if (this.mappings.hasOwnProperty(name)) {
                    var vo = this.mappings[name];
                    if (vo.value === value || vo.cl === value) {
                        return vo.prop;
                    }
                }
            }
            return undefined;
        },

        getValue: function(prop) {
            var vo = this.mappings[prop];
            if (!vo) {
                if (this.parent) {
                    vo = this.parent.getMappingVo.apply(this.parent, arguments);
                }
                else if (this.throwOnMissing) {
                    throw new Error(formatMappingError(prop));
                }
                else {
                    return;
                }
            }
            if (vo.cl) {
                var args = Array.prototype.slice.call(arguments);
                args[0] = vo.cl;
                if (vo.singleton) {
                    if (!vo.value) {
                        vo.value = this.createInstance.apply(this, args);
                    }
                    return vo.value;
                }
                else {
                    return this.createInstance.apply(this, args);
                }
            }
            return vo.value;
        },

        getClass: function(prop) {
            var vo = this.mappings[prop];
            if (!vo) {
                if (this.parent) {
                    vo = this.parent.getMappingVo.apply(this.parent, arguments);
                }
                else {
                    return undefined;
                }
            }
            if (vo.cl) {
                return vo.cl;
            }
            return undefined;
        },

        instantiate: function(TargetClass) {
            if (typeof TargetClass !== 'function') {
                throw new Error(infuse.errors.CREATE_INSTANCE_INVALID_PARAM);
            }
            var params = infuse.getDependencies(TargetClass);
            if (this.strictMode && !TargetClass.hasOwnProperty('inject')) {
                throw new Error(infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE);
            }
            else if (this.strictModeConstructorInjection && params.length > 0 && !TargetClass.hasOwnProperty('inject')) {
                throw new Error(infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE_CONSTRUCTOR_INJECTION);
            }
            var args = [null];
            for (var i=0, l=params.length; i<l; i++) {
                if (arguments.length > i+1 && arguments[i+1] !== undefined && arguments[i+1] !== null) {
                    // argument found
                    args.push(arguments[i+1]);
                }
                else {
                    var name = params[i];
                    // no argument found
                    var vo = this.getMappingVo(name);
                    if (!!vo) {
                        // found mapping
                        var val = this.getInjectedValue(vo, name);
                        args.push(val);
                    }
                    else {
                        // no mapping found
                        if (this.throwOnMissing) {
                            throw new Error(formatMappingError(name, TargetClass.name));
                        }
                        args.push(undefined);
                    }
                }
            }
            return new (Function.prototype.bind.apply(TargetClass, args))();
        },

        inject: function (target, isParent) {
            if (this.parent) {
                this.parent.inject(target, true);
            }
            for (var name in this.mappings) {
                if (this.mappings.hasOwnProperty(name)) {
                    var vo = this.getMappingVo(name);
                    if (target.hasOwnProperty(vo.prop) || (target.constructor && target.constructor.prototype && target.constructor.prototype.hasOwnProperty(vo.prop)) ) {
                        target[name] = this.getInjectedValue(vo, name);
                    }
                }
            }
            if (typeof target.postConstruct === 'function' && !isParent) {
                target.postConstruct();
            }
            return this;
        },

        getInjectedValue: function(vo, name) {
            var val = vo.value;
            var injectee;
            if (vo.cl) {
                if (vo.singleton) {
                    if (!vo.value) {
                        validateConstructorInjectionLoop(name, vo.cl);
                        vo.value = this.instantiate(vo.cl);
                        injectee = vo.value;
                    }
                    val = vo.value;
                }
                else {
                    validateConstructorInjectionLoop(name, vo.cl);
                    val = this.instantiate(vo.cl);
                    injectee = val;
                }
            }
            if (injectee) {
                validatePropertyInjectionLoop(name, injectee);
                this.inject(injectee);
            }
            return val;
        },

        createInstance: function() {
            var instance = this.instantiate.apply(this, arguments);
            this.inject(instance);
            return instance;
        },

        getValueFromClass: function(cl) {
            for (var name in this.mappings) {
                if (this.mappings.hasOwnProperty(name)) {
                    var vo = this.mappings[name];
                    if (vo.cl === cl) {
                        if (vo.singleton) {
                            if (!vo.value) {
                                vo.value = this.createInstance.apply(this, arguments);
                            }
                            return vo.value;
                        }
                        else {
                            return this.createInstance.apply(this, arguments);
                        }
                    }
                }
            }
            if (this.parent) {
                return this.parent.getValueFromClass.apply(this.parent, arguments);
            } else if (this.throwOnMissing) {
                throw new Error(formatMappingError(undefined, cl.name));
            }
        },

        dispose: function() {
            this.mappings = {};
        }

    };

    if (!Function.prototype.bind) {
        Function.prototype.bind = function bind(that) {
            var target = this;
            if (typeof target !== 'function') {
                throw new Error('Error, you must bind a function.');
            }
            var args = Array.prototype.slice.call(arguments, 1); // for normal call
            var bound = function () {
                if (this instanceof bound) {
                    var F = function(){};
                    F.prototype = target.prototype;
                    var self = new F();
                    var result = target.apply(
                        self,
                        args.concat(Array.prototype.slice.call(arguments))
                    );
                    if (Object(result) === result) {
                        return result;
                    }
                    return self;
                } else {
                    return target.apply(
                        that,
                        args.concat(Array.prototype.slice.call(arguments))
                    );
                }
            };
            return bound;
        };
    }

    // register for AMD module
    if (typeof define === 'function' && typeof define.amd !== 'undefined') {
        define(infuse);
    }

    // export for node.js
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = infuse;
    }
    if (typeof exports !== 'undefined') {
        exports = infuse;
    }

})(this['infuse'] = this['infuse'] || {});
