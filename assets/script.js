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
let controlElevation;
let gpxLayers = {};

function initializeMap() {
    map = L.map('map').setView(defaultCenter, defaultZoom);

    const baseLayers = {
        "OpenStreetMap": L.tileLayer(layers.osm.url, { attribution: layers.osm.attribution }),
        "Google Streets": L.tileLayer(layers.googleStreets.url, { subdomains: layers.googleStreets.subdomains }),
        "Google Satellite": L.tileLayer(layers.googleSatellite.url, { subdomains: layers.googleSatellite.subdomains })
    };

    baseLayers["OpenStreetMap"].addTo(map);
    L.control.layers(baseLayers).addTo(map);

    controlElevation = L.control.elevation({
        elevationDiv: "#elevation-div",
        detached: true,
        theme: "lightblue-theme",
        width: "100%",
        height: "100%",
        imperial: false,
        summary: 'inline',
        ruler: true,
        legend: true,
    }).addTo(map);

    const gpxControl = L.control({ position: 'topright' });
    gpxControl.onAdd = function () {
        const div = L.DomUtil.create('div', 'gpx-selector');
        div.innerHTML = `
        <div class="gpx-selector-header">Sélection de trace</div>
        <div id="gpx-selector-content" class="gpx-selector-content"></div>
    `;

        div.querySelector('.gpx-selector-content').style.display = 'block';

        div.querySelector('.gpx-selector-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return div;
    };
    gpxControl.addTo(map);

    map.on('mousemove', (e) => {
        const coordsDisplay = document.querySelector('.coordinate');
        if (coordsDisplay) {
            coordsDisplay.textContent = `Lat: ${e.latlng.lat.toFixed(5)} | Lng: ${e.latlng.lng.toFixed(5)}`;
        }
    });
}

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

async function addGPXToMap(gpxFile) {
    try {
        const fileName = gpxFile.split('/').pop().replace('.gpx', '');

        const gpxLayer = new L.GPX(gpxFile, {
            async: true,
            marker_options: {
                startIconUrl: MapConfig.icons.start,
                endIconUrl: MapConfig.icons.end,
                shadowUrl: MapConfig.icons.shadow
            },
            polyline_options: {
                color: getRandomColor(),
                opacity: 0.75,
                weight: 5,
                lineCap: 'round'
            }
        });

        gpxLayer.on("loaded", function (e) {
            gpxLayers[fileName] = e.target;

            updateGPXSelector();
        });

        gpxLayer.addTo(map);

    } catch (error) {
        console.error(`Erreur lors du chargement de ${gpxFile}:`, error);
    }
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function updateGPXSelector() {
    const selector = document.getElementById('gpx-selector-content');
    if (!selector) return;

    selector.innerHTML = '';

    Object.keys(gpxLayers).forEach(name => {
        const item = document.createElement('div');
        item.className = 'gpx-selector-item';
        item.innerHTML = `
            <input type="radio" name="gpx-track" id="gpx-${name}" value="${name}">
            <label for="gpx-${name}">
                ${name}
            </label>
        `;

        item.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                showSingleGPXTrace(name);
            }
        });

        if (Object.keys(gpxLayers).indexOf(name) === 0) {
            item.querySelector('input').checked = true;
            showSingleGPXTrace(name);
        }

        selector.appendChild(item);
    });
}
function showSingleGPXTrace(name) {
    // Masque toutes les traces
    Object.keys(gpxLayers).forEach(traceName => {
        if (gpxLayers[traceName]) {
            map.removeLayer(gpxLayers[traceName]);
        }
    });

    // Affiche la trace sélectionnée
    if (gpxLayers[name]) {
        map.addLayer(gpxLayers[name]);
        controlElevation.clear();
        controlElevation.load(gpxLayers[name]._gpx);
        map.fitBounds(gpxLayers[name].getBounds());
    }
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