<?php

function parse_file($file) {
    $result = array();
    $offset = 0;

    $data = file_get_contents($file);
    $data_arr = explode("<tr>", $data);
    
    $header_arr = _tagstrip($data_arr[1], "th");
    $data_arr = array_slice($data_arr, 2);
    
    foreach ($data_arr as $track) {
        $track_arr = _tagstrip($track, "td");
        $i = 0;
        $res_arr = array();
        foreach ($track_arr as $field) {
            $res_arr[$header_arr[$i]] = $field;
            $i += 1;
        }
        $res_arr["Offset"] = $offset;
        $offset += _minutes_to_seconds($res_arr["Duration"]);
        
        $result[] = $res_arr;
    }
    return $result;
}

function offset_to_track($track_array, $offset) {
    foreach (array_reverse($track_array) as $current_track) {
        if ($current_track["Offset"] < $offset)
            return $current_track["Artist"]." - ".$current_track["Title"];
    }
    return false;
}

function find_offset_in_file($file, $offset) {
    return offset_to_track(parse_file($file), $offset);
}

function _tagstrip($data, $tag) {
    $opening_tag = "<".$tag.">";
    $closing_tag = "</".$tag.">";
    $return_arr = array();
    
    $array_raw = array_slice(explode($opening_tag, $data),1);
    foreach ($array_raw as $line) {
            $return_arr[] = strstr($line, $closing_tag, true);
    }
    return $return_arr;
}

function _minutes_to_seconds($minutestring) {
    $time_arr = explode(":", $minutestring);
    return $time_arr[0] * 60 + $time_arr[1];
}

?>