module.exports = (function () {
	"use strict";
	
	const Express = require("express");
	const Router = Express.Router();
	const Gachi = require("../modules/gachi.js");

	Router.get("/", (req, res) => res.sendStatus(200));

	Router.get("/gachi", async (req, res) => {
		let threshold = new Date();
		threshold.setDate(threshold.getDate() - 14);
		threshold.setHours(0); threshold.setMinutes(0); threshold.setSeconds(0); threshold.setMilliseconds(0); 

		const data = await Gachi.getAll();
		const latest = data.filter(i => i.Added_On).sort((a, b) => a.Added_On - b.Added_On)[0].Added_On;
		const rssData = data.filter(i => i.Added_On !== null && i.Added_On >= threshold).map(i => {
			return "\t\t<item>\n" + 
					"\t\t\t<title>" + i.Name.replace(/[\u00A0-\u9999<>&]/gim, i => "&#" + i.charCodeAt(0) + ";") + "</title>\n" + 
					"\t\t\t<link>https://supinic.com/gachi/detail/" + i.ID + "</link>\n" + 
					"\t\t\t<guid>https://supinic.com/gachi/detail/" + i.ID + "</guid>\n" + 
					"\t\t\t<description>Published by " + i.Author + " on " + i.Published + "</description>\n" + 
					"\t\t\t<pubDate>" + i.Added_On.toUTCString() + "</pubDate>\n" + 
				"\t\t</item>";
		});

		res.set("Content-Type", "application/rss+xml");
		res.send(
			"<?xml version='1.0' encoding='UTF-8' ?>\n" +
			"<rss version='2.0' xmlns:atom='http://www.w3.org/2005/Atom'>\n" + 
			"\t<channel>\n" + 
			"\t\t<atom:link href='https://supinic.com/rss/gachi' rel='self' type='application/rss+xml'/>\n" + 
			"\t\t<title>Gachi RSS</title>\n" + 
			"\t\t<link>https://supinic.com/gachi/list</link>\n" + 
			"\t\t<description>Tracks added to the gachi list in the past two weeks</description>\n" + 
			"\t\t<lastBuildDate>" + latest.toUTCString() + "</lastBuildDate>\n" +
			"\t\t<webMaster>supinic@pm.me (Supinic)</webMaster>\n" + 
			"\t\t<category>Gachimuchi</category>\n" + 
			"\t\t<image>\n" + 
			"\t\t\t<title>Gachi RSS</title>\n" + 
			"\t\t\t<url>https://supinic.com/public/img/gachiRSS.png</url>\n" + 
			"\t\t\t<link>https://supinic.com/gachi/list</link>\n" + 
			"\t\t</image>\n" + 
			rssData.join("\n") +
			"\t</channel>" +
			"</rss>"
		);
	});

	return Router;
})();
	