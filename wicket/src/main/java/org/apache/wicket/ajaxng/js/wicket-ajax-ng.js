(function() {

YUI().use('*', function(Y) {
	
	/*
	 * YUI Shortcuts 
	 */
	var E = Y.Event;
	var L = Y.Lang;
	var UA = Y.UA;
	
	var W = { };

	// Publish the current YUI instance.
	// Creating new YUI instance every time it is needed can be quite expensive
	W.Y = Y;		
	
	/*
	 * $, $$
	 */
	
	W.$ = function(arg) 
	{
		if (arg == null || typeof(arg) == "undefined") 
		{
			return null;
		}
		if (arguments.length > 1) 
		{
			var e=[];
			for (var i=0; i<arguments.length; i++) 
			{
				e.push(W.$(arguments[i]));
			}
			return e;
		} 
		else if (typeof arg == 'string') 
		{
			return document.getElementById(arg);
		} 
		else 
		{
			return arg;
		}
	}
	
	/**
	 * Returns true if the argument element belongs to the current document.
	 * If the argument is a string, returns whether the document contains element with given id.
	 * If the argument is neither element nor a string function returns true.
	 */
	W.$$ = function(element) 
	{				
		if (L.isString(element)) 
		{			
			return W.$(element) != null;
		}
		else 
		{	
			return Y.get(element).inDoc();
		}
	}	
	
	/*
	 * Utility
	 */
	
	var bind = function(method, object) 
	{		
		return function() 
		{
			return method.apply(object, arguments);
		}
	}
	
	var copyArray = function(array)
	{
		var res = new Array();
		for (var i = 0; i < array.length; ++i)
		{
			res.push(array[i]);
		}
		return res;
	}
	
	var iterateArray = function(array, itemFunc)
	{
		if (L.isArray(array)) 
		{
			for(var i = 0; i < array.length; ++i)
			{
				var res = itemFunc(array[i]); 
				if (res != null)
				{
					return res;
				}
			}
		}
		else if (!L.isUndefined(array) && !L.isNull(array))
		{
			return itemFunc(array);
		}		
		return null;
	}
	
	var replaceAll = function(str, from, to) 
	{
	    var idx = str.indexOf(from);
	    while (idx > -1) 
	    {
	        str = str.replace(from, to);
	        idx = str.indexOf(from);
	    }
	    return str;
	}
	
	/*
	 * Logging
	 */
	var DummyLogger = 
	{
		trace: function() { },
		debug: function() { },
		info: function() { },
		error: function() { }
	}		
	
	var FirebugLogger =
	{
		arg: function(type, args)
		{			
			var first = args[0];			
			var a = copyArray(args).slice(1);
			if (args.length > 1)
			{
				a.unshift("|");
			}
			a.unshift(first);
			a.unshift("|");			
			a.unshift(type);
			
			for (var i = 0; i < a.length; ++i)
			{
				if (L.isString(a[i]) && a[i].length > 100) 
				{
					var s = a[i];
					a[i] = 
					{
						value: s,
						toString: function() 
						{
							return s.substring(0, 30) + "...";
						}
					};
				}
			}
			
			return a;
		},
		trace: function()
		{						
			console.debug.apply(this, FirebugLogger.arg("TRACE", arguments));
		},
		debug: function() 
		{
			console.debug.apply(this, FirebugLogger.arg("DEBUG", arguments));
		},
		info: function() 
		{
			console.info.apply(this, FirebugLogger.arg("INFO", arguments));
		},
		error: function() 
		{
			console.error.apply(this, FirebugLogger.arg("ERROR", arguments));
		}
	}
	
	var logger = DummyLogger;
	
	if (UA.gecko && typeof(console) !== "undefined" && logger === DummyLogger)
	{
		logger = FirebugLogger;
	}	
	
	var logConfig = { disableAll: false, trace: true, debug: true, info: true, error: true, "trace:GarbageCollector": false };
	
	W.Log  = 
	{
		trace: function()
		{
			if (!logConfig.disableAll && logConfig.trace && logConfig[arguments[0]] != false && logConfig["trace:" + arguments[0]] != false)
				logger.trace.apply(this, arguments);
		},
		debug: function()
		{
			if (!logConfig.disableAll && logConfig.debug && logConfig[arguments[0]] != false && logConfig["debug:" + arguments[0]] != false)
				logger.debug.apply(this, arguments);
		},
		info: function()
		{
			if (!logConfig.disableAll && logConfig.info && logConfig[arguments[0]] != false && logConfig["info:" + arguments[0]] != false)
				logger.info.apply(this, arguments);
		},
		error: function()
		{
			if (!logConfig.disableAll && logConfig.error && logConfig[arguments[0]] != false && logConfig["error:" + arguments[0]] != false)
				logger.error.apply(this, arguments);
		},
		setLogger: function(newLogger)
		{
			logger = newLogger;
		},
		getLogger: function()
		{
			return logger;
		},
		isDummyLogger: function()
		{
			return logger == DummyLogger;
		},
		getConfig: function() 
		{
			return logConfig;
		}
	};
		
	// convenience shortcut
	var log = W.Log;
	
	/*
	 * Garbage Collection (for removing event listeners from elements removed from DOM)
	 */
	
	/**
	 * YAHOO event cleanups the listeners only on page unload. However, if the page lives long
	 * enough the elements removed from document that have listener attached cause IE GC not free the
	 * memory. So we manually register each element with listener and then periodically check 
	 * whether the element is still in document. If it's not the element's listeners are removed.
	 */	
	var GarbageCollector = function(purgeInterval) 
	{
		this.elementsWithListeners = new Array();
		
		// temporary array of elements being processed during purge
		this.beingPurged = null;
		
		// count of purged elements (debug)
		this.purgedCount = 0;
		
		this.purgeInterval = purgeInterval;
		
		window.setInterval(bind(this.purgeInactiveListeners, this), purgeInterval);
	};

	GarbageCollector.prototype = 
	{
		// periodically called to initiate the purging process
		purgeInactiveListeners : function() 
		{		
			// if purge is in progress don't do anything
			if (this.beingPurged != null) 
			{
				return;
			}
			
			// the the elements
			this.beingPurged = this.elementsWithListeners;
			this.elementsWithListeners = new Array();
			
			log.trace("GarbageCollector", "Purge Begin");
			
			this.purgedCount = 0;
			
			// start the process
			this.purge();
		},
		
		purge: function() 
		{
			if (this.beingPurged != null)
			{
				var done = 0;
				
				// it is necessary to limit amount of items being purged in one go otherwise
				// IE will complain about script being slow
				var max = 50;
				
				var a = this.beingPurged;
				var i;
				for (i = 0; i < a.length && done < 50; ++i)
				{
					var e = a[i];
					if (e != null)
					{
						++done;
						if (!W.$$(e)) {
							E.purgeElement(e);
							++this.purgedCount;
						} else {
							// element is still in document, return it
							this.elementsWithListeners.push(e);
						}
						a[i] = null;
					}			
				}
								
				if (i == a.length)
				{
					// we are done with purging
					this.beingPurged = null;
					
					log.trace("GarbageCollector", "Purge End; purged: " + this.purgedCount + ", total: " + this.elementsWithListeners.length);
				}		
				else
				{
					// not yet done, continue after 50ms
					window.setTimeout(bind(this.purge, this), 50);
				}
			}
		}	
	}
	
	var garbageCollector = new GarbageCollector(5000);

	// We need to intercept addListener for current YUI instance as well as for all subsequent instances
	
	var oldAddListener = Y.Event.addListener;	
	/**
	 * Intercept the YAHOO.util.Event.addListener method and append the element
	 * to elementsWithListeners array so that we can purge it once it get removed from DOM;
	 */
	Y.Event.addListener = function(el)
	{		
		log.trace("Events", "Adding event listeners", arguments);
		oldAddListener.apply(this, arguments);
		if (el !== window && el !== document)
		{
			var a = garbageCollector.elementsWithListeners;
			a.push(W.$(el));			
		}
	};

	// This intercepts addListener in other YUI instances
	YUI.add("event-dom-fix", function(YY) 
	{	
		var oldAddListener = YY.Event.addListener;	
		/**
		 * Intercept the YAHOO.util.Event.addListener method and append the element
		 * to elementsWithListeners array so that we can purge it once it get removed from DOM;
		 */
		YY.Event.addListener = function(el)
		{		
			log.trace("Events", "Adding event listeners", arguments);
			oldAddListener.apply(this, arguments);
			if (el !== window && el !== document)
			{
				var a = garbageCollector.elementsWithListeners;
				a.push(W.$(el));			
			}
		};
	}, "1.0.0", { use: [ "event-dom" ] }
	);			
	
	
	Y.on("unload", function() { garbageCollector = null; }, window );
	
	/**
	 * Functions executor takes array of functions and executes them. Each function gets
	 * the notify object, which needs to be called for the next function to be executed.
	 * This way the functions can be executed synchronously. Each function has to call
	 * the notify object at some point, otherwise the functions after it wont be executed.
	 * After the FunctionExecutor is initialize, the start methods triggers the
	 * first function.
	 */
	var FunctionsExecutor = function(functions) 
	{
		this.functions = functions;
		this.current = 0;
		this.depth = 0; // we need to limit call stack depth
	}

	FunctionsExecutor.prototype = 
	{
		processNext: function() 
		{
			if (this.current < this.functions.length) 
			{
				var f = this.functions[this.current];
				var run = bind(function() 
				{
					var notify = bind(this.notify, this);
					try
					{
						f(notify);
					} 
					catch (ex)
					{
						log.error("FunctionExecutor", "Error execution function: ", f);
						notify();
					}
				}, this);
				this.current++;
							
				if (this.depth > 50 || UA.webkit) 
				{
					// to prevent khtml bug that crashes entire browser
					// or to prevent stack overflow (safari has small call stack)
					this.depth = 0;
					window.setTimeout(run, 1);
				}
				else 
				{
					this.depth ++;
					run();
				}				
			}
		},	
		
		start: function() 
		{
			this.processNext();
		},
		
		notify: function() 
		{
			this.processNext();
		}
	}

	var replaceOuterHtmlIE = function(element, text) 
	{						

		// replaces all <iframe references with <__WICKET_JS_REMOVE_X9F4A__iframe text
		var marker = "__WICKET_JS_REMOVE_X9F4A__"; 					
		function markIframe(text) {
			var t = text;
			var r = /<\s*iframe/i;
			while ((m = t.match(r)) != null) 
			{			
				t = replaceAll(t, m[0], "<" + marker + m[0].substring(1));            
			}
	        return t;
		}
		
		function removeIframeMark(text) 
		{
			return replaceAll(text, marker, "");
		}
								
		if (element.tagName == "SCRIPT") 
		{
			// we need to get the javascript content, so we create an invalid DOM structure,
			// (that is necessary for IE to let us see the innerHTML of the script tag	
			var tempDiv = document.createElement("div");
			tempDiv.innerHTML = "<table>" + text + "</table>";		
			var script = tempDiv.childNodes[0].childNodes[0].innerHTML;
			
			element.outerHtml = text;
			try 
			{
				eval(script);
			} 
			catch (e) 
			{
				log.error("ReplaceOuterHtml", "Error evaluation javascript: ", script, e);
			}
			return;
		}  
		
		var parent = element.parentNode;
		var tn = element.tagName;
					
						
		var tempDiv = document.createElement("div");
		var tempParent;
		
		// array for javascripts that were in the text
		var scripts = new Array();				
		
		if (window.parent == window || window.parent == null) 
		{
			document.body.appendChild(tempDiv);
		}
			
		if (tn != 'TBODY' && tn != 'TR' && tn != "TD" && tn != "THEAD" && tn != "TFOOT" && tn != "TH") 
		{		
			// in case the element is not any of these																									
							
			// this is not exactly nice, but we need to get invalid markup inside innerHTML,
			// because otherwise IE just swallows the <script> tags (sometimes)		
			tempDiv.innerHTML = '<table style="display:none">' + markIframe(text) + '</table>';
							
			// now copy the script tags to array (needed later for script execution)
			var s = tempDiv.getElementsByTagName("script");				
							
			for (var i = 0; i < s.length; ++i) 
			{			
				scripts.push(s[i]);
			}						
							
			// now use regular div so that we won't mess the DOM
			tempDiv.innerHTML = '<div style="display:none">' + text + '</div>'; 

			// set the outer <div> as parent
			tempParent = tempDiv.childNodes[0];
			
			tempParent.parentNode.removeChild(tempParent);								
							
		} 
		else 
		{		
			// same trick as with before, this time we need a div to to create invalid markup
			// (otherwise we wouldn't be able to get the script tags)
			tempDiv.innerHTML = '<div style="display:none">' + markIframe(text) + '</div>';
		
			// now copy the script tags to array (needed later for script execution)
			var s = tempDiv.getElementsByTagName("script");
							
			for (var i = 0; i < s.length; ++i) 
			{
				scripts.push(s[i]);
			}		
			
			// hack to get around the fact that IE doesn't allow to replace table elements
			tempDiv.innerHTML = '<table style="display: none">' + text + '</table>';
			
			// get the parent element of new elements
			tempParent = tempDiv.getElementsByTagName(tn).item(0).parentNode;					
		}	

		// place all newly created elements before the old element	
		while(tempParent.childNodes.length > 0) 
		{
			var tempElement = tempParent.childNodes[0];
			tempParent.removeChild(tempElement);
			parent.insertBefore(tempElement, element);
			tempElement = null;
		}

	    // remove the original element
		parent.removeChild(element);

		element.outerHTML = "";	
		element = "";
		
		if (window.parent == window || window.parent == null) 
		{
			document.body.removeChild(tempDiv);
		}	
		
		tempDiv.outerHTML = "";

		parent = null;
		tempDiv = null;
		tempParent = null;
	      		
		for (i = 0; i < scripts.length; ++i) 
		{
			addJavascripts(scripts[i], removeIframeMark); 
		}									
	}

	var replaceOuterHtmlSafari = function(element, text) 
	{
		// if we are replacing a single <script> element
		if (element.tagName == "SCRIPT") 
		{
			// create temporal div and add script as inner HTML		
			var tempDiv = document.createElement("div");
			tempDiv.innerHTML = text;

			// try to get script content
			var script = tempDiv.childNodes[0].innerHTML;
			if (typeof(script) != "string") 
			{
				script = tempDiv.childNodes[0].text;
			}
			
			element.outerHTML = text;
			try 
			{
				eval(script);
			} 
			catch (e) 
			{
				log.error("ReplaceOuterHtml", "Error evaluation javascript: ", script, e);
			}
			return;
		}
		var parent = element.parentNode;
		var next = element.nextSibling;
		
		var index = 0;
		while (parent.childNodes[index] != element) 
		{
			++index;
		}
		
		element.outerHTML = text;	
			
		element = parent.childNodes[index];	
		
		// go through newly added elements and try to find javascripts that 
		// need to be executed	
		while (element != next) 
		{
			try 			
			{
				addJavascripts(element);
			} 
			catch (ignore) 
			{
			}
			element = element.nextSibling;
		}	
	}

	/**
	 * A cross-browser method that replaces the markup of an element. The behavior
	 * is similar to calling element.outerHtml=text in internet explorer. However
	 * this method also takes care of executing javascripts within the markup on
	 * browsers that don't do that automatically.
	 * Also this method takes care of replacing table elements (tbody, tr, td, thead)
	 * on browsers where it's not supported when using outerHTML (IE).
	 */
	var replaceOuterHtml = function(element, text) 
	{	
		if (UA.ie) 
		{		
			replaceOuterHtmlIE(element, text);				
	    } 
		else if (UA.safari || UA.opera) 
		{
	    	replaceOuterHtmlSafari(element, text);    	
	    } 
		else /* GECKO */ 
		{
	    	// create range and fragment
	        var range = element.ownerDocument.createRange();
	        range.selectNode(element);
			var fragment = range.createContextualFragment(text);
			
	        element.parentNode.replaceChild(fragment, element);        
	    }		
	}	

	W.replaceOuterHtml = replaceOuterHtml;
	
	/*
	 * Throttler
	 */
	
	var ThrottlerEntry = function(func)
	{
		this.func = func;
	};
	
	/**
	 * Throttler is responsible for throttle down function execution to make sure that is not
	 * executed more often that the specified interval. Throttler can be used to reduce number
	 * of AJAX requests. To match function with previously executed functions a (string) token
	 * is used.
	 */
	var Throttler = function()
	{
		this.entries = { };
		this.executionTimes = { };
	};
	
	Throttler.prototype = 
	{
		/**
		 * Either execute the specified function immediately, or postpone the execution if function
		 * with same token has been invoked in time that is less than "millis" milliseconds from now.
		 * 
		 * @param token - string token to match previously executed function with the one specified now
		 * @param millis - how much to postpone the function after the last invocation
		 * @param func - function
		 * @param postponeTimerOnUpdate is an optional parameter. If it is set to true, then the timer is
	     *    reset each time the throttle function gets called. Use this behavior if you want something
	     *    to happen at X milliseconds after the *last* call to throttle.
	     *    If the parameter is not set, or set to false, then the timer is not reset.
	     *    This can be useful for throttling events based on keyboard input. The function can be called
	     *    for example 2 seconds after the last key stroke.
		 */
		throttle: function(token, millis, func, postponeTimerOnUpdate)
		{
			postponeTimerOnUpdate = postponeTimerOnUpdate || false;

			// check if throttling is necessary. thottling is always necessary when postponeTimerOnUpdate 
		    // is true
			if (!postponeTimerOnUpdate && this.checkLastExecutionTime(token, millis, func))
			{
				return;
			}
			var entry = this.entries[token];
			if (entry == null)
			{
				entry = new ThrottlerEntry(func);
				entry.timeout = window.setTimeout(bind(function() { this.execute(token) }, this), millis);
				this.entries[token] = entry;
				log.trace("Throttler", "Setting throttle, token:", token, ", millis:", millis, ", func:", func);
			}
			else
			{
				entry.func = func;
				if (postponeTimerOnUpdate)
				{
					window.clearTimeout(entry.timeout);
					entry.timeout = window.setTimeout(bind(this.execute, this), millis);
					log.trace("Throttler", "Postponing throttle, token:", token, ", millis:", millis, ", func:", func);
				}
				else
				{
					log.trace("Throttler", "Replacing throttle, token:", token, ", millis:", millis, ", func:", func);
				}
			}
		},
		
		// Checks if the function needs to be postponed. If not, executes it immediately and returns true.
		// Otherwise returns false.
		checkLastExecutionTime:function(token, millis, func)
		{
			var e = this.executionTimes[token];
			var now = new Date().getTime();
			if (e == null || (e + millis) < now)
			{
				log.trace("Throttler", "Executing function immediately, token:", token, ", millis:", millis, ", func:", func);
				this.executionTimes[token] = now;
				this.entries[token] = null;
				func();
				return true;
			}
			else
			{
				return false;
			}
		},
		
		execute: function(token)
		{			
			var entry = this.entries[token];
			if (entry != null)
			{				
				var f = entry.func;
				log.trace("Throttler", "Invoking throttled function, token:", token, "func:", f);
				this.entries[token] = null;
				this.executionTimes[token] = new Date().getTime();
				f();				
			}
		}
	};
	
	var isNonEmpty = function(string) 
	{
		return L.isString(string) && string.length > 0;
	}
	
	W.Throttler = Throttler;	
	
	/*
	 * Convenience URL methods
	 */
	var escapeParameter = function(text) 
	{
	    if (encodeURIComponent) 
	    {
	        return encodeURIComponent(text);
	    } else 
	    {
	        return escape(text);
	    }
	}	
	
	var mapToUrlParameters = function(map)
	{
		var res = "";
		var key;
		for (key in map)
		{
			var value = map[key];
			if (L.isString(value) || L.isNumber(value))
			{
				if (res.length > 0)
				{
					res += "&";
				}
				res += escapeParameter(key);
				res += "=";
				res += escapeParameter(value);
			}
			else if (L.isArray(value))
			{
				for (var i = 0; i < value.length; ++i)
				{
					var v = value[i];
					if (L.isString(v) || L.isNumber(v))
					{
						if (res.length > 0)
						{
							res += "&";
						}
						res += escapeParameter(key);
						res += "=";
						res += escapeParameter(v);
					}
				}
			}
		}
		return res;
	}
		
	var appendMap = function(target, map)
	{
		var append = function(key, value)
		{
			var oldValue = target[key];
			if (oldValue == null)
			{
				target[key] = value;
			}
			else if (L.isArray(oldValue))
			{
				oldValue.push(value);
			}
			else
			{
				target[key] = [ oldValue, value];
			}				
		}
		
		var key;
		for (key in map)
		{
			var value = map[key];
			
			if (L.isArray(value))
			{
				for (var i = 0; i < value.length; ++i)
				{
					var v = value[i];
					append(key, v);
				}
			}
			else
			{
				append(key, value);
			}			
		}
	}
	
	// Method for serializing DOM nodes to string
	// original taken from Tacos (http://tacoscomponents.jot.com)
	var serializeNodeChildren = function(node) 
	{
		if (node == null) 
		{ 
			return "" 
		}
		var result = "";
		
		for (var i = 0; i < node.childNodes.length; i++) 
		{
			var thisNode = node.childNodes[i];
			switch (thisNode.nodeType) 
			{
				case 1: // ELEMENT_NODE
				case 5: // ENTITY_REFERENCE_NODE
					result += serializeNode(thisNode);
					break;
				case 8: // COMMENT
					result += "<!--" + thisNode.nodeValue + "-->";
					break;
				case 4: // CDATA_SECTION_NODE
					result += "<![CDATA[" + thisNode.nodeValue + "]]>";
					break;				
				case 3: // TEXT_NODE
				case 2: // ATTRIBUTE_NODE
					result += thisNode.nodeValue;
					break;
				default:
					break;
			}
		}
		return result;	
	}


	var serializeNode = function(node)
	{
		if (node == null) 
		{ 
			return "" 
		}
		var result = "";
		result += '<' + node.nodeName;
		
		if (node.attributes && node.attributes.length > 0) 
		{				
			for (var i = 0; i < node.attributes.length; i++) 
			{
				result += " " + node.attributes[i].name 
					+ "=\"" + node.attributes[i].value + "\"";	
			}
		}
		
		result += '>';
		result += serializeNodeChildren(node);
		result += '</' + node.nodeName + '>';
		return result;
	}

	
	/**
	 * Adds a stylesheet definition to document.
	 */
	var addStyle = function(style) 
	{
		if (W.Y.UA.ie)
		{
			try 
			{
				// workaround to get over the limit of 31 definitions in IE				
				var last = document.styleSheets.length - 1;
				if (last > 0 && document.styleSheets[last].cssText.length < 30000)
				{
					document.styleSheets[last].cssText = document.styleSheets[last].cssText + style;
				}
				else
				{
					document.createStyleSheet().cssText = style;
				}
			} 
			catch(e) 
			{
				try 
				{
					document.createStyleSheet().cssText = style;
				} 
				catch (e) 
				{
					try 
					{
						var last = document.styleSheets.length - 1;
						document.styleSheets[last].cssText = document.styleSheets[last].cssText + style;
					} 
					catch (error) 
					{
						log.error("Contribution", "Error adding stylesheet definiton.");
					}
				}				
			}			
		}
		else
		{			
			var head = document.getElementsByTagName("head")[0];

			var node = document.createElement("style");
			node.setAttribute("type", "text/css");

			var content = document.createTextNode(style);
			node.appendChild(content);
			head.appendChild(node);
		}
	}
	
	/**
	 * Loads remote stylesheet file. 
	 * Note that the CSS file must come from same origin as the page, unlike
	 * loadJavascript.
	 */
	var loadStylesheet = function(url, notify)
	{
		var failureHandler = function() 
		{
			log.error("Contribution", "Error loading stylesheet from ", url);
			notify();
		};
		
		var successHandler = function(response)
		{
			try 
			{				
				addStyle(response.responseText);
			} 
			catch (exception)
			{
				log.error("Contribution", "Error adding stylesheet from ", url);
			}
			notify();
		};
		
		// load the file using Ajax
		// there are two reasons why yui-get can't be used to load stylesheets
		//  1. lack of proper onload notification in FF
		//  2. bug in IE that limits maximal number of CSS definitons to 31
		
		var cfg = 
		{
			method: "get",
			on: 
			{
				success: successHandler,
				failure: failureHandler,
				abourt: abortHandler
			}			
		}
		
		log.debug("Contribution", "Loading stylesheet resource ", url);
		
		Y.io(url, cfg);
	}
	
	/**
	 * Loads and executes remote javascript file. The file may come from
	 * different origin than the page.
	 */
	var loadJavascript = function(url, notify)
	{
		var failureHandler = function() 
		{
			log.error("Contribution", "Error loading javascript from ", url);
			notify();
		};
		
		var successHandler = function()
		{
			notify();
		};
		
		var cfg =
		{
			onSuccess: successHandler,
			onFailure: failureHandler,
			onTimeout: failureHandler
		};
		
		Y.Get.script(url, cfg);
	}
	
	var contributed = null;
	
	var getContributed = function() 
	{
		if (contributed == null)
		{
			contributed = {
				urls: {},
				ids: {}
			};
			
			Y.all("script").each(function(node)
			{
				var src = node.getAttribute("src");
				if (L.isString(src))
				{
					contributed.urls[src] = true;
				}
			});
			
			Y.all("link").each(function(node)
			{
				var href = node.getAttribute("href");
				if (L.isString(href))
				{
					contributed.urls[href] = true;
				}
			});
		}
		return contributed;
	}
	
	W.getContributed = function() 
	{
		return getContributed();		
	}
	
	var isContributed = function(id, url)
	{
		if (L.isString(id) && (Wicket.$(id) != null || getContributed().ids[id] == true))
		{
			return true;
		}
		else if (L.isString(url) && getContributed().urls[url] == true)
		{
			return true;
		}
		else
		{
			return false;
		}
	}
	
	var markContributed = function(id, url)
	{
		if (L.isString(id))
		{
			getContributed().ids[id] = true;
		}
		if (L.isString(url))
		{
			getContributed().urls[url] = true;
		}
	}
	
	var contributeElement = function(element, notify)
	{		
		try 
		{
			log.trace("Contribution", "Begin element contribution:", element);
			var tagName = element.tagName.toLowerCase();
			if (tagName != "script" && tagName != "link" && tagName != "style")
			{
				log.error("Contribution", "Unknown element to contribute:", element);
				notify();
				return;
			}
			var id = element.getAttribute("id");
			var url = null;
			if (tagName == "script")
			{
				url = element.getAttribute("src");
			}
			else if (tagName == "link")
			{
				url = element.getAttribute("href");
			}
			
			log.trace("Contribution", "TagName:", tagName, "url:", url, "id:", id);
			
			if (!isContribute(id, url))
			{
				markContributed(id, url);
				if (tagName == "script")
				{
					if (url != null)
					{
						log.trace("Contribution", "Loading javascript:", url);
						loadJavascipt(url, notify);
					}
					else
					{
						var body = serializeNodeChildren(element);
						if (body == null || body == "")
							body = element.text;
						
						log.trace("Contribution", "Evaluating javascript:", body);
						
						eval(body);
					}
				}
				else if (tagName == "link")
				{
					log.trace("Contribution", "Loading stylesheet:", url);
					loadStylesheet(url, notify);
				}
				else 
				{
					var body = serializeNodeChidren(element);
					if (body == null || body == "")
						body = element.text;
					
					log.trace("Contribution", "Adding stylesheet: ", body);
					
					addStyle(body);
				}
			}
			else
			{
				log.trace("Contribution", "Skipped - element already contributed.");
			}
		} 
		catch (e) 
		{
			log.error("Contribution", "Error contributing element:", element);
			notify();
		}
	}
	
	// Goes through all script elements contained by the element and add them to head
	var addJavascripts = function(element, contentFilter) 
	{	
		var notify = function() 
		{
		}
		
		var add = function(element) 
		{
			var src = element.getAttribute("src");
			
			// if it is a reference, just add it to head				
			if (L.isString(src)) 
			{
				contributeElement(element, nofiy);
			} 
			else 
			{	
				var content = Wicket.DOM.serializeNodeChildren(element);		
				if (content == null || content == "")
					content = element.text;
				
				if (L.isFunction(contentFilter)) 
				{
					content = contentFilter(content);
				}
				
				var id = element.getAttribute(id);
				if (L.isString(id))
				{
					markContributed(id, null);
				}
					
				try 
				{
					eval(content);
				}
				catch (exception)
				{
					log.error("Contribution", "Error evaluating javascript ", content);
				}
			}		
		}
		
		if (typeof(element) != "undefined" &&
		    typeof(element.tagName) != "undefined" &&
		    element.tagName.toLowerCase() == "script") 
		{
			add(element);
		} 
		else 
		{
			// we need to check if there are any children, because Safari
			// aborts when the element is a text node			
			if (element.childNodes.length > 0) 
			{				
				var scripts = element.getElementsByTagName("script");
				for (var i = 0; i < scripts.length; ++i) 
				{
					add(scripts[i]);
				}
			}
		}
	}
	
	/*
	 * AJAX
	 */
	
	/**
	 * An item in a RequestQueue. Item constructor get a map of configuration attributes. Each attribute 
	 * can be either specified by a full name or by a shortcut.   
	 * 
	 * Possible attributes:
	 * 
	 *   SHORTCUT, NAME            TYPE       DESCRIPTION
	 *   
	 *   c, component            - Element    Component responsible for the AJAX request or null           
	 *                                        when the component is a page. If there is no DOM element 
	 *                                        for the component the attribute can contain a string 
	 *                                        (Component#getMarkupId()). The string is then used to find
	 *                                        the matching component on the server side.
	 *                                        
	 *                                        The element is also used as precondition. The element must 
	 *                                        be part of the DOM tree otherwise the item will be ignored.
	 *                                         
	 *   f, formId               - String     Form ID if the AJAX request should submit a form or null
	 *                                        if the request doesn't involve form submission
	 *                                        
	 *   m, multipart	         - Boolean    (only when formId is not null) True if the form submit should
	 *                                        be multipart, false otherwise. Note that for multipart AJAX 
	 *                                        requests a hidden IFRAME will be used and that can have 
	 *                                        negative impact on error detection.
	 *                                        (doesn't work with current YUI 3 PR1 release)
	 *                                         
	 *   t, requestTimeout       - Integer    Timeout in milliseconds for the AJAX request. This only 
	 *                                        involves the actual communication and not the processing 
	 *                                        afterwards. Can be null in which case the default request
	 *                                        timeout will be used.
	 *                                        
	 *   pt, processingTimeout   - Integer    Timeout for the response processing. In case the response
	 *                                        processing takes more than the timeout it won't block the
	 *                                        request queue. Can be null in which case the default processing
	 *                                        timeout will be used.
	 *          
	 *   p, pageId               - String     Used to identify the originating page. String in form of
	 *                                        <pageId>:<pageVersion>
	 *          
	 *   l, listenerInterface    - String     Listener interface name that will be used when building
	 *                                        the URL. Can be null if a behavior should be invoked. 
	 *                                        
	 *   b, behaviorIndex        - Integer    Index of behavior that should be invoked on the component
	 *                                        in case the listenerInterface is null
	 *                                        
	 *   t, token                - String     Optional string identifying related items in request queue. 
	 *                                        Used to identify previous items (items with same token) that 
	 *                                        will be removed when this item is added and removePrevious 
	 *                                        is true. Also required when throttle attribute is used.
	 *        
	 *   r, removePrevious       - Boolean    Optional. If there are previous items with same token in the 
	 *                                        queue they will be removed if removePrevious is true. This 
	 *                                        can be useful when the items are added in queue faster
	 *                                        than they are processed and only the latest request matters.
	 *                                        An example of this could be periodically updated component.
	 *                                        There is no point of having multiple refreshing requests
	 *                                        stored in the queue for such component because only the
	 *                                        last request is relevant. Alternative to this is the
	 *                                        throttle attribute.  
	 *   
	 *   th, throttle            - Integer    Optional. Limits adding items with same token to at most one 
	 *                                        item per n milliseconds where n is the value of throttle 
	 *                                        attribute. Useful to limit the number of AJAX requests that 
	 *                                        are triggered by a user action such as typing into a text 
	 *                                        field. 
	 *                                        Throttle attribute only applies when token is specified.   
	 *                                        
	 *   thp, throttlePostpone   - Boolean    Optional. Only applicable when throttle attribute is set.
	 *                                        Defaults to false. Causes the throttle timer reset each time
	 *                                        item with same token is being added to queue. 
	 *                                        Example: Event is fired by user typing in a textfield. 
	 *                                        Throttle value is 2000 (ms), throttle postpone is true.
	 *                                        The event will be fired 2000ms after user typed the last 
	 *                                        character. 
	 *                                        If throttle postpone is false, The event is fired immediately 
	 *                                        after user starts typing and then every two seconds as long
	 *                                        as user keeps typing.
	 *   
	 *   pr, preconditions       - Method(s)  Optional. Method or array of methods that is/are invoked 
	 *                                        before the request executes. The method(s) will get this 
	 *                                        RequestQueueItem passed as fist argument and have to return 
	 *                                        a boolean value. If any of these methods returns false the 
	 *                                        request is canceled.
	 *                                        
	 *   be, beforeHandlers      - Method(s)  Optional. Method or array of methods that is/are invoked
	 *                                        before the actual AJAX request. This invocation only 
	 *                                        happens when all precondition methods return true.  
	 *                                        
	 *   s, successHandlers      - Method(s)  Optional. Method or array of methods that is/are invoked 
	 *                                        after the request is successfully processed. The method(s) 
	 *                                        will get this RequestQueueItem passed as fist argument.  
	 *                                        
	 *   e, errorHandlers        - Method(s)  Optional. Method or array of methods that is/are invoked when 
	 *                                        an error happens during the AJAX request or the processing 
	 *                                        afterwards, or when some of the timeouts is exceeded. The 
	 *                                        method(s) will get this RequestQueueItem passed as fist 
	 *                                        argument. If possible error message will be second argument 
	 *                                        passed to the handlers. 
	 *                                        	                                         
     *   u, urlArguments        - Object      Optional. Map that contains additional URL arguments. These 
     *                                        will be appended to the URL. This is simpler alternative to 
     *                                        urlArgumentMethods.
     *                                        
     *   ua, urlArgumentMethods - Method(s)  Optional. Method or array of methods that produce additional 
     *                                       URL arguments. Each of the methods will get this 
     *                                       RequestQueueItem passed and must return a 
     *                                       Map<String, String> (Object).
	 */
	var RequestQueueItem = function(attributes)
	{
		var a = attributes;
		var b = function(value) 
		{
			if (value) 
				return true;
			else
				return false;
		}
		var createMethodArray = function(methodOrArray) 
		{			
			if (L.isFunction(methodOrArray))
				return [methodOrArray];
			else if (L.isArray(methodOrArray))
				return methodOrArray;
			else {				
				return [];
			}
		}
		var m = function(m1, m2)
		{
			m1 = createMethodArray(m1);
			m2 = createMethodArray(m2);
			return m1.concat(m2);
		}
		var gs = W.ajax.globalSettings;
		
		this.attributes  = 
		{
			component:            a.component          || a.c    || null,
			formId:               a.formId             || a.f    || null,
			multipart:          b(a.multipart          || a.m),
			requestTimeout:       a.requestTimeout     || a.t    || gs.defaultRequestTimeout,
			processingTimeout:    a.processingTimeout  || a.pt   || gs.defaultProcessingTimeout,
			pageId:               a.pageId             || a.p    || gs.defaultPageId,
			listenerInterface:    a.listenerInterface  || a.l    || null,
			behaviorIndex:        a.behaviorIndex      || a.b,
			token:                a.token              || a.t    || gs.defaultToken,			
			removePrevious:     b(a.removePrevious     || a.r    || gs.defaultRemovePrevious),
			throttle:             a.throttle           || a.th   || null,
			throttlePostpone:   b(a.throttlePostpone   || a.thp),
			preconditions:      m(a.preconditions      || a.pr,  gs.preconditions),
			beforeHandlers:     m(a.beforeHandlers     || a.be,  gs.beforeHandlers),
			successHandlers:    m(a.successHandlers    || a.s,   gs.successHandlers),
			errorHandlers:      m(a.errorHandlers      || a.e,   gs.errorHandlers),
			urlArguments:         a.urlArguments       || a.u    || null,
			urlArgumentMethods: m(a.urlArgumentMethods || a.ua,  gs.urlArgumentMethods)
		}
		
		log.trace("RequestQueue", "Creating New Item", this.attributes);
	}
	
	RequestQueueItem.prototype = 
	{
		checkPreconditions: function() 
		{			
			var res = iterateArray(this.attributes.preconditions, bind(function(precondition) 
			{
				try 
				{					
					if (precondition(this) == false)
					{
						log.debug("RequestQueue", "Precondition failed - skiping item; Item: ", this, " Precondition: ", precondition);
						return false;
					}
				} 
				catch (exception) 
				{
					log.error("RequestQueue", "Error evaluating precondition ", precondition, "Exception: ", exception);
					return false;
				}
			}, this));
			if (res == null)
			{
				return true;
			}
			else
			{
				return false;
			}
		},
		
		invokeBeforeHandlers: function()
		{
			iterateArray(this.attributes.beforeHandlers, bind(function(handler) 
			{
				try
				{
					handler(this);
				}
				catch (exception)
				{
					log.error("RequestQueue", "Error invoking before handler ", handler, "Exception: ", exception);
				}
			}, this));
		},
		
		invokeSuccessHandlers: function()
		{
			iterateArray(this.attributes.successHandlers, bind(function(handler) 
			{
				try
				{
					handler(this);
				}
				catch (exception)
				{
					log.error("RequestQueue", "Error invoking success handler ", handler, "Exception: ", exception);
				}
			}, this));
		},
		
		invokeErrorHandlers: function(error)
		{
			iterateArray(this.attributes.errorHandlers, bind(function(handler) 
			{
				try
				{
					handler(this, error);
				}
				catch (exception)
				{
					log.error("RequestQueue", "Error invoking error handler ", handler, "Exception: ", exception);
				}
			}, this));
		},
		
		success: function()
		{
			if (this.next != null)
			{
				this.invokeSuccessHandlers();				
				this.next();
				this.next = null;
			}
		},
		
		failure: function(msg)
		{
			if (this.next != null)
			{
				this.invokeErrorHandlers(msg);				
				this.next();
				this.next = null;
			}
		},
		
		defaultUrlParameters: function()
		{
			var a = this.attributes;
			var componentId = (a.component == null) ? null : (W.$(a.component).getAttribute("id"));
			var res = {};
			var gs = W.ajax.globalSettings;
			res[gs.urlParamComponentId] = componentId;
			res[gs.urlParamPageId] = a.pageId;
			res[gs.urlParamFormId] = a.formId;
			res[gs.urlParamListenerInterface] = a.listenerInterface;
			res[gs.urlParamBehaviorIndex] = a.behaviorIndex;
			return res;
		},
		
		buildUrl: function() 
		{
			var url = W.ajax.globalSettings.urlPrefix;
			var a = this.attributes;
			
			var params = new Object();
			
			if (a.urlArguments != null)
			{				
				appendMap(params, a.urlArguments);
			}
			for (var i = 0; i < a.urlArgumentMethods.length; ++i)
			{
				var m = a.urlArgumentMethods[i](this);
				if (L.isObject(m))
				{
					appendMap(params, m);
				}
			}
			
			appendMap(params, this.defaultUrlParameters());
			
			var paramsString = mapToUrlParameters(params); 
			
			if (paramsString.length > 0)
			{
				url += "?";
				url += paramsString;
			}
			
			return url;
		},
		
		processResponse: function(response)
		{
		},
		
		onSuccess: function(transactionId, responseObject)
		{
			log.debug("RequestQueue", "Request successful - TransactionId: ", transactionId, " Response: ", responseObject, "Item: ", this);
			try {
				// skip the if (false) prefix
				var responseText = responseObject.responseText.substring(10);
				var response = eval(responseText);
				log.debug("RequestQueue", "Response parsed: ", response);
				
				alert(response.header);
				
			} catch (exception) {
				log.error("RequestQueue","Error parsing or processing response.");
				this.failure(exception);
			}
			
		},
		
		onFailure: function(transactionId, responseObject)
		{
			log.debug("RequestQueue", "Request failed - TransactionId: ", transactionId, " Response: ", responseObject, "Item: ", this);
			this.failure();
		},
		
		getRequestCfg: function(url) {
			var a = this.attributes;
			var m = a.formId != null ? "POST" : "GET";
			var f = a.formId != null ? { id:a.formId } : null;
			var res = 
			{
				method: m,
				on: 
				{
					success: bind(this.onSuccess, this),
					failure: bind(this.onFailure, this),
					abort: bind(this.onFailure, this)
				},
				form: f,
				timeout: a.requestTimeout				
			};
			return res;
		},
		
		execute: function(next)
		{
			this.invokeBeforeHandlers();			
			this.next = next;

			var url = this.buildUrl();
			var cfg = this.getRequestCfg(url);
			
			log.debug("RequestQueue", "Initiating AJAX Request on ", url, " with configuration ", cfg);
			
			var request = Y.io(url, cfg);
			
			log.trace("RequestQueue", "Obtained request object ", request);
			
			this.success();
		}
	};
	
	var RequestQueue = function()
	{
		this.queue = new Array();
		this.throttler = new Throttler();
	};
	
	RequestQueue.prototype = 
	{
		addInternal: function(item) 
		{			
			var execute = this.queue.length == 0;
		
			var a = item.attributes;
			if (a.removePrevious) 
			{
				if (!isNonEmpty(a.token)) 
				{
					log.warn("RequestQueue", "Item ", item, " has removePrevious set but no token specified - ignored");
				} 
				else 
				{
					this.removeByToken(a.token);
				}
			}
			this.queue.push(item);
			
			if (execute) 
			{
				this.next();
			}
		},
		
		removeByToken: function(token) 
		{
			if (token != null) 
			{
				for (var i = 0; i < this.queue.length; ++i) 
				{
					var item = this.queue[i];
					if (item.attributes.token == token) 
					{
						this.queue[i] = null;
					}
				}
				var q = this.queue;
				this.queue = new Array();
				for (var i = 0; i < q.length; ++i) 
				{
					if (q[i] != null) 
					{
						this.queue.push(q[i]);
					}
				}
			}
		},
		
		add: function(item) 
		{
			if (item == null) 
			{
				log.error("RequestQueue", "Argument 'item' must not be null.");
				return;
			}
			else if (item.attributes == null) 
			{
				log.error("RequestQueue", "Item ", item, " must contain attributes.");
				return;
			}
			var a = item.attributes;			
			if (a.throttlePostpone == true && a.throttle == null) 
			{
				log.warn("RequestQueue", "Item ", item, " has throttlePostpone set but no throttle specified - ignored.");
			} 
			else if (a.throttle != null && !isNonEmpty(a.token)) 
			{
				log.warn("RequestQueue", "Item ", item, " has throttle set but no token specified - ignored.");
			}
			else if (a.throttle != null) 
			{
				var f = bind(function() { this.addInternal(item);}, this);
				this.throttler.throttle(a.token, a.throttle, f, a.throttlePostpone);
				return;
			}
			this.addInternal(item);				
		},
		
		nextInternal: function() 
		{
			this.currentItem = null;
			
			if (this.queue.length > 0)
			{
				var i = this.queue.shift();
				
				if (i.checkPreconditions())
				{
					this.currentItem = i;
					var s = bind(function() { this.skip(i); }, this);
					var a = i.attributes;
					var t = a.requestTimeout + a.processingTimeout + 1000;
					
					// failsafe timeout, in case the request queue item fails to call next() 
					window.setTimeout(s, t);
					
					var next = bind(this.next, this);
					i.execute(next);
				}
				else
				{
					this.next();
				}
			}
		},		
		
		next: function() 
		{		
			window.setTimeout(bind(this.nextInternal, this), 0);
		},
		
		skip: function(item) 
		{
			if (this.currentItem == item)
			{
				log.error("RequestQueue", "Timeout exceeded, skipping item", item);
				this.currentItem = null;
				this.next();
			}
		}	
		
	};
	
	var defaultPrecondition = function(item)
	{
		var a = item.attributes;		
		if (a.component != null)
		{			
			if (!W.$$(a.component))
			{				
				log.debug("RequestQueue", "Component ", a.component, " no longer in document, skipping item.");
				return false;
			}			
		}
		if (a.formId != null)
		{
			if (!W.$$(a.formId))
			{
				log.debug("RequestQueue", "Form ", a.formId, " no longer in document, skipping item.");
				return false;
			}
		}
		return true;
	};
	
	var reqCount = 0;
	
	var timestampArgumentMethod = function(item)
	{
		var stamp = "" + (reqCount ++) + (Math.ceil(Math.random() * 10000));
		var res = {};
		res[W.ajax.globalSettings.urlParamTimestamp] = stamp;
		return res; 
	}
	
	var globalSettings = 
	{
		defaultRequestTimeout: 60000,
		defaultProcessingTimeout: 60000,
		defaultPageId: -1,
		defaultToken: null,
		defaultRemovePrevious: false,
		beforeHandlers: [],
		preconditions: [defaultPrecondition],
		successHandlers: [],
		errorHandlers: [],
		urlPostProcessors: [],
		urlArgumentMethods: [ timestampArgumentMethod ],
		urlPrefix: "INVALID_URL_PREFIX",
		urlParamComponentId: "INVALID_COMPONENT_ID_PARAM",
		urlParamTimestamp: "INVALID_TIMESTAMP_PARAM",
		urlParamPageId: "INVALID_PAGE_ID_PARAM",
		urlParamFormId: "INVALID_FORM_ID_PARAM",
		urlParamListenerInterface: "INVALID_LISTENER_INTERFACE_PARAM",
		urlParamBehaviorIndex: "INVALID_BEHAVIOR_INDEX_PARAM"
	};
	
	var Ajax = function() 
	{
		this.globalSettings = globalSettings;
		this.requestQueue = new RequestQueue();
	};
	
	Ajax.prototype = 
	{
		
	};
	
	W.ajax = new Ajax();

	W.e = function(event, attributes)
	{
		var element;
		if (attributes.c == null)
		{
			element = window;
		}
		else
		{
			element = W.$(attributes.c);
		}		
		Y.on(event, function(event) 
		{			
			var item = new RequestQueueItem(attributes);
			item.event = event;
			W.ajax.requestQueue.add(item);
		}, element);
		element = null;
	}
		
	window.W = W;
	
});

})();