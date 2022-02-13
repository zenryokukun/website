const KEY = "ZENID";

/**
 * localStorage
 *  KEY:[{"id":String,"margin":Number,"pwd":String},{},...]
 */

function _get(){
    return JSON.parse(localStorage.getItem(KEY));
}

function _set(obj){
    localStorage.setItem(KEY,JSON.stringify(obj));
}

function _rm(){
    localStorage.removeItem(KEY);
}

export const storage = {
    add:function(obj){
        const data = _get();
        if (data){
            data.push(obj);
            _set(data);
        } else {
            _set([obj]);
        }
    },

    sum:function(){
        const data = _get();
        /**データがない場合は0を返す。 */
        if(!data){
            return 0;
        }
        return data.reduce((prev,current) => {
            return prev + current.margin;
        },0);
    },

    getByPositionId(id){
        const data = _get();
        if (!data) return;
        const ret = data.filter(obj => obj.id === id);
        //filter結果が無いとき空配列になる。戻りねはundefinedなる。
        return ret[0];
    },

    parse:function(){
        return _get();
    },
    /*
    checkPwd:function(id,pwd){
        const position = this.getByPositionId(id);
        console.log(id);
        console.log(position);
        console.log(pwd,position["pwd"]);
    },
    */
    remove:function(id){
        const data = _get();
        const newData = data.filter(obj => obj.id != id);
        _set(newData);
    },

    reset:function(){
        _rm();
    }
};

/** test
storage.reset();
storage.add({"id":123,"margin":50});
storage.remove(123);
storage.add({"id":125,"margin":100});
console.log(storage.sum());
storage.add({"id":135,"margin":200});
console.log(storage.sum());
storage.add({"id":235,"margin":300});
console.log(storage.sum());
storage.remove(135);
console.log(storage.sum());
storage.remove(235);
console.log(storage.sum());
storage.remove(125);
console.log(storage.sum());
storage.remove(999);
console.log(_get());
 */



