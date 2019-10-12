const assert = require('chai').assert;
const infuse = require('../lib/infuse');

const utils = {};

utils.applyProperties = (target, extension) => {
	for (const prop in extension) {
		target[prop] = extension[prop];
	}
};

utils.inherit = (target, obj) => {
	let subclass;
	if (obj && obj.hasOwnProperty('constructor')) {
		// use constructor if defined
		subclass = obj.constructor;
	} else {
		// call the super constructor
		subclass = function(){
			return target.apply(this, arguments);
		};
	}
	// add super properties
	utils.applyProperties(subclass.prototype, target.prototype);
	// set the prototype chain to inherit from the parent without calling parent's constructor
	let chain = function(){};
	chain.prototype = target.prototype;
	subclass.prototype = new chain();
	// add obj properties
	if (obj) utils.applyProperties(subclass.prototype, obj, target.prototype);
	// point constructor to the subclass
	subclass.prototype.constructor = subclass;
	// set super class reference
	subclass.parent = target.prototype;
	return subclass;
};


describe('infusejs', function () {

	let injector;

	beforeEach(function () {
		injector = new infuse.Injector();
	});

	afterEach(function () {
		injector.dispose();
		injector = null;
	});

	it('create injector', function () {
		assert.isDefined(injector);
		assert.instanceOf(injector, infuse.Injector);
	});

	it('create 2 injectors', function () {
		const inj1 = new infuse.Injector();
		const inj2 = new infuse.Injector();
		inj1.mapValue('name', 'John');
		assert.isFalse(inj2.hasMapping('name'));
	});

	it('has mapping value', function () {
		injector.mapValue('name', 'John');
		assert.ok(injector.hasMapping('name'));
	});

	it('has mapping class', function () {
		const InstanceClass = function(){};
		injector.mapClass('name', InstanceClass);
		assert.ok(injector.hasMapping('name'));
	});

	it('map class singleton twice with getValue', function () {
		const InstanceClass = function(){};
		injector.mapClass('name1', InstanceClass, true);
		injector.mapClass('name2', InstanceClass, true);
		const instance1 = injector.getValue('name1');
		const instance2 = injector.getValue('name2');
		assert.ok(instance1 !== instance2);
	});

	it('map class singleton twice with injection', function () {
		const InstanceClass = function(){};
		injector.mapClass('name1', InstanceClass, true);
		injector.mapClass('name2', InstanceClass, true);
		const TestClass1 = function(){this.name1 = null;};
		const TestClass2 = function(){this.name2 = null;};
		const instance1 = injector.createInstance(TestClass1);
		const instance2 = injector.createInstance(TestClass2);
		assert.ok(instance1 !== instance2);

	});

	it('mapping value bad property throws error', function () {
		assert.throws(() => injector.mapValue(1, 1), infuse.errors.MAPPING_BAD_PROP);
	});

	it('mapping value bad value throws error', function () {
		assert.throws(() => injector.mapValue('name'), infuse.errors.MAPPING_BAD_VALUE + 'name');
	});

	it('mapping class no class throws error', function () {
		assert.throws(() => injector.mapClass('name'), infuse.errors.MAPPING_BAD_CLASS + 'name');
	});

	it('mapping class wrong class throws error with non-class', function () {
		assert.throws(() => injector.mapClass('name', 1), infuse.errors.MAPPING_BAD_CLASS + 'name');
	});

	it('already has mapping value throws error', function () {
		injector.mapValue('name', 'John');
		assert.throws(() => injector.mapValue('name', 'John'), infuse.errors.MAPPING_ALREADY_EXISTS + 'name');
	});

	it('already has mapping class throws error', function () {
		const InstanceClass = function(){};
		injector.mapClass('name', InstanceClass);
		assert.throws(() => injector.mapClass('name', InstanceClass), infuse.errors.MAPPING_ALREADY_EXISTS + 'name');
	});

	it('remove mapping with no mapping', function () {
		injector.removeMapping('name');
		assert.isFalse(injector.hasMapping('name'));
	});

	it('remove mapping value', function () {
		injector.mapValue('name', 'John').removeMapping('name');
		assert.isFalse(injector.hasMapping('name'));
	});

	it('remove mapping class', function () {
		const InstanceClass = function(){};
		injector.mapClass('name', InstanceClass).removeMapping('name');
		assert.isFalse(injector.hasMapping('name'));
	});

	it('re-mapping value after removal', function () {
		injector.mapValue('name', 'John').removeMapping('name').mapValue('name', 'John');
		assert.ok(injector.hasMapping('name'));
	});

	it('re-mapping class after removal', function () {
		const InstanceClass = function(){};
		injector.mapValue('name', InstanceClass).removeMapping('name').mapValue('name', InstanceClass);
		assert.ok(injector.hasMapping('name'));
	});

	it('get mapping value', function () {
		injector.mapValue('name', 'John');
		assert.equal(injector.getMapping('John'), 'name');
	});

	it('get mapping class', function () {
		const InstanceClass = function(){};
		injector.mapClass('name', InstanceClass);
		assert.equal(injector.getMapping(InstanceClass), 'name');
	});

	it('get non-existing mapping returns undefined', function () {
		assert.isUndefined(injector.getMapping('John'));
	});

	it('get value', function () {
		injector.mapValue('name', 'John');
		assert.equal(injector.getValue('name'), 'John');
	});

	it('get value boolean', function () {
		injector.mapValue('bool1', true);
		injector.mapValue('bool2', false);
		assert.equal(injector.getValue('bool1'), true);
		assert.equal(injector.getValue('bool2'), false);
	});

	it('get value empty string', function () {
		injector.mapValue('name', '');
		assert.equal(injector.getValue('name'), '');
	});

	it('get value no mapping throws error', function () {
		assert.throws(() => injector.getValue('name'), /No mapping found/);
		assert.throws(() => injector.getValue('name', undefined), /No mapping found/);
		assert.throws(() => injector.getValue('name', null), /No mapping found/);
	});

	it('get class', function () {
		const InstanceClass = function(){};
		injector.mapClass('name', InstanceClass);
		assert.equal(injector.getClass('name'), InstanceClass);
	});

	it('inject property into object', function () {
		const foo = { name: null };
		injector.mapValue('name', 'John').inject(foo);
		assert.equal(foo.name, 'John');
	});

	it('inject function into object', function () {
		const foo = { getName: null };
		const func = function(){ return 'John' };
		injector.mapValue('getName', func).inject(foo);
		assert.equal(foo.getName, func);
		assert.equal(foo.getName(), 'John');
	});

	it('inject instance into object', function () {
		const foo = {instance: null};
		const InstanceClass = function(){};
		const instance = new InstanceClass();
		injector.mapValue('instance', instance).inject(foo);
		assert.equal(foo.instance, instance);
	});

	it('inject class into object', function () {
		const foo = {instance: null};
		const InstanceClass = function(){};
		injector.mapClass('instance', InstanceClass).inject(foo);
		assert.ok(foo.instance instanceof InstanceClass);
	});

	it('inject class not singleton into object', function () {
		const foo1 = {instance: null};
		const foo2 = {instance: null};
		const InstanceClass = function(){};
		injector.mapClass('instance', InstanceClass);
		injector.inject(foo1);
		injector.inject(foo2);
		assert.ok(foo1.instance instanceof InstanceClass);
		assert.ok(foo2.instance instanceof InstanceClass);
		assert.isFalse(foo1.instance === foo2.instance);
	});

	it('inject class singleton into object', function () {
		const foo1 = {instance: null};
		const foo2 = {instance: null};
		const InstanceClass = function(){};
		injector.mapClass('instance', InstanceClass, true);
		injector.inject(foo1);
		injector.inject(foo2);
		assert.ok(foo1.instance instanceof InstanceClass);
		assert.ok(foo2.instance instanceof InstanceClass);
		assert.ok(foo1.instance === foo2.instance);
	});

	it('inject property into instance', function () {
		const FooClass = function(){this.name=null;};
		const foo = new FooClass();
		injector.mapValue('name', 'John').inject(foo);
		assert.ok(foo.name, 'John');
	});

	it('inject function into instance', function () {
		const FooClass = function(){this.getName=null};
		const foo = new FooClass();
		const func = function(){return 'John'};
		injector.mapValue('getName', func).inject(foo);
		assert.equal(foo.getName, func);
		assert.equal(foo.getName(), 'John');
	});

	it('inject instance into instance', function () {
		const FooClass = function(){this.instance=null};
		const foo = new FooClass();
		const InstanceClass = function(){};
		const instance = new InstanceClass();
		injector.mapValue('instance', instance).inject(foo);
		assert.equal(foo.instance, instance);
	});

	it('inject class not singleton into instance', function () {
		const FooClass1 = function(){this.instance=null};
		const FooClass2 = function(){this.instance=null};
		const foo1 = new FooClass1();
		const foo2 = new FooClass2();
		const InstanceClass = function(){};
		injector.mapClass('instance', InstanceClass);
		injector.inject(foo1);
		injector.inject(foo2);
		assert.ok(foo1.instance instanceof InstanceClass);
		assert.ok(foo2.instance instanceof InstanceClass);
		assert.isFalse(foo1.instance === foo2.instance);
	});

	it('inject class singleton into instance', function () {
		const FooClass1 = function(){this.instance=null};
		const FooClass2 = function(){this.instance=null};
		const foo1 = new FooClass1();
		const foo2 = new FooClass2();
		const InstanceClass = function(){};
		injector.mapClass('instance', InstanceClass, true);
		injector.inject(foo1);
		injector.inject(foo2);
		assert.ok(foo1.instance instanceof InstanceClass);
		assert.ok(foo2.instance instanceof InstanceClass);
		assert.ok(foo1.instance === foo2.instance);
	});

	it('inject class with constructor not singleton into instance', function () {
		const FooClass1 = function(instance){this.instanceParam=instance};
		const FooClass2 = function(instance){this.instanceParam=instance};
		const InstanceClass = function(){};
		injector.mapClass('instance', InstanceClass);
		const foo1 = injector.createInstance(FooClass1);
		const foo2 = injector.createInstance(FooClass2);
		assert.ok(foo1.instanceParam instanceof InstanceClass);
		assert.ok(foo2.instanceParam instanceof InstanceClass);
		assert.isFalse(foo1.instanceParam === foo2.instanceParam);
	});

	it('inject class with constructor singleton into instance', function () {
		const FooClass1 = function(instance){this.instanceParam=instance};
		const FooClass2 = function(instance){this.instanceParam=instance};
		const InstanceClass = function(){};
		injector.mapClass('instance', InstanceClass, true);
		const foo1 = injector.createInstance(FooClass1);
		const foo2 = injector.createInstance(FooClass2);
		assert.ok(foo1.instanceParam instanceof InstanceClass);
		assert.ok(foo2.instanceParam instanceof InstanceClass);
		assert.ok(foo1.instanceParam === foo2.instanceParam);
	});

	it('inject class with constructor in itself throws error with getValue', function () {
		const FooClass = function(name){this.nameParam=name;};
		injector.mapClass('name', FooClass, true);
		assert.throws(() => injector.getValue('name'), infuse.errors.INJECT_INSTANCE_IN_ITSELF_CONSTRUCTOR);
	});

	it('inject class with constructor in itself throws error with getValueFromClass', function () {
		const FooClass = function(name){this.nameParam=name;};
		injector.mapClass('name', FooClass);
		assert.throws(() => injector.getValueFromClass(FooClass), infuse.errors.INJECT_INSTANCE_IN_ITSELF_CONSTRUCTOR);
	});

	it('inject class in itself throws error with getValue', function () {
		const FooClass = function(){this.name=null;};
		injector.mapClass('name', FooClass);
		assert.throws(() => injector.getValue('name'), infuse.errors.INJECT_INSTANCE_IN_ITSELF_PROPERTY);
	});

	it('inject class in itself throws error with getValueFromClass', function () {
		const FooClass = function(){this.name=null;};
		injector.mapClass('name', FooClass);
		assert.throws(() => injector.getValueFromClass(FooClass), infuse.errors.INJECT_INSTANCE_IN_ITSELF_PROPERTY);
	});

	it('injected in prototype (property)', function () {
		const FooClass = function(){};
		FooClass.prototype.name = null;
		injector.mapValue('name', 'John');
		const foo = injector.createInstance(FooClass);
		assert.equal(foo.name, 'John');
	});

	it('injected in prototype (property) with inheritance', function () {
		const Human = function(){};
		Human.prototype.name = null;
		const Male = function(){};
		utils.inherit(Human, Male.prototype);
		injector.mapValue('name', 'John');
		const male = injector.createInstance(Male);
		assert.equal(male.name, 'John');
	});

	it('create instance', function () {
		const FooClass = function(){};
		const foo = injector.createInstance(FooClass);
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
	});

	it('create instance with params', function () {
		const FooClass = function(p1, p2, p3){
			this.p1 = p1;
			this.p2 = p2;
			this.p3 = p3;
		};
		const foo = injector.createInstance(FooClass, 1, false, '');
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
		assert.equal(foo.p1, 1);
		assert.equal(foo.p2, false);
		assert.equal(foo.p3, '');
	});

	it('create instance no param throws error', function () {
		const FooClass = function(){};
		assert.throws(() => injector.createInstance(), infuse.errors.CREATE_INSTANCE_INVALID_PARAM);
	});

	it('create instance invalid param throws error', function () {
		const FooClass = function(){};
		assert.throws(() => injector.createInstance(1), infuse.errors.CREATE_INSTANCE_INVALID_PARAM);
	});

	it('create instance inject property', function () {
		const FooClass = function(){this.name=null;};
		const foo = injector.mapValue('name', 'John').createInstance(FooClass);
		assert.equal(foo.name, 'John');
	});

	it('create instance inject function', function () {
		const FooClass = function(){this.getName=null;};
		const func = function(){return 'John'};
		const foo = injector.mapValue('getName', func).createInstance(FooClass);
		assert.equal(foo.getName, func);
	});

	it('create instance inject instance', function () {
		const FooClass = function(){this.instance=null;};
		const InstanceClass = function(){};
		const instance = new InstanceClass();
		const foo = injector.mapValue('instance', instance).createInstance(FooClass);
		assert.equal(foo.instance, instance);
	});

	it('create instance unique', function () {
		const FooClass1 = function(){this.name=null;};
		const FooClass2 = function(){};
		const foo1 = injector.createInstance(FooClass1);
		const foo2 = injector.createInstance(FooClass2);
		assert.notEqual(foo1, foo2);
	});

	it('create instance with arguments', function () {
		const FooClass = function(name){this.name=name;this.age=null;};
		const foo = injector.mapValue('age', 21).createInstance(FooClass, 'John');
		assert.equal(foo.name, 'John');
		assert.equal(foo.age, 21);
	});

	it('create instance with constructor mapping', function () {
		const p1 = 'John';
		const p2 = 31;
		const p3 = {data:'data'};
		const p4 = [1, 'string', true];
		const p5 = true;
		injector.mapValue('p1', p1);
		injector.mapValue('p2', p2);
		injector.mapValue('p3', p3);
		injector.mapValue('p4', p4);
		injector.mapValue('p5', p5);
		const FooClass = function(p1, p2, p3, p4, p5){
			this.param1 = p1;
			this.param2 = p2;
			this.param3 = p3;
			this.param4 = p4;
			this.param5 = p5;
		};
		const foo = injector.createInstance(FooClass);
		assert.equal(foo.param1, p1);
		assert.equal(foo.param2, p2);
		assert.equal(foo.param3, p3);
		assert.equal(foo.param4, p4);
		assert.equal(foo.param5, p5);
	});

	it('create instance with constructor forced parameters', function () {
		const p1 = 'John';
		const p2 = 31;
		const p3 = {data:'data'};
		injector.mapValue('p1', p1);
		injector.mapValue('p2', p2);
		injector.mapValue('p3', p3);
		const FooClass = function(p1, p2, p3){
			this.param1 = p1;
			this.param2 = p2;
			this.param3 = p3;
		};
		const foo = injector.createInstance(FooClass, null, 'forced', undefined);
		assert.equal(foo.param1, p1);
		assert.equal(foo.param2, 'forced');
		assert.equal(foo.param3, p3);
	});

	it('create instance with constructor mapping and inheritance', function () {
		const Human = function(type) {
			this.typeParam = type
		}
		Human.prototype.getType = function() {
			return this.typeParam;
		}
		const Male = function(name) {
			Human.call(this, 'male')
			this.nameParam = name;
		}
		Male.prototype.getName = function() {
			return this.nameParam;
		}
		utils.inherit(Human, Male.prototype);
		injector.mapValue('name', 'John');
		const male = injector.createInstance(Male);
		assert.equal(male.typeParam, 'male');
		assert.equal(male.nameParam, 'John');
		assert.equal(male.getType(), 'male');
		assert.equal(male.getName(), 'John');
	});

	it('get instance with getValue', function () {
		const FooClass = function(){};
		injector.mapClass('name', FooClass);
		const foo = injector.getValue('name');
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
	});

	it('get instance with getValueFromClass', function () {
		const FooClass = function(){};
		injector.mapClass('name', FooClass);
		const foo = injector.getValueFromClass(FooClass);
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
	});

	it('get instance no mapping throws error', function () {
		const FooClass = function(){this.name=null;};
		assert.throws(() => injector.getValueFromClass(FooClass), /No mapping found/);
	});

	it('get instance bad singleton parameter throws error', function () {
		const FooClass = function(){};
		assert.throws(() => injector.mapClass('name', FooClass, 'bad'), infuse.errors.MAPPING_BAD_SINGLETON + 'name');
	});

	it('get instance with constructor mapping with getValue', function () {
		const FooClass = function(type){this.typeParam = type;};
		injector.mapClass('name', FooClass);
		injector.mapValue('type', 'type');
		const foo = injector.getValue('name');
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
		assert.equal(foo.typeParam, 'type');
	});

	it('get instance with constructor mapping with getValueFromClass', function () {
		const FooClass = function(type){this.typeParam = type;};
		injector.mapClass('name', FooClass);
		injector.mapValue('type', 'type');
		const foo = injector.getValueFromClass(FooClass);
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
		assert.equal(foo.typeParam, 'type');
	});

	it('get instance with constructor parameters with getValue', function () {
		const FooClass = function(type){this.typeParam = type;};
		injector.mapClass('name', FooClass);
		const foo = injector.getValue('name', 'type');
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
		assert.equal(foo.typeParam, 'type');
	});

	it('get instance with constructor parameters with getValueFromClass', function () {
		const FooClass = function(type){this.typeParam = type;};
		injector.mapClass('name', FooClass);
		const foo = injector.getValueFromClass(FooClass, 'type');
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
		assert.equal(foo.typeParam, 'type');
	});

	it('get instance with constructor forced parameters with getValue', function () {
		const FooClass = function(type){this.typeParam = type;};
		injector.mapClass('name', FooClass);
		injector.mapValue('type', 'type');
		const foo = injector.getValue('name', 'another type');
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
		assert.equal(foo.typeParam, 'another type');
	});

	it('get instance with constructor forced parameters with getValueFromParam', function () {
		const FooClass = function(type){this.typeParam = type;};
		injector.mapClass('name', FooClass);
		injector.mapValue('type', 'type');
		const foo = injector.getValueFromClass(FooClass, 'another type');
		assert.isNotNull(foo);
		assert.isDefined(foo);
		assert.ok(foo instanceof FooClass);
		assert.equal(foo.typeParam, 'another type');
	});

  it('get instance with constructor using explicit inject array', function () {
  		const FooClass = function(a){this.typeParam = a;};
        FooClass.inject = ['type'];
  		injector.mapClass('name', FooClass);
  		injector.mapValue('type', 'type');
  		const foo = injector.getValue('name');
  		assert.isNotNull(foo);
  		assert.isDefined(foo);
  		assert.ok(foo instanceof FooClass);
  		assert.equal(foo.typeParam, 'type');
  	});

  it('get instance with constructor using explicit inject array with multiple args', function () {
      const FooClass = function(a, b, c){this.typeParamA = a;this.typeParamB = b;this.typeParamC = c;};
      FooClass.inject = ['typeA', 'typeB', 'typeC'];
      injector.mapClass('name', FooClass);
      injector.mapValue('typeA', 'typeA');
      injector.mapValue('typeB', 'typeB');
      injector.mapValue('typeC', 'typeC');
      const foo = injector.getValue('name');
      assert.isNotNull(foo);
      assert.isDefined(foo);
      assert.ok(foo instanceof FooClass);
      assert.equal(foo.typeParamA, 'typeA');
      assert.equal(foo.typeParamB, 'typeB');
      assert.equal(foo.typeParamC, 'typeC');
  });

  it('get instance with constructor using explicit inject array overriding existing type', function () {
      const FooClass = function(type){this.typeParam = type;};
      FooClass.inject = ['anotherType'];
      injector.mapClass('name', FooClass);
      injector.mapValue('type', 'type');
      injector.mapValue('anotherType', 'anotherType');
      const foo = injector.getValue('name');
      assert.isNotNull(foo);
      assert.isDefined(foo);
      assert.ok(foo instanceof FooClass);
      assert.equal(foo.typeParam, 'anotherType');
  });

  it('get instance with constructor using explicit inject array overriding existing type with multiple args', function () {
      const FooClass = function(typeA, typeB, typeC){this.typeParamA = typeA;this.typeParamB = typeB;this.typeParamC = typeC;};
      FooClass.inject = [null, 'anotherTypeB']; // Omit final otherwise falsey key
      injector.mapClass('name', FooClass);
      injector.mapValue('typeA', 'typeA');
      injector.mapValue('typeB', 'typeB');
      injector.mapValue('typeC', 'typeC');
      injector.mapValue('anotherTypeB', 'anotherTypeB');
      const foo = injector.getValue('name');
      assert.isNotNull(foo);
      assert.isDefined(foo);
      assert.ok(foo instanceof FooClass);
      assert.equal(foo.typeParamA, 'typeA');
      assert.equal(foo.typeParamB, 'anotherTypeB');
      assert.equal(foo.typeParamC, 'typeC');
  });

	it('get instance no singleton with getValue', function () {
		const FooClass = function(){};
		injector.mapClass('name', FooClass);
		const foo1 = injector.getValue('name');
		const foo2 = injector.getValue('name');
		assert.ok(foo1 instanceof FooClass);
		assert.ok(foo2 instanceof FooClass);
		assert.isFalse(foo1 === foo2);
	});

	it('get instance no singleton with getValueFromClass', function () {
		const FooClass = function(){};
		injector.mapClass('name', FooClass);
		const foo1 = injector.getValueFromClass(FooClass);
		const foo2 = injector.getValueFromClass(FooClass);
		assert.ok(foo1 instanceof FooClass);
		assert.ok(foo2 instanceof FooClass);
		assert.isFalse(foo1 === foo2);
	});

	it('get instance singleton with getValue', function () {
		const FooClass = function(){};
		injector.mapClass('name', FooClass, true);
		const foo1 = injector.getValue('name');
		const foo2 = injector.getValue('name');
		assert.ok(foo1 instanceof FooClass);
		assert.ok(foo2 instanceof FooClass);
		assert.ok(foo1 === foo2);
	});

	it('get instance singleton with getValueFromClass', function () {
		const FooClass = function(){};
		injector.mapClass('name', FooClass, true);
		const foo1 = injector.getValueFromClass(FooClass);
		const foo2 = injector.getValueFromClass(FooClass);
		assert.ok(foo1 instanceof FooClass);
		assert.ok(foo2 instanceof FooClass);
		assert.ok(foo1 === foo2);
	});

	it('get constructor params', function() {
		const f = function(name, age, other){};
		const names = infuse.getDependencies(f);
		assert.deepEqual(names, ['name', 'age', 'other']);
	});

    it('property injection with inject property using arguments', function () {
        const FooClass = function(){};
        injector.mapClass('name', FooClass, true);
        const TestClass = function(){
            this.renamedName = arguments[0];
        };
        TestClass.inject = ['name'];
        const inst = injector.createInstance(TestClass);
        assert.ok(inst.renamedName instanceof FooClass);
    });

    it('property injection using string', function () {
        const FooClass = function(){};
        injector.mapClass('name', FooClass, true);
        const TestClass = function(){
            this['name'] = null;
        };
        const inst = injector.createInstance(TestClass);
        assert.ok(inst.name instanceof FooClass);
    });

    it('property injection using string and inject method', function () {
        const FooClass = function(){};
        injector.mapClass('name', FooClass, true);
        const TestClass = function(){
            this['name'] = null;
        };
        const inst = new TestClass();
        injector.inject(inst);
        assert.ok(inst.name instanceof FooClass);
    });

    it('dispose', function () {
		const FooClass = function(){};
		const InjecteeClass = function(){this.name1=null;this.name2=null;this.name3=null;};
		injector.mapValue('name1', 'John');
		injector.mapClass('name2', FooClass);
		injector.mapClass('name3', FooClass, true);
		injector.dispose();
		assert.isFalse(injector.hasMapping('name1'));
		assert.isFalse(injector.hasMapping('name1'));
		assert.isFalse(injector.hasMapping('name2'));
		assert.isFalse(injector.hasMapping('name3'));
		assert.throws(() => injector.getValueFromClass(FooClass), /No mapping found/);
		assert.throws(() => injector.getValue('name2'), /No mapping found/);
		assert.throws(() => injector.getValue('name3'), /No mapping found/);
		const injectee = injector.createInstance(InjecteeClass);
		assert.isNull(injectee.name1);
		assert.isNull(injectee.name2);
		assert.isNull(injectee.name3);
	});

	it('post construct called', function () {
		const FooClass = function(){
			this.postConstructCalled = false;
		};
		FooClass.prototype = {
			postConstruct: function() {
				this.postConstructCalled = true;
			}
		};
		const foo = injector.createInstance(FooClass);
		assert.ok(foo.postConstructCalled);
	});

	it('post construct absent', function () {
		const FooClass = function(){
			this.postConstructCalled = false;
		};
		const foo = injector.createInstance(FooClass);
		assert.isFalse(foo.postConstructCalled);
	});

	it('scope', function () {
		const FooClass = function(){
			this.that = this;
		};
		const foo = injector.createInstance(FooClass)
		assert.equal(foo.that, foo);
	});

	it('child injector creation', function () {
		const child = injector.createChild();
		assert.isNotNull(child);
		assert.isDefined(child);
		assert.notEqual(child, injector);
		assert.ok(child instanceof infuse.Injector);
		assert.equal(child.parent, injector);
	});

	it('child injector don\'t get parent mapping', function () {
		injector.mapValue('name', 'John');
		const child = injector.createChild();
		assert.isFalse(child.hasMapping('name'));
	});

	it('child injector has inherited mapping', function () {
		injector.mapValue('name', 'John');
		injector.mapValue('type', function(){});
		const child = injector.createChild();
		assert.ok(child.hasInheritedMapping('name'));
		assert.ok(child.hasInheritedMapping('type'));
	});

	it('child injector map value', function () {
		const child = injector.createChild();
		child.mapValue('name', 'John');
		assert.ok(child.hasMapping('name'));
	});

	it('child injector map parent value', function () {
		injector.mapValue('name', 'John');
		const child = injector.createChild();
		const FooClass = function(){this.name=null;};
		const foo = child.createInstance(FooClass);
		assert.equal(foo.name, 'John');
	});

	it('child injector create class from parent mapping', function () {
		const FooClass = function(){};
		injector.mapClass('name', FooClass);
		const child = injector.createChild();
		const foo = child.createInstance(FooClass);
		assert.isNotNull(foo);
		assert.ok(foo instanceof FooClass);
	});

	it('child injector get instance from parent mapping with getValue', function () {
		const FooClass = function(){};
		injector.mapClass('name', FooClass);
		const child = injector.createChild();
		const foo = child.getValue('name');
		assert.isNotNull(foo);
		assert.ok(foo instanceof FooClass);
	});

	it('child injector get instance from parent mapping with getValueFromClass', function () {
		const FooClass = function(){};
		injector.mapClass('name', FooClass);
		const child = injector.createChild();
		const foo = child.getValueFromClass(FooClass);
		assert.isNotNull(foo);
		assert.ok(foo instanceof FooClass);
	});

	it('child injector get value from parent mapping', function () {
		const FooClass = function(){};
		injector.mapValue('name2', 'John');
		const child = injector.createChild();
		const name = child.getValue('name2');
		assert.isNotNull(name);
		assert.equal(name, 'John');
	});

	it('child injector inject value from parent mapping', function () {
		const FooClass = function(){this.name=null;};
		injector.mapValue('name', 'John');
		const foo = new FooClass();
		const child = injector.createChild();
		child.inject(foo);
		assert.equal(foo.name, 'John');
	});

	it('child injector inject class from parent mapping', function () {
		const child = injector.createChild();
		const FooClass = function(){this.instance=null;};
		const InstanceClass = function(){};
		injector.mapClass('instance', InstanceClass);
		const foo = new FooClass();
		child.inject(foo);
		assert.isNotNull(foo.instance);
		assert.ok(foo.instance instanceof InstanceClass);
	});

	it('child injector inject class with constructor in itself throws error with getValue', function () {
		const FooClass = function(name){this.nameParam=name;};
		injector.mapClass('name', FooClass);
		const child = injector.createChild();
		assert.throws(() => child.getValue('name'), infuse.errors.INJECT_INSTANCE_IN_ITSELF_CONSTRUCTOR);
	});

	it('child injector inject class with constructor in itself throws error with getValueFromClass', function () {
		const FooClass = function(name){this.nameParam=name;};
		injector.mapClass('name', FooClass);
		const child = injector.createChild();
		assert.throws(() => child.getValueFromClass(FooClass), infuse.errors.INJECT_INSTANCE_IN_ITSELF_CONSTRUCTOR);
	});

	it('child injector inject class in itself throws error with getValue', function () {
		const FooClass = function(){this.name=null;};
		injector.mapClass('name', FooClass);
		const child = injector.createChild();
		assert.throws(() => child.getValue('name'), infuse.errors.INJECT_INSTANCE_IN_ITSELF_PROPERTY);
	});

	it('child injector inject class in itself throws error with getValueFromClass', function () {
		const FooClass = function(){this.name=null;};
		injector.mapClass('name', FooClass);
		const child = injector.createChild();
		assert.throws(() => child.getValueFromClass(FooClass), infuse.errors.INJECT_INSTANCE_IN_ITSELF_PROPERTY);
	});

	it('child injector override mapping value', function () {
		const FooClass = function(){this.name=null;};
		injector.mapValue('name', 'John');
		const child = injector.createChild();
		child.mapValue('name', 'David');
		const foo = child.createInstance(FooClass);
		assert.equal(foo.name, 'David');
	});

	it('child injector override mapping class', function () {
		const FooClass = function(){this.type='parent class';};
		const FooClassChild = function(){this.type='child class';};
		const InstanceClass = function(){this.name=null};
		injector.mapClass('name', FooClass);
		const child = injector.createChild();
		child.mapClass('name', FooClassChild);
		const instance = child.createInstance(InstanceClass);
		assert.equal(instance.name.type, 'child class');
		assert.ok(instance.name instanceof FooClassChild);
	});

	it('child injector create instance and get parent and child mapping', function () {
		const injector = new infuse.Injector();
		injector.mapValue('name', 'John');
		const child = injector.createChild();
		child.mapValue('type', 'male');
		const FooClass = function() {
			this.name = null;
			this.type = null;
		}
		const foo = child.createInstance(FooClass);
		assert.equal(foo.name, 'John');
		assert.equal(foo.type, 'male');
	});

	it('child injector get instance and get parent and child mapping with getValue', function () {
		const injector = new infuse.Injector();
		injector.mapValue('name', 'John');
		const child = injector.createChild();
		child.mapValue('type', 'male');
		const FooClass = function() {
			this.name = null;
			this.type = null;
		}
		child.mapClass('foo', FooClass);
		const foo = child.getValue('foo');
		assert.equal(foo.name, 'John');
		assert.equal(foo.type, 'male');
	});

	it('child injector get instance and get parent and child mapping with getValueFromClass', function () {
		const injector = new infuse.Injector();
		injector.mapValue('name', 'John');
		const child = injector.createChild();
		child.mapValue('type', 'male');
		const FooClass = function() {
			this.name = null;
			this.type = null;
		}
		child.mapClass('foo', FooClass);
		const foo = child.getValueFromClass(FooClass);
		assert.equal(foo.name, 'John');
		assert.equal(foo.type, 'male');
	});

	it('child injector get injection from multi layers with getValue', function () {
		const injector = new infuse.Injector();
		injector.mapValue('name', 'John');
		const child1 = injector.createChild();
		const child2 = child1.createChild();
		const child3 = child2.createChild();
		const child4 = child3.createChild();
		const FooClass = function(){this.name = null;};
		const foo1 = child4.createInstance(FooClass);
		child4.mapClass('foo', FooClass);
		const foo2 = child4.getValue('foo');
		assert.equal(foo1.name, 'John');
		assert.equal(foo2.name, 'John');
	});

	it('child injector get injection from multi layers with getValueFromClass', function () {
		const injector = new infuse.Injector();
		injector.mapValue('name', 'John');
		const child1 = injector.createChild();
		const child2 = child1.createChild();
		const child3 = child2.createChild();
		const child4 = child3.createChild();
		const FooClass = function(){this.name = null;};
		const foo1 = child4.createInstance(FooClass);
		child4.mapClass('foo', FooClass);
		const foo2 = child4.getValueFromClass(FooClass);
		assert.equal(foo1.name, 'John');
		assert.equal(foo2.name, 'John');
	});

	it('child injector resolve its value with from a parent instantiation', function () {
		const Parent = function() {
			this.name = null;
		};
		injector.mapClass('parent', Parent);
		const child = injector.createChild();
		child.mapValue('name', 'John');
		assert.equal(child.getValue('parent').name, 'John');
	});

	it('child injector resolve its value with from different parents (getValue)', function () {
		const Parent = function() {
			this.depth1 = null;
			this.depth2 = null;
			this.depth3 = null;
		};

		injector.mapClass('parent', Parent);
		injector.mapValue('depth1', 'depth 1');

		const child1 = injector.createChild();
		child1.mapValue('depth2', 'depth 2');

		const child2 = child1.createChild();
		child2.mapValue('depth3', 'depth 3');

		assert.equal(child2.getValue('parent').depth1, 'depth 1');
		assert.equal(child2.getValue('parent').depth2, 'depth 2');
		assert.equal(child2.getValue('parent').depth3, 'depth 3');

		assert.equal(child1.getValue('parent').depth1, 'depth 1');
		assert.equal(child1.getValue('parent').depth2, 'depth 2');
		assert.equal(child1.getValue('parent').depth3, null);

		assert.equal(injector.getValue('parent').depth1, 'depth 1');
		assert.equal(injector.getValue('parent').depth2, null);
		assert.equal(injector.getValue('parent').depth3, null);

	});

	it('child injector resolve its value with from different parents (createInstance)', function () {
		const Parent = function() {
			this.depth1 = null;
			this.depth2 = null;
			this.depth3 = null;
		};

		injector.mapClass('parent', Parent);
		injector.mapValue('depth1', 'depth 1');

		const child1 = injector.createChild();
		child1.mapValue('depth2', 'depth 2');

		const child2 = child1.createChild();
		child2.mapValue('depth3', 'depth 3');

		assert.equal(child2.createInstance(Parent).depth1, 'depth 1');
		assert.equal(child2.createInstance(Parent).depth2, 'depth 2');
		assert.equal(child2.createInstance(Parent).depth3, 'depth 3');

		assert.equal(child1.createInstance(Parent).depth1, 'depth 1');
		assert.equal(child1.createInstance(Parent).depth2, 'depth 2');
		assert.equal(child1.createInstance(Parent).depth3, null);

		assert.equal(injector.createInstance(Parent).depth1, 'depth 1');
		assert.equal(injector.createInstance(Parent).depth2, null);
		assert.equal(injector.createInstance(Parent).depth3, null);

	});

	it('strict mode is not enabled by default', function () {
		assert.isFalse(injector.strictMode);
	});

	it('missing dependencies in strict mode with constructor injection should throw an error', function() {
		injector.strictMode = true;
		const FooClass = function(type){this.typeParam = type;};
  		injector.mapClass('name', FooClass);
  		injector.mapValue('type', 'type');
		assert.throws(() => injector.getValue('name'), infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE);
	});

	it('missing dependencies in strict mode with constructor injection should throw an error', function () {
		injector.strictMode = true;
		injector.mapValue('config', { data: 1 });
		const Injectee = function() { this.config = null; };
		assert.throws(() => injector.createInstance(Injectee), infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE);
	});

	it('should not throw an error with property injection when injecting in class in strict mode with constructor injection ', function () {
		injector.strictModeConstructorInjection = true;
		const FooClass = function(){this.typeParam = null;};
  		injector.mapClass('name', FooClass);
		assert.doesNotThrow(() => injector.getValue('name'), infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE);
	});

	it('should not throw an error if injected dependencies is zero in strict mode with constructor injection ', function() {
		injector.strictModeConstructorInjection = true;
		const FooClass = function(){};
		injector.mapClass('name', FooClass);
		assert.doesNotThrow(() => injector.getValue('name'), infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE);
		assert.doesNotThrow(() => injector.getValue('name'), infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE_CONSTRUCTOR_INJECTION);
	})

	it('should throw an error if injected dependencies is zero in strict mode with constructor injection ', function() {
		injector.strictModeConstructorInjection = true;
		const FooClass = function(type){this.typeParam = type;};
		injector.mapClass('name', FooClass);
		assert.throws(() => injector.getValue('name'), infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE_CONSTRUCTOR_INJECTION);
	})

	it('should throw an error with property injection when injecting in class in strict mode', function () {
		injector.strictMode = true;
		const FooClass = function(){this.typeParam = null;};
  		injector.mapClass('name', FooClass);
		assert.throws(() => injector.getValue('name'), infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE);
	});

	it('should throw an error if injected dependencies is zero in strict mode', function() {
		injector.strictMode = true;
		const FooClass = function(){};
		injector.mapClass('name', FooClass);
		assert.throws(() => injector.getValue('name'), infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE);
	})

	it('strict mode is inherited in child injectors', function () {
		injector.strictMode = true;
		const childInjector = injector.createChild();
		const FooClass = function(type){this.typeParam = type;};
  		childInjector.mapClass('name', FooClass);
  		childInjector.mapValue('type', 'type');
		assert.throws(() => childInjector.getValue('name'), infuse.errors.DEPENDENCIES_MISSING_IN_STRICT_MODE);
	});

	it('throwOnMissing is enabled by default', function () {
		assert.ok(injector.throwOnMissing);
	});

	describe('throwOnMissing', function() {

		function getErrorMessage(callback) {
			try {
				callback();
			} catch (e) {
				return e.message;
			}
		}

		beforeEach(function() {
			injector.throwOnMissing = true;
			injector.mapClass('fooClass', function(missing){});
		});

		it('getValue with throwOnMissing false should return undefined', function () {
			injector.throwOnMissing = false;
			assert.isUndefined(injector.getValue('not-existing'));
		});

		it('getValueFromClass with throwOnMissing false should return undefined', function () {
			injector.throwOnMissing = false;
			assert.isUndefined(injector.getValue(function NotExisting(){}));
		});

		it('causes requesting a missing value to throw', function () {
			assert.throws(() => injector.getValue('missing'));
			assert.throws(() => injector.getValue('fooClass'));
			assert.throws(() => injector.createInstance(function(missing) {}));
		});

		it('throws an error that describes the problem when instantiating', function() {
			assert.include(getErrorMessage(function(){injector.getValue('fooClass')}), 'missing');
			const instantiationError = getErrorMessage(function(){injector.createInstance(function customClassName(not_a_predefined_string){})});
			assert.include(instantiationError, 'not_a_predefined_string');
			assert.include(instantiationError, 'customClassName');
		});

		it('is inherited in child injectors', function() {
			injector.throwOnMissing = false;
			const childInjector = injector.createChild();
			assert.isFalse(childInjector.throwOnMissing);
		});

	});

	describe('ES6 capabilities', function() {

		it('should inject into an ES6 class', function() {
			injector.mapValue('name', 'John');
			class FooClass {
				constructor() {
					this.name = null;
				}
			}
			const foo = new FooClass();
			assert.isNull(foo.name);
			injector.inject(foo);
			assert.equal(foo.name, 'John');
		});

		it('should instantiate and fulfil the dependencies of an ES6 class', function() {
			injector.mapValue('name', 'John');
			injector.mapValue('age', 21);
			class FooClass {
				constructor(name) {
					this.nameInjected = name;
					this.age = null;
				}
			}
			const foo = injector.createInstance(FooClass);
			assert.equal(foo.nameInjected, 'John');
			assert.equal(foo.age, 21);
		});

		it('should instantiate and fulfil the dependencies of an ES6 class with default values', function() {
			injector.mapValue('name', 'John');
			injector.mapValue('age', 21);
			class FooClass {
				constructor(name = 'david', age = 36) {
					this.nameInjected = name;
					this.ageInjected = age;
				}
			}
			const foo = injector.createInstance(FooClass);
			assert.equal(foo.nameInjected, 'John');
			assert.equal(foo.ageInjected, 21);
		});

		it('should retain default argument values if no mapping found', function() {
			injector.throwOnMissing = false;
			injector.mapValue('name', 'John');
			class FooClass {
				constructor(name = 'david', age = 36) {
					this.nameInjected = name;
					this.ageInjected = age;
				}
			}
			const foo = injector.createInstance(FooClass);
			assert.equal(foo.nameInjected, 'John');
			assert.equal(foo.ageInjected, 36);
		});

		it('should retain default argument values if no mapping found with a different syntax', function() {
			injector.throwOnMissing = false;
			injector.mapValue('name', 'John');
			class FooClass { constructor(name = 'david', age = 36) {
					this.nameInjected = name;
					this.ageInjected = age;
				}
			}
			const foo = injector.createInstance(FooClass);
			assert.equal(foo.nameInjected, 'John');
			assert.equal(foo.ageInjected, 36);
		});

		it('should be able to inject an ES6 class as a dependency', function() {
			class FooClass {
				constructor(){}
			}
			injector.mapClass('foo', FooClass);
			function TestClass(foo) {
				this.injected = foo;
			}
			const testClass = injector.createInstance(TestClass);
			assert.ok(testClass.injected instanceof FooClass);
		});

		it('should throw an error when trying to instantiate an arrow function', function() {
			const Arrow = () => {};
			injector.mapClass('arrow', Arrow);
			function TestClass(arrow) {
				this.injected = arrow;
			}
			assert.throws(() => injector.createInstance(TestClass), infuse.errors.DEPENDENCIES_INVALID_TARGET);
		});

		it('should be able to use the inject property on a class', function() {
			injector.mapValue('name', 'John');
			class FooClass {
				constructor(dummyVariable){
					this.nameInjected = dummyVariable;
				}
			}
			FooClass.inject = ['name'];
			const foo = injector.createInstance(FooClass);
			assert.equal(foo.nameInjected, 'John');
		});

		it('should ignore other constructor names in a class', function() {
			injector.mapValue('name', 'John');
			class FooClass1 {
				static foo(bar) {
					const constructor = function(no1, no2) {};
				}
				constructor(dummyVariable){
					this.nameInjected = dummyVariable;
				}
			}
			class FooClass2 {
				static foo(bar) {
					function constructor(no1, no2){}
				}
				constructor(dummyVariable){
					this.nameInjected = dummyVariable;
				}
			}
			class FooClass3 {
				static foo(bar) {
					function constructor (no1, no2){}
				}
				constructor(dummyVariable){
					this.nameInjected = dummyVariable;
				}
			}
			class FooClass4 {
				static foo(bar) {
					constructor(no1, no2);
				}
				constructor(dummyVariable){
					this.nameInjected = dummyVariable;
				}
			}
			class FooClass5 {
				static foo(bar) {
					constructor (no1, no2);
				}
				constructor(dummyVariable){
					this.nameInjected = dummyVariable;
				}
			}
			class FooClass6 {
				constructor(dummyVariable){
					this.nameInjected = dummyVariable;
				}
				func() {
					this.constructor = function(){}
				}
			}
			FooClass1.inject = ['name'];
			FooClass2.inject = ['name'];
			FooClass3.inject = ['name'];
			FooClass4.inject = ['name'];
			FooClass5.inject = ['name'];
			FooClass6.inject = ['name'];
			const foo1 = injector.createInstance(FooClass1);
			const foo2 = injector.createInstance(FooClass2);
			const foo3 = injector.createInstance(FooClass3);
			const foo4 = injector.createInstance(FooClass4);
			const foo5 = injector.createInstance(FooClass5);
			const foo6 = injector.createInstance(FooClass6);
			assert.equal(foo1.nameInjected, 'John');
			assert.equal(foo2.nameInjected, 'John');
			assert.equal(foo3.nameInjected, 'John');
			assert.equal(foo4.nameInjected, 'John');
			assert.equal(foo5.nameInjected, 'John');
			assert.equal(foo6.nameInjected, 'John');
		});

		it('should ignore other constructor names in a class', function() {
			injector.mapValue('name', 'John');
			class FooClass {
				static foo(bar) {
					const constructor = function(no1, no2) {};
					function constructor(no1, no2){}
					function constructor (no1, no2){}
					constructor(no1, no2);
					constructor (no1, no2);
				}
				func() {
					this.constructor = function(){}
				}
				constructor(dummyVariable){
					this.nameInjected = dummyVariable;
				}
			}
			FooClass.inject = ['name'];
			const foo = injector.createInstance(FooClass);
			assert.equal(foo.nameInjected, 'John');
		});

		it('should be able to inject an ES6 class as a dependency without constructor', function() {
			class FooClass {

			}
			injector.mapClass('foo', FooClass);
			function TestClass(foo) {
				this.injected = foo;
			}
			const testClass = injector.createInstance(TestClass);
			assert.ok(testClass.injected instanceof FooClass);
		});

	});

});
