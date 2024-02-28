module.exports = (function () {
	"use strict";

	const TemplateModule = require("../template.js");

	class EventSubscription extends TemplateModule {
		static get name () { return "event-subscription"; }
		static get database () { return "data"; }
		static get table () { return "Event_Subscription"; }
	}

	return EventSubscription;
})();
