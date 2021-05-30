module.exports = (function () {
	"use strict";

	return class Gachi {
		static async init () {
			await sb.Query.raw("SET NAMES 'utf8mb4'");
			return true;
		}

		static async get (ID, ...fields) {
			const row = await sb.Query.getRow("data", "Gachi");
			try {
				await row.load(ID);
			}
			catch (e) {
				return null;
			}

			let creditUser = null;
			if (row.values.Added_By !== null && row.values.Added_By !== 0) {
				const user = await sb.Query.getRow("chat_data", "User_Alias");
				await user.load(row.values.Added_By);
				creditUser = user.values.Name;
			}

			const target = (fields.length !== 0) ? fields : Object.keys(row.values);
			const ret = {};
			for (const field of target) {
				ret[field] = row.values[field];
			}

			ret.Added_By = creditUser;
			return ret;
		}

		static async getAll () {
			const youtubePrefix = "https://youtu.be/$";
			const data = await sb.Query.getRecordset(rs => rs
				.select("Gachi.*")
				.select("Video_Type.Type", "Video_Type.Link_Prefix")
				.select("User_Alias.Name AS Added_By_Name")
				.from("data", "Gachi")
				.join("data", "Video_Type")
				.join("chat_data", "User_Alias", "Added_By")
				.orderBy("Gachi.ID DESC")
			);

			const ret = [];
			for (const row of data) {
				const basedOn = (!row.Based_On)
					? "<b>(original work)</b>"
					: ((row.Based_On_Link)
						? (`<a target='_blank' rel='noopener noreferrer' href='${youtubePrefix.replace("$", row.Based_On_Link)}'>${row.Based_On}</a>`)
						: row.Based_On);
				const mainLink = (row.Youtube_Link)
					? youtubePrefix.replace("$", row.Youtube_Link)
					: row.Link_Prefix.replace("$", row.Link);
				const otherLink = (row.Youtube_Link)
					? row.Link_Prefix.replace("$", row.Link)
					: null;

				ret.push({
					ID: row.ID,
					Name: row.Name,
					Foreign_Name: row.Foreign_Name || null,
					Author: row.Author || null,
					Main_Link: mainLink,
					Other_Link: otherLink,
					Based_On: basedOn,
					Published: (row.Published) ? row.Published.format("Y-m-d") : "N/A",
					Sort_Published: (row.Published) ? row.Published.valueOf() : 0,
					Length: (row.Length) ? sb.Utils.formatTime(row.Length, true) : "N/A",
					Sort_Length: row.Length || 0,
					Notes: row.Notes || null,
					Added_On: row.Added_On,
					Added_By: row.Added_By_Name
				});
			}

			return ret;
		}

		static async updateOrInsert (ID, data) {
			const row = await sb.Query.getRow("data", "Gachi");

			if (ID) {
				await row.load(ID);
			}
			else {
				const checkYoutube = await sb.Query.getRecordset(rs => rs
					.select("ID")
					.from("data", "Gachi")
					.where("Youtube_Link = %s", data.Link)
				);

				if (checkYoutube[0]) {
					throw new Error(`Video link already exists as a Youtube reupload for record ID = ${checkYoutube[0].ID}`);
				}

				const checkRejected = await sb.Query.getRecordset(rs => rs
					.select("Notes")
					.from("data", "Gachi_Todo_List")
					.where("Link = %s", data.Link)
					.where("Rejected = %b", true)
				);

				if (checkRejected[0]) {
					throw new Error(`Video link has been rejected from being submitted. Reason: ${checkRejected[0].Notes}`);
				}
			}

			data.Name = data.Name.replace(/^♂|♂$/g, "").trim();
			data.Author = data.Author.trim();
			if (data.Based_On) {
				data.Based_On = data.Based_On.trim();
			}

			row.setValues(data);
			await row.save();

			return row.values.ID;
		}

		static async getPrefix (ID) {
			const rs = await sb.Query.getRecordset(rs => rs
				.select("Link_Prefix")
				.from("data", "Video_Type")
				.where("ID = %n", ID)
			);

			return rs[0].Link_Prefix;
		}

		static async getTodoList () {
			return await sb.Query.getRecordset(rs => rs
				.select("Gachi_Todo_List.ID", "Link", "Rejected", "Notes", "Result")
				.select("Type", "Link_Prefix")
				.from("data", "Gachi_Todo_List")
				.join("data", "Video_Type")
			);
		}

		static async insertTodo (data) {
			const row = await sb.Query.getRow("data", "Gachi_Todo_List");
			row.setValues(data);
			await row.save();

			return row.ID;
		}

		static get fields () {
			return [
				{ name: "Name", required: true, jsType: "string", htmlType: "text" },
				{ name: "Foreign_Name", required: false, jsType: "string", htmlType: "text" },
				{ name: "Link", required: true, jsType: "string", htmlType: "text" },
				{ name: "Youtube_Link", required: false, jsType: "string", htmlType: "text" },
				{ name: "Author", required: true, jsType: "string", htmlType: "text" },
				{ name: "Video_Type", required: true, jsType: "string", htmlType: "text", protected: true },
				{ name: "Based_On", required: false, jsType: "string", htmlType: "text" },
				{ name: "Based_On_Link", required: false, jsType: "string", htmlType: "text" },
				{ name: "Published", required: true, jsType: "date", htmlType: "date" },
				{ name: "Length", required: true, jsType: "number", htmlType: "number" },
				{ name: "Audio_Backup", required: false, jsType: "string", htmlType: "text" },
				{ name: "Added_By", adminOnly: true, required: false, jsType: "string", htmlType: "text" },
				{ name: "Added_On", adminOnly: true, required: false, jsType: "string", htmlType: "text" },
				{ name: "Notes", required: false, jsType: "string", htmlType: "text" }
			];
		}
	};
})();
