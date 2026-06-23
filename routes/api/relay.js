const { z } = require("zod");
const Express = require("express");
const Router = Express.Router();

const LinkRelay = require("../../modules/internal/relay.js");
const WebUtils = require("../../utils/webutils.js");

const relayBodySchema = z.object({
	body: z.object({
		url: z.string().startsWith("/")
	})
});

module.exports = (function () {
	"use strict";

	Router.post("/", async (req, res) => {
		const parseResult = relayBodySchema.safeParse(req);
		if (!parseResult.success) {
			return WebUtils.apiFail(res, 400, "Body validation error", {
				validation: parseResult.error
			});
		}

		const { url } = parseResult.data.body;
		if (!url) {
			return WebUtils.apiFail(res, 404, "No URL provided");
		}
		else if (!url.startsWith("/")) {
			return WebUtils.apiFail(res, 400, "URL must start with a single slash");
		}

		const crypto = require("node:crypto");
		const hash = crypto.createHash("md5");

		const digest = hash
			.update(url)
			.digest()
			.toString("base64")
			.replaceAll("+", "_")
			.replaceAll("\\", "-")
			.slice(0, 8);

		const exists = await LinkRelay.selectSingleCustom(q => q.where("Hash = %s", digest));
		if (exists) {
			return WebUtils.apiSuccess(res, {
				created: false,
				identifier: digest,
				link: `https://supinic.com/relay/${digest}`
			});
		}

		await LinkRelay.insert({
			Hash: digest,
			Link: url,
			Type: "Local"
		});

		return WebUtils.apiSuccess(res, {
			created: true,
			identifier: digest,
			link: `https://supinic.com/relay/${digest}`
		});
	});

	Router.get("/:digest", async (req, res) => {
		const { digest } = req.params;
		const relay = await LinkRelay.selectSingleCustom(q => q.where("Hash = %s", digest));
		if (!relay) {
			return WebUtils.apiFail(res, 404, "No such relay exists");
		}

		return WebUtils.apiSuccess(res, {
			hash: relay.Hash,
			link: relay.Link,
			type: relay.Type,
			created: relay.Created.valueOf()
		});
	});

	return Router;
})();
