module.exports = (function () {
	"use strict";

	// const Result = require("../result.js");
	const TemplateModule = require("../template.js");

	class VideoType extends TemplateModule {
		static get name () { return "video-type"; }
		static get database () { return "data"; }
		static get table () { return "Video_Type"; }
	}

	return VideoType;
})();