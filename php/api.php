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
            echo geonamesTop10("mountains");
            break;
        case "cities":
            echo geonamesTop10("cities");
            break;
    }
}
