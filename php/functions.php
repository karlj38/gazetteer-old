<?php

include "keys.php";

function getCountryList()
{
    $json =  file_get_contents("../json/countryBorders.geo.json");
    $data = json_decode($json)->features;
    $countries = [];

    foreach ($data as $country) {
        $name = $country->properties->name;
        $code = $country->properties->iso_a2;
        array_push($countries, [$name, $code]);
    }
    sort($countries);
    return json_encode($countries);
}

function getBorders()
{
    if ($code = $_REQUEST["countryCode"] ?? null) {
        $json =  file_get_contents("../json/countries.geojson");
        $data = json_decode($json)->features;
        foreach ($data as $country) {
            if ($country->properties->ISO_A2 === $code) {
                return json_encode($country);
            }
        }
    }
}
