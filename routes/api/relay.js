module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const LinkRelay = require("../../modules/internal/relay.js");

	Router.post("/", async (req, res) => {
		const { url } = req.body;
		if (!url) {
			return sb.WebUtils.apiFail(res, 404, "No URL provided");
		}
		else if (!url.startsWith("/")) {
			return sb.WebUtils.apiFail(res, 400, "URL must being with a single slash");
		}

		const crypto = require("crypto");
		const hash = crypto.createHash("md4");

		const digest = hash.update(url).digest();
		const exists = await LinkRelay.selectSingleCustom(q => q.where("Hash = %s", digest));
		if (exists) {
			return sb.WebUtils.apiSuccess(res, {
				created: false,
				identifier: digest,
				link: "https://supinic.com/relay/" + digest
			});
		}

		const row = await LinkRelay.insert({
			Hash: digest,
			Link: url,
			Type: "Local"
		});

		return sb.WebUtils.apiSuccess(res, {
			created: true,
			identifier: digest,
			link: "https://supinic.com/relay/" + digest
		});
	});

	Router.get("/:digest", async (req, res) => {
		const { digest } = req.params;
		const relay = await LinkRelay.selectSingleCustom(q => q.where("Hash = %s", digest));
		if (!relay) {
			return sb.WebUtils.apiFail(res, 404, "No such relay exists");
		}

		return sb.WebUtils.apiSuccess(res, {
			hash: relay.Hash,
			link: relay.Link,
			type: relay.Type,
			created: relay.Created.valueOf()
		});
	});

	return Router;
})();