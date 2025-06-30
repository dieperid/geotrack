const MapConfig = {
    defaultCenter: [46.5513, 6.5560],
    defaultZoom: 9,
    refreshInterval: 30000,

    layers: {
        osm: {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: '© OpenStreetMap'
        },
        googleStreets: {
            url: "http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
            subdomains: ["mt0", "mt1", "mt2", "mt3"]
        },
        googleSatellite: {
            url: "http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
            subdomains: ["mt0", "mt1", "mt2", "mt3"]
        }
    },

    icons: {
        start: "assets/img/pin-icon-start.png",
        end: "assets/img/pin-icon-end.png",
        shadow: "assets/img/pin-shadow.png"
    }
};