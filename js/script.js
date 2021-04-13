function init() {
  window.map = L.map("map", {
    minZoom: 2,
    maxBounds: [
      [-180, -180],
      [180, 180],
    ],
    zoomControl: false,
  }).fitWorld();
  window.countryMarker = L.marker();
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

  map.on("locationfound", onLocationFound);
  map.on("locationerror", onLocationError);
  map.locate();

  map.on("click", onMapClick);
}

function onLocationFound(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  getCountry({ lat, lng });
}

function onLocationError(e) {
  alert(e.message);
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
    getCountry({ countryName });
  } else {
    alert("Not a valid country");
  }
}

function submitForm(event) {
  event.preventDefault();
  const search = $("#countryList").val();
  validateSearch(search);
}

function onMapClick(e) {
  const lat = e.latlng.lat % 90;
  const lng = e.latlng.lng > 180 ? e.latlng.lng - 360 : e.latlng.lng;
  getCountry({ lat, lng });
}

// function geocode(lat, lng) {
//   if (lat && lng) {
//     console.log(lat, lng);
//     $.getJSON("php/api", { get: "geocode", lat, lng }, function (data, status) {
//       console.log(data);
//       window.countryName = data.components.country;
//       window.countryCode = data.components["ISO_3166-1_alpha-2"];
//       getCountry();
//     }).fail(function () {
//       alert("Geocode error");
//     });
//   }
// }

function getCountry({ countryName, lat, lng }) {
  resetMap();
  let params = { get: "country" };
  if (countryName) {
    params.country = countryName;
  } else if (lat && lng) {
    params.lat = lat;
    params.lng = lng;
  }
  $.getJSON("php/api", params, function (data, status) {
    console.log(data);
    if (lat && lng) {
      window.countryName = data.components.country;
      window.countryCode = data.components.country_code.toUpperCase();
    }
    window.countryData = data;
    document.title = `Gazetteer | ${window.countryName}`;
    location.hash = window.countryName;
    getBorders();
    countryPopup();
  });
}

function resetMap() {
  $("#infoContainer > .row").empty();
  if ($("#infoContainer").css("display") === "block") {
    closePanel();
  }
  if (window.borders) {
    map.removeLayer(borders);
  }
  map.removeLayer(countryMarker);
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

function countryPopup() {
  const lat = countryData.rest.latlng[0];
  const lng = countryData.rest.latlng[1];
  const flag = countryData.rest.flag;

  const countryIcon = L.ExtraMarkers.icon({
    prefix: "fa",
    icon: "fa-flag",
    markerColor: "blue",
  });
  countryMarker = L.marker([lat, lng], { icon: countryIcon }).addTo(map);

  let content = `<h1 class="text-center">${countryName}</h1>`;
  content += `<button id="expand" class="btn btn-primary text-center mx-auto d-block" onclick="moreInfo()">Learn more</button>`;
  countryMarker.bindPopup(content).openPopup();

  $(".leaflet-popup-content-wrapper")
    .prepend(`<img src="${flag}" class="w-100">`)
    .addClass("pt-0 px-0 overflow-hidden");

  countryMarker.on("popupopen", function () {
    if ($("#infoContainer").css("display") === "block") {
      $("#expand").text("Hide panel");
    } else {
      $("#expand").text("Learn more");
    }
  });
}

function moreInfo() {
  if ($("#infoContainer").css("display") === "none") {
    openPanel();
    if (!$("#infoSection").length) {
      countryInfo();
      currencies();
    }
  } else {
    closePanel();
  }
}

function openPanel() {
  $("#map").animate({ height: "-=33vh" });
  $("#infoContainer").slideToggle();
  $("#expand").text("Hide panel");
}

function countryInfo() {
  country = {};
  country["Country Code"] = countryCode;
  country.Capital = countryData.rest.capital || null;
  country.Continent = countryData.components.continent || null;
  country.Population = countryData.rest.population || null;
  const landarea = countryData.rest.area || null;
  country["Land Area"] = landarea ? `${landarea} km<sup>2</sup>` : null;
  const tz = countryData.annotations.timezone.short_name || null;
  let offset = countryData.annotations.timezone.offset_string || null;
  offset = offset ? `(${offset})` : null;
  country["Time Zone"] = `${tz} ${offset}`;
  callcode = countryData.annotations.callingcode || null;
  country["Calling Code"] = callcode ? `+${callcode}` : null;
  country["TLD"] = countryData.rest.topLevelDomain || null;
  country.Demonym = countryData.rest.demonym || null;
  const wiki = countryData.wiki || null;
  country.Wikipedia = wiki
    ? `<a href="${wiki}" target="_blank">Wikipedia</a>`
    : null;
  let langArr = [];
  countryData.rest.languages.forEach((lang) => langArr.push(lang.name));
  country.Language = langArr.join(", ");

  let properties = Object.keys(country).sort();
  let countryDetails = {};
  properties.forEach((prop) => (countryDetails[prop] = country[prop]));

  $("#infoContainer div.row").append(
    `<div id="infoSection" class="col-md-4 border"></div>`
  );
  $("#infoSection").append(`<h2>Country Information</h2>`);
  $("#infoSection").append(
    `<table class="table table-sm table-hover"></table>`
  );
  $("#infoSection table").append(`<tbody></tbody>`);

  for (let key in countryDetails) {
    if (countryDetails[key]) {
      $("#infoSection tbody").append(`<tr></tr>`);
      $("#infoSection tr:last-child").append(`<th scope"row">${key}</th>`);
      $("#infoSection tr:last-child").append(
        `<td >${countryDetails[key]}</td>`
      );
    }
  }
}

function currencies() {
  if ((currency = countryData.annotations.currency || null)) {
    const currencySymbol = currency.html_entity || currency.symbol || null;
    const currencyCode = currency.iso_code || null;
    const currencyName = currency.name || null;
    const currencySub = currency.subunit || null;

    if (currencyCode) {
      $("#infoContainer div.row").append(
        `<div id="currencySection" class="col-md-4 border"></div>`
      );
      $("#currencySection").append(`<h2>Finance</h2>`);
      $("#currencySection").append(
        `<table class="table table-sm table-hover"></table>`
      );
      $("#currencySection table").append(`<tbody id="currencies"></tbody>`);
      $mainCurrency = $("<tr></tr>");
      $mainCurrency.append(
        `<td><img src="${countryData.rest.flag}" class="currencyFlag" /></td>`
      );
      $mainCurrency.append(`<th scope='row'>${currencyCode}</th>`);
      $mainCurrency.append(
        `<td>${currencyName} (${currencySymbol} / ${currencySub})</td>`
      );
      $("#currencies").append($mainCurrency);
    }
    $.getJSON(
      "php/api",
      { get: "currencies", base: currencyCode },
      function (data, status) {
        console.log(data);
        if (data.success) {
          for (const currency in data.rates) {
            const rate = Number(data.rates[currency]).toFixed(3);
            const flag = data.flags[currency];
            $currency = $("<tr/>");
            $currency.append(
              `<td><img src='${flag}' class='currencyFlag'></td>`
            );
            $currency.append(`<th scope='row'>${currency}</th>`);
            $currency.append(`<td>${rate}</td>`);
            $("#currencies").append($currency);
          }
          $("#currencySection").append(`<p>
            Source
            <a href="https://exchangerate.host" target="_blank"
              >exchangerate.host</a
            >
          </p>`);
        } else {
          $("#currencySection").append(`<p>
            <a href="https://exchangerate.host" target="_blank"
              >exchangerate.host unavailable</a
            >
          </p>`);
        }
      }
    );
  }
}

function closePanel() {
  $("#map").animate({ height: "+=33vh" });
  $("#infoContainer").slideToggle();
  $("#expand").text("Learn more");
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
