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
        },
        swissTopo: {
            url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
            attribution: '© <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
            maxZoom: 18,
            minZoom: 2
        },
        swissTopoAerial: {
            url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg",
            attribution: '© <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
            maxZoom: 18,
            minZoom: 2
        }
    },

    icons: {
        start: "assets/img/pin-icon-start.png",
        end: "assets/img/pin-icon-end.png",
        shadow: "assets/img/pin-shadow.png"
    }
};