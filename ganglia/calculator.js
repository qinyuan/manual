var rraManager, clusterManager, metricsGroupManager, metricsManager;
var cal, periodPicker, defaultMetrics;
$(document).ready(function() {
	defaultMetrics = $.trim(document.getElementById('defaultMetrics').innerHTML);
	eval("defaultMetrics=" + defaultMetrics + ";");
	defaultMetrics = defaultMetrics['metricsGroups'];
	
	initObject();
	cal.update();
	decorateButton();
});

function initObject(){
	cal = new Calculator();
	cal.closeUpdate = true;

	rraManager = new RRAManager();
	metricsManager = new MetricsManager();
	metricsGroupManager = new MetricsGroupManager();
	clusterManager = new ClusterManager();
	clusterManager.add();
	initRRA();
	periodPicker = new PeriodPicker();

	cal.closeUpdate = false;
	cal.update();
}

function Calculator() {
	this.closeUpdate = false;
}

Calculator.prototype.update = function() {
	if (this.closeUpdate) {
		return;
	}
	this.updateMetricsCount();
	this.updateResultDetails();
};

Calculator.prototype.updateResultDetails = function() {
	if (this.closeUpdate) {
		return;
	}

	var $trs = $('div#rraConfig tbody tr');
	var rra = $trs.size();
	var rows = 0;
	$trs.each(function() {
		rows += parseInt($(this).find('td:eq(3)').text());
	});
	rows = rows / rra;

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
			"space" : self.formatNumber(space + " bytes")
		});
		$resultDetails.append(detail);
	});

	var summaryFolderSize = this.getSummaryFolderSize(maxMetricsCount, rra, rows);
	$resultDetails.append(parseTemplate("resultSummaryTpl", {
		"metricsCount" : maxMetricsCount,
		"space" : this.formatNumber(summaryFolderSize + " bytes")
	}));

	totalSpace += summaryFolderSize;
	$('#totalSpace').text(this.formatNumber(totalSpace) + " bytes");
};

Calculator.prototype.formatNumber = function(num) {
	var reg = /(\d{1,3})(?=(\d{3})+(?:$|\D))/g;
	num = num.toString().replace(reg, "$1,");
	return num;
};

Calculator.prototype.getSingleRRDSize = function(ds, rra, rows) {
	return 8 * ds * rra * rows + 80 * ds * rra + 232 * ds + 112 * rra + 120;
};

Calculator.prototype.getHostFolderSize = function(hostCount, metricsCount, rra, rows) {
	var singleRrdInHostFolder = this.getSingleRRDSize(1, rra, rows);
	return hostCount * singleRrdInHostFolder * metricsCount;
};

Calculator.prototype.getSummaryFolderSize = function(metricsCount, rra, rows) {
	var singleRrdInSummaryFolder = this.getSingleRRDSize(2, rra, rows);
	return singleRrdInSummaryFolder * metricsCount;
};

Calculator.prototype.getClusterSpace = function(hostCount, metricsCount, rra, rows) {
	var hostFolderSize = this.getHostFolderSize(hostCount, metricsCount, rra, rows);
	var summaryFolderSize = this.getSummaryFolderSize(metricsCount, rra, rows);
	return hostFolderSize + summaryFolderSize;
};

Calculator.prototype.updateMetricsCount = function() {
	$('#clusters div.cluster').each(function() {
		var metricsCount = $(this).find('tbody tr').size();
		$(this).find('input.metricsCount').val(metricsCount);
	});
};

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

function PeriodPicker() {
	this.$div = $('#periodPicker').css('display', 'none');
	this.$bindText = null;
	var args = {
		showTip : true,
		min : 0,
		width : 600,
		step : 1
	};

	this.yearPicker = $('#yearPicker');
	this.dayPicker = $('#dayPicker');
	this.hourPicker = $('#hourPicker');
	this.minPicker = $('#minPicker');
	this.secPicker = $('#secPicker');

	args.max = 364;
	this.dayPicker.slider(args);
	args.max = 23;
	this.hourPicker.slider(args);
	args.max = 59;
	this.minPicker.slider(args);
	args.max = 59;
	this.secPicker.slider(args);
}

PeriodPicker.prototype.show = function(element) {
	this.$bindText = $(element);
	var period = new Period(this.$bindText.next().val());
	this.load(period);

	var offset = this.$bindText.offset();
	offset.top = offset.top + this.$bindText.height() + 5;
	this.$div.show().offset(offset);
};

PeriodPicker.prototype.update = function() {
	var period = this.getValue();
	if (!rraManager.validate(period.getSeconds())) {
		return;
	}
	this.$bindText.val(period.getText());
	this.$bindText.next().val(period.getSeconds());
	rraManager.refresh(this.$bindText.parent().parent());
	this.hide();
};

PeriodPicker.prototype.getValue = function() {
	var year = parseInt(this.yearPicker.val());
	var day = this.dayPicker.slider('getValue');
	var hour = this.hourPicker.slider('getValue');
	var min = this.minPicker.slider('getValue');
	var sec = this.secPicker.slider('getValue');
	return new Period(sec, min, hour, day, year);
};

PeriodPicker.prototype.load = function(period) {
	this.yearPicker.val(period.year);
	this.dayPicker.slider('setValue', period.day);
	this.hourPicker.slider('setValue', period.hour);
	this.minPicker.slider('setValue', period.min);
	this.secPicker.slider('setValue', period.sec);
};

PeriodPicker.prototype.hide = function() {
	this.$bindText = null;
	this.$div.hide();
};

function initRRA() {
	rraManager.add(15, 15 * 244);
	rraManager.add(24 * 15, 24 * 15 * 244);
	rraManager.add(168 * 15, 168 * 15 * 244);
	rraManager.add(672 * 15, 672 * 15 * 244);
	rraManager.add(5760 * 15, 5760 * 15 * 374);
}

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

function RRAManager() {
	this.count = 0;
	this.listener = new Array();
}

RRAManager.prototype.add = function(interval, period) {
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
};

RRAManager.prototype.remove = function(anchor) {
	var $tr = $(anchor).parent().parent();
	var $nextTr = $tr.next();
	$tr.remove();
	while ($nextTr && $nextTr.size()) {
		var $td = $nextTr.find('td:first');
		$td.text(parseInt($td.text()) - 1);
		$nextTr = $nextTr.next();
	}
	this.count--;
};

RRAManager.prototype.validate = function(seconds) {
	if (seconds <= 0) {
		alert('时间值必须大于零');
		return false;
	} else {
		return true;
	}
};

RRAManager.prototype.refresh = function($tr) {
	createRRAByTableRow($tr).getRevisedRRA().save($tr);
};

RRAManager.prototype.getRRACount = function() {
	return this.count;
};

function ClusterManager() {
	this.index = 0;
	this.listener=new Array();
}

ClusterManager.prototype.add = function() {
	var tpl = parseTemplate("clusterTpl", {
		'clusterName' : "cluster" + (++this.index)
	});
	var $cluster = $($.trim(tpl));
	$cluster.appendTo('#clusters');

	for (var i in defaultMetrics) {
		metricsGroupManager.add($cluster, defaultMetrics[i]);
	}
};

ClusterManager.prototype.remove = function(anchor) {
	$(anchor).parent().remove();
};

function MetricsGroupManager() {
}

MetricsGroupManager.prototype.add = function(anchor, metricsData) {
	var groupName = (metricsData && metricsData.name) ? metricsData.name : "未命名";
	var $tpl = $($.trim(parseTemplate('metricsGroupTpl', {
		"groupName" : groupName
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
};

MetricsGroupManager.prototype.remove = function(anchor) {
	$(anchor).parent().remove();
};

MetricsGroupManager.prototype.changeName = function(span) {
	var name = span.innerHTML;
	if (name.indexOf('<input') >= 0) {
		return;
	}
	var input = '<input type="text" value="' + name;
	input += '" onblur="return metricsGroupManager.changeNameSubmit(this);" />';
	span.innerHTML = input;
	$(span).find('input').select();
};

MetricsGroupManager.prototype.changeNameSubmit = function(input) {
	$(input).parent().text(input.value);
};

function MetricsManager() {
}

MetricsManager.prototype.add = function(arg, metricsItem) {
	if (arg.is && arg.is('div')) {
		var $tbody = arg.find('tbody');
	} else {
		var $tbody = $(arg).parent().find('tbody');
	}

	var params = {
		"index" : $tbody.find('tr').size() + 1
	};
	if (metricsItem && metricsItem.name && metricsItem.desc) {
		params.name = metricsItem.name;
		params.desc = metricsItem.desc;
	}
	$tbody.append(parseTemplate('metricsTpl', params));
	if (!params.name) {
		$tbody.find('tr:last').find('input:first').focus();
	}
};

MetricsManager.prototype.remove = function(anchor) {
	var $tr = $(anchor).parent().parent();
	var $nextTr = $tr.next();
	$tr.remove();
	while ($nextTr.size() && $nextTr.is('tr')) {
		var $td = $nextTr.find('td:first');
		$td.text(parseInt($td.text()) - 1);
		$nextTr = $nextTr.next();
	}
};

function decorateButton() {
	var lightgreen = "rgb(71,164,71)";
	var darkgreen = "rgb(61,144,61)";
	$('button.green').hover(changeColor(darkgreen), changeColor(lightgreen));
	var lightblue = "rgb(66,139,202)";
	var darkblue = "rgb(56,119,172)";
	$('button.blue').hover(changeColor(darkblue), changeColor(lightblue));
	function changeColor(color) {
		return function() {
			$(this).css('background-color', color);
		};
	};
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