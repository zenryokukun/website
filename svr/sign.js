import fs from 'fs';
import {URL} from "url";
import path from "path";
import crypto from "crypto";

const here = path.dirname(new URL(import.meta.url).pathname).slice(1);
const conf = here + "/conf/conf.json";
const {api_key,api_secret} = JSON.parse(fs.readFileSync(conf));

export function getHeaders(){
    return {"Content-Type":"application/json"};
}

export function getHeadersAuth(path,method,body){
    //console.log(`path:${path} method:${method} body:${body}`);
    const now = Date.now().toString();
    let data = "";
    if (body) 
        data = JSON.stringify(body);
    const text = now + method + path + data;
    const sign = crypto.createHmac("sha256",api_secret).update(text).digest("hex");
    return {
        "API-KEY":api_key,
        "API-TIMESTAMP":now,
        "API-SIGN":sign
    };
}