const Express = require("express");
const Router = Express.Router();
const WebUtils = require("../../utils/webutils.js");

const timelineUrls = {
	regular: "UserTweets",
	replies: "UserTweetsAndReplies"
};

const defaults = {
	csrfToken: "2a5b3ceebc9bac4b4abafe716185b2ef",
	bearerToken: "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
	slugs: {
		// Different slug when logged in than when logged out (!)
		// Also, requires the freedom_of_speech_not_reach_appeal_label_enabled feature to be set (!!)
		timeline: "oPHs3ydu7ZOOy2f02soaPA",
		timelineReplies: "nrdle2catTyGnTyj1Qa7wA",
		user: "hVhfo_TquFTmgL7gYwf91Q"
	},
	user: {
		variables: {
			withSafetyModeUserFields: true,
			withSuperFollowsUserFields: true
		},
		features: {
			responsive_web_twitter_blue_verified_badge_is_enabled: true,
			verified_phone_label_enabled: false,
			responsive_web_graphql_timeline_navigation_enabled: true
		}
	},
	timeline: {
		regular: {
			variables: {
				count: 100,
				includePromotedContent: true,
				withQuickPromoteEligibilityTweetFields: true,
				withSuperFollowsUserFields: true,
				withDownvotePerspective: false,
				withReactionsMetadata: false,
				withReactionsPerspective: false,
				withSuperFollowsTweetFields: true,
				withVoice: true,
				withV2Timeline: true
			},
			features: {
				responsive_web_twitter_blue_verified_badge_is_enabled: true,
				verified_phone_label_enabled: false,
				responsive_web_graphql_timeline_navigation_enabled: true,
				longform_notetweets_consumption_enabled: true,
				tweetypie_unmention_optimization_enabled: true,
				vibe_api_enabled: true,
				responsive_web_edit_tweet_api_enabled: true,
				graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
				freedom_of_speech_not_reach_appeal_label_enabled: false,
				view_counts_everywhere_api_enabled: true,
				standardized_nudges_misinfo: true,
				tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
				interactive_text_enabled: true,
				responsive_web_text_conversations_enabled: false,
				responsive_web_enhance_cards_enabled: false
			}
		},
		replies: {
			variables: {
				count: 100,
				includePromotedContent: true,
				withCommunity: true,
				withSuperFollowsUserFields: true,
				withDownvotePerspective: false,
				withReactionsMetadata: false,
				withReactionsPerspective: false,
				withSuperFollowsTweetFields: true,
				withVoice: true,
				withV2Timeline: true
			},
			features: {
				responsive_web_twitter_blue_verified_badge_is_enabled: true,
				responsive_web_graphql_exclude_directive_enabled: false,
				verified_phone_label_enabled: false,
				responsive_web_graphql_timeline_navigation_enabled: true,
				responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
				tweetypie_unmention_optimization_enabled: true,
				vibe_api_enabled: true,
				responsive_web_edit_tweet_api_enabled: true,
				graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
				view_counts_everywhere_api_enabled: true,
				longform_notetweets_consumption_enabled: true,
				tweet_awards_web_tipping_enabled: false,
				freedom_of_speech_not_reach_fetch_enabled: false,
				freedom_of_speech_not_reach_appeal_label_enabled: false,
				standardized_nudges_misinfo: true,
				tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
				interactive_text_enabled: true,
				responsive_web_text_conversations_enabled: false,
				responsive_web_enhance_cards_enabled: false
			}
		}
	}
};

// eslint-disable-next-line no-unused-vars
const fetchEntryPageBody = async () => {
	const response = await sb.Got("FakeAgent", {
		url: `https://twitter.com/pajlada`,
		responseType: "text"
	});

	if (!response.ok) {
		return {
			success: false,
			error: {
				code: "entry-page-fetch",
				statusCode: response.statusCode
			}
		};
	}

	return {
		success: true,
		body: response.body
	};
};

// eslint-disable-next-line no-unused-vars
const fetchMainFileBody = async (entryPageBody) => {
	const filename = entryPageBody.match(/responsive-web\/client-web\/(main\.\w+\.js)/)?.[1];
	if (!filename) {
		return {
			success: false,
			error: {
				code: "main-file-name"
			}
		};
	}

	const response = await sb.Got("FakeAgent", {
		url: `https://abs.twimg.com/responsive-web/client-web/${filename}`,
		responseType: "text"
	});

	if (!response.ok) {
		return {
			success: false,
			error: {
				code: "main-file-fetch",
				statusCode: response.statusCode
			}
		};
	}

	return {
		success: true,
		body: response.body
	};
};

// eslint-disable-next-line no-unused-vars
const fetchBearerToken = (mainFileBody) => {
	const token = mainFileBody.match(/"([a-zA-Z0-9%]{103,104})"/)?.[1];
	if (!token) {
		return {
			success: false,
			error: {
				code: "bearer-token-match"
			}
		};
	}

	return {
		success: true,
		token
	};
};

const fetchGuestToken = async (bearerToken) => {
	const response = await sb.Got("FakeAgent", {
		method: "POST",
		responseType: "json",
		url: `https://api.twitter.com/1.1/guest/activate.json`,
		headers: {
			Authorization: `Bearer ${bearerToken}`
		}
	});

	if (!response.ok) {
		return {
			success: false,
			error: {
				code: "guest-token-fetch",
				body: response.body,
				statusCode: response.statusCode
			}
		};
	}

	const token = response.body.guest_token;
	if (!token) {
		return {
			success: false,
			error: {
				code: "no-guest-token",
				body: response.body,
				statusCode: response.statusCode
			}
		};
	}

	return {
		success: true,
		token
	};
};

const fetchEndpointSlugs = async (entryPageBody) => {
	const userFileName = entryPageBody.match(/.UsersGraphQL":"(\w+)"/)?.[1];
	const timelineFileName = entryPageBody.match(/.ProfileTimelines":"(\w+)"/)?.[1];
	if (!userFileName || !timelineFileName) {
		return {
			success: false,
			error: {
				code: "no-endpoint-url-match",
				timelineFileName,
				userFileName
			}
		};
	}

	const usersPromise = sb.Got("FakeAgent", {
		responseType: "text",
		url: `https://abs.twimg.com/responsive-web/client-web/endpoints.UsersGraphQL.${userFileName}a.js`
	});
	const timelinePromise = sb.Got("FakeAgent", {
		responseType: "text",
		url: `https://abs.twimg.com/responsive-web/client-web/endpoints.ProfileTimelines.${timelineFileName}a.js`
	});

	const [userResponse, timelineResponse] = await Promise.all([
		usersPromise,
		timelinePromise
	]);

	if (!userResponse.ok || !timelineResponse.ok) {
		return {
			success: false,
			error: {
				code: "endpoint-file-fetch",
				user: {
					statusCode: userResponse.statusCode
				},
				timeline: {
					statusCode: timelineResponse.statusCode
				}
			}
		};
	}

	// match group info: anything but `"` - url can contain unexpected characters
	const userApiUrl = userResponse.body.match(/queryId\s*:\s*"([^"]+?)"\s*,\s*operationName\s*:\s*"UserByScreenName"/)?.[1];
	const timelineApiUrl = timelineResponse.body.match(/queryId\s*:\s*"([^"]+?)"\s*,\s*operationName\s*:\s*"UserTweets"/)?.[1];
	if (!userApiUrl || !timelineApiUrl) {
		return {
			success: false,
			error: {
				code: "no-url-match"
			}
		};
	}

	return {
		success: true,
		user: userApiUrl,
		timeline: timelineApiUrl
	};
};

const fetchUserId = async (data) => {
	const { bearerToken, guestToken, slug, username } = data;
	const variables = {
		screen_name: username,
		...defaults.user.variables
	};

	const features = {
		...defaults.user.features
	};

	const variablesString = encodeURIComponent(JSON.stringify(variables));
	const featuresString = encodeURIComponent(JSON.stringify(features));

	const response = await sb.Got("FakeAgent", {
		url: `https://api.twitter.com/graphql/${slug}/UserByScreenName?variables=${variablesString}&features=${featuresString}`,
		responseType: "json",
		throwHttpErrors: false,
		headers: {
			Authorization: `Bearer ${bearerToken}`,
			"X-Guest-Token": guestToken,
			"X-CSRF-Token": defaults.csrfToken
		}
	});

	if (!response.ok) {
		return {
			success: false,
			error: {
				code: "user-id-fetch",
				body: response.body,
				statusCode: response.statusCode
			}
		};
	}

	const userId = response.body.data?.user?.result?.rest_id;
	if (!userId) {
		return {
			success: false,
			error: {
				code: "no-user-id",
				body: response.body,
				statusCode: response.statusCode
			}
		};
	}

	return {
		success: true,
		id: String(userId)
	};
};

const fetchTimeline = async (data) => {
	const { bearerToken, guestToken, includeReplies, userId } = data;
	const endpointType = (includeReplies) ? "replies" : "regular";
	const slug = (includeReplies)
		? defaults.slugs.timelineReplies
		: defaults.slugs.timeline;

	const variables = {
		...defaults.timeline[endpointType].variables,
		userId,
		count: 100
	};

	const features = {
		...defaults.timeline[endpointType].features
	};

	const variablesString = encodeURIComponent(JSON.stringify(variables));
	const featuresString = encodeURIComponent(JSON.stringify(features));

	const endpoint = timelineUrls[endpointType];
	const response = await sb.Got("FakeAgent", {
		url: `https://api.twitter.com/graphql/${slug}/${endpoint}?variables=${variablesString}&features=${featuresString}`,
		responseType: "json",
		throwHttpErrors: false,
		headers: {
			Authorization: `Bearer ${bearerToken}`,
			"X-Guest-Token": guestToken
		}
	});

	if (!response.ok) {
		return {
			success: false,
			error: {
				code: "timeline-fetch",
				body: response.body,
				statusCode: response.statusCode
			}
		};
	}

	const entries = response.body?.data?.user?.result?.timeline_v2?.timeline?.instructions?.[1]?.entries;
	if (!entries || !Array.isArray(entries)) {
		return {
			success: false,
			error: {
				code: "timeline-parse-entries",
				body: response.body,
				statusCode: response.statusCode
			}
		};
	}

	const tweetEntries = entries
		.map(i => i.content.itemContent)
		.filter(Boolean)
		.map(i => i?.tweet_results?.result?.legacy)
		.filter(Boolean);

	return {
		success: true,
		entries: tweetEntries
	};
};

const cacheKeys = {
	entryPage: "gql-twitter-entry-page",
	mainFile: "gql-twitter-main-page",
	bearerToken: "gql-twitter-bearer-token",
	guestToken: "gql-twitter-guest-token",
	slugs: "gql-twitter-api-slugs"
};

const previousCacheKeys = {
	entryPage: ["entryPage"],
	mainFile: ["entryPage", "mainFile"],
	bearerToken: ["entryPage", "mainFile"],
	guestToken: ["entryPage", "mainFile", "bearerToken"],
	slugs: ["entryPage", "mainFile"],
	userid: ["guestToken", "bearerToken", "entryPage", "mainFile"],
	timeline: ["guestToken", "bearerToken", "entryPage", "mainFile"]
};

const resetPreviousStepsCaches = async (type) => {
	const keys = previousCacheKeys[type];
	const promises = keys.map(key => sb.Cache.setByPrefix(cacheKeys[key], null));

	return await Promise.all(promises);
};

Router.get("/timeline/:username", async (req, res) => {
	const { username } = req.params;
	const { includeReplies } = req.query;

	/*
	let entryPageBody = await sb.Cache.getByPrefix(cacheKeys.entryPage);
	if (!entryPageBody) {
		const entryPage = await fetchEntryPageBody();
		if (!entryPage.success) {
			await resetPreviousStepsCaches("entryPage");
			return WebUtils.apiFail(res, 503, "Entry page load error", entryPage.error);
		}

		entryPageBody = entryPage.body;
		await sb.Cache.setByPrefix(cacheKeys.entryPage, entryPageBody, { expiry: 7 * 864e5 }); // 7 days
	}

	let bearerToken = await sb.Cache.getByPrefix(cacheKeys.bearerToken);
	if (!bearerToken) {
		let mainFileBody = await sb.Cache.getByPrefix(cacheKeys.mainFile);
		if (!mainFileBody) {
			const mainFile = await fetchMainFileBody(entryPageBody);
			if (!mainFile.success) {
				await resetPreviousStepsCaches("mainFile");
				return WebUtils.apiFail(res, 503, "Main page load error", mainFile.error);
			}

			mainFileBody = mainFile.body;
			await sb.Cache.setByPrefix(cacheKeys.mainFile, mainFileBody, { expiry: 7 * 864e5 }); // 7 days
		}

		const bearerTokenResult = fetchBearerToken(mainFileBody);
		if (!bearerTokenResult) {
			await resetPreviousStepsCaches("bearerToken");
			return WebUtils.apiFail(res, 503, "Bearer token load error", bearerTokenResult.error);
		}

		bearerToken = bearerTokenResult.token;
		await sb.Cache.setByPrefix(cacheKeys.bearerToken, bearerToken, { expiry: 7 * 864e5 }); // 7 days
	}
	*/

	const { bearerToken } = defaults;
	let guestToken = await sb.Cache.getByPrefix(cacheKeys.guestToken);
	if (!guestToken) {
		const guestTokenResult = await fetchGuestToken(bearerToken);
		if (!guestTokenResult.success) {
			await resetPreviousStepsCaches("guestToken");
			return WebUtils.apiFail(res, 503, "Guest token load error", guestTokenResult.error);
		}

		guestToken = guestTokenResult.token;
		await sb.Cache.setByPrefix(cacheKeys.guestToken, guestToken, { expiry: 300_000 }); // 5 minutes
	}

	// let slugs = await sb.Cache.getByPrefix(cacheKeys.slugs);
	let slugs = defaults.slugs;
	if (!slugs) {
		const slugsResult = await fetchEndpointSlugs("");
		// const slugsResult = await fetchEndpointSlugs(entryPageBody);
		if (!slugsResult.success) {
			await resetPreviousStepsCaches("slugs");
			return WebUtils.apiFail(res, 503, "GraphQL URL slugs load error", slugsResult.error);
		}

		slugs = {
			timeline: slugsResult.timeline,
			user: slugsResult.user
		};
		await sb.Cache.setByPrefix(cacheKeys.slugs, slugs, { expiry: 7 * 864e5 }); // 7 days
	}

	const userCacheKey = `gql-twitter-userid-${username}`;
	let userId = await sb.Cache.getByPrefix(userCacheKey);
	if (!userId) {
		const userIdResult = await fetchUserId({
			bearerToken,
			guestToken,
			username,
			slug: slugs.user
		});

		if (!userIdResult.success) {
			if (userIdResult.error.code === "no-user-id") {
				return WebUtils.apiFail(res, 404, "User does not exist");
			}
			else {
				await resetPreviousStepsCaches("userid");
				return WebUtils.apiFail(res, 503, "User ID load error", userIdResult.error);
			}
		}

		userId = userIdResult.id;
		await sb.Cache.setByPrefix(userCacheKey, userId, { expiry: 7 * 864e5 }); // 7 days
	}

	const timelineCacheKey = (includeReplies)
		? `gql-twitter-timeline-${username}-replies`
		: `gql-twitter-timeline-${username}`;

	let timeline = await sb.Cache.getByPrefix(timelineCacheKey);
	if (!timeline) {
		const timelineResult = await fetchTimeline({
			bearerToken,
			guestToken,
			includeReplies,
			userId
		});
		if (!timelineResult.success) {
			await resetPreviousStepsCaches("timeline");
			return WebUtils.apiFail(res, 503, "Timeline load error", timelineResult.error);
		}

		timeline = timelineResult.entries;
		await sb.Cache.setByPrefix(timelineCacheKey, timeline, { expiry: 600_000 }); // 10 minutes
	}

	return WebUtils.apiSuccess(res, { userId, timeline }, {
		skipCaseConversion: true
	});
});

Router.get("/syndication/:username", async (req, res) => {
	const { username } = req.params;
	const { includeReplies } = req.query;

	const response = await sb.Got("FakeAgent", {
		url: `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`,
		searchParams: {
			includeReplies: String(Boolean(includeReplies))
		},
		headers: {
			Cookie: sb.Config.get("TWITTER_BROWSER_COOKIE")
		},
		responseType: "text"
	});

	if (!response.ok) {
		return WebUtils.apiFail(res, 503, "Twitter API failed");
	}

	const $ = sb.Utils.cheerio(response.body);
	const node = $("#__NEXT_DATA__");
	const data = JSON.parse(node.text());

	const timeline = data.props.pageProps.timeline.entries
		.map(i => i.content.tweet)
		.filter(Boolean);

	if (timeline.length > 1) {
		const [first, second] = timeline;
		if (new sb.Date(first.created_at) < new sb.Date(second.created_at)) {
			first.probablyPinned = true;
		}
	}

	return WebUtils.apiSuccess(res, { timeline });
});

module.exports = Router;
