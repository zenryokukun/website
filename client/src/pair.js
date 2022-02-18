import {PAIRS} from "./util.js";

const details = {
    init:function(){
        this._data = {};
        for(const pair of PAIRS){
            this._data[pair] = [];
        }
    },
    update:function(pair,recs){
        const data = this._data;
        data[pair] = recs;
    }
};

/* tests
details.init();
details.update("BTC_JPY",[1,2,3]);
details.update("ETH_JPY",[5,6,7]);
console.log(details._data);
details.update("BTC_JPY",[0,0,0]);
console.log(details._data);
*/