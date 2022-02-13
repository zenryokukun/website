const units = {
	 "BTC":0.01,
    "ETH":0.1,
    "BCH":0.1,
    "LTC":1,
    "XRP":10
};
export function getUnit(pair){
	if (pair.length > 3){
		pair = pair.slice(0,3);
	}
	return units[pair];
}
export const PAIRS = ["BTC_JPY","ETH_JPY","LTC_JPY","BCH_JPY","XRP_JPY"];
export const LEVERAGE = 2;
export const AMT_LIMIT = 300000;
export const timer = (ms) => new Promise(res => setTimeout(res,ms));
export function intl(num){
	return new Intl.NumberFormat().format(num);
}
export function psuedoPosition(id,pair,side,size,price,prof){
    const ret = {
        "positionId":id,
        "symbol":pair,
        "side":side,
        "size":size.toString(),
        "price":price.toString(),
        "lossGain":prof.toString()
    };
    return ret;
}

function getDivisionOf(targ,dest){
    return dest / targ;
}


export function validateAmount(coin,amt,holdAmt){
    /**
     * [Params]
     *   coin(string):"BTC" | "BTC_JPY"
     *   amt(float|int)
     * [Returns]
     *   boolean
     */
    //convert to float
    amt = parseFloat(amt);
    holdAmt = parseFloat(holdAmt);
    //convert BTC_JPY to BTC
	coin = coin.length > 3 ? coin.slice(0,3) : coin;

    const min = units[coin];
    const div = min < 1 ? getDivisionOf(min,1) : 1;
    //float →　intに無理やり変換してチェック
    const min_checker = min * div;
    const amt_checker = amt * div;
    //最小取引単位より小さいとダメ
    if (amt_checker < min_checker) return false;
    //端数があるとダメ
    if (amt_checker % min_checker !== 0) return false;
    //保有量を超えていたらダメ
    if (holdAmt){
        const holdAmt_checker = holdAmt * div;
        if (amt_checker > holdAmt_checker) return false;
    }
    //ここまで通ればOK
    return true;
}
