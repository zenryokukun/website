import { PAIRS, validateAmount } from "./util.js";

//socket　受信関数
function onadd(data){
    //data -> {pair:str,position:{apiのレスポンス}}
    const {pair,position} = data;
    details.update(pair,position);
    details.callback(pair,position);
}
function onremove(data){
    const {pair,id} = data;
    details.remove(pair,id);
    details.callback(pair,details[pair]);
}

//socket 初期化
const socket = io();
socket.on("add position",onadd);
socket.on("remove position",onremove);

/**保有ポジション管理obj 初期化 
 * データはgmo positionのresponse["data"]["list"]
*/
export const details = {
    update: function(pair,data){
        /**pair単位で全データ差し替え。初期化時に利用想定 */
        if (this.hasOwnProperty(pair))
            this[pair] = data;
    },
    //新規取引時に呼ぶ。サーバ送信
    open:function(pair,id){
        const data = {"pair":pair,"id":id};
        socket.emit("open",data);
    },
    //決済時に呼ぶ。サーバ送信
    close:function(pair,id){
        const data = {"pair":pair,"id":id};
        socket.emit("close",data);
    },

    add: function(pair,position){
        /**pairにデータを追加 */
        if(!pair) return;
        this[pair].push(position);
    },

    remove:function(pair,id){
        /**idに一致するデータを削除 */
        if(!pair)return;
        this[pair] = this[pair].filter(pos => pos.positionId != id);
    },
    
    findById: function(id){
        /**idにマッチするポジションを返す */
        for(const pair of PAIRS){
            if (this[pair]){
                for (const pos of this[pair]) {
                    if (pos.positionId === id){
                        return pos;
                    }
                }
            }
        }
        return;
    },
    socketOnOpen(func){
        /**新規取引時、client.jsのsetAmountを呼び出す必要があるため追加
         * client.js⇔details.jsでお互いにimportし合うの避けるためコールバックで受け取って実行
         */
        this.callback = func;
    }
};

//init
for (const pair of PAIRS){
	details[pair] = [];
}

//test
//details.open(12345);
