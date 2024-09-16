let bearerToken;
let gpxUrl;

const devices = {
    1: {
        username: "Anthony",
        marker: null,
    },
    2: {
        username: "David",
        marker: null,
    },
};

// Get the config info
fetch("config/config.json")
    .then((response) => response.json())
    .then((data) => {
        bearerToken = data.token;
        gpxUrl = data.gpx_url;
    })
    .catch((err) => console.log(err));

var markerAnt = null;
var markerDav = null;
let fetchInterval = 20000;
var popupAnt = L.popup().setContent("Anthony");
var popupDav = L.popup().setContent("David");

// Map initialization
var map = L.map("map").setView([46.818188, 8.227512], 8);

// Liste des fichiers GPX à ajouter
const gpxFiles = [
    "assets/gpx/file.gpx",
    "assets/gpx/file2.gpx",
    "assets/gpx/file3.gpx",
];

// Fonction pour ajouter un fichier GPX à la carte
function addGPX(gpxFile) {
    new L.GPX(gpxFile, {
        async: true,
        marker_options: {
            startIconUrl: "assets/img/pin-icon-start.png",
            endIconUrl: "assets/img/pin-icon-end.png",
            shadowUrl: "assets/img/pin-shadow.png",
        },
    })
        .on("loaded", function (e) {
            map.fitBounds(e.target.getBounds());
        })
        .addTo(map);
}

// Ajouter chaque fichier GPX à la carte
gpxFiles.forEach(addGPX);

//osm layer
var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});
osm.addTo(map);

// google street
googleStreets = L.tileLayer(
    "http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    {
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
    }
);

//google satellite
googleSat = L.tileLayer("http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
});

var baseMaps = {
    OSM: osm,
    "Google Street": googleStreets,
    "Google Satellite": googleSat,
};

L.control.layers(baseMaps).addTo(map);

map.on("mousemove", function (e) {
    document.getElementsByClassName("coordinate")[0].innerHTML =
        "lat: " + e.latlng.lat + " lng: " + e.latlng.lng;
});

/**
 * Function to fetch the position from an api call
 */
function fetchPosition() {
    for (const id in devices) {
        const { username } = devices[id];

        fetch(`https://tracking.anthonydieperink.ch/api/devices/${id}`, {
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
                        `https://tracking.anthonydieperink.ch/api/positions?deviceId=${id}`,
                        {
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

                            // Create a new marker of update existing one
                            if (devices[id].marker === null) {
                                devices[id].marker =
                                    L.marker(latLng).addTo(map);
                                devices[id].marker.bindPopup(`${username}`);
                            } else {
                                devices[id].marker.setLatLng(latLng);
                            }

                            // Add marker to the layer
                            map.addLayer(devices[id].marker);
                        })
                        .catch((error) => {
                            console.error("Fetch error:", error);
                        });
                } else {
                    map.removeLayer(markerAnt);
                }
            })
            .catch((error) => {
                console.error("Fetch error:", error);
            });
    }
}

window.addEventListener("load", () => {
    fetchPosition();
    setInterval(fetchPosition, fetchInterval);
});
