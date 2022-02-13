
/*
 * webSocket API
 */

import {intl,timer,PAIRS} from "./util.js";

const WS_PUBLIC = "wss://api.coin.z.com/ws/public/v1";
const ws = new WebSocket(WS_PUBLIC);

ws.addEventListener("open", async (evt) => {
    for (let i=0; i<PAIRS.length;i++){
        const params = JSON.stringify({
            "command":"subscribe",
            "channel":"ticker",
            "symbol":PAIRS[i]
        });
        ws.send(params);
        //subscribeは1秒1回制限があるため1.1秒待つ。
        await timer(1100);
        console.log(PAIRS[i]+":subscribed");
    }
});

ws.addEventListener("message",msg => {
    const data = JSON.parse(msg["data"]);
    const coin = data["symbol"].slice(0,3).toLowerCase();
    const price = data["last"]
    const selector = `#${coin} .flex-price .current-price`;
    const node = document.querySelector(selector);
    node.textContent = intl(price);
    node.dataset["price"] = price;
    
});

ws.addEventListener("error", err => {
    console.log(err);
});

