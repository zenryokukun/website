import {getExecutor,getPattern} from "./apihelper.js";

/**
 * name[str]:name of api
 * opt[object]:{"params":{},"body":{},keys:{}}
 **/
export async function api(name,opt){
    const pat = getPattern(name);
    const exec = getExecutor(pat);
    const resp = await exec(name,opt);
    return resp;
}

const body = {
    body:{
        "symbol":"XRP_JPY",
        "side":"SELL",
        "executionType":"MARKET",
        "settlePosition":[{
            "positionId":148144737,
            "size":"10"
        }]
    }
}

const params = {
    "orderId":2222746707
}
/*
api("executions",{params:params,keys:["list"]})
.then(val => {
    console.log(val);
})
.catch(err => console.log(err));
*/
/*
let a = await api("assets");
let b = await api("ticker",{params:{"symbol":"BTC_JPY"}});
*/
/*
let a = await api("close",{"body":{
    "symbol":"BTC_JPY",
    "side":"BUY",
    "executionType":"MARKET",
    "settlePosition":[{
        "positionId":2033919229,
        "size":"0.01"
    }]
}});
*/
/*
let a = await api("positions",{
    "params":{"symbol":"BTC_JPY"},
    "keys":["list"]
});

console.log(a);
*/