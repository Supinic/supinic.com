const Express = require("express");
const Router = Express.Router();

const Poll = require("../../../modules/chat-data/poll.js");
const WebUtils = require("../../../utils/webutils.js");

module.exports = (function () {
	"use strict";

	/**
	 * @api {get} /bot/poll/list Poll - List
	 * @apiName GetPolLList
	 * @apiDescription Gets the entire list of all polls
	 * @apiGroup Bot
	 * @apiPermission none
	 * @apiSuccess {Object[]} poll
	 * @apiSuccess {number} poll.ID
	 * @apiSuccess {string} poll.text Full poll description as it is presented
	 * @apiSuccess {date} poll.created
	 * @apiSuccess {date} poll.started
	 * @apiSuccess {date} poll.ended
	 * @apiSuccess {Object} poll.votes
	 * @apiSuccess {boolean} poll.votes.hidden If the votes results are hidden for any reason, this is true
	 * @apiSuccess {string} [poll.votes.reason] If votes are hidden, this is the reason
	 * @apiSuccess {Object} poll.votes.results
	 * @apiSuccess {Object} [poll.votes.results.yes] Amount of "yes" votes, if not hidden
	 * @apiSuccess {Object} [poll.votes.results.no] Amount of "no" votes, if not hidden
	 */
	Router.get("/list", async (req, res) => {
		const [pollData, voteData] = await Promise.all([
			Poll.selectAll(),
			Poll.getVotes()
		]);

		const data = pollData.map(i => {
			const votesData = {};
			if (i.End && sb.Date.now() > i.End) {
				votesData.hidden = false;
				votesData.results = voteData[i.ID] ?? { yes: 0, no: 0 };
			}
			else {
				votesData.hidden = true;
				votesData.results = {};
				votesData.reason = "Votes are hidden because the poll has not ended yet";
			}

			return {
				ID: i.ID,
				Text: i.Text,
				Created: i.Created,
				Started: i.Start,
				Ended: i.End,
				Votes: votesData
			};
		});

		return WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
