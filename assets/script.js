// script.js

// Chargement des configurations
const { devices, s3_url, bearerToken, api_base } = AppConfig;
const {
    defaultCenter,
    defaultZoom,
    refreshInterval,
    layers,
    icons
} = MapConfig;

// Variables globales
let map;

async function loadAllGPXFromS3() {
    const s3BaseUrl = AppConfig.s3_url;
    if (!s3BaseUrl) return;

    try {
        // 1. Request to list all bucket files
        const listUrl = `${s3BaseUrl}?list-type=2`;
        const response = await fetch(listUrl);

        if (!response.ok) {
            throw new Error(`Erreur S3: ${response.status}`);
        }

        // 2. Parse the XML response
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        // 3. Extract all GPX files
        const keys = xmlDoc.getElementsByTagName('Key');
        const gpxFiles = Array.from(keys)
            .map(keyNode => keyNode.textContent)
            .filter(key => key.endsWith('.gpx'))
            .map(key => `${s3BaseUrl}/${key}`);

        // Number of simultaneous loads
        const MAX_PARALLEL = 3;

        // 4. Loads each file (with parallelism limitation)
        for (let i = 0; i < gpxFiles.length; i += MAX_PARALLEL) {
            const batch = gpxFiles.slice(i, i + MAX_PARALLEL);
            await Promise.all(batch.map(url => {
                return new Promise(resolve => {
                    addGPXToMap(url).then(resolve).catch(e => {
                        console.error(`Erreur chargement ${url}:`, e);
                        resolve();
                    });
                });
            }));
        }

    } catch (error) {
        console.error("Erreur lors du chargement des GPX depuis S3:", error);
    }
}

function addGPXToMap(gpxFile) {
    return new Promise((resolve) => {
        new L.GPX(gpxFile, {
            async: true,
            marker_options: {
                startIconUrl: MapConfig.icons.start,
                endIconUrl: MapConfig.icons.end,
                shadowUrl: MapConfig.icons.shadow
            }
        })
            .on("loaded", function (e) {
                // map.fitBounds(e.target.getBounds());
                resolve();
            })
            .on("error", function (e) {
                console.error(`Erreur GPX ${gpxFile}:`, e.error);
                resolve();
            })
            .addTo(map);
    });
}

function initializeMap() {
    map = L.map('map').setView(defaultCenter, defaultZoom);

    const baseLayers = {
        "OpenStreetMap": L.tileLayer(
            layers.osm.url, {
            attribution: layers.osm.attribution
        }
        ),
        "Google Streets": L.tileLayer(
            layers.googleStreets.url, {
            subdomains: layers.googleStreets.subdomains
        }
        ),
        "Google Satellite": L.tileLayer(
            layers.googleSatellite.url, {
            subdomains: layers.googleSatellite.subdomains
        }
        )
    };

    baseLayers["OpenStreetMap"].addTo(map);
    L.control.layers(baseLayers).addTo(map);

    map.on('mousemove', (e) => {
        const coordsDisplay = document.querySelector('.coordinate');
        if (coordsDisplay) {
            coordsDisplay.textContent = `lat: ${e.latlng.lat.toFixed(5)} lng: ${e.latlng.lng.toFixed(5)}`;
        }
    });
}

async function updateDevicePosition(id, device) {
    try {
        const deviceResponse = await fetch(`${api_base}/devices/${id}`, {
            headers: { Authorization: bearerToken }
        });

        if (!deviceResponse.ok) return;

        const deviceData = await deviceResponse.json();

        // Checks if the device is online
        if (deviceData.status === "unknown" || deviceData.status === "offline") {
            if (device.marker) map.removeLayer(device.marker);
            return;
        }

        // Get the position
        const positionResponse = await fetch(`${api_base}/positions?deviceId=${id}`, {
            headers: { Authorization: bearerToken }
        });

        if (!positionResponse.ok) return;

        const positionData = await positionResponse.json();
        const latLng = L.latLng(positionData[0].latitude, positionData[0].longitude);


        console.log(positionData);

        const formattedCoords = `
            <b>${device.username}</b><br>
            Lat: ${positionData[0].latitude.toFixed(6)}<br>
            Lng: ${positionData[0].longitude.toFixed(6)}<br>
            <small>${new Date(positionData[0].deviceTime).toLocaleString()}</small>
        `;

        // Update or create marker
        if (!device.marker) {
            device.marker = L.marker(latLng).addTo(map);
            device.marker.bindPopup(formattedCoords);
        } else {
            device.marker.setLatLng(latLng);
            device.marker.getPopup().setContent(formattedCoords);
        }

    } catch (error) {
        console.error(`Error updating device ${id}:`, error);
    }
}

async function refreshAllPositions() {
    for (const [id, device] of Object.entries(devices)) {
        await updateDevicePosition(id, device);
    }
}

/**
 * Initialise l'application
 */
async function initApp() {
    try {
        initializeMap();

        await loadAllGPXFromS3();
        await refreshAllPositions();

        setInterval(refreshAllPositions, refreshInterval);

    } catch (error) {
        console.error("Initialization error:", error);
    }
}

window.addEventListener('load', initApp);