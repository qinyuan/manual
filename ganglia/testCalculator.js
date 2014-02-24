test("observer test", function() {
	var obs1 = Object.create(observer);
	var obs2 = Object.create(observer);
	obs1.action = function() {
		this.notify();
	};
	obs2.isUpdate = false;
	obs2.update = function() {
		this.isUpdate = true;
	};

	obs1.attach(obs2);
	ok(obs2.isUpdate === false);
	obs1.action();
	ok(obs2.isUpdate === true);
});
