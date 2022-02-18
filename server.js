
import http from "http";
import express from "express";
import { fileURLToPath } from 'url';
import path from 'path';
import fs from "fs";
import {api} from "./svr/api.js";
import { swapSide } from "./svr/apihelper.js";
//import { details } from "./svr/details.js";
import { runSocket } from "./svr/io.js";
import helmet from "helmet";

const NOT_OK = 1;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.Server(app);
const port = process.env.PORT || 8000;
runSocket(server);

function defaultResolve(thisResponse,apiResponse){
    if (apiResponse){
        return thisResponse.json(apiResponse);
    } else {
        return thisResponse.json(null);
    }
}

app.use(helmet());
app.use(
    helmet.contentSecurityPolicy({
        directives:{
            connectSrc:["'self'","wss://api.coin.z.com/ws/public/v1"]
        }
    })
);

app.use(express.static("img"));
app.use(express.static("client"));
//app.use(express.static("svr"));
app.use(express.json());

/**ROUTING */
app.get("/",(req,res) => {
    const file = path.join(__dirname,"client","index.html");
	res.sendFile(file);
});

app.get("/ticker",(req,res)=>{
    api("ticker")
    .then(apires => defaultResolve(res,apires))
    .catch(err => console.log(err))
});

app.get("/valuation",(req,res) => {
	api("margin")
    .then(apires => defaultResolve(res,apires))
    .catch(e => console.log(e));
});

app.get("/positions",(req,res) => {
	const params = req.query;
    api("positions",{"params":params,"keys":["list"]})
    .then(apires => defaultResolve(res,apires))
    .catch(e => console.log(e));
});


app.get("/story",(req,res) => {
    const dir = path.join(__dirname,"story");
    const proms = [];
    fs.readdir(dir,(err,data)=>{
        if (err) throw err;
        for (const file of data){
            if (file.startsWith("story") && file.endsWith(".json")){
				/**retrieve index from filename. filename ex ->story1.json */
                const index = parseInt(file.slice(-6,-5));
                const filepath = path.join(__dirname,"story",file);
                const prom = new Promise((resolve,reject)=>{
                    const content = fs.promises.readFile(filepath,"utf8");
                    content.then( _data => {
                        const stories = JSON.parse(_data).map(elem => elem["msg"]);
                        resolve({index:index,stories:stories});
                    });
                });
                proms.push(prom);
            }
        }
        Promise.all(proms)
        .then(stories => res.json(stories))
        .catch(err=>{
            console.log(err);
        });
    });
});

app.post("/exec",(req,res)=>{
    const {pair,side,amt,pwd} = req.body;
    
    /**some check? */
    
    /**open */
    api("order",{
        body:{
            "symbol":pair,
            "side":side,
            "executionType":"MARKET",
            "size":amt
        }
    })
    .then((orderId) => {
        if (orderId){
            const opt = {params:{"orderId":orderId},keys:["list"]};
            api("executions",opt)
                .then(data => {
                    //正常
                    const id = data[0]["positionId"];
                    let params;
                    if (id){
                        params = {"positionId":id}
                    } else {
                        params = null;
                    }
                    return res.json(params);
                })
                .catch(err => {
                    //建玉ID取得失敗
                    console.trace(err);
                    return res.json(null);
                });
        } else {
            return res.json(null);
        }
    })
    .catch(err => {
        console.trace(err)
        res.json({"status":NOT_OK,"msg":"取引に失敗しました。時間をおいて試してください。"});
    });
});

app.post("/close",(req,res) => {
    //"pair":symbol,"side":side,"amt":size,"id":id
    const {pair,side,amt,id} = req.body;
    const body = {
        "symbol":pair,
        "side":swapSide(side),
        "executionType":"MARKET",
        "settlePosition":[{
            "positionId":id,
            "size":amt
        }]
    };
    api("close",{body:body})
    .then( data => {
        if (data)
            res.json({"message":"SUCCESS! Thank you!","orderId":data})
        else
            res.json(null);
    })
    .catch(err => console.trace(err));
});

/**run server */
server.listen(port,["192.168.0.23","localhost"],()=>{
	console.log("listening on port:" + port.toString());
});