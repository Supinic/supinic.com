/* eslint-env browser */

const noAcceptLinks = document.querySelectorAll("a.noaccept");
for (const el of noAcceptLinks) {
	el.addEventListener("click", async (evt) => {
		evt.preventDefault();
		const res = await fetch(el.href, { headers: { Accept: "" } });
		const blob = await res.blob();

		const url = URL.createObjectURL(blob);
		window.open(url, "_blank");
	});
}
