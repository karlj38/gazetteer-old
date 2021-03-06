function init() {
  headerHeight = $("header").outerHeight();
  mapHeight = $(window).outerHeight() - headerHeight;
  $("#map").outerHeight(mapHeight);
  window.map = L.map("map", {
    minZoom: 2,
    maxBounds: [
      [-180, -180],
      [180, 180],
    ],
    zoomControl: false,
  }).fitWorld();
  window.countryMarker = L.marker();
  window.cityMarkers = L.layerGroup();
  window.mountainMarkers = L.layerGroup();
  window.universityMarkers = L.layerGroup();
  window.covidMarkers = L.layerGroup();
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
  map.removeLayer(cityMarkers);
  map.removeLayer(mountainMarkers);
  map.removeLayer(universityMarkers);
  map.removeLayer(covidMarkers);
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
  countryMarker = L.marker([lat, lng], {
    icon: countryIcon,
    title: countryName,
  }).addTo(map);

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
      cities();
      mountains();
      medals();
      movies();
      universities();
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

function closePanel() {
  $("#map").animate({ height: "+=33vh" });
  $("#infoContainer").slideToggle();
  $("#expand").text("Learn more");
}

function countryInfo() {
  country = {};
  country["Country Code"] = countryData.components.country_code;
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
  $("#infoSection").append(`<p>
  Source
  <a href="https://www.geonames.org/" target="_blank">GeoNames</a> &
  <a href="https://opencagedata.com/" target="_blank">OpenCage</a>
</p>`);
}

function currencies() {
  if ((currency = countryData.annotations.currency || null)) {
    const symbol = currency.html_entity || currency.symbol || null;
    const code = currency.iso_code || null;
    const name = currency.name || null;
    const sub = currency.subunit || null;

    if (code) {
      displayCurrency({
        symbol,
        code,
        name,
        sub,
      });
      displayRates(code);
    }
  }
}

function displayCurrency({ symbol, code, name, sub }) {
  $("#infoContainer div.row").append(
    `<div id="currencySection" class="col-md-4 border"></div>`
  );
  $("#currencySection").append(`<h2>Finance</h2>`);
  $("#currencySection").append(
    `<table class="table table-sm table-hover"></table>`
  );
  $("#currencySection table").append(`<tbody id="currencies"></tbody>`);
  $mainCurrency = $("<tr></tr>");
  const flag = code === "EUR" ? "svg\\Europe.svg" : countryData.rest.flag;
  $mainCurrency.append(`<td><img src="${flag}" class="currencyFlag" /></td>`);
  $mainCurrency.append(`<th scope='row'>${code}</th>`);
  $mainCurrency.append(`<td>${name} (${symbol} / ${sub})</td>`);
  $("#currencies").append($mainCurrency);
}

function displayRates(code) {
  $.getJSON(
    "php/api",
    { get: "currencies", base: code },
    function (data, status) {
      if (data.success) {
        for (const currency in data.rates) {
          const rate = Number(data.rates[currency]).toFixed(3);
          const flag = data.flags[currency];
          $currency = $("<tr/>");
          $currency.append(`<td><img src='${flag}' class='currencyFlag'></td>`);
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

function mountains() {
  const countryCode = countryData.components.country_code;
  $.getJSON(
    "php/api",
    { get: "mountains", countryCode: countryCode },
    function (data, status) {
      let mountains = [];
      const mountainIcon = L.ExtraMarkers.icon({
        prefix: "fa",
        icon: "fa-mountain",
        markerColor: "green",
      });

      data.forEach((mountain) => {
        const mountainMarker = L.marker([mountain.lat, mountain.lng], {
          icon: mountainIcon,
          title: mountain.name,
        });

        let details = `<h2>${mountain.name}</h2>`;
        let elevation = mountain.elevation || null;
        elevation = elevation ? elevation + " m" : "undefined";
        details += `<p><strong>Elevation:</strong> ${elevation} </p>`;
        if (mountain.wiki) {
          details += `<p><a href="${mountain.wiki}" target="_blank">Wikipedia</a></p>`;
        }

        mountainMarker.bindPopup(details);
        mountains.push(mountainMarker);
      });
      window.mountainMarkers = L.layerGroup(mountains).addTo(map);
    }
  );
}

function cities() {
  const countryCode = countryData.components.country_code;
  $.getJSON(
    "php/api",
    { get: "cities", countryCode: countryCode },
    function (data, status) {
      let cities = [];

      data.forEach((city) => {
        const cityIcon = L.ExtraMarkers.icon({
          prefix: "fa",
          icon: "fa-city",
          markerColor:
            city.name === countryData.rest.capital ? "red" : "yellow",
        });
        const cityMarker = L.marker([city.lat, city.lng], {
          icon: cityIcon,
          title: city.name,
        });

        let details = `<h2>${city.name}</h2>`;
        if (city.name === countryData.rest.capital) {
          details += `<p class="lead">Capital</p>`;
        }
        details += `<p><strong>Population:</strong> ${city.population}</p>`;
        if (city.wiki) {
          details += `<p><a href="${city.wiki}" target="_blank">Wikipedia</a></p>`;
        }
        if (city.weather) {
          details += weather(city.weather);
        }

        cityMarker.bindPopup(details);
        cities.push(cityMarker);
      });
      window.cityMarkers = L.layerGroup(cities).addTo(map);
    }
  );
}

function weather(weather) {
  w = `
  <h3>Current Weather</h3>
    <table id="weather" class="table">
      <tbody>
      ${buildWeather(weather)}
      </tbody>
    </table>
    <p>Source <a href="https://openweathermap.org/" target="_blank">OpenWeather</a></p>`;
  // console.log(w);
  return w;
}

function buildWeather(weather) {
  // console.log(weather);
  const summaryIcon = `<i class="wi wi-owm-${weather.weather[0].id}"></i>`;
  let summary = weather.weather[0].description;
  summary = summary[0].toUpperCase() + summary.slice(1);
  const currentTemp = Math.round(weather.main.temp);
  const feels = Math.round(weather.main.feels_like);
  const max = Math.round(weather.main.temp_max);
  const min = Math.round(weather.main.temp_min);
  const windDirIcon = `<i class = "wi wi-wind from-${weather.wind.deg}-deg"></i>`;
  const windDir = weather.wind.deg;
  const wind = Math.round(weather.wind.speed);
  const pressure = weather.main.pressure;
  const humidity = weather.main.humidity;
  const sunrise = convertTime(weather.sys.sunrise);
  const sunset = convertTime(weather.sys.sunset);
  let $result = `
  <tr>
    <td class="summary">${summaryIcon} ${summary}</td>
    <td ><span class="summary">${currentTemp}<i class = "wi wi-celsius"></i> </span>Feels like ${feels}<i class = "wi wi-celsius"></i></td>
  </tr>
  <tr>
    <td><i class = "wi wi-thermometer"></i> ${max}<i class = "wi wi-celsius"></i></td>
    <td><i class = "wi wi-thermometer-exterior"></i> ${min}<i class = "wi wi-celsius"></i></td>
  </tr>
  <tr>
    <td><i class= "wi wi-strong-wind"></i> ${wind} m/s</td>
    <td>${windDirIcon} ${windDir}&#176;</td>
  </tr>
  <tr>
    <td><i class = "wi wi-humidity"></i> ${humidity} % </td>
    <td><i class = "wi wi-barometer"></i> ${pressure} hPa</td>
  </tr>
  <tr>
  <td><i class = "wi wi-sunrise"></i> ${sunrise}</td>
  <td><i class = "wi wi-sunset"></i> ${sunset}</td>
  </tr>`;
  return $result;
}

function convertTime(unix) {
  const d = new Date(unix * 1000);
  let hours = d.getHours();
  hours = hours < 10 ? `0${hours}` : hours;
  let mins = d.getMinutes();
  mins = mins < 10 ? `0${mins}` : mins;
  return `${hours}:${mins}`;
}

function medals() {
  $.getJSON(
    "php/api",
    { get: "medals", country: countryName },
    function (data, status) {
      $("#infoContainer div.row").append(
        `<div id="medalsSection" class="col-md-4 border"></div>`
      );
      $("#medalsSection").append(`<h2>Olympic Medals</h2>`);
      $("#medalsSection").append(
        `<table class="table table-sm table-hover"></table>`
      );

      const header = `
      <thead>
        <tr>
          <th></th>
          <th scope="col" class="text-center">Total</th>
          <th scope="col" class="text-center">Summer</th>
          <th scope="col" class="text-center">Winter</th>
        </tr>
    </thead>`;
      $("#medalsSection table").append(header);
      $("#medalsSection table").append(`<tbody id="medals"></tbody>`);

      let rows = `<tr>
      <td class="text-center"><img src="svg/Gold_medal.svg"></td>
      <td class="text-center">${data.gold}</td>
      <td class="text-center">${data.so_gold}</td>
      <td class="text-center">${data.wo_gold}</td>
      </tr>`;
      rows += `<tr>
      <td class="text-center"><img src="svg/Silver_medal.svg"></td>
      <td class="text-center">${data.silver}</td>
      <td class="text-center">${data.so_silver}</td>
      <td class="text-center">${data.wo_silver}</td>
      </tr>`;
      rows += `<tr>
      <td class="text-center"><img src="svg/Bronze_medal.svg"></td>
      <td class="text-center">${data.bronze}</td>
      <td class="text-center">${data.so_bronze}</td>
      <td class="text-center">${data.wo_bronze}</td>
      </tr>`;
      rows += `<tr>
      <td class="text-center"><img src="svg/GoldSilverBronze_medals.svg"></td>
      <td class="text-center">${data.medal}</td>
      <td class="text-center">${data.so_medal}</td>
      <td class="text-center">${data.wo_medal}</td>
      </tr>`;
      $("#medals").append(rows);

      if (data.mostsuccessfulsport !== "-") {
        $("#medalsSection").append(
          `Most successful sport: ${data.mostsuccessfulsport}`
        );
      }

      $("#medalsSection").append(`<p>
      Source
      <a
        href="https://data.world/johayes13/summer-winter-olympic-games/workspace/file?filename=Olympics.csv"
        target="_blank"
        >data.world</a
      >
    </p>`);
    }
  );
}

function movies() {
  $.getJSON(
    "php/api",
    { get: "movies", country: countryName },
    function (data, status) {
      // console.log(data);
      if (data.length) {
        buildMovieCarousel();
        fillMovieCarousel(data);
      }
    }
  );
}

function buildMovieCarousel() {
  $("#infoContainer .row").append(
    `<div id="movieSection" class="col border"></div>`
  );
  $("#movieSection").append(`<h2>Notable Movies</h2>`);
  $("#movieSection").append(
    `<div id="movieCarousel" class="carousel slide" data-ride="carousel"></div`
  );
  $("#movieCarousel").append(
    `<div id="carouselInsert" class="carousel-inner"></div>`
  );
  $("#movieCarousel").append(`<a
  class="carousel-control-prev"
  href="#movieCarousel"
  role="button"
  data-slide="prev"
>
  <span
    class="carousel-control-prev-icon"
    aria-hidden="true"
  ></span>
  <span class="sr-only">Previous</span>
</a>`);
  $("#movieCarousel").append(`<a
  class="carousel-control-next"
  href="#movieCarousel"
  role="button"
  data-slide="next"
>
  <span
    class="carousel-control-next-icon"
    aria-hidden="true"
  ></span>
  <span class="sr-only">Next</span>
</a>`);
}

function fillMovieCarousel(data) {
  data.forEach((movie, i) => {
    details = `
    <div class="carousel-item ${i == 0 ? "active" : ""}">
      <div class="container">
        <div class = "row">
          <div class="d-none d-md-flex col-md-6 justify-content-center">
          <a href="https://www.imdb.com/title/${
            movie.imdbID
          }" target="_blank" class="float-left mr-3 mb-3"><img src="${
      movie.poster
    }"></a>
          </div>
          <div class="col-md-6 movieDesc">
          <a href="https://www.imdb.com/title/${
            movie.imdbID
          }" target="_blank" class="d-md-none float-left mr-3 mb-3"><img src="${
      movie.poster
    }"></a>
            <p class="lead"><a href="https://www.imdb.com/title/${
              movie.imdbID
            }" target="_blank">${movie.Title}, ${movie.Year} (${
      movie.Runtime
    })</a></p>
            <p>IMDb Rating: ${movie.imdbRating}</p>
            <p>Awards: ${movie.Awards}</p>
            <p>Starring: ${movie.Actors}</p>
            <p class=" float-left float-md-none">Source <a href="https://www.imdb.com/" target="_blank">IMDb</a> 
            via <a href="https://data.world/studentoflife/imdb-top-250-lists-and-5000-or-so-data-records/workspace/file?filename=IMDB_Top250movies2_OMDB_Detailed.csv" target="_blank">data.world</a> 
            & <a href="https://www.omdbapi.com/" target="_blank">OMDb API</a></p>
          </div>
        </div>
      </div>
    </div>`;
    $("#carouselInsert").append(details);
  });
}

function universities() {
  $.getJSON(
    "php/api",
    { get: "universities", country: countryName },
    function (data, status) {
      console.log(data);
      let unis = [];
      const uniIcon = L.ExtraMarkers.icon({
        prefix: "fa",
        icon: "fa-university",
        markerColor: "black",
      });

      data.forEach((uni) => {
        const uniMarker = L.marker([uni.lat, uni.lng], {
          icon: uniIcon,
          title: uni.uni,
        });
        let details = `<h2>${uni.uni}</h2>`;
        details += `<p><strong>World Rank:</strong> ${uni.world}</p>`;
        details += `<p><strong>National Rank:</strong> ${uni.nat}</p>`;
        details += `<p><a href="${uni.wiki}" target="_blank">Wikipedia</a></p>`;
        details += `<p>Source <a href="https://cwur.org/2020-21.php">CWUR (2020-2021)</a> via <a href="https://data.world/proydu/world-university-rankings-2020-21" target="_blank">data.world</a></p>`;
        uniMarker.bindPopup(details);
        unis.push(uniMarker);
      });
      window.universityMarkers = L.layerGroup(unis).addTo(map);
    }
  );
}

function covid() {
  resetMap();
  $.getJSON("php/api", { get: "covid" }, function (data, status) {
    console.log(data);
    data.sort((a, b) => b.cases - a.cases);
    data.forEach((country) => {
      const r = Math.sqrt(country.cases) * 1500;
      const details = `
      <h2>${country.countryName} <img src="${country.flag}" class="thumbnail"></h2>
      <p>Data from ${country.fromDate} to ${country.toDate}</p>
      <p><strong>Recent cases : </strong> ${country.cases}</p>
      <p><strong>Recent deaths : </strong> ${country.deaths}</p>
      <p>Source <a href="https://github.com/CSSEGISandData/COVID-19" target="_blank">John Hopkins University</a> via <a href="https://covidapi.info" target="_blank">covidapi.info</a></p>
    `;
      let covidPopup = L.popup()
        .setLatLng([country.lat, country.lng])
        .setContent(details);
      let area = L.circle([country.lat, country.lng], {
        radius: r,
        color: "#f00",
        weight: 1,
      })
        .bindPopup(covidPopup)
        .addTo(covidMarkers)
        .on("click", onMapClick)
        .on("mouseover", function (e) {
          this.openPopup();
        });
    });
    covidMarkers.addTo(map);
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
