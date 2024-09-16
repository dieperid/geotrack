let bearerToken;
let s3Url;
let map;
const fetchInterval = 20000;

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

async function loadConfig() {
    try {
        const response = await fetch("../config/config.json");
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        bearerToken = data.token;
        s3Url = data.s3_url;
    } catch (err) {
        console.error("Error loading config:", err);
    }
}

async function doesURLExist(url) {
    return fetch(url, { method: "GET" })
        .then((response) => {
            return response.status === 200;
        })
        .catch(() => {
            return false;
        });
}

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

// Fonction pour charger et afficher la carte
async function initializeMap() {
    // Map initialization
    map = L.map("map").setView([46.818188, 8.227512], 8);

    //osm layer
    var osm = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
    );
    osm.addTo(map);

    // google street
    googleStreets = L.tileLayer(
        "http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }
    );

    //google satellite
    googleSat = L.tileLayer(
        "http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        {
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }
    );

    var baseMaps = {
        OSM: osm,
        "Google Street": googleStreets,
        "Google Satellite": googleSat,
    };

    L.control.layers(baseMaps).addTo(map);

    /**
    // Liste des fichiers GPX à ajouter
    const gpxFiles = [
        "assets/gpx/file.gpx",
        "assets/gpx/file2.gpx",
        "assets/gpx/file3.gpx",
    ];

    // Ajouter chaque fichier GPX à la carte
    gpxFiles.forEach(addGPX);
*/

    map.on("mousemove", function (e) {
        document.getElementsByClassName("coordinate")[0].innerHTML =
            "lat: " + e.latlng.lat + " lng: " + e.latlng.lng;
    });

    if (await doesURLExist(s3Url)) {
        new L.GPX(s3Url, {
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
    } else {
        console.error("GPX file not found at the specified URL.");
    }
}

/**
 * Function to fetch the position from an api call
 */
async function fetchPosition() {
    for (const id in devices) {
        const { username } = devices[id];

        fetch(`https://tracking.anthonydieperink.ch/api/devices/${id}`, {
            method: "GET",
            credentials: "include",
            headers: {
                Authorization: bearerToken,
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
                            credentials: "include",
                            headers: {
                                Authorization: bearerToken,
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
                    map.removeLayer(devices[id].marker);
                }
            })
            .catch((error) => {
                console.error("Fetch error:", error);
            });
    }
}

async function main() {
    await loadConfig();
    await initializeMap();
    fetchPosition();
    setInterval(fetchPosition, fetchInterval);
}

window.addEventListener("load", main);
