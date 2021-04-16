<?php

include "keys.php";

// $link = new mysqli("localhost", $dbLogin, $dbPassword, "gazetteer");
$link = new mysqli($host_name, $user_name, $password, $database);
if ($link->connect_error) {
    die('<p>Failed to connect to MySQL: ' . $link->connect_error . '</p>');
} else {
    // echo '<p>Connection to MySQL server successfully established.</p>';
}

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
                $location = $geoname->name;
                if (!isset($geoname->wiki)) {
                    $wikiResult = json_decode(Wiki($location));
                    $top10->geonames[$i]->wiki = $wikiResult[3][0] ?? null;
                }
                $top10->geonames[$i]->weather = getWeather($location, $code) ?? null;
            }
            return json_encode($top10->geonames);
        }
    }
}

function getWeather($location, $country)
{
    global $weather;
    $url = "https://api.openweathermap.org/data/2.5/weather?q=$location,$country&units=metric&appid=$weather";
    $result = json_decode(curl($url));
    if ($result->cod === 200) {
        return $result;
    }
}

function getMedals()
{
    global $link;
    if ($country = $_GET["country"] ?? null) {
        $sql = "SELECT * FROM olympics WHERE nation = '$country'";
        $query = $link->query($sql);
        if ($query->num_rows > 0) {
            $row = $query->fetch_assoc();
            return json_encode($row);
        }
    }
}

function getMovies()
{
    global $link;
    if ($country = $_GET["country"] ?? null) {
        $movies = [];

        $country = ($country === "United States") ? "USA" : $country;
        $country = ($country === "United Kingdom") ? "UK" : $country;

        $sql = "SELECT Title, Year, Ranking, Runtime, Actors, Awards, imdbRating, imdbID FROM movies WHERE Country LIKE '%$country%' ORDER BY 'Ranking' LIMIT 10";
        $query = $link->query($sql);
        if ($query->num_rows > 0) {
            while ($row = $query->fetch_assoc()) {
                $title = $row["Title"];
                $year = $row["Year"];

                $searchResults = json_decode(searchMovie($title, $year));
                if ($poster = $searchResults->results[0]->poster_path ?? null) {
                    $row["poster"] = "https://image.tmdb.org/t/p/w300$poster";
                    array_push($movies, $row);
                }
            }
            echo json_encode($movies);
        }
    }
}

function searchMovie($q, $y)
{
    global $tmdb;
    $q = urlencode($q);
    $url = "https://api.themoviedb.org/3/search/movie?api_key=$tmdb&query=$q&year=$y";
    return curl($url);
}

function getUniversities()
{
    global $link;
    global $geonames;
    if (($country = $_GET["country"] ?? null)) {
        $country = ($country === "United States") ? "USA" : $country;
        $output = [];

        $sql = "SELECT * FROM universities WHERE Location = '$country' LIMIT 20";
        $query = $link->query($sql);
        if ($query->num_rows > 0) {
            while ($row = $query->fetch_assoc()) {
                $uni = $row["institution"];
                $encoded = urlencode($uni);
                $url = "http://api.geonames.org/wikipediaSearchJSON?title=$encoded&maxRows=1&username=$geonames";
                $geonamesResult = json_decode(curl($url));
                $found = false;
                $from = "";

                $wiki = json_decode(Wiki($uni));
                $wikiLink = $wiki[3][0] ?? null;
                $wikiTitle = $wiki[1][0] ?? null;
                $wikiCheckLink = $geonamesResult->geonames[0]->wikipediaUrl ?? null;
                $wikiCheckTitle = $geonamesResult->geonames[0]->title ?? null;

                if ($wikiLink && $wikiTitle && $wikiCheckLink && $wikiCheckTitle && (strpos($wikiLink, $wikiCheckLink) > 0 || $wikiTitle === $wikiCheckTitle)) {
                    $found = true;
                    $lat = $geonamesResult->geonames[0]->lat;
                    $lng = $geonamesResult->geonames[0]->lng;
                    $from = "geo";

                    if ($found) {
                        if (count($output) < 10) {
                            array_push($output, [
                                "uni" => $row["institution"],
                                "from" => $from,
                                "world" => $row["world_rank"],
                                "nat" => $row["national_rank"],
                                "wiki" => $wikiLink,
                                "lat" => $lat,
                                "lng" => $lng
                            ]);
                        } else {
                            break;
                        }
                    }
                }
            }
            return json_encode($output);
        }
    }
}

function getCovid()
{
    $results = [];
    $yesterday = date("Y-m-d", time() - 60 * 60 * 24);
    $twoWeeksEarlier = date("Y-m-d", time() - 60 * 60 * 24 * 15);
    $covidURL = "https://covidapi.info/api/v1/global/timeseries/$twoWeeksEarlier/$yesterday";
    $covidData = json_decode(curl($covidURL));

    $countriesURL = "https://restcountries.eu/rest/v2";
    $countries = json_decode(curl($countriesURL));
    foreach ($covidData->result as $country => $data) {

        foreach ($countries as $restCountry => $restData) {
            if (($alpha3Code = $restData->alpha3Code ?? null) === $country) {
                $result = [];
                $result["countryName"] = $restData->name;
                $result["alpha2code"] = $restData->alpha2Code;
                $result["alpha3code"] = $alpha3Code;
                $result["lat"] = $restData->latlng[0];
                $result["lng"] = $restData->latlng[1];
                $result["flag"] = $restData->flag;

                $mostRecent = count($covidData->result->$country) - 1;
                $historic = ($mostRecent - 7 < 0) ? 0 : ($mostRecent - 7);
                $latestCases = $covidData->result->$country[$mostRecent]->confirmed;
                $historicCases = $covidData->result->$country[$historic]->confirmed;
                $latestDeaths = $covidData->result->$country[$mostRecent]->deaths;
                $historicDeaths = $covidData->result->$country[$historic]->deaths;
                $cases = $latestCases - $historicCases;
                $deaths = $latestDeaths - $historicDeaths;

                $result["cases"] = $cases;
                $result["deaths"] = $deaths;
                $result["fromDate"] = $covidData->result->$country[$historic]->date;
                $result["toDate"] = $covidData->result->$country[$mostRecent]->date;

                array_push($results, $result);
                break;
            }
        }
    }
    echo json_encode($results);
}
