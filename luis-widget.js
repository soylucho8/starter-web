var hrfA = {
	hostUrl : 'https://' + (hrfConfig.is_staging === true ? 's-' : ("dev" in hrfConfig ? hrfConfig.dev.substring(0,1) + "-" : '')) + 'api.hrfuse.com/',
	viewLocation : '/view.php',
	editLocation : '/edit.php',
	tabName		: '',
	name		: '',
	func		: '',
	value		: '',
	callObj		: {},
	useDiv		: true,
	tempName	: '',
	tempDir		: '',
	skipNotify  : false,
	params		: {},
	version		: 'v1',
	show_providers : '',
	
	// Main ajax call for gets
	get :  
		function() {  
			var o = hrfA.callObj; 
			
			if(!hrfA.isDefined(o.customFunc) && hrfA.isFunction(o.div)) { 
				o.customFunc = o.div;
				o.div = '';
			}
			//function getHTML always has useDiv=true
			if(hrfA.useDiv)
				hrfA.div = o.div; 
			
			if(!hrfA.useDiv)
				hrfA.fieldId = o.fieldId
			
			if(o.name == '' || o.func == '') {
				hrfA.addError('A name and func must be present to run a get(). name: ' + o.name + ', func: ' + o.func);
				return false;
			}
			
			 
			var extraParams = hrfA.paramToString(); 
			//used to display the loading icon, if an id is received (as attachParam), use the received id, else, use the default id (needed if we have multiple loading on the same page)
			var $loading; 

			if(hrfA.isDefined(hrfA.params['loading_id'])){ 
				$loading=jQuery('#'+hrfA.params['loading_id']); 
			} else {
				$loading=jQuery('#hrf-loading-image');
			} 
			$loading.show();  
			       
			var tempDir = hrfA.tempDir != '' && hrfA.isDefined(hrfA.tempDir) ? hrfA.tempDir : '';
			
			jQuery.ajax(hrfA.hostUrl + hrfA.version + tempDir + hrfA.viewLocation + '?n=' + o.name + '&f=' + o.func + extraParams + (hrfA.isDefined(o.value) && o.value != '' ? '&' + o.value : ''), { 
				error : function(xrh, error, error_type) { 
					//console.log(xrh); 
					//console.log(error); 
					//console.log(error_type); 
				},
				
				dataType : 'jsonp',
				jsonpCallback: 'jsonCallback',
				contentType: "application/json",
				success : function(result) {
					result = result.html; 
				
					if(typeof(result) != 'undefined' && result.indexOf('Session Expired. Please logout and login again') != -1) {
						setTimeout(function() {
							var forceLogout = window.location = '/?logout=1&return_url=' + encodeURIComponent(document.location.pathname + document.location.search);
							return false;
						}, 5000);
					} 
					
					// If the div should be populated
					if(o.useDiv == true) {
						if(result == '') { //if result is empty
							hrfA.addError('There wasn\'t any HTML to fetch. name: ' + o.name + ' func: ' + o.func + ' value: ' + o.value);
						}
						//fill the html content
						if(o.div) {
							var $div = jQuery('#' + o.div);
							$div.html(result);
							
						}
	
						// If there is a datepicker on the page
						if(hrfA.isDefined(jQuery.fn.simpleDatepicker)) {
							
							if(jQuery('.datePicker.date').length > 0) {
								jQuery('.datePicker').simpleDatepicker({startdate : 2008, format : 'd-M-Y'});
							} else {
								jQuery('.datePicker').simpleDatepicker({startdate : 2008});
							}
						}
						
					} else { 
						if(result == '') {
							hrfA.addError('There wasn\'t anything to fetch. name: ' + o.name + ' func: ' + o.func + ' value: ' + o.value);
						}
						
						if(o.fieldId) {
							var $field = jQuery('#' + o.fieldId);
							var tag = $field.prop('tagName');
							var type = $field.prop('type');
							if(tag == 'TEXTAREA' || (tag == 'INPUT' && (type.toUpperCase() == 'HIDDEN' || type == 'TEXT'))) {
								$field.val(result);
							} else if(tag == 'SELECT') {
								var obj = jQuery.parseJSON(result);
								$field.empty();
								for(var i in obj) {
									$field.append('<option value="' + i + '">' + obj[i] + '</option>');
								}
							}
						}
						
						if(o.isResponse) {
							var possibleJSON = result.replace(/\<(script|div style\=\"padding\: 10px\;\")[\s\S]*\<\/(script|div)\>/g, "");
							var firstChar = possibleJSON.slice(0,1), checkChar = firstChar == "[" ? "]" : "}", lastChar = possibleJSON.slice(-1), extraJavascript;
							if((firstChar == "[" || firstChar == "{") && checkChar == lastChar) {
								extraJavascript = result.replace(/[\s\S]*\<script.*\>([\s\S]+)\<\/script\>/, "$1");
								try{eval(extraJavascript);} catch(e) {}
								result = $.parseJSON(possibleJSON);
							} else {
								extraJavascript = result.replace(/[\s\S]*\<script.*\>([\s\S]+)\<\/script\>/, "$1");
								try{eval(extraJavascript);} catch(e) {}
								result = possibleJSON;
							}
							o.isResponse = false;
						}
					}  
					
					// if a specific function needs to be run after the get request
					if(hrfA.isDefined(o.customFunc)) {
						o.customFunc(result);
					} 
					
					$loading.hide();        
				} 
			});
			
			// If hrfA.tempName() was called before this call, it will now be reset.
			// This will also reset tempDir
			hrfA.refreshName();
		},
	getHTML :
		function(func, value, div, customFunc) {
			
			if(!hrfA.isDefined(div) && value != '') {
				div = value;
				value = ''; 
			}
		
			var formValues = hrfA.parseValues(value);
			
			hrfA.callObj = { 
				name 		: hrfA.name, 
				func 		: func,
				value 		: formValues,
				div 		: div,
				customFunc	: customFunc,
				useDiv		: true
			}; 
			hrfA.get(); 
		},  

	getTab :
		function(tab, value, breakCache) {
			jQuery('#hrf-tabs li').removeClass('selected');
			jQuery('#hrf-tabs li[data-tab="' + tab + '"]').addClass('selected');

			//if tab has content
			if(jQuery('#' + tab + '-landing-strip').html() != "" && breakCache !== true) {	
				hrfA.setName(tab);
				jQuery('.hrf-tab-landing-strips').hide();
				jQuery('#' + tab + '-landing-strip').parent().show();
				jQuery('#' + tab + '-landing-strip').show();
				return;
			}

			if(typeof(value) == 'object' && typeof(value.show_providers) != 'undefined' && value.show_providers != "")
				hrfA.show_providers = value.show_providers;

			var formValues = hrfA.parseValues(value);
			
			hrfA.callObj = { 
				name 		: tab, 
				func 		: 'main',
				value 		: formValues,
				div 		: tab + '-landing-strip',
				customFunc	: function() {
					hrfA.setName(tab);
					jQuery('.hrf-tab-landing-strips').hide();
					jQuery('#' + tab + '-landing-strip').parent().show();
					jQuery('#' + tab + '-landing-strip').show();
				},
				useDiv		: true 
			};

			hrfA.get();
		},
		
	getLb :
		function(func, value, widthType) {
			hrfA.getHTML(func, value, 'lb', function(result) { hrfA.showLb(widthType); });
		},
		
	getInputData :
		function(func, value, fieldId, customFunc) {
			var formValues = hrfA.parseValues(value);
			
			hrfA.callObj = {
				name 		: hrfA.name, 
				func 		: func,
				value 		: formValues,
				fieldId		: fieldId,
				customFunc	: customFunc,
				useDiv		: false
			}
			hrfA.get();
		},
		
	getResponse :
		function(func, value, customFunc) {
			var formValues = hrfA.parseValues(value);
			
			hrfA.callObj = {
				name 		: hrfA.name, 
				func 		: func,
				value 		: formValues,
				customFunc	: customFunc,
				useDiv		: false,
				isResponse 	: true
			}
			hrfA.get();
		},
	
	// This is the function that actually interacts with edit.php. The other functions are like "wrapper" functions that push to this one.
	push :
		function() {

			var o = hrfA.callObj, values;
			
			if(hrfA.useDiv)
				hrfA.div = o.div;
			
			//jQuery('div.loading').show();
			if(o.name == '' || o.func == '') {
				hrfA.addError('A name and func must be present to run a set(). name: ' + o.name + ', func: ' + o.func);
			}
			
			var $loading = jQuery('#hrf-loading-image');
			$loading.show();
			
			// Validate a form if formId is supplied
			var extraParams = hrfA.paramToString();
			
			var tempDir = hrfA.tempDir != '' ? hrfA.tempDir : '';

			jQuery.ajax(hrfA.hostUrl + hrfA.version + tempDir + hrfA.editLocation + '?n=' + o.name + '&f=' + o.func + extraParams + (hrfA.isDefined(o.values) && o.values != '' ? '&' + o.values : ''), {
				error : function(xrh, error, error_type) { 
					//console.log(xrh); 
					//console.log(error); 
					//console.log(error_type);  
				},
				dataType : 'jsonp',
				jsonpCallback: "jsonEditCallback",
				contentType: "application/json",
				success : function(result) {

					result = typeof(result) == 'object' ? result : JSON.parse(result);
					
					if(result) {

						if(typeof(result.errors) != 'undefined') { //if there was an error
							hrfN.add(result.errors, { forceStatus : 'error' });
						} else if(typeof(result.message != 'undefined')) { //if there is a notification message
							hrfN.add(result.message);
						}
						
						// Popup notify anything that is echoed out.
						if(!o.skipNotify) { 
							//N.add(result);
						} else {
							o.skipNotify = false;
						}
					}
					
					// Execute any type of custom function
					if(hrfA.isDefined(o.customFunc)) {
						o.customFunc(result)
					}
						
					$loading.hide();
				}
			});
			
			// If hrfA.tempName() was called before this call, it will now be reset.
			hrfA.refreshName();
		},
	
	// This is the wrapper function that is used for the push function. The push function is the actual function that accesses edit.php
	set :
		function(func, data, customFunc) {
			var formValues = hrfA.setValues(data), 
				formId = hrfA.isString(data) && /[a-z]+/i.test(data) && data.indexOf('&') == -1 ? data : hrfA.formId;

			hrfA.callObj = { 
				name 		: hrfA.name, 
				func 		: func,
				values		: formValues,
				formId		: formId,
				customFunc	: customFunc
			};
			hrfA.push();
		},
	setAndGetHTML :
		function(func, data, viewFunc, viewValue, viewDiv, viewCustomFunc) {
			//if data is a string, it assumes it is the formId attribute
			 
			//in this case, data would be the form id, and setValues() would return a string with the name and values of elements inside a form
			var formValues = hrfA.setValues(data), 
				formId = hrfA.isString(data) && /[a-z]+/i.test(data) && data.indexOf('&') == -1 ? data : hrfA.formId;

			hrfA.callObj = { 
				name 		: hrfA.name, 
				func 		: func,
				values		: formValues,
				formId		: formId,
				customFunc	: function() { hrfA.getHTML(viewFunc, viewValue, viewDiv, viewCustomFunc); hrfA.hideLb(); }
			};
			hrfA.push();
		},
		
	setResponse : 
		function(func, data, customFunc) {
			var formValues = hrfA.setValues(data), 
				formId = hrfA.isString(data) && /[a-z]+/i.test(data) && data.indexOf('&') == -1 ? data : hrfA.formId;
			hrfA.callObj = {
				name 		: hrfA.name, 
				func 		: func,
				values 		: formValues,
				formId		: formId,
				customFunc	: customFunc,
				skipNotify	: true,
				isResponse 	: true
			};
			hrfA.push();
		},	
		
	// Sets the name permanantly until changed by another setName() or a tab is clicked.
	setName : 
		function(name) {
			hrfA.name = name;
		},
	
	// Sets the name to be something for one ajax call (get or push). Afterwards it is reset to the previous main name that was set.
	setTempName : 
		function(tempName) {
			hrfA.tempName = hrfA.name;
			hrfA.name = tempName;
		},
		
	// Sets directory for one ajax call that needs to be used if it's going to something specific (like to the /jobs/view.php), you would use setTempDir('/jobs/');
	setTempDir : 
		function(tempDir) {
			hrfA.tempDir = tempDir;
		},
		
	refreshName :
		function() {
			if(hrfA.tempName) {
				hrfA.name = hrfA.tempName;
				hrfA.tempName = '';
			}
			if(hrfA.tempDir) {
				hrfA.tempDir = '';
			}
		},
		
	// Popup that shows up when something is clicked, also called lightbox
	showLb :
		function(width) {
			
			var $lb = jQuery('#hrf-lb'),
				left, newWidth, $wrapper, $lbbg,
				scrollTop = (document.documentElement.scrollTop) ? document.documentElement.scrollTop : window.pageYOffset;
			
			if(!$lb.length) {
				$wrapper = jQuery(document.createElement('div')).attr('id', 'hrf-lb-wrapper');
				$lb = jQuery(document.createElement('div')).attr('id', 'hrf-lb');
				$lbbg = jQuery(document.createElement('div')).attr('id', 'hrf-lbbg');
				$wrapper.append($lb).append($lbbg);
				jQuery('#' + hrfWidget.placeholderId).prepend($wrapper);
			}
			
			switch(width) {
				case 'all':
					newWidth = 'auto';
					break;
				case 'full':
					newWidth = '95%';
					break;
				case 'middle':
				case 'medium':
					newWidth = '65%';
					break;
				case 'small':
					newWidth = '40%';
					break;
				case 'mini':
				case 'tiny':
					newWidth = '15%';
					break;
				default:
					newWidth = '40%';
			}
			
			if(jQuery(window).width() < 900) 
				newWidth = '95%';
				
			$lb.css('width', newWidth);
			left = (jQuery(window).width() - $lb.width()) / 2
			
			//If IE 8
			if(scrollTop == undefined) scrollTop = 0;
			
			$lb.data('scrollTop', scrollTop);
			$lb.data('previousOverflow', jQuery(document.body).css('overflow-y'));
			jQuery(document.body).css('overflow-y', 'auto');
			
			// lbbg is the large dark background area that appears when the lightbox comes up
			jQuery('#hrf-lbbg').show().css({width : document.documentElement.clientWidth + 0, height : document.documentElement.clientHeight + 0, left : '0px', top : '0px'})
			
			// lb is the lightbox itself
			$lb
				.show()
				.css({top : (scrollTop + 30) + 'px', left : left})
				.prepend('<span class="fa-cancel-circled hrf-lb-close"></span>');
			$lb.find('.hrf-lb-close').on('click', function() { hrfA.hideLb() });
		},
		
	// Hides the lightbox.
	hideLb : 
		function() {
			jQuery('#hrf-lb').hide().html('');
			jQuery('#hrf-lbbg').hide();
			jQuery('#hrf-widget').scrollTop(jQuery('#hrf-lb').data('scrollTop'));
			jQuery(document.body).css('overflow-y', jQuery('#hrf-lb').data('previousOverflow'));
			//V.clearErrors();
		},
		
	attachParam :
		function(param, value) {
			hrfA.params[param] = value;
		},
		
	paramToString :
		function() {
			var i, str = '';
			
				for(i in hrfA.params) {
					str += '&' + i + '=' + hrfA.params[i];
				}
			return str;
		},
		
	parseValues :
		function(value) {
			return hrfA.setValues(value);
		},
	//set the values from the elements in the form, based on the id received 
	setValues :
		function(data) { 
			var formValues;
			// If this is an string, we'll assume it's a form id
			if(hrfA.isString(data) && /[a-z]+/i.test(data) && data.indexOf('&') == -1) { //in this case, data would be the form id
				formValues = jQuery('#' + data).serialize(); //serialize will give us the names and values of the inputs on the form
				hrfA.formId = data;
				 
			// Data can also be a key : value object
			} else if(hrfA.isObject(data)) {
				formValues = jQuery.param(data);
			
			// If it's a custom url string
			} else if(hrfA.isString(data) && data.indexOf('&') != -1) {
				formValues = data;
				
			// If it's only an int, we'll assume that it's an id and assign it to v
			} else if(/[^a-z]+/i.test(data)) {
				formValues = 'v=' + data;
			
			// If there's an & we'll assume that they are trying to manually format the url parameters
			} else if(hrfA.isString(data) && data.indexOf('&') != -1) {
				formValues = data;
			}
			return formValues;
		},
		
	addError :
		function(msg) {
			try { console.log(msg); } catch(e) {}
		},
		
	isDefined :
		function(data) {
			return typeof(data) != 'undefined';
		},
		
	isString :
		function(data) {
			return typeof(data) == 'string';
		},
		
	isInt :
		function(data) {
			return typeof(data) == 'number';
		},
		
	isObject :
		function(data) {
			return typeof(data) == 'object';
		},
		
	isFunction :
		function(data) {
			return typeof(data) == 'function';
		},
		
	hasComma :
		function(string) {
			return string.indexOf(',') != -1;
		},
		
	/*
	 * 
	 *  Misc functions
	 *  
	 */
		
	// This is used in the autocomplete plugin we have. This will bold the letters that we are searching for.
	highlightResult : function(value, data) {
		var q = jQuery('#autocomplete').val().toLowerCase();
		q = q.split('');
		var location, newValue, finalValue = '', lastLocation, done = new Array();
		var playValue = value.toLowerCase();
		for(var i = 0; i < q.length; i++) {
				location = playValue.indexOf(q[i], lastLocation + 1);
				if(i == 0) {
					if(location == 0) {
						newValue = '<b>' + value.slice(0, 1) + '</b>';
					} else {
						newValue = value.slice(0, location) + '<b>' + value.slice(location, location + 1) + '</b>';
					}
				} else {
						newValue = value.slice(lastLocation + 1, location) + '<b>' + value.slice(location, location + 1) + '</b>';
				}
				lastLocation = location;
				finalValue += newValue;
				done.push(location);
		}
		finalValue += value.slice(lastLocation + 1);
		return finalValue;
    }
};

var hrfN = {
	add : 
		function(alertText, options) {

			if(typeof(alertText) == 'undefined' || alertText == "")
				return;

			var newId, timeoutId, lastId, split, $newNotify, $lastNotification, offsetTop, $allNotifications = jQuery('.sticky');
		
			// Default options
			var defaults = {
				width : 225,
				canClose : true,
				time : 6000,
				uniqueClass : '',
				forceStatus : ''
			};
			
			if(hrfA.isObject(options)) {
				for(var i in options) {
					defaults[i] = hrfA.isDefined(options[i]) ? options[i] : defaults[i];
				}
			}
			
			// Get all notifications and get the length
			if($allNotifications.length) {
				lastId = $allNotifications.last().attr('id');
				split = lastId.split('_');
				newId = parseInt(split[1]) + 1;
			} else {
				newId = 1;
			}
			
			// Create New Notification
			$newNotify = jQuery(document.createElement('div')).addClass('alert').addClass('sticky').attr('id','notify_' + newId).prop('data-id', newId);
			$newNotify.html(alertText);
			
			if(defaults.uniqueClass != '') {
				$newNotify.addClass(defaults.uniqueClass);
			}
			
			if(defaults.canClose) {
				$newNotify.addClass('alert-dismissable');
				$newNotify.prepend('<span class="close" data-dismiss="alert" aria-hidden="true" title="Close">X</span>');
				$newNotify.find('.close').on('click', function() {
					hrfN.close(newId);
				});
			}
			
			if(defaults.width != 225) {
				$newNotify.css('width', defaults.width);
			}
			
			// Assign the top attribute of the notification depending on how many notifications are already present.
			if($allNotifications.length == 0) {
				var mobileTop = hrfA.isMobile ? 10 : 125;
				$newNotify.css({ top : mobileTop }).show();
			} else {
				$lastNotification = $allNotifications.last();
				offsetTop = $lastNotification[0].offsetTop;
				$newNotify.css({ top : offsetTop + $lastNotification.outerHeight() + 10 }).show();
			}

			// Format Error Alert Message As Necessary
		    if(/error/i.test(alertText) || defaults.forceStatus == 'error' || defaults.forceStatus == 'danger') {
				$newNotify.addClass('alert-danger');
				defaults.time = 400000;
			} else if(/success/i.test(alertText) || defaults.forceStatus == 'success') {
				$newNotify.addClass('alert-success');
			} else if(alertText.indexOf('Ticket:') != -1 || defaults.forceStatus == 'ticket') {
				$newNotify.addClass('alert-warning');
			} else {
				$newNotify.addClass('alert-info');
			}
		    
		    // Add a class to all links to have them match the notification.
		    $newNotify.not('.formError').find('a').each(function() { jQuery(this).addClass('alert-link'); });
			
			timeoutId = setTimeout(function() { 
				hrfN.close(newId);
			}, defaults.time);
			
			$newNotify.data('timeout_id_notify', timeoutId);
			$newNotify.data('timeout_time_notify', defaults.time);
			
			// Attach it to the widget
			$newNotify.appendTo(jQuery('#hrf-widget'));
		},
	close : 
		function(id) {
			var $notify = jQuery('#notify_' + id);
			var height = $notify.outerHeight();
			$notify.fadeOut(function() {
				$notify.remove();
				hrfN.moveUp(id, height);
			});
		},
		
	moveUp :
		function(id, height) {
			var $notifications = jQuery('.sticky');
			var i = 1;
			var prevId, currentId;
			var $firstNotification, offset;
			$notifications.each(function() {
				$currentNotify = jQuery(this);
				currentId = parseInt($currentNotify.prop('data-id'));
				
				if(currentId == id) {
					$currentNotify.animate({ top : 120 });
				} else if(currentId > id) {
					offsetTop = $currentNotify[0].offsetTop;
					$currentNotify.animate({ top : (offsetTop - height - 10) });
				}
				clearTimeout($currentNotify.data('timeout_id_notify'));
				setTimeout(function() { 
					hrfN.close(currentId);
				}, $currentNotify.data('timeout_time_notify'));
			});
		}
};



var hrfWidget = {
	
	placeholderId : 'hrf-widget',
	config : {},
	
	
	init : function() {
		var t = hrfWidget;
		t.setConfig(hrfConfig);
		hrfA.setName('widget');
		//hrfA.setName(t.config.widgetType);
		hrfA.version = t.config.api_version;
		t.authenticate();
	},
	
	setConfig : function(config) {
		var t = hrfWidget;
		jQuery.extend(t.config, config);
		if(!t.config.api_client.length) {
			hrfA.addError('API Client Not Set in hrfConfig object');
			return false;
		}
		
		if(!t.config.api_hash.length) {
			hrfA.addError('API Hash Not Set in hrfConfig object');
			return false;
		}
		
		jQuery.extend(t.config, config);
		return true;
	},
	
	authenticate : function() {
		var t = hrfWidget;
		
		hrfA.setTempName('authenticate');
		hrfA.setResponse('init', { 
			client : t.config.api_client, 
			hash : t.config.api_hash,
			hide_widget_border : (typeof(t.config.hideWidgetBorder) != 'undefined' ? t.config.hideWidgetBorder : ''),
			widget_accent_color : (typeof(t.config.widgetAccentColor) != 'undefined' ? t.config.widgetAccentColor : ''),
			widget_accent_hover_color : (typeof(t.config.widgetAccentHoverColor) != 'undefined' ? t.config.widgetAccentHoverColor : ''),
			widget_background_color : (typeof(t.config.widgetBackgroundColor) != 'undefined' ? t.config.widgetBackgroundColor : ''),
			widget_content_background_color : (typeof(t.config.widgetContentBackgroundColor) != 'undefined' ? t.config.widgetContentBackgroundColor : ''),
			widget_border_color : (typeof(t.config.widgetBorderColor) != 'undefined' ? t.config.widgetBorderColor : ''),
			widget_inner_border_color : (typeof(t.config.widgetInnerBorderColor) != 'undefined' ? t.config.widgetInnerBorderColor : ''),
			no_widget_padding : (typeof(t.config.noWidgetPadding) != 'undefined' ? t.config.noWidgetPadding : ''),
			no_widget_margin : (typeof(t.config.noWidgetMargin) != 'undefined' ? t.config.noWidgetMargin : '')
		}, function(result) {
			if((hrfA.isDefined(result.error) && !result.error.length) || (hrfA.isDefined(result.session_token) && result.session_token)) {
				
				hrfA.attachParam('token', result.session_token);
				hrfA.attachParam('sid', result.sid);
				
				if(typeof(hrfClientUser) != 'undefined') {
					hrfA.setTempName('clientUser');
					hrfA.setResponse('register', hrfClientUser, function(result) {
						if(hrfA.isDefined(result.client_user_id) && result.client_user_id)
							hrfA.attachParam('client_user_id', result.client_user_id);
						
						if(typeof(hrfCandidate) != 'undefined') {
							
							if(typeof(hrfCandidate.reference_id) != 'undefined')
								hrfA.attachParam('reference_id', hrfCandidate.reference_id);
							
							hrfA.setTempName('candidate');
							hrfA.setResponse('register', hrfCandidate, function(result) {
								if(hrfA.isDefined(result.candidate_id) && result.candidate_id)
									hrfA.attachParam('candidate_id', result.candidate_id);

								t.buildHTML();
							});
						} else {
							t.buildHTML();
						}
						
					});
				} 
			}
		});
	},
	
	buildHTML : function() {
		var t = hrfWidget;
		(function() {
			var d=document,
			h=d.getElementsByTagName('head')[0],
			s=d.createElement('link');
			s.type='text/css';
			s.rel='stylesheet';
			s.href=hrfA.hostUrl + hrfConfig.api_version + '/css/widget.css.php' + (t.config.is_staging ? '?' + (new Date()).getTime() : '');
			h.appendChild(s);

			h=d.getElementsByTagName('head')[0];
			s=d.createElement('script');
			s.type='text/javascript';
			s.src=hrfA.hostUrl + hrfConfig.api_version + '/js/datepicker/foundation-datepicker.min.js';
			h.appendChild(s);
		})();

		if(document.getElementById(t.placeholderId) != null) {

			hrfA.setTempName('widget');
			hrfA.getHTML('main', { 
				init_tab : (typeof(t.config.widgetType) != 'undefined' ? t.config.widgetType : (typeof(t.config.initTab) != 'undefined' ? t.config.initTab : '')),
				expand_tab : typeof(t.config.expandTab) != 'undefined' ? t.config.expandTab : '',
				show_tabs : typeof(t.config.showTabs) != 'undefined' ? t.config.showTabs : '',
				provider : typeof(t.config.provider) != 'undefined' ? t.config.provider : '',
				show_providers : typeof(t.config.showProviders) != 'undefined' ? t.config.showProviders : ''
			}, t.placeholderId);

		}
	},

	setClientUser : function(clientUser, buildHTMLafter) {
		hrfA.setTempName('clientUser');
		hrfA.setResponse('register', clientUser, function(result) {
			if(hrfA.isDefined(result.client_user_id) && result.client_user_id)
				hrfA.attachParam('client_user_id', result.client_user_id);

			if(buildHTMLafter == true)
				hrfWidget.buildHTML();
		});

	}
}

if(typeof jQuery === "undefined") {
	var d=document,
	h=d.getElementsByTagName('head')[0],
	s=d.createElement('script');
	s.type='text/javascript';
	s.src='https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js';
	//s.src='https://api.hrfuse.com/js/jquery.js';
	s.onload = hrfWidget.init;
	s.onreadystatechange = function() {
		if (this.readyState == 'complete' || this.readyState == 'loaded') 
			hrfWidget.init();
		};
	h.appendChild(s);

} else {
	hrfWidget.init();
}
