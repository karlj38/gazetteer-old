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

function curl($url)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL, $url);
    $result = curl_exec($ch);
    curl_close($ch);
    return $result;
}

function openCage($search)
{
    global $opencage;
    $search = urlencode($search);
    $url = "https://api.opencagedata.com/geocode/v1/json?q=$search&pretty=1&limit=1&key=$opencage";
    return curl($url);
}

function getGeoCode()
{
    if (($lat = $_GET["lat"] ?? null) && ($lng = $_GET["lng"] ?? null)) {
        $geocode =  json_decode(opencage("$lat+$lng"));
        if ($geocode->status->code === 200) {
            $result = $geocode->results[0];
            if ($continent = $result->components->continent ?? null) {
                if ($continent === "Antarctica") {
                    $result->components->country = "Antarctica";
                    $result->components->country_code = "AQ";
                } elseif ($result->components->country === "Côte d'Ivoire") {
                    $result->components->country = "Ivory Coast";
                }
                return json_encode($result);
            }
        }
    }
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
