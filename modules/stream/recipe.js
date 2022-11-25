module.exports = (function () {
	const TemplateModule = require("../template.js");

	class Recipe extends TemplateModule {
		static get name () { return "recipe"; }
		static get database () { return "stream"; }
		static get table () { return "Recipe"; }
	}

	return Recipe;
})();
