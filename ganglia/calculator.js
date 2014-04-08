var config = $.trim(document.getElementById('config').innerHTML);
eval("config=" + config + ";");

function Period(second, min, hour, day, year) {
	if (!second) {
		second = 0;
	}
	if (arguments.length == 5) {
		this.sec = second;
		this.min = min;
		this.hour = hour;
		this.day = day;
		this.year = year;
		this.seconds = second + min * 60 + hour * 3600 + day * 3600 * 24 + year * 3600 * 24 * 365;
	} else {
		this.seconds = second;
		this.sec = getRemainder(60);
		this.min = getRemainder(60);
		this.hour = getRemainder(24);
		this.day = getRemainder(365);
		this.year = getRemainder();
	}

	function getRemainder(dividor) {
		if (dividor) {
			var value = second % dividor;
			second = parseInt(second / dividor);
		} else {
			var value = second;
			second = 0;
		}
		return value;
	}

}

Period.prototype.getSeconds = function() {
	return this.seconds;
};

Period.prototype.getText = function() {
	var str = "";
	if (this.year) {
		str += this.year + "年";
	}
	if (this.day) {
		str += this.day + "天";
	}
	if (this.hour) {
		str += this.hour + "小时";
	}
	if (this.min) {
		str += this.min + "分";
	}
	if (this.sec) {
		str += this.sec + "秒";
	}
	return str;
};

var periodPicker = {
	$div : $('#periodPicker').css('display', 'none'),
	$bindText : null,
	$year : $('#year'),
	$day : $('#day'),
	$hour : $('#hour'),
	$min : $('#min'),
	$sec : $('#sec'),
	show : function(element) {
		this.$bindText = $(element);
		var period = new Period(this.$bindText.next().val());
		this.load(period);

		var offset = this.$bindText.offset();
		offset.top = offset.top + this.$bindText.height() + 5;
		this.$div.show().offset(offset);

		this.eachText(function(key, $text, value) {
			if (value !== 0) {
				$text.select();
				return true;
			}
		});
	},
	update : function() {
		var period = this.getValue();
		if (!rraManager.validate(period.getSeconds())) {
			return;
		}
		this.$bindText.val(period.getText());
		this.$bindText.next().val(period.getSeconds());
		rraManager.refresh(this.$bindText.parent().parent());
		this.hide();
	},
	getValue : function() {
		var self = this;
		function get(prefix) {
			var str = self['$' + prefix].val().replace(/\D/g, '');
			return str === "" ? 0 : parseInt(str);
		}

		return new Period(get('sec'), get('min'), get('hour'), get('day'), get('year'));
	},
	load : function(period) {
		this.eachText(function(key, $text) {
			$text.val(period[key.replace('$', '')]);
		});
	},
	hide : function() {
		this.$bindText = null;
		this.$div.hide();
	},
	eachText : function(func) {
		var keys = ['$year', '$day', '$hour', '$min', '$sec'];
		for (var i = 0, len = keys.length; i < len; i++) {
			var key = keys[i];
			var $text = this[key];
			var value = parseInt($text.val());
			if (func(key, $text, value)) {
				break;
			}
		}
	}
};

function parseTemplate(templateId, data) {
	var tplHTML = document.getElementById(templateId).innerHTML;
	var smart = new jSmart(tplHTML);
	return smart.fetch(data);
}

function createRRAByTableRow($tr) {
	var $tds = $tr.find('td');
	interval = parseInt($tds.eq(1).find('input:hidden').val());
	period = parseInt($tds.eq(2).find('input:hidden').val());
	rows = parseInt($tds.eq(3).text());
	return new RRA(interval, period, rows);
}

function createFirstRRA() {
	return new RRA(15, 7200, 0).getRevisedRRA();
}

function RRA(interval, period, rows) {
	this.interval = interval;
	this.period = period;
	this.rows = rows;
}

RRA.prototype.nextRRA = function() {
	var interval = this.interval * 10;
	var period = this.period * 10;
	var rows = this.rows;
	return new RRA(interval, period, rows);
};

RRA.prototype.getRevisedRRA = function() {
	var rows = Math.ceil(this.period / this.interval);
	period = rows * this.interval;
	return new RRA(this.interval, period, rows);
};

RRA.prototype.getIntervalText = function() {
	return new Period(this.interval).getText();
};

RRA.prototype.getPeriodText = function() {
	return new Period(this.period).getText();
};

RRA.prototype.save = function($tr) {
	var $texts = $tr.find('input:text');
	var $hiddens = $tr.find('input:hidden');
	$texts.eq(0).val(this.getIntervalText());
	$texts.eq(1).val(this.getPeriodText());
	$hiddens.eq(0).val(this.interval);
	$hiddens.eq(1).val(this.period);
	$tr.find('td').eq(3).text(this.rows);
};

var messageManager = {
	$message : $('#message'),
	showCopyInfo : function(anchor) {
		var offset = $(anchor).offset();
		offset.left = offset.left - 100;
		var msg = this.$message;
		msg.text('复制成功');
		msg.css('display', 'block');
		msg.offset(offset);
		setTimeout(function() {
			msg.css('display', 'none');
		}, 1000);
	},
	getInputNumber : function(info) {
		var num = prompt(info, 1);
		if (num == null) {
			return 0;
		}
		while (!num.match(/^\d+$/g)) {
			num = prompt('输出格式错误，再次输入', 1);
			if (num == null) {
				return 0;
			}
		}
		return parseInt(num);
	}
};

var OBSERVER = {
	stop : false,
	create : function() {
		var self = this;
		return {
			listener : new Array(),
			attach : function(listener) {
				if (!'update' in listener) {
					throw new Error('invalid listener ' + listener);
				}
				this.listener.push(listener);
			},
			notify : function() {
				if (self.stop === true) {
					return;
				}
				for (var i = 0, len = this.listener.length; i < len; i++) {
					this.listener[i].update();
				}
			},
			update : function() {
			}
		};
	}
};

var outlineManager = OBSERVER.create();
outlineManager.update = function() {
	var href = this.createHref;
	var str = href('rra', '数据归档', 0);
	var clusterIndex = 0;
	$('div#clusters div.cluster').each(function() {
		var clusterName = $(this).find('input.clusterName').val();
		str += href('c' + clusterIndex, clusterName, 0);
		var metricsIndex = 0;
		$(this).find('div.metricsGroup div.title').each(function() {
			var metricsName = $(this).find('span:first').text();
			str += href('c' + clusterIndex + "m" + metricsIndex, metricsName, 1);
			metricsIndex++;
		});
		clusterIndex++;
	});
	$('#outlineDiv').html(str).find('a').click(function() {
		outlineManager.locate(this);
	});
};
outlineManager.locate = function(anchor) {
	var id = anchor.id.replace('outline_', '');
	var $configDiv = $('#configDiv');
	if (id === 'rra') {
		$configDiv.scrollTop(0);
	} else if (id.match(/^c\d+m\d$/g)) {
		var clusterIndex = id.replace('c', '').replace(/m.*/, '');
		var metricsIndex = id.replace(/.*m/, '');
		var $cluster = $('div.cluster').eq(clusterIndex);
		var metricsGroup = $cluster.find('div.metricsGroup').get(metricsIndex);
		$configDiv.scrollTop(metricsGroup.offsetTop + 200);
	} else if (id.match(/^c\d+$/g)) {
		var clusterIndex = id.replace('c', '');
		var cluster = $('div.cluster').get(clusterIndex);
		$configDiv.scrollTop(cluster.offsetTop + 200);
	}
};
outlineManager.createHref = function(id, text, level) {
	var str = '<p>';
	for (var i = 0; i < level; i++) {
		str += '&nbsp;&nbsp;';
	}
	str += '<a href="javascript:void(0)" id="outline_' + id + '">' + text + '</a></p>';
	return str;
};

var cal = OBSERVER.create();
cal.update = function() {
	this.updateMetricsCount();
	this.updateResultDetails();
};
cal.updateResultDetails = function() {
	var rra = rraManager.getRRACount();
	var rows = rraManager.getAverageRows();

	var totalSpace = 0;
	var maxMetricsCount = 0;

	var $resultDetails = $('#resultDetails').empty();
	var self = this;
	$('#clusters div.cluster').each(function() {
		$this = $(this);
		var clusterName = $this.find('input.clusterName').val();
		var hostCount = parseInt($this.find('input.hostCount').val());
		var metricsCount = parseInt($this.find('input.metricsCount').val());
		var space = self.getClusterSpace(hostCount, metricsCount, rra, rows);

		totalSpace += space;
		if (maxMetricsCount < metricsCount) {
			maxMetricsCount = metricsCount;
		}

		var detail = parseTemplate("resultDetailTpl", {
			"clusterName" : clusterName,
			"hostCount" : hostCount,
			"metricsCount" : metricsCount,
			"space" : self.formatNumber(space)
		});
		$resultDetails.append(detail);
	});

	var summaryFolderSize = this.getSummaryFolderSize(maxMetricsCount, rra, rows);
	$resultDetails.append(parseTemplate("resultSummaryTpl", {
		"metricsCount" : maxMetricsCount,
		"space" : this.formatNumber(summaryFolderSize)
	}));

	totalSpace += summaryFolderSize;
	$('#totalSpace').text(this.formatNumber(totalSpace));
};
cal.formatNumber = function(num) {
	if (! typeof num === 'number') {
		num = parseInt(num);
	}
	var level = null;
	for (var i = 0, len = this.formatConfig.length; i < len; i++) {
		var newLevel = this.formatConfig[i];
		if (num >= newLevel.threshold) {
			level = newLevel;
		}
	}

	return (num / level.threshold).toFixed(2) + " " + level.tag;
};
cal.formatConfig = [{
	tag : "b",
	threshold : 0
}, {
	tag : 'Kb',
	threshold : 1024
}, {
	tag : 'Mb',
	threshold : 1024 * 1024
}, {
	tag : 'Gb',
	threshold : 1024 * 1024 * 1024
}, {
	tag : 'Tb',
	threshold : 1024 * 1024 * 1024 * 1024
}];
cal.getSingleRRDSize = function(ds, rra, rows) {
	return 8 * ds * rra * rows + 80 * ds * rra + 232 * ds + 112 * rra + 120;
};
cal.getHostFolderSize = function(hostCount, metricsCount, rra, rows) {
	var singleRrdInHostFolder = this.getSingleRRDSize(1, rra, rows);
	return hostCount * singleRrdInHostFolder * metricsCount;
};
cal.getSummaryFolderSize = function(metricsCount, rra, rows) {
	var singleRrdInSummaryFolder = this.getSingleRRDSize(2, rra, rows);
	return singleRrdInSummaryFolder * metricsCount;
};
cal.getClusterSpace = function(hostCount, metricsCount, rra, rows) {
	var hostFolderSize = this.getHostFolderSize(hostCount, metricsCount, rra, rows);
	var summaryFolderSize = this.getSummaryFolderSize(metricsCount, rra, rows);
	return hostFolderSize + summaryFolderSize;
};
cal.updateMetricsCount = function() {
	$('#clusters div.cluster').each(function() {
		var metricsCount = $(this).find('tbody tr').size();
		$(this).find('input.metricsCount').val(metricsCount);
	});
};

var rraManager = OBSERVER.create();
rraManager.count = 0;
rraManager.add = function(interval, period) {
	this.count++;
	if (!interval || !period) {
		var $tr = $('#rraConfig tbody tr:last-child');
		var rra = $tr.size() ? createRRAByTableRow($tr).nextRRA() : createFirstRRA();
	} else {
		var rra = new RRA(interval, period, 0).getRevisedRRA();
	}
	var data = {
		'index' : this.count,
		'interval' : rra.getIntervalText(),
		'period' : rra.getPeriodText(),
		'secInterval' : rra.interval,
		'secPeriod' : rra.period,
		'rows' : rra.rows
	};
	$('#rraConfig tbody').append(parseTemplate('rraRowTpl', data));
	this.notify();
};
rraManager.remove = function(anchor) {
	var $tr = $(anchor).parent().parent();
	var $nextTr = $tr.next();
	$tr.remove();
	while ($nextTr && $nextTr.size()) {
		var $td = $nextTr.find('td:first');
		$td.text(parseInt($td.text()) - 1);
		$nextTr = $nextTr.next();
	}
	this.count--;
	this.notify();
};
rraManager.validate = function(seconds) {
	if (seconds <= 0) {
		alert('时间值必须大于零');
		return false;
	} else {
		return true;
	}
};
rraManager.refresh = function($tr) {
	createRRAByTableRow($tr).getRevisedRRA().save($tr);
	this.notify();
};
rraManager.getRRACount = function() {
	return this.count;
};
rraManager.getAverageRows = function() {
	var sum = 0;
	$('#rraConfig .content tbody tr').each(function() {
		sum += parseInt($(this).find('td:eq(3)').text());
	});
	return sum / this.count;
};
rraManager.loadDefault = function() {
	for (var i = 0, len = config.rras.length; i < len; i++) {
		var rra = config.rras[i];
		rraManager.add(rra.interval, rra.period);
	}
};

var metricsManager = OBSERVER.create();
metricsManager.tpl = null;
metricsManager.copy = function(anchor) {
	var $tr = $(anchor).parent().parent();
	this.tpl = {
		'name' : $tr.find('td.name').text(),
		'desc' : $tr.find('td.desc').text()
	};
	$('button.pasteMetrics').stop(true).hide().fadeIn(300, function() {
		$(this).stop(true).hide().fadeIn(300);
	});
	messageManager.showCopyInfo(anchor);
};
metricsManager.showPasteDialog = function(button) {
	var num = messageManager.getInputNumber('输入粘贴数量');

	OBSERVER.stop = true;
	var $tbody = $(button).parent().find('tbody');
	for (var i = 0; i < num; i++) {
		this.add($tbody, this.tpl, i === 0);
	}
	OBSERVER.stop = false;

	this.notify();
};
metricsManager.paste = function($tbody, num) {
	for (var i = 0; i < num; i++) {
		this.add($tbody, this.tpl, i === 0);
	}
};

metricsManager.showAddDialog = function(button) {
	var num = messageManager.getInputNumber('输入添加的指标数量');

	for (var i = 0; i < num; i++) {
		this.add(button, null, i === 0);
	}
};
metricsManager.add = function(arg, metricsItem, select) {
	if (('is' in arg)) {
		if (arg.is('tbody')) {
			var $tbody = arg;
		} else {
			var $tbody = arg.find('tbody');
		}
	} else {
		var $tbody = $(arg).parent().find('tbody');
	}

	var params = {
		"index" : $tbody.find('tr').size() + 1
	};
	if (metricsItem && ('name' in metricsItem) && ('desc' in metricsItem)) {
		params.name = metricsItem.name;
		params.desc = metricsItem.desc;
	}

	var $tpl = $($.trim(parseTemplate('metricsTpl', params)));
	$tpl.appendTo($tbody);
	if (select) {
		var $firstText = $tpl.find('input:first');
		if ($firstText.val() === '') {
			$firstText.focus();
		} else {
			$firstText.select();
		}
	}

	this.notify();
};
metricsManager.remove = function(anchor) {
	OBSERVER.stop = true;

	var $tr = $(anchor).parent().parent();
	var $nextTr = $tr.next();
	$tr.remove();
	while ($nextTr.size() && $nextTr.is('tr')) {
		var $td = $nextTr.find('td:first');
		$td.text(parseInt($td.text()) - 1);
		$nextTr = $nextTr.next();
	}

	OBSERVER.stop = false;
	this.notify();
};

var metricsGroupManager = OBSERVER.create();
metricsGroupManager.$tpl = null;
metricsGroupManager.copy = function(anchor) {
	$tpl = $(anchor).parent().clone(true);
	$('button.pasteMetricsGroup').stop(true).hide().fadeIn(300, function() {
		$(this).stop(true).hide().fadeIn(300);
	});
	messageManager.showCopyInfo(anchor);
};
metricsGroupManager.showPasteDialog = function(button) {
	var num = messageManager.getInputNumber('输入粘贴数量');
	var $div = $(button).parent().parent();
	for (var i = 0; i < num; i++) {
		if (i === 0) {
			$div.append($tpl);
		} else {
			$div.append($tpl.clone());
		}
	}
	$tpl.find('input:text').eq(0).focus();

	this.notify();
};
metricsGroupManager.add = function(anchor, metricsData) {
	var groupName = (metricsData && metricsData.name) ? metricsData.name : "未命名";
	var $tpl = $($.trim(parseTemplate('metricsGroupTpl', {
		"groupName" : groupName,
		"hidden" : metricsManager.tpl == null
	})));
	var $anchor = $(anchor);
	var $div = $anchor.is('div') ? $anchor : $anchor.parent().parent();
	$tpl.appendTo($div);

	if (metricsData && metricsData.items) {
		var items = metricsData.items;
		for (var i in items) {
			metricsManager.add($tpl, items[i]);
		}
	} else {
		metricsManager.add($tpl);
		$tpl.find("td input:first").focus();
	}

	this.notify();
};
metricsGroupManager.remove = function(anchor) {
	$(anchor).parent().remove();

	this.notify();
};

var textEditor = OBSERVER.create();
textEditor.latestElement = null;
textEditor.latestValue = null;
textEditor.edit = function(element) {
	if (element !== this.latestElement) {
		this.latestElement = element;
		var $element = $(element);
		this.latestValue = $element.text();
		$element.html(this.createInputText()).children('input').select();
	}
};
textEditor.createInputText = function() {
	var str = '<input type="text" value="' + this.latestValue + '"';
	var width = $(this.latestElement).css('width');
	if (width) {
		str += ' style="width:' + (parseInt(width.replace('px')) - 3) + 'px;"';
	}
	str += ' />';
	return $(str).blur(function() {
		textEditor.submitChange(this);
	}).keyup(function(event) {
		if (event.keyCode === 13) {
			textEditor.submitChange(this);
		}
	});
};
textEditor.submitChange = function(input) {
	var $input = $(input);
	var text = $.trim($input.val());
	$input.parent().html((text === '' ? this.latestValue : text));

	this.latestElement = null;
	this.latestValue = null;

	this.notify();
};

var clusterManager = OBSERVER.create();
clusterManager.index = 0;
clusterManager.add = function() {
	OBSERVER.stop = true;

	var tpl = parseTemplate("clusterTpl", {
		'clusterName' : "cluster" + (++this.index),
		'hidden' : metricsGroupManager.$tpl === null
	});
	var $cluster = $($.trim(tpl));
	$cluster.appendTo('#clusters');

	for (var i = 0, len = config.metricsGroups.length; i < len; i++) {
		metricsGroupManager.add($cluster, config.metricsGroups[i]);
	}

	OBSERVER.stop = false;
	this.notify();
};
clusterManager.remove = function(anchor) {
	$(anchor).parent().remove();
	this.notify();
};

var multiSelector = OBSERVER.create();
multiSelector.$selectedTrs = [];
multiSelector.lastTd = null;
multiSelector.lastTBody = null;
multiSelector.select = function(td, event) {
	var $tr = $(td).parent();
	var tbody = $tr.parent().get(0);
	if (event.ctrlKey && this.lastTBody === tbody) {
		if ($tr.hasClass('selected')) {
			this.unSelectTr($tr);
		} else {
			this.selectOne($tr);
		}
	} else if (event.shiftKey && this.lastTBody === tbody) {
		var startTr = $(td).parent().get(0);
		var endTr = $(this.lastTd).parent().get(0);
		var $trs = this.getInBetweenTrs(startTr, endTr);
		for (var i = 0, len = $trs.length; i < len; i++) {
			this.selectOne($trs[i]);
		}
	} else {
		this.unSelectAll();
		this.selectOne($tr);
	}
	this.lastTd = td;
	this.lastTBody = tbody;
};
multiSelector.getInBetweenTrs = function(startTr, endTr) {
	var $tbody = $(startTr).parent();
	var $trs = [];
	var start = false;
	$tbody.find('tr').each(function() {
		if (this === startTr || this === endTr) {
			if (start) {
				start = false;
				$trs.push($(this));
			} else {
				start = true;
			}
		}
		if (start === true) {
			$trs.push($(this));
		}
	});
	return $trs;
};
multiSelector.unSelectTr = function($tr) {
	$tr.removeClass('selected');
	var newTrs = [];
	$.each(this.$selectedTrs, function(index, value) {
		if (value.get(0) !== $tr.get(0)) {
			newTrs.push(value);
		}
	});
	this.$selectedTrs = newTrs;
	if (newTrs.length === 0) {
		this.getRemoveMetricsButton($tr).hide();
	}
};
multiSelector.selectOne = function($tr) {
	$tr.addClass('selected');
	this.$selectedTrs.push($tr);
	this.getRemoveMetricsButton($tr).show();
};
multiSelector.getRemoveMetricsButton = function($tr) {
	var $tbody = $tr.parent();
	var $table = $tbody.parent();
	var $div = $table.parent();
	return $div.find('button.removeMetrics');
};
multiSelector.unSelectAll = function() {
	$.each(this.$selectedTrs, function(index, value) {
		value.removeClass('selected');
	});
	if (this.$selectedTrs.length > 1) {
		this.getRemoveMetricsButton(this.$selectedTrs[0]).hide();
	}
	this.$selectedTrs = [];
};
multiSelector.removeSelectedTrs = function(button) {
	var anchors = [];
	$(button).parent().find('tr.selected').each(function() {
		anchors.push($(this).find('a.removeMetrics').get(0));
	});
	this.unSelectAll();

	OBSERVER.stop = true;
	for (var i = anchors.length - 1; i >= 0; i--) {
		metricsManager.remove(anchors[i]);
	}
	OBSERVER.stop = false;
	this.notify();
};

var eventsManager = OBSERVER.create();
eventsManager.bindEvent = function($element, eventName, func) {
	$element.each(function() {
		if (!this[eventName]) {
			this[eventName] = func;
		}
	});
};
eventsManager.updateButtonHover = function() {
	function changeColor(color) {
		return function() {
			this.style.backgroundColor = color;
		};
	};

	var lightgreen = "rgb(71,164,71)";
	var darkgreen = "rgb(61,144,61)";
	this.bindEvent($('button.green'), 'onmouseover', changeColor(darkgreen));
	this.bindEvent($('button.green'), 'onmouseout', changeColor(lightgreen));

	var lightblue = "rgb(66,139,202)";
	var darkblue = "rgb(56,119,172)";
	this.bindEvent($('button.blue'), 'onmouseover', changeColor(darkblue));
	this.bindEvent($('button.blue'), 'onmouseout', changeColor(lightblue));

	var lightRed = "rgb(217,83,79)";
	var darkRed = "rgb(190,73,69)";
	this.bindEvent($('button.red'), 'onmouseover', changeColor(darkRed));
	this.bindEvent($('button.red'), 'onmouseout', changeColor(lightRed));
};
eventsManager.update = function() {
	this.updateButtonHover();
	this.bindEvent($('button.addMetrics'), 'onclick', function() {
		metricsManager.showAddDialog(this);
	});
	this.bindEvent($('button.pasteMetrics'), 'onclick', function() {
		metricsManager.showPasteDialog(this);
	});
	this.bindEvent($('button.removeMetrics'), 'onclick', function() {
		multiSelector.removeSelectedTrs(this);
	});
	this.bindEvent($('button.addMetricsGroup'), 'onclick', function() {
		metricsGroupManager.add(this);
	});
	this.bindEvent($('button.pasteMetricsGroup'), 'onclick', function() {
		metricsGroupManager.showPasteDialog(this);
	});
	this.bindEvent($('a.removeMetrics'), 'onclick', function() {
		metricsManager.remove(this);
	});
	this.bindEvent($('a.copyMetrics'), 'onclick', function() {
		metricsManager.copy(this);
	});
	this.bindEvent($('a.copyMetricsGroup'), 'onclick', function() {
		metricsGroupManager.copy(this);
	});
	this.bindEvent($('#addRRA'), 'onclick', function() {
		rraManager.add();
	});
	this.bindEvent($('#addCluster'), 'onclick', function() {
		clusterManager.add();
	});
	this.bindEvent($('#periodOk'), 'onclick', function() {
		periodPicker.update();
	});
	this.bindEvent($('#periodCancel'), 'onclick', function() {
		periodPicker.hide();
	});
	this.bindEvent($('div.metricsGroup div.title span'), 'onclick', function() {
		textEditor.edit(this);
	});
	this.bindEvent($('div.metricsGroup div.content td.name'), 'onclick', function() {
		textEditor.edit(this);
	});
	this.bindEvent($('div.metricsGroup div.content td.desc'), 'onclick', function() {
		textEditor.edit(this);
	});
	this.bindEvent($('div.metricsGroup div.content td.index'), 'onclick', function(event) {
		multiSelector.select(this, event);
	});
};

function bindObservers() {
	rraManager.attach(cal);
	rraManager.attach(eventsManager);

	metricsManager.attach(cal);
	metricsManager.attach(eventsManager);

	metricsGroupManager.attach(cal);
	metricsGroupManager.attach(eventsManager);
	metricsGroupManager.attach(outlineManager);

	clusterManager.attach(cal);
	clusterManager.attach(eventsManager);
	clusterManager.attach(outlineManager);

	textEditor.attach(outlineManager);

	multiSelector.attach(cal);
}

function log(obj) {
	if ( typeof obj == 'object') {
		for (var i in obj) {
			console.log(i + " " + obj[i]);
		}
	} else {
		console.log(obj);
	}
}

OBSERVER.stop = true;
clusterManager.add();
rraManager.loadDefault();
OBSERVER.stop = false;

cal.update();
eventsManager.update();
outlineManager.update();

bindObservers();
