import {Server} from "socket.io";
import { details } from "./details.js";
import { api } from "./api.js";

//io Server格納用
var io;

function onconnect(socket){
    console.log("connected")
    socket.on("open",onopen);
    socket.on("close",onclose);
    socket.on("disconnect",ondisconnect);
}

function ondisconnect(reason){
    console.log(`disconnected:${reason}`);
}

/**新規取引時 */
function onopen(data){
    const {pair,id} = data;
    if (!id) return;
    //position取得
    api("positions",{"params":{"symbol":pair},"keys":["list"]})
    .then(robj => {
        if (robj){
            //detail更新＆送信
            details.update(pair,robj);
            io.emit("add position",{"pair":pair,"position":robj});
        }
    })
    .catch(e => console.trace(e));
}

/**決済時*/
function onclose(data){
    const {pair,id} = data;
    if (!id) return;
    //detail更新＆送信
    details.remove(pair,id);
    io.emit("remove position",data);
}

export function runSocket(httpServer){
    io = new Server(httpServer);
    io.on("connection",onconnect);
}