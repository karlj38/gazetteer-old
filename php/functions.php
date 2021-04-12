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

// function getGeoCode()
// {
//     if (($lat = $_GET["lat"] ?? null) && ($lng = $_GET["lng"] ?? null)) {
//         $geocode =  json_decode(opencage("$lat+$lng"));
//         if ($geocode->status->code === 200) {
//             $result = $geocode->results[0];
//             if ($continent = $result->components->continent ?? null) {
//                 if ($continent === "Antarctica") {
//                     $result->components->country = "Antarctica";
//                     $code = "ISO_3166-1_alpha-2";
//                     $result->components->$code = "AQ";
//                 } elseif ($result->components->country === "Côte d'Ivoire") {
//                     $result->components->country = "Ivory Coast";
//                 }
//                 return json_encode($result);
//             }
//         }
//     }
// }

function Wiki($search)
{
    $search = urlencode($search);
    $url = "https://en.wikipedia.org/w/api.php?action=opensearch&search=$search&limit=1";
    return curl($url);
}

function getCountry()
{
    if (($lat = $_GET["lat"] ?? null) && ($lng = $_GET["lng"] ?? null)) {
        $opencage = opencage("$lat+$lng");
    } elseif ($country = $_GET["country"] ?? null) {
        $opencage = opencage($country);
    }
    $opencage = json_decode($opencage);
    if (($status = $opencage->status->code ?? null) && $status === 200) {
        if ($result = $opencage->results[0] ?? null) {
            if ($continent = $result->components->continent ?? null) {
                if ($continent === "Antarctica") {
                    $result->components->country = "Antarctica";
                    $code = "ISO_3166-1_alpha-2";
                    $result->components->$code = "AQ";
                } elseif ($result->components->country === "Côte d'Ivoire") {
                    $result->components->country = "Ivory Coast";
                }
                $country = $result->components->country;
                $wikiResult = json_decode(Wiki($country));
                $result->wiki = $wikiResult[3][0] ?? null;
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
