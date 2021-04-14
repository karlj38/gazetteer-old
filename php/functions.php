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

function restCountry($code)
{
    $url = "https://restcountries.eu/rest/v2/alpha/$code";
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
                    $result->components->country_code = "AQ";
                } elseif ($result->components->country_code === "ci") {
                    $result->components->country = "Ivory Coast";
                }
                $country = $country ?? $result->components->country;
                $wikiResult = json_decode(Wiki($country));
                $result->wiki = $wikiResult[3][0] ?? null;

                $countryCode = strtoupper($result->components->country_code);
                $result->components->country_code = $countryCode;
                $restResult = json_decode(restCountry($countryCode));

                $result->rest = $restResult ?? null;
                return json_encode($result);
            }
        }
    }
}

function getBorders()
{
    if ($code = $_GET["countryCode"] ?? null) {
        $json =  file_get_contents("../json/countries.geojson");
        $data = json_decode($json)->features;
        foreach ($data as $country) {
            if ($country->properties->ISO_A2 === $code) {
                return json_encode($country);
            }
        }
    }
}

function getCurrencies()
{
    if ($base = $_GET["base"] ?? null) {
        $url = "https://api.exchangerate.host/latest?base=$base&symbols=AUD,CAD,CHF,CNY,EUR,GBP,HKD,JPY,USD";
        $ratesResult = curl($url);
        $ratesResult = json_decode($ratesResult);
        $flags = ["AUD" => "svg\Australia.svg", "CAD" => "svg\Canada.svg", "CHF" => "svg\Switzerland.svg", "CNY" => "svg\China.svg", "EUR" => "svg\Europe.svg", "GBP" => "svg\UK.svg", "HKD" => "svg\Hong_Kong.svg", "JPY" => "svg\Japan.svg", "USD" => "svg\USA.svg"];
        if ($ratesResult->success) {
            $ratesResult->flags = $flags;
            return json_encode($ratesResult);
        }
    }
}

function getGeonamesTop10($feature)
{
    global $geonames;
    switch ($feature) {
        case "cities":
            $featureClass = "P";
            $order = "population";
            break;
        case "mountains":
            $featureClass = "T";
            $order = "elevation";
            break;
    }
    if ($code = $_GET["countryCode"] ?? null) {
        $url = "http://api.geonames.org/searchJSON?featureClass=$featureClass&maxRows=10&orderby=$order&country=$code&style=full&username=$geonames";
        $top10 =  json_decode(curl($url));
        if ($top10->totalResultsCount > 0) {
            $geonames = $top10->geonames;
            for ($i = 0; $i < count($geonames); $i++) {
                $geoname = $geonames[$i];
                if ($list = $geoname->alternateNames ?? null) {
                    foreach ($list as $index => $value) {
                        if ($value->lang === "link") {
                            $geoname->wiki = $value->name;
                            break;
                        }
                    }
                }
                if (!isset($geoname->wiki)) {
                    $featureName = $geoname->name;
                    $wikiResult = json_decode(Wiki($featureName));
                    $top10->geonames[$i]->wiki = $wikiResult[3][0] ?? null;
                }
            }
            return json_encode($top10->geonames);
        }
    }
}

function getWeather()
{
    global $weather;
    if (($location = $_GET["location"] ?? null) &&  ($country = $_GET["country"] ?? null)) {
        $url = "https://api.openweathermap.org/data/2.5/weather?q=$location,$country&units=metric&appid=$weather";
        $result = json_decode(curl($url));
        if ($result->cod === 200) {
            return json_encode($result);
        }
    }
}
