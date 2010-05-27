/**
 * Schedgy, the simple scheduling tool.
 * MIT Licensed 2010
 * Programmed By: Benjamin E. Coe
 */

/**
 * The main Schedgy object. controls calendars, users, and events.
 *
 * @param {params.calendar} the DOM element to attach a calendar to.
 * @param {params.dateString} a string representing the date to initialize the calendar with.
 * @return the schedgy calendar is bootstrapped.
 */
var Schedgy = Class.extend({
	init: function(params) {
		this.$calendar = params.calendar;
		this.controller = params.controller || '/schedgy';
		
		// initialize the calendar if the
		// date string is set.
		if (params.dateString) {
			this.initCalendar(params.dateString);
		}
		
		// Load the user list.
		this.initUserList();
	},
	
	initCalendar: function(dateString) {
		var dateObject = new Date(dateString);
		this.calendar = new Calendar(this.$calendar, dateObject);
	},
	
	initUserList: function() {
		var action = '/load_users'
		
		$.ajax({
			url: this.controller + action,
			dataType: 'json',
			data: {},
			type: 'POST',
			success: this._userListCallback
		});
	},
	
	_userListCallback: function(data) {
	
	}
});

/**
 * The calendar widget.
 *
 * @param {jQuery object} $element an element to attach the calendar object to.
 * @retrun calendar is initialized and attached to the element provided.
 */
var Calendar = Class.extend({
	days: [],
	init: function($calendar, dateObject) {
		this.dateObject = dateObject;
		
		// Create the day objects and add them into the table.
		var days = $calendar.find('td');
		var daysOffset = dateObject.getDay();
		for (var day = 0;day < this._getDaysInMonth();day++) {
			$day = $(days[day + daysOffset]);
			days.push(new Day({
				day: $day,
				dayOfMonth: (day + 1)
			}));
		}
				
	},
	
	_getDaysInMonth: function() {
		return 32 - new Date(this.dateObject.getFullYear(), this.dateObject.getMonth(), 32).getDate();
	}
});

/**
 * A day within the calendar.
 */
var Day = Class.extend({
	init: function(params) {		
		this.$day = params.day;
		this.dayOfMonth = params.dayOfMonth;
		
		// Build the DOM element for the day.
		$ul = $('<div class="number">' + this.dayOfMonth + '</div><ul><li>Test list.</li></ul>');
		$ul.droppable({
			drop: function(event, ui) {
				var $this = $(this);
				var $element = ui.draggable;
				$this.append($element.clone());
			}
		});
		this.$day.append($ul);
	}
});

/**
 * A user in the system.
 */
var User = Class.extend({
	init: function() {
		
	}
});