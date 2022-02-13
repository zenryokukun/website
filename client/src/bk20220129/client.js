
import {
	intl,timer,PAIRS,getUnit
	,validateAmount,LEVERAGE
	,AMT_LIMIT
} from "./util.js";
import "./ws.js";
import {storage} from "./storage.js";

/**swipe用グローバル変数 */
let _PAGE_INDEX;
let _CONTENTS;
let _TITLES;
/**保有ポジション管理obj 初期化 */
const details = {};
for (const pair of PAIRS){
	details[pair] = null;
}
details.update = function(pair,data){
	if (this.hasOwnProperty(pair))
		this[pair] = data;
}

/**評価額欄 *********************************************************/
function getAvailableAmount(){
	const node = document.getElementById("avail")
	const avail = node.dataset["value"];
	return parseInt(avail);
}

function _updateTextContent(id,val,head,tail){
	/**
	 * id[str]:elementのid
	 * val[int]:価格
	 * head[str]:optional 価格の頭につける円マークとか
	 * tail[str]:optional 価格の後ろにつける単位
	 */
	const node = document.getElementById(id);
	let txtStr = intl(val);
	if (head)
		txtStr = head + txtStr.toString();
	if (tail)
		txtStr = txtStr + tail;
	node.textContent = txtStr;
	//マイナスなら赤字
	if (val < 0) node.style.color = "red";
	//更新用にvalue属性を設定
	node.dataset["value"] = val.toString();
}

function updateValuation(resp){
	/**resp[obj]:/valuationのレスポンス */
	if (!resp) return;
	/**評価額 取引可能額 拘束証拠金 利益*/
	const {actualProfitLoss,availableAmount,margin,profitLoss} = resp;
	_updateTextContent("eval",actualProfitLoss,"\\");
	_updateTextContent("avail",availableAmount,"\\");
	_updateTextContent("profit",profitLoss,"\\");
	/**test */
	getAvailableAmount();
}

function initValutation(){
	fetch("/valuation")
	.then(res => res.json())
	.then(res => updateValuation(res));
}
/**評価額欄 end *****************************************************/

/*銘柄一覧の価格をtickerで更新する*/
function initPrices(){
	const url = "https://api.coin.z.com/public/v1/ticker";
	fetch("/ticker",{"headers":{"Content-Type":"application/json"}})
		.then(res => res.json())
		.then(res => {
			if (res["status"] == 0){
				/*価格を設定するNode*/
				const targets = document.querySelectorAll(".current-price");	
				/*id（銘柄名）と一致する価格を設定*/
				for (const data of res["data"]){
					const last = data["last"];
					const coin = data["symbol"].slice(0,3);
					Array.from(targets).forEach(targ => {
						if (coin === targ.id) {
							targ.textContent = intl(last);
							targ.dataset["price"] = last;
						}
					});
				}
			}
		});
}

function _switchNode(node,isVisible){
	if (isVisible){
		node.style.display = "block";
	} else {
		node.style.display = "none";
	}
}

function switchDisplay(pos,story,trade){
	const posNode = document.getElementById("positions");
	const storyNode = document.getElementById("stories");
	const tradeNode = document.getElementById("open-trade");
	_switchNode(posNode,pos);
	_switchNode(storyNode,story);
	_switchNode(tradeNode,trade);
}


function _getAmount(node){
	const selector = `#${node.id} .buy-amount,#${node.id} .sell-amount`;
	const snode = document.querySelectorAll(selector);
	const size = Array.from(snode).reduce((prev,cur)=>prev+parseFloat(cur.textContent),0);
	return size;
}

function setAmount(pair,data){
	if (!data || data.length === 0) return;
	let bsize = 0;
	let ssize = 0;
	for (const d of data){
		if (d["side"] === "BUY")
			bsize += parseFloat(d["size"]);
		else if(d["side"] === "SELL")
			ssize += parseFloat(d["size"]);
	}
	const genId = pair.slice(0,3).toLowerCase();
	const s1 = `#${genId} .flex-buy .buy-amount`
	const s2 = `#${genId} .flex-sell .sell-amount`
	const buyNode = document.querySelector(s1);
	const sellNode = document.querySelector(s2);
	buyNode.textContent = Math.floor(bsize*100)/100;
	sellNode.textContent = Math.floor(ssize*100)/100;
	
}

/**init position amount */
async function initAmount(){
	for (const pair of PAIRS){	
		fetch("/positions?symbol="+pair)
		.then(res => res.json())
		.then(data => {
			if(data && data.length > 0)
				setAmount(pair,data);
				details.update(pair,data);
		});
		console.log("wating...");
		await timer(700);
	}
}

/**[START]positions modal関連****************************************************************** */

function getCurrentPrice(pair){
	/** 
	 * main-contentの表から直近価格を取得
	 * datasetにwsから設定しているため、wsからの価格が取得される前はundefinedを返す
	 */
	const coin = pair.slice(0,3).toLowerCase();
	const selector = `#${coin} .flex-price .current-price`;
    const node = document.querySelector(selector);
	const price = node.dataset["price"];
	if (price){
		return parseInt(price);
	}
	return ;
}

function calcProf(size,price,current,side){
	const purchased = size * price;
	const purchasedNow = size * current;
	const prof = side == "BUY" ? purchasedNow - purchased : purchased - purchasedNow;
	return prof;
}

function createPositionTitle(){
	const frame = document.createElement("div");
	frame.id = "flex-frame-title-d";
	["No","銘柄","売買","建玉","価格","損益"].forEach((val,i) => {
		const div = document.createElement("div");
		div.textContent = val;
		div.className = `flex-item-title-d _${i+1}`;
		frame.append(div);
	});
	return frame;
}

function createPositionDetail(pair,side,size,price,prof,row){
	/**outer frame*/
	const frame = document.createElement("div");
	frame.className = "flex-frame-d";
	const current = getCurrentPrice(pair);
	/**現在価格で利益を計算 */
	prof = current ? parseInt(calcProf(size,price,current,side)) : prof;
	/*値設定*/
	[row,pair,side,size].forEach((arg,i) => {
		const node = document.createElement("div");
		//node.className = "flex-item-d";
		//i+1はレスポンシブ対応用のクラス名
		node.className = `flex-item-d _${i+1}`;
		node.textContent = arg;
		frame.append(node);
	});
	
	/**価格をカンマ区切りで設定 */
	const priceNode = document.createElement("div");
	priceNode.className = "flex-item-d _5";
	priceNode.textContent = intl(price);
	frame.append(priceNode);
	/**利益設定　マイナスなら赤字 */
	const profNode = document.createElement("div");
	profNode.className = "flex-item-d _6";
	profNode.textContent = prof;
	frame.append(profNode);
	if (prof < 0) profNode.style["color"] = "red";
	/**クリックイベント
	frame.addEventListener("click", e => {
		const dial = document.getElementById("close-confirm");
		dial.showModal();
	});
	 */
	return frame;
}

function initModalPositions(){
	const rows = document.querySelectorAll(".flex-wrapper");
	for (const row of Array.from(rows)){
		row.addEventListener("click", e=> {
			const amt = _getAmount(row);
			/**stories,positionsの子ノードを全削除。tradeは動的に作っていないので残す */
			deleteContentById("stories");
			deleteContentById("positions");
			if (amt > 0) {
				document.getElementById("modal").style.display = "block";
				/**btc→BTC_JPYに変換*/
				const pair = row.id.toUpperCase() + "_JPY";
				const positions = details[pair];
				if (positions.length > 0){					
					const parent = document.getElementById("positions")
					const header = createPositionTitle();
					parent.append(header);
					let i = 1;
					for (const pos of positions){
						const {symbol,size,side,price,lossGain,positionId} = pos;
						const frame = createPositionDetail(symbol.slice(0,3),side,size,parseInt(price),parseInt(lossGain),i);
						/**clickで決済確認ダイアログ開く */
						frame.addEventListener("click", e => openCloseTradeDialog(positionId));
						parent.append(frame);
						i++;
					}
				}
				
				switchDisplay(true,false,false);
			}
		});
	}
}
/**[END]positions modal関連****************************************************************** */

/**[START]stories modal関連****************************************************************** */
function renderPageColor(index){
    const nodes = document.querySelectorAll(".story-pages-d");
    for (const node of Array.from(nodes)){
        let style;
        if (node.dataset["index"] == index){
            style = {"textDecoration":"none","color":"grey"};
        } else {
            style = {"textDecoration":"underline","color":"blue"};
        }
        for (const key of Object.keys(style)){
			node.style[key] = style[key];
		}
    }
}

/**
 * 
 * @param {int ファイル名の連番のため、-1して添え時にする必要あり} index  
 * @returns undefined
 */
function showStory(index,stories,titles,parent){
	//前ページの内容が存在している場合は消す。
	const bef = document.getElementById("story-area");
	if (bef){
		//子ノード削除
		deleteContent(bef);
		//親ノード削除
		bef.remove();
	}
	//現ページ構築
	const storyAreaNode = document.createElement("div");
	
	storyAreaNode.id = "story-area";
	const contents = stories.filter(story => story["index"] == index )[0]["stories"];
	if (!contents) return ;
	const titleNode = document.createElement("p");
	titleNode.textContent = titles[index-1];
	/**-d for dynamic */
	titleNode.className = "story-title-d";
	parent.append(storyAreaNode);
	storyAreaNode.append(titleNode);
	
	for (const content of contents){
		const p = document.createElement("p");
		p.className = "story-line-d";
		p.textContent = content;
		storyAreaNode.append(p);
		
	}
	renderPageColor(index);
	//swipe用　現在のページを取得するためグローバル変数にセット。
	_PAGE_INDEX = index;
}

function initStoryContent(contents){
	/**positionsの子ノードを全削除。tradeは動的に作っていないので残す */
	deleteContentById("positions");
	/**storiesの残りがあるかもしれないので消す */
	deleteContentById("stories");
	const titles = [
		"第一部　失業","第二部　村八分",
		"第三部　旅立ち","第四部　伝説的英雄",
		"第五部　孤島の鬼","第六部　raise StopIteration"
	];
	/**outer content frame */
	const frame = document.getElementById("stories");
	/**frame for pages */
	const pagesFrame = document.createElement("div");
	/**"d" for dynamic */
	pagesFrame.id = "pages-d"; 
	const ul = document.createElement("ul");
	ul.id = "page-list-d";
	/**add li to ul */
	for (let i=0; i < contents.length; i++){
		const li = document.createElement("li");
		li.className = "story-pages-d";
		li.textContent = (i+1).toString();
		li.dataset["index"] = i+1;
		li.addEventListener("click", evt => showStory(i+1,contents,titles,frame));
		ul.append(li);
	}
	pagesFrame.append(ul);
	frame.append(pagesFrame);
	showStory(1,contents,titles,frame);
	/**swipe用 */
	_CONTENTS = contents;
	_TITLES = titles;
}


function swipePage(next){
	/**swipe時
	 * next:[int]　正負しかみない
	 */
	const frame = document.getElementById("stories");
	const idx = _PAGE_INDEX;
	const maxPage = document.querySelectorAll(".story-pages-d").length;
	let nextPage;
	//left
	if (next < 0){
		 nextPage = idx - 1 < 1 ? maxPage : idx -1;
	//right
	} else {
		nextPage = idx + 1 > maxPage ? 1 : idx + 1;
	}
	if (nextPage){
		showStory(nextPage,_CONTENTS,_TITLES,frame);
		//scrolltop
		document.getElementById("modal-content").scrollTop = 0;
	}
}

function initTouch(){
	/**story swipe切り替え対応 */
	const storyNode = document.getElementById("stories");
	let startx = 0;
	let starty = 0;
	let diffx = 0;
	let diffy =0;
	let threshx = 40;
	let threshy = 40;
	const node = document.getElementById("stories");

	document.body.addEventListener("touchstart", e=>{
		if (storyNode.style.display != "none"){
			startx = e.changedTouches[0].pageX;
			starty = e.changedTouches[0].pageY;
		}
	});
	document.body.addEventListener("touchmove", e=>{
		if (storyNode.style.display != "none"){
			let x = e.changedTouches[0].pageX;
			let y = e.changedTouches[0].pageY;
			diffx = startx - x;
			diffy = starty - y;
		}
	});
	document.body.addEventListener("touchend", e=>{
		if (Math.abs(diffx) > threshx && Math.abs(diffy) < threshy) {
			swipePage(diffx);
		}
		startx = 0;
		starty = 0;
		diffx = 0;
		diffy = 0;
	});
	document.body.addEventListener("touchcancel", e=>{
		startx = 0;
		starty = 0;
		diffx = 0;
		diffy = 0;
	});
}

function initModalStory(){
	const lnk = document.getElementById("story-link");
	let stories = null;
	lnk.addEventListener("click", e => {
		document.getElementById("modal").style.display = "block";
		if (!stories){
			fetch("/story").then(res => res.json())
			.then(content => {
				stories = content;
				if (stories){
					initStoryContent(stories);
					switchDisplay(false,true,false);
				}
			})
		} else {
			console.log("story already loaded.")
			if(stories){
				initStoryContent(stories);
				switchDisplay(false,true,false);
			}
		}

	});
}
/**[END]stories modal関連****************************************************************** */

/**[START]trade modal関連****************************************************************** */

function _checkRequired(pwd,amt){
	/**パスワード、購入量のどちらも入力必要 */
	if (pwd === "" || amt === ""){
		return false;
	}
	return true;
}

function _checkPassword(pwd){
	const pattern = /[0-9a-zA-z]{4,8}/;
	return pattern.test(pwd);
}

function calcMargin(price,amt,leverage){
	/**
	 * Returns[int]取引に必要な金額を返す
	 * Params
	 * 	price[int],amt[float],leverage[int]
	 */
	return Math.floor(price * amt / leverage);
}

function _checkVisitorAmount(margin){
	/**margin[int]:証拠金 */
	return storage.sum() + margin < AMT_LIMIT;
}

function initModalTrade(){
	/**modal内の取引メニューの初期化 */
	const _setAmt = (pair) => {
		const unit = getUnit(pair);
		const node = document.getElementById("least-amount");
		node.textContent = unit;
	};
	const sl = document.getElementById("pair-select");
	sl.addEventListener("change", e=>{
		const pair = sl.value;
		_setAmt(pair);
	});
	
	PAIRS.forEach(pair => {
		const op = document.createElement("option");
		op.value = pair;
		op.textContent = pair;
		sl.append(op);
	});

	/**pwd表示画像クリック */
	document.getElementById("eye-img").addEventListener("click", e => {
		const ipt = document.getElementById("pwd-user");
		if (ipt.value == ""){
			return false;
		}
		if (ipt.type === "password"){
			ipt.type = "text";
		} else {
			ipt.type = "password";
		}
	});

	/**modal内の取引ボタン桜花イベント */
	document.getElementById("trade-button").addEventListener("click", e => {
		const pair = sl.value;
		const pwd = document.getElementById("pwd-user").value;
		const amt = parseFloat(document.getElementById("amt-user").value);		
		/**pwd amtどちらも入力されているか */
		if (!_checkRequired(pwd,amt)){
			alert("パスワードと購入量どちらも入力必須です。");
			return ;
		}
		/**password入力値チェック */
		if (!_checkPassword(pwd)){
			alert("パスワードは大小英数字で4~8桁にしてください。");
			return;
		} else {console.log("password ok.");}
		/**amtチェック */
		if (!validateAmount(pair,amt)){
			alert("購入量は取引単位の倍数にしてください。");
			return ;
		} 

		/**残高チェック */
		const price = getCurrentPrice(pair);
		if (!price){
			alert(`${pair}　の現在価格の取得が出来ません。後で試してください。`);
			return;
		}
		const margin = calcMargin(price,amt,LEVERAGE); //必要証拠金
		const avail = getAvailableAmount();　//利用可能額
		if (!(avail > margin)){
			alert(`必要証拠金は${margin}円だ！足りねぇぞ！。`);
			return;	
		}
		/**保有限度チェック*/
		if (!_checkVisitorAmount(margin)){
			alert("ポジション決済してから取引してください。");
			return;
		}

		/**dialog 開く */
		const dial = document.getElementById("confirm");
		const _side = document.getElementById("trade-side").dataset["side"];
		const side = _side === "buy" ? "BUY" : "SELL";

		openDialog(pair,side,amt,pwd,margin);
		/**サーバ送信 */
		//const param = {"pair":pair,"amount":amt};

	});
	/**modal内の初期化ここまで**** */

	/**BUY SELL*/
	const defaultBg = "#777";
	const selectedBg = "#F00";
	const buybtn = document.getElementById("side-buy");
	const sellbtn = document.getElementById("side-sell");
	[buybtn,sellbtn].forEach(node => {
		node.addEventListener("click", function(e){
			this.style.backgroundColor = selectedBg;
			const other = this === buybtn ? sellbtn : buybtn;
			other.style.backgroundColor = defaultBg;
			/**side更新 */
			const parent = document.getElementById("trade-side")
			parent.dataset["side"] = this === buybtn ? "buy" : "sell";
		});
	});
	/**新規取引ボタン押下イベント */
	const lnk = document.getElementById("trade-link");
	lnk.addEventListener("click", e => {
		document.getElementById("modal").style.display = "block";
		//モーダルを開くときにテキストボックスやプルダウン等を初期化
		_setAmt(PAIRS[0]);
		document.getElementById("pwd-user").value = "";
		document.getElementById("amt-user").value = "";
		document.getElementById("pair-select").value = PAIRS[0];
		switchDisplay(false,false,true);
	});
}
/**[END]trade modal関連****************************************************************** */

/**********************************************************[START] open-trade dialog*/

function _setDialogData(id,key,val){
	const node = document.getElementById(id);
	node.dataset[key] = val;
	node.textContent = val;
}
function _removeDialogData(id,key){
	const node = document.getElementById(id);
	delete node.dataset[key];
	node.textContent = "";
}

function _getDialogData(id,key){
	return document.getElementById(id).dataset[key];
}
/**pw取得用関数　openDialog内で設定 */
let _pwd = function(){}
/**margin取得用関数 openDialog内で設定 */
let _margin = function(){}

function openDialog(pair,side,amt,pwd,margin){
	_setDialogData("trading-pair","pair",pair);
	_setDialogData("trading-side","side",side);
	_setDialogData("trading-amount","amt",amt);
	_pwd = function(){return pwd};
	_margin = function(){return margin};
	document.getElementById("confirm").showModal();
}

function closeDialog(){
	_removeDialogData("trading-pair","pair");
	_removeDialogData("trading-side","side");
	_removeDialogData("trading-amount","amt");
	_pwd = function(){};
	_margin = function(){};
	document.getElementById("confirm").close();
}

/**確認dialog内のボタン押下イベント */
function initOpenTradeDialog(){
	/**okボタン */
	document.getElementById("exec").addEventListener("click", e => {
		const pair = _getDialogData("trading-pair","pair");
		const side = _getDialogData("trading-side","side");
		const amt = _getDialogData("trading-amount","amt");
		/**server */
		const pwd = _pwd();
		const margin = _margin();
		fetch("/exec",{
			method:"POST",
			headers:{"Content-Type":"application/json"},
			body:JSON.stringify({"pair":pair,"side":side,"amt":amt,"pwd":pwd})
		})
		.then(res => res.json())
		.then(robj => {
			storage.add({"id":robj.positionId,"margin":margin,"pwd":pwd});
			alert(`ポジションID:${robj.positionId}`)
			closeDialog();
		})
		.catch(err => alert(err))
	});
	/**closeボタン*/
	document.getElementById("cancel").addEventListener("click", e=> {
		closeDialog();
	});
}

/********************************************[END] open-trade dialog*/

/********************************************[START] close-trade dialog */
/**パスワード一致チェック */
function checkPwd(pwd,id){
	/**
	 * pwd[string] user input password
	 * id[string] positionId
	 * */
	//購入時パスワード
	const position = storage.getByPositionId(id);
	if (!position) return;
	const openPwd = position["pwd"];
	console.log(`openPwd:${openPwd}`);
	return openPwd === pwd;
}
/**開く */
function openCloseTradeDialog(id){
	/**positioinIdを表示*/
	const idNode = document.getElementById("position-id");
	idNode.textContent = id;
	const dial = document.getElementById("close-confirm");
	dial.showModal();
}
/*** ポジション明細をクリックした時のダイアログ初期化処理 */
function initCloseTradeDialog(){
	document.getElementById("exec-close").addEventListener("click", e => {
		//決済
		const idTextStr = document.getElementById("position-id").textContent;
		const id = parseInt(idTextStr);
		const closePwd = document.getElementById("close-pwd").value;
		if (checkPwd(closePwd,id)){
			console.log("OK!!!!");
		} else {
			alert("wrong password");
		}
		
	});
	
	document.getElementById("cancel-close").addEventListener("click", e => {
		/**pwd,idを削除して閉じる*/
		document.getElementById("close-pwd").value = "";
		document.getElementById("position-id").textContent = "";
		document.getElementById("close-confirm").close();
	});
}

/*******************************************************[END] close-trade dialog */

function initModal(){
	/*隠す関数display:noneにする。*/
	const _hide = ()=>{
		const modal = document.getElementById("modal");
		modal.style.display = "none";
	};
	
	/*modal閉じる処理。modal-contentと重なっていない部分（枠外）をクリックすると発動
		display:none
	*/
	window.addEventListener("click", e => {
		const modal = document.getElementById("modal");
		if (e.target === modal) {
			_hide();
		}
	});
	
	/*閉じるボタン押した場合*/
	document.getElementById("close").addEventListener("click", e=> {
		_hide();
	});
}

function deleteContent(parent){
	const childs = Array.from(parent.childNodes);	
	for (const child of childs){
		child.remove();
	}
}

function deleteContentById(id){
	const parent = document.getElementById(id);
	deleteContent(parent);
}


window.addEventListener("load", e => {
	//initPrices  initAmount　はテストのため止める
	initValutation();
	//initPrices();
	initModal();
	initModalPositions();
	initModalStory();
	initModalTrade();
	initAmount();
	initTouch();
	initOpenTradeDialog();
	initCloseTradeDialog();
});
