# GeoTrack

GeoTrack is a lightweight web app that displays GPX tracks on an interactive map and shows a live elevation profile. GPX files are loaded directly from the configured S3 bucket, and device positions can also be refreshed from an external tracking API.

The app is fully static: HTML, CSS, and JavaScript are served by Nginx, while the browser fetches map tiles, GPX files, and live device data.

## What The Project Does

- Lists available `.gpx` files from the configured S3 bucket
- Displays one GPX trace at a time on a Leaflet map
- Shows the elevation chart for the selected GPX trace
- Lets you switch traces from the selector in the map UI
- Supports direct links with a URL parameter such as `?file=David_20.06.26.gpx`
- Refreshes tracked device positions from the configured API

## How It Works

1. The app loads `config/app-config.js` and `config/map-config.js`.
2. It requests the S3 bucket listing with `?list-type=2`.
3. Every GPX file found in the bucket is added to the selector.
4. If the URL contains `?file=...`, that GPX file is selected automatically.
5. If no file is provided, `main.gpx` is used as the default when available.
6. Device positions are refreshed on the interval defined in `config/map-config.js`.

## Project Structure

```text
.
├── assets/
│   ├── img/                # Marker icons
│   ├── gpx/                # Local sample GPX files
│   ├── script.js           # Main application logic
│   └── style.css           # App styles
├── config/
│   ├── app-config.js       # Local runtime config, not committed by default
│   ├── app-config.js.example
│   └── map-config.js
├── index.html
└── docker-compose.yml
```

## Configuration

Create `config/app-config.js` from the example file:

```js
const AppConfig = {
    devices: {
        1: { id: 3, username: "John Doe", marker: null },
        2: { id: 2, username: "John Doe", marker: null }
    },

    bearerToken: "Bearer <token here>",
    s3_url: "https://s3.example.com/geotrack",
    api_base: "https://tracking.example.com/api",
};
```

### App Config

- `devices`: devices to poll from the tracking API
- `bearerToken`: authorization header sent to the tracking API
- `s3_url`: base URL of the S3 bucket or S3-compatible storage
- `api_base`: base URL of the tracking API

### Custom S3 Configuration

GeoTrack reads GPX files directly from the browser, so `s3_url` must be a public or browser-accessible base URL that supports object listing with `?list-type=2`.

Example:

```js
const AppConfig = {
    devices: {},
    bearerToken: "Bearer <token here>",
    s3_url: "https://my-bucket.s3.eu-central-1.amazonaws.com/gpx",
    api_base: "https://tracking.example.com/api",
};
```

If your GPX files are stored in a folder-like prefix, include that prefix in the URL:

```js
s3_url: "https://my-bucket.s3.eu-central-1.amazonaws.com/tracks"
```

This will make GeoTrack request:

```text
https://my-bucket.s3.eu-central-1.amazonaws.com/tracks?list-type=2
```

and load GPX files such as:

```text
https://my-bucket.s3.eu-central-1.amazonaws.com/tracks/David_20.06.26.gpx
```

You can also use S3-compatible providers if they expose a compatible HTTP endpoint, for example:

- AWS S3
- Cloudflare R2
- MinIO
- Wasabi
- Backblaze B2 S3 API

Make sure the endpoint is configured so the browser can:

- list objects from the configured bucket or prefix
- fetch individual `.gpx` files
- pass CORS checks from your GeoTrack domain

### Map Config

`config/map-config.js` controls:

- map center and zoom
- device refresh interval
- available base layers
- start/end/shadow marker icons

## Running Locally

### Option 1: Docker Compose

```bash
docker compose up
```

Then open:

```text
http://localhost:8080
```

### Option 2: Any Static Web Server

You can also serve the project with any static file server, as long as `index.html`, `assets/`, and `config/` are available together.

## Using The App

### Open The Default Viewer

Visit:

```text
http://localhost:8080
```

If `main.gpx` exists in S3, it is displayed by default.

### Open A Specific GPX From The URL

Visit:

```text
http://localhost:8080/?file=David_20.06.26.gpx
```

If the file exists in the configured S3 bucket, it is loaded automatically and displayed on the map.

You can also provide a file from a subfolder if that is how it appears in the S3 listing, for example:

```text
http://localhost:8080/?file=runs/David_20.06.26.gpx
```

### Select A GPX Manually

Use the trace selector in the top-right corner of the map to switch between available GPX files.

### Hide The Current Trace

Choose `Aucune trace` in the selector to clear the map and elevation chart.

## S3 Requirements

For GPX loading to work correctly:

- the S3 bucket must be reachable from the browser
- bucket listing must be allowed for the configured URL
- GPX files must be publicly accessible or accessible through the same browser session
- CORS must allow the browser to fetch both the bucket listing and the GPX files

If bucket listing is blocked, the selector cannot be populated.

## Tracking API Requirements

The device markers depend on these endpoints:

- `GET {api_base}/devices/{id}`
- `GET {api_base}/positions?deviceId={id}`

The app sends the configured `bearerToken` as the `Authorization` header.

## Notes

- GPX files are loaded client-side, not processed by a backend service
- The app shows one GPX trace at a time
- The selected trace updates the URL so links can be shared easily
- If the requested `?file=` value is not found, the app falls back to `main.gpx` when available

## Development Notes

- Main UI entry point: [index.html](./index.html)
- Main logic: [assets/script.js](./assets/script.js)
- App config template: [config/app-config.js.example](./config/app-config.js.example)
- Map setup: [config/map-config.js](./config/map-config.js)
