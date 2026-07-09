if (typeof mapboxgl === "undefined") {
  console.error("Mapbox GL JS is not loaded.");
} else if (typeof mapToken === "undefined" || !mapToken) {
  console.error("Mapbox token is missing.");
} else if (
  typeof coordinates === "undefined" ||
  !Array.isArray(coordinates) ||
  coordinates.length !== 2
) {
  console.error("Coordinates are missing or invalid:", coordinates);
} else {
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  const validCoordinates =
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90 &&
    !(lng === 0 && lat === 0);

  if (!validCoordinates) {
    console.error("Invalid listing coordinates:", coordinates);
  } else {
    const listingCoordinates = [lng, lat];

    console.log("Listing Coordinates:", listingCoordinates);

    mapboxgl.accessToken = mapToken;

    const mapContainer = document.getElementById("map");

    if (!mapContainer) {
      console.error("Map container #map not found.");
    } else {
      const map = new mapboxgl.Map({
        container: mapContainer,
        style: "mapbox://styles/mapbox/streets-v12",
        center: listingCoordinates,
        zoom: 12,
      });

      map.addControl(new mapboxgl.NavigationControl());

      const marker = new mapboxgl.Marker()
        .setLngLat(listingCoordinates)
        .addTo(map);

      map.on("load", () => {
        console.log("Map loaded successfully.");
        console.log("Marker Coordinates:", listingCoordinates);

        map.resize();
      });

      map.on("error", (event) => {
        console.error("Mapbox Error:", event.error);
      });
    }
  }
}