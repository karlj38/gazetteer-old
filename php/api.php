<?php
include "functions.php";

ini_set("display_errors", "1");
error_reporting(E_ALL);

if ($api = $_GET["get"] ?? null) {
    switch ($api) {
        case "countryList":
            echo getCountrylist();
            break;
            // case "geocode":
            //     echo getGeoCode();
            //     break;
        case "country":
            echo getCountry();
            break;
        case "borders":
            echo getBorders();
            break;
        case "currencies":
            echo getCurrencies();
            break;
        case "mountains":
            echo getGeonamesTop10("mountains");
            break;
        case "cities":
            echo getGeonamesTop10("cities");
            break;
            // case "weather":
            //     echo getWeather();
            //     break;
        case "medals":
            echo getMedals();
            break;
        case "movies":
            echo getMovies();
            break;
        case "universities":
            echo getUniversities();
            break;
    }
}
