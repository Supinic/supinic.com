module.exports = (function () {
	class VideoRequest extends require("../template.js") {
		static get name () { return "Video_Request"; }
		static get database () { return "cytube"; }
		static get table () { return "Video_Request"; }
	}

	return VideoRequest;
})();
