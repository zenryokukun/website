const pairs = [
    {symbol:"BTC_JPY",side:"BUY",size:0.01},
    {symbol:"BTC_JPY",side:"BUY",size:0.02},
    {symbol:"BTC_JPY",side:"SELL",size:0.1},
    {symbol:"BTC_JPY",side:"SELL",size:0.2},
    {symbol:"XRP_JPY",side:"BUY",size:100},
    {symbol:"XRP_JPY",side:"BUY",size:200},
    {symbol:"XRP_JPY",side:"SELL",size:100}
];

export function get(coins){
    const ret = [];
    for (const pair of pairs){
        if (pair["symbol"] === coins){
            ret.push(pair);
        }
    }
    return ret;
}