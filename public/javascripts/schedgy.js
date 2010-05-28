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
	users: [],
	init: function(params) {
		this.$calendar = params.calendar;
		this.$userList = params.userList;
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
		this.calendar = new Calendar(this.$calendar, dateObject, this);
	},
	
	initUserList: function() {
		var action = '/list_users'
		var self = this;
		$.ajax({
			url: this.controller + action,
			dataType: 'json',
			data: {},
			type: 'POST',
			success: function (data) {
				self._userListCallback(self, data);
			}
		});
	},
	
	_userListCallback: function(self, data) {		
		for (var key in data) {
			var userParams =  $.parseJSON(data[key]);
			userParams.$userList = this.$userList;
			userParams.md5 = MD5(userParams.email);
			
			// Create a new user object and add it to the user's list.
			self.users.push(new User(userParams));
		}
	}
});

/**
 * The calendar widget.
 *
 * @param {jQuery object} $element an element to attach the calendar object to.
 * @retrun calendar is initialized and attached to the element provided.
 */
var Calendar = Class.extend({
	days: {},
	init: function($calendar, dateObject, schedgy) {
		var self = this;
		this.dateObject = dateObject;
		this.schedgy = schedgy;
		
		// Create the day objects and add them into the table.
		var days = $calendar.find('td');
		var daysOffset = dateObject.getDay();
				
		for (var day = 0;day < this._getDaysInMonth();day++) {
			$day = $(days[day + daysOffset]);
			
			var daysKey = (new Date(this.dateObject.getFullYear(), this.dateObject.getMonth(), (day + 1))).toString();			
			this.days[daysKey] = new Day({
				day: $day,
				dayOfMonth: (day + 1),
				calendar: this,
				schedgy: this.schedgy
			});
		}
		
		// Load day's data from server.
		var action = '/list_days';
		$.ajax({
			url: this.schedgy.controller + action,
			dataType: 'json',
			data: {
				time: this.dateObject.getTime() / 1000, // Ruby takes seconds.
			},
			type: 'POST',
			success: function (data) {
				if (data.error) {
					alert(data.error);
				} else {
					// Load in each us
					for (var key in data) {
						var dayData = $.parseJSON(data[key]);
						var day = self.days[(new Date(dayData.day)).toString()];
						// Now add the users to the day.
						for (var userKey in dayData.assigned_users) {
							console.log(dayData.assigned_users[userKey]);
						}
					}
				}
			}
		});
				
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
		var self = this;
		
		this.users = false
		this.$day = params.day;
		this.dayOfMonth = params.dayOfMonth;
		this.calendar = params.calendar;
		this.schedgy = params.schedgy;
		
		// Build the DOM element for the day.
		$list = $('<div class="number">' + this.dayOfMonth + '</div><ul><li>Drop User Here</li></ul>');
		$list.droppable({
			drop: function(event, ui) {
				var $this = $(this);
				var $element = ui.draggable;
				var action = '/add_user_to_day'
				var user = $element.data('class');
				
				$.ajax({
					url: self.schedgy.controller + action,
					dataType: 'json',
					data: {
						time: (new Date(self.calendar.dateObject.getFullYear(), self.calendar.dateObject.getMonth(), self.dayOfMonth)).getTime() / 1000, // Ruby takes seconds.
						email: user.email
					},
					type: 'POST',
					success: function (data) {
						if (data.error) {
							alert(data.error);
						} else {
							self.addUser(self, $element);
						}
					}
				});				
			}
		});
		this.$list = $list;
		this.$day.append($list);
	},
	
	getUser: function(email) {
		return this.users[email];
	},
	
	addUser: function(self, $element) {
		// Remove the 'Drop User Here.' hint if list is empty.
		if (!self.users) {
			self.users = {};
			self.$list.find('li').remove();
		}
		
		// Add to list of users on this day (if jquery call returns successfully)
		var user = $element.data('class');
		self.users[user.email] = user;
		
		var template = new jsontemplate.Template($('#template-user-calendar').html());
		var $user = $(template.expand({
			first_name: user.first_name,
			last_name: user.last_name
		}));	
		$user.data('class', user);
		self.$list.append($user);
	}
});

/**
 * A user in the system.
 */
var User = Class.extend({
	init: function(params) {
		this.first_name = params.first_name;
		this.last_name = params.last_name;
		this.email = params.email;
		this.md5 = params.md5;
		this.$userList = params.$userList;
		
		// Actually create the element and append it to the users list.
		var template = new jsontemplate.Template($('#template-user-side').html());
		this.$user = $(template.expand(params));
		this.$user.data('class', this);
		this.$user.draggable({
	    	helper: 'clone'
	    });
		params.$userList.append(this.$user);
	}
});