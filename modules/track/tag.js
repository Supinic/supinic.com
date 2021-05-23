module.exports = (function () {
	const TemplateModule = require("../template.js");
	// const Alias = require("./alias.js");

	class Tag extends TemplateModule {
		static async list () {
			return await super.selectAll();
		}

		static async get (ID) {
			const exists = await super.exists(ID);
			if (!exists) {
				return null;
			}

			const row = (await super.selectSingleCustom(rs => rs
				.select("GROUP_CONCAT(Track_Tag.Track SEPARATOR ',') AS Tracks")
				.leftJoin({
					toDatabase: "music",
					toTable: "Track_Tag",
					on: "Track_Tag.Tag = Tag.ID"
				})
				.where("Tag.ID = %n", ID)
				.groupBy("Tag.ID")
			));

			row.Tracks = (row.Tracks)
				? row.Tracks.split(",").map(Number)
				: [];

			return row;
		}

		static async createAlias () {}

		static get name () { return "tag"; }
		static get database () { return "music"; }
		static get table () { return "Tag"; }
	}

	return Tag;
})();
