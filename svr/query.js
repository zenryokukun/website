import {URLSearchParams} from "url";

export function toQueryString(params){
    /**
     * converts object to http query string.
     * ex:{"a":1,"b":2} -> ?a=1&b=2
     */
    if (!params)
        return '';
    return "?" + new URLSearchParams(params);
}