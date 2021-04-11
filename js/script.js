function init() {
  window.map = L.map("map", {
    minZoom: 2,
    maxBounds: [
      [-180, -180],
      [180, 180],
    ],
    zoomControl: false,
  }).fitWorld();
  const sat = L.tileLayer.provider("Esri.WorldImagery").addTo(map);
}

$(function () {
  init();
});
