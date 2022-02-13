const PAIRS = ["BTC_JPY","ETH_JPY","LTC_JPY","BCH_JPY","XRP_JPY"];

export const details = {
    update: function(pair,data){
        /**pair単位で全データ差し替え。初期化時に利用想定 */
        if (this.hasOwnProperty(pair))
            this[pair] = data;
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
    }
};

//init
for (const pair of PAIRS){
	details[pair] = [];
}
