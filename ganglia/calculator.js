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

var messageManager={
	$message:$('#message'),
	showCopyInfo:function(){
		this.$message.css({
			left:0,
			top:0	
		});
		this.$message.text('复制成功！').fadeIn(250);
		setTimeout(1000,function(){
			this.$message.hide(250);
		});
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
		'name' : $tr.find('input:text').eq(0).val(),
		'desc' : $tr.find('input:text').eq(1).val()
	};
	$('button.pasteMetrics').stop(true).hide().fadeIn(300,function(){
		$(this).stop(true).hide().fadeIn(300);
	});
	messageManager.showCopyInfo();
};
metricsManager.showPasteDialog = function(button) {
	var num = this.getInputNumber('输入粘贴的指标数量');

	for (var i = 0; i < num; i++) {
		this.add($(button).parent().find('tbody'), this.tpl, i === 0);
	}
};
metricsManager.paste = function($tbody, num) {
	for (var i = 0; i < num; i++) {
		this.add($tbody, this.tpl, i === 0);
	}
};
metricsManager.getInputNumber = function(info) {
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
};
metricsManager.showAddDialog = function(button) {
	var num = this.getInputNumber('输入添加的指标数量');

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
metricsGroupManager.changeName = function(span) {
	var name = span.innerHTML;
	if (name.indexOf('<input') >= 0) {
		return;
	}
	var input = '<input type="text" value="' + name;
	input += '" onblur="return metricsGroupManager.changeNameSubmit(this);" />';
	span.innerHTML = input;
	$(span).find('input').select();
};
metricsGroupManager.changeNameSubmit = function(input) {
	$(input).parent().text(input.value);
};

var clusterManager = OBSERVER.create();
clusterManager.index = 0;
clusterManager.add = function() {
	OBSERVER.stop = true;

	var tpl = parseTemplate("clusterTpl", {
		'clusterName' : "cluster" + (++this.index)
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
};
eventsManager.update = function() {
	this.updateButtonHover();
	this.bindEvent($('button.addMetrics'), 'onclick', function() {
		metricsManager.showAddDialog(this);
	});
	this.bindEvent($('button.pasteMetrics'), 'onclick', function() {
		metricsManager.showPasteDialog(this);
	});
	this.bindEvent($('a.removeMetrics'), 'onclick', function() {
		metricsManager.remove(this);
	});
	this.bindEvent($('a.copyMetrics'), 'onclick', function() {
		metricsManager.copy(this);
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
};

function bindObservers() {
	rraManager.attach(cal);
	rraManager.attach(eventsManager);
	metricsManager.attach(cal);
	metricsManager.attach(eventsManager);
	metricsGroupManager.attach(cal);
	metricsGroupManager.attach(eventsManager);
	clusterManager.attach(cal);
	clusterManager.attach(eventsManager);
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
bindObservers();
rraManager.getAverageRows(); 