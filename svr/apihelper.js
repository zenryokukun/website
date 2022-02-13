import {log} from "./log.js";
import { toQueryString } from "./query.js";
import fetch from "node-fetch";
import {getHeaders,getHeadersAuth} from "./sign.js";


const PUBLIC = "https://api.coin.z.com/public";
const PRIVATE = "https://api.coin.z.com/private";
const GET_NO_AUTH = 0;
const GET_AUTH = 1;
const POST = 2;
const URLS = {
    /**public */
    "status":{
        "url":"/public/v1/status",
        "pattern":GET_NO_AUTH
    },
    "ticker":{
        "url":"/public/v1/ticker",
        "pattern":GET_NO_AUTH
    },
    "board":{
        "url":"/public/v1/orderbooks",
        "pattern":GET_NO_AUTH
    },
    "trades":{
        "url":"/public/v1/trades",
        "pattern":GET_NO_AUTH
    },
    "kline":{
        "url":"/public/v1/klines",
        "pattern":GET_NO_AUTH,
    },
    /**private */
    "margin":{
        "url":"/private/v1/account/margin",
        "pattern":GET_AUTH
    },
    "assets":{
        "url":"/private/v1/account/assets",
        "pattern":GET_AUTH
    },
    "orders":{
        "url":"/private/v1/orders",
        "pattern":GET_AUTH
    },
    "activeOrders":{
        "url":"/private/v1/activeOrders",
        "pattern":GET_AUTH
    },
    "executions":{
        "url":"/private/v1/executions",
        "pattern":GET_AUTH
    },
    "positions":{
        "url":"/private/v1/openPositions",
        "pattern":GET_AUTH
    },
    "order":{
        "url":"/private/v1/order",
        "pattern":POST
    },
    "cancel":{
        "url":"/private/v1/cancelOrder",
        "pattern":POST
    },
    "cancelAll":{
        "url":"/private/v1/cancelBulkOrder",
        "pattern":POST
    },
    "close":{
        "url":"/private/v1/closeOrder",
        "pattern":POST
    },
    "closeAll":{
        "url":"/private/v1/closeBulkOrder",
        "pattern":POST
    }
};

function getURL(apiName){
    return URLS[apiName]["_url"];
}

export function getPattern(apiName){
    return URLS[apiName]["pattern"];
}

function getEndPoint(apiName){
    const topDir = URLS[apiName]["url"].split("/")[1];
    if (topDir == "public") return PUBLIC;
    if (topDir == "private") return PRIVATE;
    throw new Error("api name or address might be wrong.." + apiName);
}


function _checkHTTP(resp){
    return resp.ok;
}

function _checkAPI(respObj){
    return respObj["status"] == 0;
}

async function check(resp,keys){
    if (_checkHTTP(resp)){
        const respj = await resp.json();
        if (_checkAPI(respj)){
            return extract(respj,keys);
        }
        //api error
        const err = respj["messages"][0];
        const code = err["message_code"];
        const msg = err["message_string"];
        log(`API_ERROR:${code}_${msg}`);
        return;
    }
    //http error
    log(`HTTP_ERROR_${resp.status}:${resp.statusText}`);
}

/**
 * 
 * @param {string} name 
 * @param {object} opt 
 *      {object} "params",{array} "keys",{object} "body"
 * @returns {object|undefined}
 * 
 */
async function _get_no_auth(name,opt){
    opt = opt||{};
    const url = getURL(name);
    const endpoint = getEndPoint(name);
    const params = opt["params"];
    const query = url + toQueryString(params);
    const headers = getHeaders();
    const resp = await fetch(endpoint+query,{
        "method":"GET",
        "headers":headers,
    });
    return check(resp,opt["keys"]);
}

async function _get_auth(name,opt){
    opt = opt||{};
    const url = getURL(name);
    const endpoint = getEndPoint(name);
    const params = opt["params"];
    const query = url + toQueryString(params);
    const headers = getHeadersAuth(url,"GET");
    const resp = await fetch(endpoint+query,{
        "method":"GET",
        "headers":headers
    });
    return check(resp,opt["keys"]);
}

async function _post(name,opt){
    opt = opt||{};
    const url = getURL(name);
    const endpoint = getEndPoint(name);
    const params = opt["params"];
    const body = opt["body"];
    const query = url + toQueryString(params);
    const headers = getHeadersAuth(url,"POST",body);
    const resp = await fetch(endpoint+url,{
        "method":"POST",
        "headers":headers,
        "body":JSON.stringify(body)
    });
    return check(resp,opt["keys"]);
}

function extract(respObj,keys){
    let ret = respObj["data"];
    if (Object.keys(ret).length == 0) return;
    if (!keys) return ret;
    keys.forEach(key => ret = ret[key]);
    if (!ret) throw new Error("KeyError");
    return ret;
}

export function getExecutor(pattern){
    /**
     * pattern1:
     *  GET without auth, with/without params
     *      status,ticker,board,trades,kline
     * pattern2
     *  GET with auth, with/without params
     *      margin,assets,orders,activeOrders,executions,
     *      openPositions,
     * pattern3
     *  POST with auth, with/witout params
     *      order,cancel,close,closeALl
     */
    if (pattern == GET_NO_AUTH) return _get_no_auth;
    if (pattern == GET_AUTH) return _get_auth;
    if (pattern == POST) return _post;   
}

//init...
for (let key in URLS){
    const api = URLS[key];
    const fullurl = api["url"];
    
    let _url = fullurl.split("/public");
    if (_url.length > 1){
         _url = _url[1];
    } else {
        _url = fullurl.split("/private");
        if (_url.length > 1)
            _url = _url[1];
    }
    api["_url"] = _url;
}

/**close用 "BUY"⇔"SELL" swap */
export function swapSide(side){
    if (side === "BUY")
        return "SELL";
    if (side === "SELL")
        return "BUY";
    return;
}

