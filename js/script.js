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
  const night = L.tileLayer.provider("NASAGIBS.ViirsEarthAtNight2012");
  const street = L.tileLayer.provider("Jawg.Streets", {
    accessToken:
      "Kyyk5x2h2cziidv4NudH48i2lgxN5j1e3lo5CtRHb8th7m5mbfxeq7qB71thO2ZE",
  });
  const dark = L.tileLayer.provider("Jawg.Dark", {
    accessToken:
      "Kyyk5x2h2cziidv4NudH48i2lgxN5j1e3lo5CtRHb8th7m5mbfxeq7qB71thO2ZE",
  });
  const baseLayers = {
    Streets: street,
    Dark: dark,
    Satellite: sat,
    Night: night,
  };

  L.control.layers(baseLayers).addTo(map);
  L.control.zoom({ position: "bottomleft" }).addTo(map);
}

function getCountryList() {
  $.getJSON("php/api", { get: "countryList" }, function (data, status) {
    data.forEach((country) => {
      const id = country[0].replace(/ /g, "-");
      $("#countries").append(
        `<option id="${id}" value="${country[0]}" data="${country[1]}">${country[0]}</option>`
      );
    });
  }).then(checkURLHash);
}

function checkURLHash() {
  if (location.hash) {
    hash = decodeURI(location.hash.substring(1));
    validateSearch(hash);
  }
}

function validateSearch(search) {
  const countryId = search.replace(/ /g, "-");
  if ($(`#${countryId}`).length) {
    window.countryName = search;
    window.countryCode = $(`#${countryId}`).attr("data");
    document.title = `Gazetteer | ${countryName}`;
    location.hash = countryName;
    console.log(countryName, countryCode);
    getCountry();
  } else {
    alert("Not a valid country");
  }
}

function submitForm(event) {
  event.preventDefault();
  const search = $("#countryList").val();
  validateSearch(search);
}

function getCountry() {
  resetMap();
  getBorders();
}

function resetMap() {
  if (window.borders) {
    map.removeLayer(borders);
  }
}

function getBorders() {
  $.getJSON(
    "php/api",
    { get: "borders", countryCode: countryCode },
    function (data, status) {
      let borders = [];
      if (data.geometry.type === "MultiPolygon") {
        data.geometry.coordinates.forEach((poly) => {
          let coords = [];
          poly[0].forEach((coord) => {
            const lat = coord[1];
            const lng = coord[0];
            coords.push([lat, lng]);
          });
          borders.push(coords);
        });
      } else {
        data.geometry.coordinates[0].forEach((coord) => {
          const lng = coord[0];
          const lat = coord[1];
          borders.push([lat, lng]);
        });
      }
      map.flyToBounds(borders);
      window.borders = L.polygon(borders).addTo(map);
    }
  ).fail(function () {
    alert(`Borders not found (${countryCode})`);
  });
}

$(function () {
  getCountryList();
  init();
});

$(window).on("load", function () {
  if ($("#preloader").length) {
    $("#preloader")
      .delay(100)
      .fadeOut("slow", function () {
        $(this).remove();
      });
  }
});
