/**
 * Schedgy, the painless scheduling tool.
 * MIT Licensed 2010
 * Programming and Design By: Benjamin E. Coe and Jeff Sarmiento
 */

/**
 * The main Schedgy object. controls calendars, users, and events.
 *
 * @param {params.calendar} the DOM element to attach a calendar to.
 * @param {params.dateString} a string representing the date to initialize the calendar with.
 * @return the schedgy calendar is bootstrapped.
 */
var Schedgy = Class.extend({
	userRoles: [],
	
	iconLookup: {
		Developer: '<img src="images/icons/computer.png" alt="Developers" style="width: 10px;height: 10px;" />',
		Marketing: '<img src="images/icons/briefcase.png" alt="Marketing" style="width: 10px;height: 10px;" />',
		Support: '<img src="images/icons/cross.gif" alt="Support" style="width: 10px;height: 10px;" />'
	},
	
	init: function(params) {
		this.users = {};
		this.$calendar = params.calendar;
		this.$userList = params.userList;

		// We modify this date object to pin it at the first of the month.		
		this.dateObject = params.dateObject || new Date();
		this.dateObject = new Date(this.dateObject.getFullYear(), this.dateObject.getMonth(), 1);
		
		this.controller = params.controller || '/schedgy';
		
		// Load the list of user roles from the server.
		this.loadRoles();
	},
	
	loadRoles: function() {
		var self = this;
		var action = '/list_role_type_names'; // The action for the rails controller.

		$.ajax({
			url: this.controller + action,
			dataType: 'json',
			data: {},
			type: 'POST',
			success: function (data) {
				for (var key in data) {
					self.userRoles.push(data[key]);
				}					
				// Load the user list.
				self.initUserList();
			}
		});
	},
	
	initUserList: function() {
		var self = this;
		var action = '/list_users' // The action for the rails controller.
		
		$.ajax({
			url: this.controller + action,
			dataType: 'json',
			data: {},
			type: 'POST',
			success: function (data) {
				self._userListCallback(data); // Populate the user lookup table.
				
				// initialize the calendar this can't be done until the user list is populated.
				this.calendar = new Calendar(self.$calendar, self.dateObject, self);
			}
		});
	},
	
	_userListCallback: function(data) {		
		for (var key in data) {
			var userParams =  data[key];
			userParams.$userList = this.$userList;
			
			// Create a new user object and add it to the users list.
			var user = new User(userParams);
			this.users[user.email] = user;
		}
	},
	
	getUser: function(email) {
		return this.users[email];
	}
});

/**
 * The calendar widget.
 *
 * @param {jQuery object} $element an element to attach the calendar object to.
 * @param {Date} dateObject the date of the first of the month.
 * @param {Schedgy object} a reference to the parent schedgy object.
 * @retrun calendar is initialized and attached to the element provided.
 */
var Calendar = Class.extend({
	days: {}, // Lookup a day in the calendar based on a key representing year/month/day.
	
	monthName: [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	],
	
	init: function($calendar, dateObject, schedgy) {
		var self = this;
		
		this.$calendar = $calendar;
		this.dateObject = dateObject;
		this.schedgy = schedgy;
		
		// Set the actual date string on this calendar.
		$('#schedgy-month').html(this.monthName[this.dateObject.getMonth()] + ' ' + this.dateObject.getFullYear());
		
		// Create the day objects and add them into the table.
		var days = $calendar.find('td');
		var daysOffset = dateObject.getDay();
		
		for (var day = 0;day < this._getDaysInMonth();day++) {
			
			$day = $(days[day + daysOffset]);			
			var daysKey = (new Date(this.dateObject.getFullYear(), this.dateObject.getMonth(), (day + 1))).toString();			
					
			// Create a new Day object and add it into a lookup table in the calendar.
			this.days[daysKey] = new Day({
				day: $day,
				dayOfMonth: (day + 1),
				calendar: this,
				schedgy: this.schedgy
			});
		}
		
		// Load day's data from server.
		this._loadMonthDays();
	},
	
	// Calls the Schedgy server and loads in data for each day.
	_loadMonthDays: function() {
		
		var self = this;
		var action = '/list_days'; // The rails action.
		
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
						var dayData = data[key];
						
						var day = self.days[(new Date(dayData.day)).toString()]; // Lookup day based on date key.
						
						if (day) { // Make sure that this day exists in this month.
							// Create a day restriction object and attach it to the day.
							day.dayRequirements = new DayRequirements({
								schedgy: self.schedgy,
								day: day,
								required_roles: dayData.required_roles,
								restricted_roles: dayData.restricted_roles,
								required_user_count: dayData.required_user_count
							});
							day.updateCounter(); // Update day widget with the new restrictions.
							
							// Now add the users to the day.
							for (var userKey in dayData.assigned_users) {
								
								var userPayload = dayData.assigned_users[userKey];
								var user = self.schedgy.getUser(userPayload.email);
							
								if (day.currentUsers < day.requiredUsers) {
									day.addUser(user.$user);
								} else {
									alert('There are already enough users on this day.');
								}
							
							}
						} // Otherwise this day must not be in this month.
					}
				}
			}
		});
	},
	
	// Helper function to return the count of the days in this month.
	_getDaysInMonth: function() {
		return 32 - new Date(this.dateObject.getFullYear(), this.dateObject.getMonth(), 32).getDate();
	}
});

/**
 * A day within the calendar.
 *
 * @param {jQuery object} params.day an object representing the td element to attach the day to.
 * @param {int} params.dayOfMonth the day of the month that this day falls on.
 * @param {Calendar object} params.calendar the parent calendar that contains this day.
 * @param {Schedgy object} params.schedgy the parent schedgy object.
 */
var Day = Class.extend({
	init: function(params) {
		var self = this;
		
		this.users = {};
		this.$day = params.day;
		this.dayOfMonth = params.dayOfMonth;
		this.calendar = params.calendar;
		this.schedgy = params.schedgy;
		this.requiredUsers = 5;
		this.currentUsers = 0;
		
		this.dayRequirements = new DayRequirements({
			schedgy: this.schedgy,
			day: this,
			required_roles: [],
			restricted_roles: [],
			required_user_count: 5
		});
		
		// Build the DOM element for the day.
		var $div = $('<div class="number">' + this.dayOfMonth + '</div>');
		this.$list = $('<ul></ul>');
		this.$counter = $('<div class="bottom"></div>')
		this.$list.droppable({
			drop: function(event, ui) {
				var $this = $(this);
				var $element = ui.draggable;
				var action = '/add_user_to_day'
				var user = $element.data('class');
				
				// We may have deleted this element in another asynchronous call.
				if (!user) {
					return true;
				}
						
				// Make sure we can add more users.
				if (self.currentUsers < self.requiredUsers) {
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
								// If this is a user being dragged and dropped form another
								// day we must remove them from the original day if everything
								// else goes successfully.
								if ($element.data('originalDay')) {
									// Fetch the data from the element being dropped.
									var $userElement = $element.data('$userElement');
									var originalUser = $element.data('originalUser');
									var originalDay = $element.data('originalDay');
									
									// Actually remove the original user.
									originalDay.removeUser(originalUser, $element);
									
									$element = $userElement;
								}
								
								self.addUser($element);
							}
						}
					});	
				} else {
					alert('There are already enough users on this day.');
				}		
			}
		});
		this.$day.append($div);
		this.$day.append(this.$list);
		this.$day.append(this.$counter);
		this.updateCounter();
	},
	
	
	updateCounter: function() {
		var self = this;
				
		// Fetch the current restriction/requirement information from dayRequirements
		// and display it.
		
		var _clickCallback = function(){
			// Remove the click event.			
			var $element = $(this).parent();
			self.dayRequirements.show();
			return false;
		}
		
		this.$counter.html('');
		this.$counter.append(this.dayRequirements.getUserWidget().click(_clickCallback));
	},
	
	getUser: function(email) {
		return this.users[email];
	},
	
	addUser: function($element) {

		var self = this;
		
		// Add to list of users on this day (if jquery call returns successfully)
		var user = $element.data('class');
		
		// Update the day requirements object and the
		// counter widget.
		this.dayRequirements.addUser(user);
		this.updateCounter()
		
		// We may have removed this element in another operation and user won't exist.
		if (!user) {
			return;
		}
		
		
		this.users[user.email] = user;
		
		var template = new jsontemplate.Template($('#template-user-calendar').html());
		var $user = $(template.expand({
			first_name: user.first_name,
			last_name: user.last_name,
			last_name_first_initial: user.last_name.charAt(0)
		}));	
		$user.data('class', user);
		
		// Allow a user to be removed.
		$user.click(function (event) {
			// Remove any menus currently open.
			$('.user-menu').remove();
			
			var $user = $(this);
			var user = $user.data('class');
			
			// Create user pop-up.
			var template = new jsontemplate.Template($('#user-menu').html());
			var $userMenu = $(template.expand({}));
			$userMenu.css({position: 'absolute', top: '-32px', left: '113px'});
			$user.append($userMenu);
			
			// Add the remove event.
			$userMenu.find('.user-menu-remove').click(function(event) {
				self.removeUser(user, $user);
				return false;
			});
			
			// Add the billing event.
			// Add the remove event.
			$userMenu.find('.user-menu-billing').click(function(event) {
				// Close the menu if it's open.
				$('.user-menu').remove();
				var user = $user.data('class');
				
				$imagesOnUser = $user.find('img[alt=Billing]');
				if (!$imagesOnUser.length) {
					$user.prepend('<img src="images/icons/money-bag.png" alt="Billing" />');
				} else {
					$user.find('img[alt=Billing]').remove();
				}
				
				return false;
			});
			
			// Add the remove event.
			$userMenu.find('.user-menu-captain').click(function(event) {
				// Close the menu if it's open.
				$('.user-menu').remove();
				var user = $user.data('class');
				
				$imagesOnUser = $user.find('img[alt=Captain]');
				if (!$imagesOnUser.length) {
					$user.prepend('<img src="images/icons/star.png" alt="Captain" />');
				} else {
					$user.find('img[alt=Captain]').remove();
				}
				
				return false;
			});
			
			$userMenu.click(function(event) {
				event.stopPropagation();
			});
			
			event.stopPropagation();
		});
		
		$(document).click(function(event) {
			// Remove any menus currently open.
			$('.user-menu').remove();
		});
		
		// Store this extra information in the cloned user element
		// when dropping this element we remove the element from the day
		// it originated on.
		$user.data('$userElement', $element);
		$user.data('originalUser', user);
		$user.data('originalDay', this);
		$user.draggable({
	    	helper: 'clone'
	    });
		
		this.$list.append($user);
	},
	
	removeUser: function(user, $user) {		
		var self = this;
		var action = '/remove_user_from_day'
		
		// Update the day requirements object and the
		// counter widget.
		this.dayRequirements.removeUser(user);
		this.updateCounter()
		
		$.ajax({
			url: this.schedgy.controller + action,
			dataType: 'json',
			data: {
				time: (new Date(this.calendar.dateObject.getFullYear(), this.calendar.dateObject.getMonth(), this.dayOfMonth)).getTime() / 1000, // Ruby takes seconds.
				email: user.email
			},
			type: 'POST',
			success: function (data) {
				if (data.error) {
					alert(data.error);
				} else {
					// Close the menu if it's open.
					$('.user-menu').remove();
					$user.slideUp('normal', function() {
						$(this).remove();
					});
				}
			}
		});
	}
});

/**
 * A single user of the Schedgy system.
 * @param {string} first_name
 * @param {string} last_name
 * @param {string} email
 * @param {jQuery Object} the user list jQuery element for appending this user to.
 */
var User = Class.extend({
	init: function(params) {
		this.first_name = params.first_name;
		this.last_name = params.last_name;
		this.role = params.roles[0] || 'any';
		this.email = params.email;
		this.md5 = MD5(this.email); // A Gravatar image key is just an MD5 encoded email.
		this.$userList = params.$userList;
		
		// Actually create the element and append it to the users list.
		var template = new jsontemplate.Template($('#template-user-side').html());
		
		// Try to render the template.
		try {
			this.$user = $(template.expand(this));
		} catch (exception) {
			alert(exception.message)
		}
		
		this.$user.data('class', this); // Store a reference to the underlying user object.
		this.$user.draggable({
	    	helper: 'clone'
	    });
			
		params.$userList.append(this.$user); // Append the user badge to the #users element.
	}
});

/**
 * Handles the prompting the user for and generating restrictions
 * and requirements on a day.
 */
var DayRequirements = Class.extend({
	init: function(params) {		
		var self = this;
		this.schedgy = params.schedgy;
		this.day = params.day;
		this.required_roles = params.required_roles;
		this.restricted_roles = params.restricted_roles;
		this.required_user_count = params.required_user_count;
		
		// Initialize the boxes for storing user information
		// for a given day.
		this.users = {any: 0};
		for (var key in this.schedgy.userRoles) {
			this.users[this.schedgy.userRoles[key]] = 0;
		}
				
		// Actually create the element and append it to the users list.
		var template = new jsontemplate.Template($('#requirements-dialog').html());
		
		// Try to render the template.
		try {
			this.$dialog = $(template.expand(this));
			
			// Display the dialog.
			this.$dialog.dialog({
				autoOpen: false,
				width: 400
			});
			
			this.$dialog.find('.add-requirement').click(function() {
				self.addRequirement(self.$dialog.find('.requirement-selects'));
				return false;
			});
			
			this.$dialog.find('.remove-requirement').click(function() {
				self.removeRequirement(self.$dialog.find('.requirement-selects'));
				return false;
			});
			
			this.$dialog.find('.add-restriction').click(function() {
				self.addRestriction(self.$dialog.find('.restriction-selects'));
				return false;
			});
			
			this.$dialog.find('.remove-restriction').click(function() {
				self.removeRestriction(self.$dialog.find('.restriction-selects'));
				return false;
			});
			
			this.$dialog.find('.save-requirements').click(function() {
				self.saveRequirements();
				return false;
			});
			
			// Pre-populate the dialog with a sane set of required users.			
			for (var key in this.required_roles) {
				var name = this.required_roles[key].name;
				var count = this.required_roles[key].count;
				for (var i = 0; i < count; i++) {
					self.addRequirement(self.$dialog.find('.requirement-selects'), name);
				}
			}
			
			for (var key in this.restricted_roles) {
				var name = this.restricted_roles[key];
				self.addRestriction(self.$dialog.find('.restriction-selects'), name);
			}
			
			for (var i=0; i < this.required_user_count; i++) {
				self.addRequirement(self.$dialog.find('.requirement-selects'));
			}
			
		} catch (exception) {
			alert(exception.message)
		}
	},
	
	addRequirement: function($element, option) {
		var self = this;
		
		// Default the option value to 'any' if none is specified.
		option = option || 'any';
		
		// Add the default option to the selector..
		var $select = $('<select></select>');
		var $option = $('<option name="type" value="any">Any Type</option>');
		$select.append($option);
		
		// Output options for each user role, select the appropriate
		// option if it is specifed.
		for (var key in this.schedgy.userRoles) {			
			$option = $('<option name="type"></option>');
			$option.attr('value', this.schedgy.userRoles[key])
			$option.html(this.schedgy.userRoles[key]);
			
			if (this.schedgy.userRoles[key] == option) {
				$option.attr('selected', 'selected')
			}
			
			$select.append($option);
		}
		
		// Save reference to this element's initial type,
		// used during validation.
		$select.data('type', option);
		$select.change(function() {
			$select = $(this);
			var message = self.validate($select.val());
			if (message) {
				alert(message);
				$select.val($select.data('type'));
			} else {
				$select.data('type', $select.val());
			}
		});
		
		$element.append($select);
	},
	
	// Don't a allow requirements to be dropped below the
	// current number of users in a box.
	validate: function(val) {
		var message = false;
		var sumRequirements = this.sumRequirements();
		for (var key in this.users) {
			
			var sum = sumRequirements[key];
			if (sumRequirements[key] == undefined) {
				sum = 0;
			}
			
			if (this.users[key] > sum) {
				message = "You must remove users of the role '" + key + "' to perform this action.";
			}
		}

		this.$dialog.find('.restriction-selects select').each(function() {
			var restriction = $(this).val();
			
			if (restriction == val) {
				message = "You must remove the restriction of the type '" + val + "' to perform this operation."
			}
		});
		
		if (message) {
			return message;
		}
		
		return false;
	},
	
	addRestriction: function($element, option) {
		var self = this;
		var $select = $('<select><option name="type" value="[Choose One]">[Choose One]</option></select>');
		$select.data('type', $select.val());
		
		for (var key in this.schedgy.userRoles) {
			var $option = $('<option name="type"></option>');
			$option.attr('value', this.schedgy.userRoles[key])
			$option.html(this.schedgy.userRoles[key]);
			
			if (option == this.schedgy.userRoles[key]) {
				$option.attr('selected', 'selected')
			}
			
			$select.append($option);
		}
		
		// Don't let a user set a restriction for a user type already assigned
		// to this day.
		$select.change(function() {
			var $select = $(this);
			if (self.users[$select.val()] > 0) {
				alert("Cannot add restriction of this type, remove users of type '" + $select.val() + "'");
				$select.val($select.data('type'));
			} else {
				$select.data('type', $select.val());
			}
		});
		
		$element.append($select);
	},
	
	removeRequirement: function($element) {
		var $select = $element.find('select:last');
		
		// Don't allow requirements to be dropped below the current
		// number of users in a given box.
		var sumRequirements = this.sumRequirements();
		if (this.users[$select.data('type')] > (sumRequirements[$select.data('type')] - 1)) {
			alert("You must remove users of the role '" + $select.data('type') + "' before performing this action.");
		} else {
			$select.remove();
		}
	},

	removeRestriction: function($element) {
		$selects = $element.find('select:last').remove();
	},
	
	sumRequirements: function() {
		var sumRequirements = {}; // Used to sum the number of users needed for each requirement type.
		this.$dialog.find('.requirement-selects select option:selected').each(function() {
			$select = $(this);
			if (sumRequirements[$select.val()] == undefined) {
				sumRequirements[$select.val()] = 1;
			} else {
				sumRequirements[$select.val()] += 1;
			}
		});
		return sumRequirements;
	},
	
	saveRequirements: function($element) {
		// Extract the requirements from the form.
		var self = this;
		self.payload = {
			time: (new Date(self.day.calendar.dateObject.getFullYear(), self.day.calendar.dateObject.getMonth(), self.day.dayOfMonth)).getTime() / 1000, // Ruby takes seconds.
		};
		var action = '/set_day_requirements_and_restrictions'
		
		// Grab required user settings from the pop-up.
		var sumRequirements = this.sumRequirements();
		
		// Copy the values into the payload array.
		for (var key in sumRequirements) {
			self.payload['requirements[' + key + ']'] = sumRequirements[key];
		}
		
		// Grab user restrictions from the pop-up.
		var restrictionCounter = 0;
		this.$dialog.find('.restriction-selects select').each(function() {
			$select = $(this);
			self.payload['restrictions[' + restrictionCounter + ']'] = $select.val();
			restrictionCounter++;
		});
		
		$.ajax({
			url: this.schedgy.controller + action,
			dataType: 'json',
			data: self.payload,
			type: 'POST',
			success: function (data) {
				self.hide();
			}
		});
	},
		
	show: function() {
		this.$dialog.dialog('open');
	},
	
	hide: function() {
		this.$dialog.dialog('close');
		this.day.updateCounter();
	},
	
	addUser: function(user) {
		var role = user.role || 'any';
		var requirements = this.sumRequirements();
		if (this.users[role] == requirements[role] || requirements[role] == undefined) {
			role = 'any';
		}
		this.users[role]++;
	},
	
	removeUser: function(user) {
		var role = user.role || 'any';
		var requirements = this.sumRequirements();
		if (this.users[role] == 0 || requirements[role] == undefined) {
			role = 'any';
		}
		this.users[role]--;
	},
	
	getUserWidget: function() {
		var imageHTML = '<img src="images/icons/smile.png" alt="Anyone" style="width: 12px;height: 12px;" />';
		
		var $userWidget = $('<span></span>');
		var requirements = this.sumRequirements();
		
		var empty = true;
		for (var key in this.users) {
			if (requirements[key]) {
				
				empty = false;
				
				$a = $('<a href="#" style="text-decoration: none;font-size: 12px;"></a>');				
				var imageHTMLTemp = imageHTML;
				if (this.schedgy.iconLookup[key]) {
					imageHTMLTemp = this.schedgy.iconLookup[key];
				}
				
				$a.html(imageHTMLTemp + this.users[key] + '/' + requirements[key]);
				$userWidget.append($a);
			}
		}
		
		if (empty) {
			$a = $('<a href="#" style="text-decoration: none;font-size: 9px;"></a>');
			$a.html('Click Me.');
			$userWidget.append($a);
		}
		
		return $userWidget;
	}
});