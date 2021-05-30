module.exports = (function () {
	class Poll extends require("../template.js") {
		static async getVotes () {
			const votes = await sb.Query.getRecordset(rs => rs
				.select("Poll", "Vote AS Type")
				.from("chat_data", "Poll_Vote")
			);

			const data = {};
			for (const vote of votes) {
				if (!data[vote.Poll]) {
					data[vote.Poll] = { yes: 0, no: 0 };
				}

				data[vote.Poll][vote.Type.toLowerCase()]++;
			}

			return data;
		}

		static get name () { return "Poll"; }
		static get database () { return "chat_data"; }
		static get table () { return "Poll"; }
	}

	return Poll;
})();
