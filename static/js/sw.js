self.addEventListener("install", (evt) => console.log("Imgur redirector: Installed", { evt });
self.addEventListener("activate", (evt) => {
	console.log("Imgur redirector: Activated", { evt });
	evt.waitUntil(self.clients.claim());
}

self.addEventListener("fetch", (evt) => {
	console.log("Imgur redirector: Fetch", { evt });

	const url = new URL(evt.request.url);
	if (url.hostname !== "i.imgur.com") {
		// everything else goes through
		return;
	}

	const headers = new Headers(evt.request.headers);
	headers.delete("Accept");

	const req2 = new Request(evt.request, { headers });
	return evt.respondWith(fetch(req2));
});
