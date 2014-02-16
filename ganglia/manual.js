window.onload = function() {
	var randStrBuilder = new RandomStrBuilder();
	var headlines = getHeadlines();
	var catalogueHtml = createCatalogueHtml(headlines);
	setCatalogue(catalogueHtml);

	var scrollRecordKey = this.location.href.toString();
	var storage = getMainBodyWindow().localStorage;
	getMainBodyWindow().onscroll = function() {
		storage[scrollRecordKey] = this.scrollY;
	};

	if (storage[scrollRecordKey]) {
		getMainBodyWindow().scrollBy(0, storage[scrollRecordKey]);
	}

	function debug(obj) {
		for (var key in obj) {
			console.log(key + " " + obj[key]);
		}
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
		var mainBody = getMainBodyDoc().getElementsByTagName('body')[0];
		var nodes = mainBody.children;
		var nodesLength = nodes.length;
		var arr = new Array();
		for (var i = 0; i < nodesLength; i++) {
			var node = nodes[i];
			if (isHeadline(node)) {
				arr.push(createHeadlineNode(node));
			}
		}

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

	function createHeadlineNode(node) {
		if (!node.id) {
			node.id = "headline" + randStrBuilder.build(20);
		}
		var level = parseInt(node.tagName.replace(/\D/g, ''));
		var text = node.innerText ? node.innerText : node.innerHTML;
		return new HeadlineNode(text, level, node.id);
	}

	function createCatalogueHtml(headlines) {
		var text = "";
		for (var i in headlines) {
			var headline = headlines[i];
			text += headline.getText() + '\n';
		}
		return text;
	}

	function setCatalogue(html) {
		var catalogueDiv = getCatalogueDoc().getElementById('catalogueDiv');
		catalogueDiv.innerHTML = html;
	}

};

function getMainBodyDoc() {
	return getMainBodyWindow().document;
}

function getCatalogueDoc() {
	return getCatalogueWindow().document;
}

function getMainBodyWindow() {
	return window.mainBodyFrame;
}

function getCatalogueWindow() {
	return window.catalogueFrame;
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
		result += "&nbsp;&nbsp;";
	}
	result += '<a href="#' + this.id + '" onclick="return window.parent.catalogueClick(this);" >';
	result += this.text + '</a>';
	result += "</p>";
	return result;
};
function RandomStrBuilder() {
	this.chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890";
	this.charsLength = this.chars.length;
}

RandomStrBuilder.prototype.build = function(strlen) {
	var str = "";
	for (var i = 0; i < strlen; i++) {
		var randNum = parseInt(Math.random() * this.charsLength);
		str += this.chars[randNum];
	}
	return str;
};
