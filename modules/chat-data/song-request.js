module.exports = (function () {
	const TemplateModule = require("../template.js");

	class SongRequest extends TemplateModule {
		static get statuses () {
			return ["Current", "Inactive", "Queued"];
		}

		static get name () { return "song-request"; }
		static get database () { return "chat_data"; }
		static get table () { return "Song_Request"; }
	}

	return SongRequest;
})();