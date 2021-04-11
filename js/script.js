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
  });
}

function submitForm(event) {
  event.preventDefault();
  const search = $("#countryList").val();
  validateSearch(search);
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

function getCountry() {}

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
