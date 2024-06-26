<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>GeoTrack</title>

	<!-- leaflet css  -->
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css" />
	<link rel="stylesheet" href="assets/style.css" />
</head>

<body>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/1.7.0/gpx.min.js"></script>
	<div id="map">
		<div class="leaflet-control coordinate"></div>
	</div>
</body>

</html>

<script>
	let bearerToken;
	let gpxUrl;

	// Get the config info
	fetch('config/config.json')
		.then(response => response.json())
		.then(data => {
			bearerToken = data.token;
			gpxUrl = data.gpx_url;
		})
		.catch(err => console.log(err));

	var markerAnt = null;
	var markerDav = null;
	let fetchInterval = 20000;
	var popupAnt = L.popup().setContent("Anthony");
	var popupDav = L.popup().setContent("David");

	// Map initialization
	var map = L.map("map").setView([46.818188, 8.227512], 8);

	// Function to check if a URL exists
	function doesURLExist(url) {
		return fetch(url, {
				method: "HEAD"
			})
			.then((response) => {
				return response.status === 200;
			})
			.catch(() => {
				return false;
			});
	}

	// Check if the url exists
	doesURLExist(gpxUrl).then((exists) => {
		if (exists) {
			new L.GPX(gpxUrl, {
					async: true,
					marker_options: {
						startIconUrl: "assets/img/pin-icon-start.png",
						endIconUrl: "assets/img/pin-icon-end.png",
						shadowUrl: "assets/img/pin-shadow.png",
					},
				})
				.on("loaded", function(e) {
					map.fitBounds(e.target.getBounds());
				})
				.addTo(map);
		} else {
			console.error("GPX file not found at the specified URL.");
		}
	});

	//osm layer
	var osm = L.tileLayer(
		"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}
	);
	osm.addTo(map);

	// google street
	googleStreets = L.tileLayer(
		"http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
			subdomains: ["mt0", "mt1", "mt2", "mt3"],
		}
	);

	//google satellite
	googleSat = L.tileLayer(
		"http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
			subdomains: ["mt0", "mt1", "mt2", "mt3"],
		}
	);

	var baseMaps = {
		OSM: osm,
		"Google Street": googleStreets,
		"Google Satellite": googleSat,
	};

	L.control.layers(baseMaps).addTo(map);

	map.on("mousemove", function(e) {
		document.getElementsByClassName("coordinate")[0].innerHTML =
			"lat: " + e.latlng.lat + " lng: " + e.latlng.lng;
	});

	/**
	 * Function to fetch the position from an api call
	 */
	function fetchPosition() {
		fetch("https://tracking.anthonydieperink.ch/api/devices/1", {
				method: "GET",
				credentials: "include", // You can use 'include' to include cookies, 'same-origin' for same-origin requests, or 'omit' to exclude credentials.
				headers: {
					Authorization: bearerToken, // If using token-based authentication
					// Add other headers as needed
				},
			})
			.then((response) => {
				if (!response.ok) {
					throw new Error("Network response was not ok");
				}
				return response.json();
			})
			.then((data) => {
				// Handle the JSON response data here
				if (data.status !== "unknown" && data.status !== "offline") {
					fetch(
							"https://tracking.anthonydieperink.ch/api/positions?deviceId=1", {
								method: "GET",
								credentials: "include", // You can use 'include' to include cookies, 'same-origin' for same-origin requests, or 'omit' to exclude credentials.
								headers: {
									Authorization: bearerToken, // If using token-based authentication
									// Add other headers as needed
								},
							}
						)
						.then((response) => {
							if (!response.ok) {
								throw new Error("Network response was not ok");
							}
							console.log(response);
							return response.json();
						})
						.then((data) => {
							// Handle the JSON response data here
							var latLng = L.latLng(
								data[0].latitude,
								data[0].longitude
							);

							if (markerAnt == null) {
								markerAnt = L.marker(latLng).addTo(map);
								markerAnt.bindPopup(popupAnt);
							}
							markerAnt.setLatLng(latLng);
							map.addLayer(markerAnt);
						})
						.catch((error) => {
							// Handle any errors that occurred during the fetch
							console.error("Fetch error:", error);
						});
				} else {
					map.removeLayer(markerAnt);
				}
			})
			.catch((error) => {
				// Handle any errors that occurred during the fetch
				console.error("Fetch error:", error);
			});

		fetch("https://tracking.anthonydieperink.ch/api/devices/2", {
				method: "GET",
				credentials: "include", // You can use 'include' to include cookies, 'same-origin' for same-origin requests, or 'omit' to exclude credentials.
				headers: {
					Authorization: bearerToken, // If using token-based authentication
					// Add other headers as needed
				},
			})
			.then((response) => {
				if (!response.ok) {
					throw new Error("Network response was not ok");
				}
				return response.json();
			})
			.then((data) => {
				// Handle the JSON response data here
				console.log(data);
				if (data.status !== "unknown" && data.status !== "offline") {
					fetch(
							"https://tracking.anthonydieperink.ch/api/positions?deviceId=2", {
								method: "GET",
								credentials: "include", // You can use 'include' to include cookies, 'same-origin' for same-origin requests, or 'omit' to exclude credentials.
								headers: {
									Authorization: bearerToken, // If using token-based authentication
									// Add other headers as needed
								},
							}
						)
						.then((response) => {
							if (!response.ok) {
								throw new Error("Network response was not ok");
							}
							return response.json();
						})
						.then((data) => {
							// Handle the JSON response data here
							var latLng = L.latLng(
								data[0].latitude,
								data[0].longitude
							);

							if (markerDav == null) {
								markerDav = L.marker(latLng).addTo(map);
								markerDav.bindPopup(popupDav);
							}
							markerDav.setLatLng(latLng);
							map.addLayer(markerDav);
						})
						.catch((error) => {
							// Handle any errors that occurred during the fetch
							console.error("Fetch error:", error);
						});
				} else {
					map.removeLayer(markerDav);
				}
			})
			.catch((error) => {
				// Handle any errors that occurred during the fetch
				console.error("Fetch error:", error);
			});
	}

	window.addEventListener("load", () => {
		fetchPosition();
		setInterval(fetchPosition, fetchInterval);
	});
</script>