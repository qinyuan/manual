function persistScroll(elementId) {
	var scrollRecordKey = this.location.href.toString() + elementId;
	var storage = window.localStorage;
	var $target = $('#' + elementId);

	if (storage[scrollRecordKey]) {
		$target.scrollTop(storage[scrollRecordKey]);
	}
	$target.scroll(function() {
		storage[scrollRecordKey] = $target.scrollTop();
	});
}

function isHeadline(node) {
	if (!node.tagName.match(/^H\d$/g)) {
		return false;
	}
	var className = node.className;
	if (className && className == 'notInCatalogue') {
		return false;
	}
	return true;
}

function getHeadlines() {
	var arr = new Array();
	var builder = new HeadlineNodeBuilder();
	$('#contentDiv').children().each(function() {
		if (this.tagName[0] === 'H') {
			arr.push(builder.build(this));
		}
	});

	var baseLevel = getBaseLevelByHeadlines(arr);
	for (var i in arr) {
		arr[i].setBaseLevel(baseLevel);
	}
	return arr;
}

function getBaseLevelByHeadlines(headlines) {
	var baseLevel = 9999;
	for (var i in headlines) {
		var headline = headlines[i];
		if (baseLevel > headline.level) {
			baseLevel = headline.level;
		}
	}
	return baseLevel;
}

function createCatalogueHtml(headlines) {
	var text = "";
	for (var i in headlines) {
		var headline = headlines[i];
		text += headline.getText() + '\n';
	}
	return text;
}

function catalogueClick(anchor) {
	var href = anchor.href.toString().replace(/.*\#/g, "");
	getMainBodyWindow().location = "mainBody.html#" + href;
	return true;
}

function HeadlineNode(text, level, id) {
	this.text = text;
	this.level = level;
	this.baseLevel = 1;
	this.id = id;
}

HeadlineNode.prototype.setBaseLevel = function(baseLevel) {
	this.baseLevel = baseLevel;
	return this;
};

HeadlineNode.prototype.getText = function() {
	var result = '<p style="margin:5px 0;">';
	for (var i = 0; i < this.level - this.baseLevel; i++) {
		result += "&nbsp;&nbsp;&nbsp;&nbsp;";
	}
	result += '<a href="#' + this.id + '" onclick="return window.parent.catalogueClick(this);" >';
	result += this.text + '</a>';
	result += "</p>";
	return result;
};

function HeadlineNodeBuilder() {
	this.headlineNodeCount = 0;
}

HeadlineNodeBuilder.prototype.build = function(node) {
	if (!node.id) {
		node.id = "manualHeadlineNode" + this.headlineNodeCount;
		this.headlineNodeCount++;
	}
	var level = parseInt(node.tagName.replace(/\D/g, ''));
	var text = node.innerText ? node.innerText : node.innerHTML;
	return new HeadlineNode(text, level, node.id);
};

function debug(obj, onlyKey) {
	if ( typeof obj === "string" || typeof obj === "number") {
		console.log(obj);
		return;
	}
	for (var key in obj) {
		if (onlyKey) {
			console.log(key);
		} else {
			console.log(key + " " + obj[key]);
		}
	}
}

var headlines = getHeadlines();
var catalogueHtml = createCatalogueHtml(headlines);
$('#catalogueDiv').get(0).innerHTML = catalogueHtml;
persistScroll('contentDiv');
persistScroll('catalogueDiv');