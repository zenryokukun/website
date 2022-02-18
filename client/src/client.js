
import {
	intl,timer,PAIRS,getUnit
	,validateAmount,LEVERAGE
	,AMT_LIMIT
	,psuedoPosition
} from "./util.js";
import "./ws.js";
import {storage} from "./storage.js";
import { details } from "./details.js";
/**swipe用グローバル変数 */
let _PAGE_INDEX;
let _CONTENTS;
let _TITLES;

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
	const yen = "\xA5"
	/**評価額 取引可能額 拘束証拠金 利益*/
	const {actualProfitLoss,availableAmount,margin,profitLoss} = resp;
	_updateTextContent("eval",actualProfitLoss,yen);
	_updateTextContent("avail",availableAmount,yen);
	_updateTextContent("profit",profitLoss,yen);
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
	//const url = "https://api.coin.z.com/public/v1/ticker";
	fetch("/ticker",{"headers":{"Content-Type":"application/json"}})
		.then(res => res.json())
		.then(res => {
			if (res){
				/*価格を設定するNode*/
				const targets = document.querySelectorAll(".current-price");	
				/*id（銘柄名）と一致する価格を設定*/
				for (const data of res){
					const last = data["last"];
					const coin = data["symbol"].slice(0,3);
					Array.from(targets).forEach(targ => {
						if (coin === targ.id) {
							targ.textContent = intl(last);
							targ.dataset["price"] = last;
						}
					});
				}
			} else {
				alert("価格の取得に失敗しました。GMOメンテかも？")
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
	if (!data /*|| data.length === 0*/) return;
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
			if (data){
				if(data.length > 0){
					setAmount(pair,data);
					details.update(pair,data);
				}
			} else {
				//console.log(`${pair}の保有量が取得できませんでした。`)
			}
		});
		console.log("wating...");
		await timer(700);
	}
	initYourPosition();
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

function _isMyPosition(id,data){
	if (!data) return false;
	return data.filter(elem => elem.id == id).length > 0;
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
				//modal表示
				document.getElementById("modal").style.display = "block";
				/**btc→BTC_JPYに変換*/
				const pair = row.id.toUpperCase() + "_JPY";
				//positionがある時は明細表示
				const positions = details[pair];
				if (positions.length > 0){
					//create headers for details					
					const parent = document.getElementById("positions")
					const header = createPositionTitle();
					parent.append(header);
					//create details
					//localStorageを取得し、自分のポジションに*を付与
					const myData = storage.parse();
					
					let i = 1;
					for (const pos of positions){
						const {symbol,size,side,price,lossGain,positionId} = pos;
						const aste = _isMyPosition(positionId,myData) ? "*" : "";
						const rowNo = i.toString() + aste;
						const frame = createPositionDetail(symbol.slice(0,3),side,size,parseInt(price),parseInt(lossGain),rowNo);
						/**clickで決済確認ダイアログ開く */
						frame.addEventListener("click", e => openCloseTradeDialog(positionId,symbol,size,side));
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
			fetch("/story")
			.then(res => {
				return res.json();
			})
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
		} else {}
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
		//const dial = document.getElementById("confirm");
		const _side = document.getElementById("trade-side").dataset["side"];
		const side = _side === "buy" ? "BUY" : "SELL";

		openDialog(pair,side,amt,pwd,margin);
		/**サーバ送信 */
		//const param = {"pair":pair,"amount":amt};

	});
	/**modal内の初期化ここまで**** */

	/**BUY SELL*/
	const defaultBg = "#777";
	const selectedBg = "#FF5722";
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

function toggleConfirmDisplay(id){
	/**
	 * id: confirm || close-confirm
	 * 指定されたほうを表示、されなかったほうを非表示にする
	 */
	const visibleNode = document.getElementById(id);
	_switchNode(visibleNode,true);
	const noneVisibleNode = id === "confirm" 
			? document.getElementById("close-confirm") 
			: document.getElementById("confirm");
	_switchNode(noneVisibleNode,false);

}

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
	//modal表示
	document.getElementById("modal-confirm").style.display = "block";
	//modal content表示
	toggleConfirmDisplay("confirm");
}

function closeDialog(){
	_removeDialogData("trading-pair","pair");
	_removeDialogData("trading-side","side");
	_removeDialogData("trading-amount","amt");
	_pwd = function(){};
	_margin = function(){};
	//modal非表示
	document.getElementById("modal-confirm").style.display = "none";
}

/**確認dialog内のボタン押下イベント */
function initOpenTradeDialog(){
	/**okボタン */
	const execBtn = document.getElementById("exec");
	execBtn.addEventListener("click", e => {
		if (execBtn.dataset["clicked"] == "1"){
			console.log("already clicked!")
			return;
		} else {
			execBtn.dataset["clicked"] = "1";
		}

		const pair = _getDialogData("trading-pair","pair");
		const side = _getDialogData("trading-side","side");
		const amt = _getDialogData("trading-amount","amt");
		/**server */
		const pwd = _pwd();
		const margin = _margin();
		//fetch中はloaderでグルグル
		showLoader();
		fetch("/exec",{
			method:"POST",
			headers:{"Content-Type":"application/json"},
			body:JSON.stringify({"pair":pair,"side":side,"amt":amt,"pwd":pwd})
		})
		.then(res => {
			return res.json();
		})
		.then(robj => {
			if (robj){
				const pid = robj.positionId;
				storage.add({"id":pid,"margin":margin,"pwd":pwd,"pair":pair});
				details.open(pair,robj.positionId);
				//alert(`ポジションID:${robj.positionId}`)
				updateLoaderMessage("completed!",`建玉ID:${pid}`)
			} else {
				updateLoaderMessage("faild...","中途半端に処理失敗しました")
				//alert("取引が失敗したか、建玉IDの取得が出来ませんでした。ごめんなさい");
			}
			closeDialog();
		})
		.catch(err => {
			updateLoaderMessage("failed...",err);
			console.log(err);
		});
	});
	/**closeボタン*/
	document.getElementById("cancel").addEventListener("click", e=> {
		//clickフラグを折る
		delete document.getElementById("exec").dataset["clicked"];
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
	return openPwd === pwd;
}

/**開く */
function openCloseTradeDialog(id,pair,size,side){
	/**positioinIdを表示*/
	const idNode = document.getElementById("position-id");
	idNode.textContent = id;
	toggleConfirmDisplay("close-confirm");
	document.getElementById("modal-confirm").style.display = "block";
}

/**閉じる */
function closeCloseTradeDialog(){
	/**pwd,idを削除して閉じる*/
	document.getElementById("close-pwd").value = "";
	document.getElementById("position-id").textContent = "";
	document.getElementById("modal-confirm").style.display = "none";
}
function initCloseTradeDialog(){
	/*** ポジション明細をクリックした時のダイアログ初期化処理 */
	document.getElementById("exec-close").addEventListener("click", e => {
		//決済
		const idTextStr = document.getElementById("position-id").textContent;
		const id = parseInt(idTextStr);
		const closePwd = document.getElementById("close-pwd").value;
		if (checkPwd(closePwd,id)){
			const position = details.findById(id);
			//close
			const {symbol,side,size} = position;
			const body = {"pair":symbol,"side":side,"amt":size,"id":id};
			//loader　表示
			showLoader();
			fetch("/close",{
				"method":"POST",
				"headers":{"Content-Type":"application/json"},
				"body":JSON.stringify(body)
			})
			.then(res => res.json())
			.then(data => {
				if (data) {
					storage.remove(id);
					details.close(symbol,id);
					//alert(data["message"]);
					updateLoaderMessage("completed!",data["message"]);
					//確認ダイアログ閉じる
					closeCloseTradeDialog();
				} else {
					updateLoaderMessage("failed...","処理に失敗しました...");
					//alert("決済に失敗したかも。。。");
				}
			})
			.catch(err =>{
				updateLoaderMessage("failed...","処理に失敗しました...");
				console.log(err);
			});
			//remove storage;
		} else {
			alert("wrong password");
		}
		
	});
	
	document.getElementById("cancel-close").addEventListener("click", e => {
		closeCloseTradeDialog();
	});
}

/*******************************************************[END] close-trade dialog */

/*******************************************************[START] loader */
function initLoader(){
	const btn = document.getElementById("loader-close");
	btn.addEventListener("click", e => closeLoader());
}

function showLoader(){
	const modal = document.getElementById("modal-loader");
	modal.style.display = "block";
	const loader = document.getElementById("preloader");
	loader.style.display = "block";
	const message = document.getElementById("loader-message");
	message.style.display = "none";
	//ステータスメッセージの初期化
	const status = document.querySelector(".status-message");
	status.textContent = "just a sec...";
	//閉じるボタン非表示
	const btn = document.getElementById("loader-close");
	btn.style.display = "none";

}

function updateLoaderMessage(header,body){
	const loader = document.getElementById("preloader");
	loader.style.display = "none";
	//ステータス表示
	const status = document.querySelector(".status-message");
	status.textContent = header;
	//メッセージ表示
	const message = document.getElementById("loader-message");
	message.style.display = "block";
	message.innerText = body;
	//閉じるボタン表示
	const btn = document.getElementById("loader-close");
	btn.style.display = "block";
}

function closeLoader(){
	const modal = document.getElementById("modal-loader");
	modal.style.display = "none";
}

/*******************************************************[END] loader */

/*******************************************************[START] myList */
function initMyList(){
	const node = document.getElementById("list-message");
	node.addEventListener("click",showMyList);
}
function showMyList(){
	const modal = document.getElementById("modal-my-list");
	modal.style.display = "block";
	/**render my poistion */
	const parent = document.getElementById("my-list");
	const data = storage.parse();
	for (const elem of data){
		const {id,pwd,pair} = elem;
		const _pair = pair ? pair.slice(0,3) : "";
		const div = document.createElement("div");
		div.className = "my-list-detail";
		const msg = `通貨:${_pair} ID:${id} PWD:${pwd} `
		div.textContent = msg;
		parent.append(div);
	}
}
function closeMyList(){
	const modal = document.getElementById("modal-my-list");
	modal.style.display = "none";
	deleteContentById("my-list");
}
/*******************************************************[END] myList */


function initModal(){
	function _hideContents(){
		const pos = document.getElementById("positions");
		const sty = document.getElementById("stories");
		const opt = document.getElementById("open-trade");
		pos.style.display = "none";
		sty.style.display = "none";
		opt.style.display = "none";
	}
	/*modal閉じる処理。modal-contentと重なっていない部分（枠外）をクリックすると発動
		display:none
	*/
	window.addEventListener("click", e => {
		const modal = document.getElementById("modal");
		const modalMyList = document.getElementById("modal-my-list");

		if (e.target === modal) {
			e.target.style.display = "none";
			_hideContents();
			return;
		}

		if (e.target === modalMyList){
			//e.target.style.display = "none";
			closeMyList();
		}
	});
	
	/*閉じるボタン押した場合*/
	const btns = document.querySelectorAll(".close-mark");
	for (const btn of Array.from(btns)){
		btn.addEventListener("click", e=> {
			const modal = document.getElementById("modal");
			const modalMyList = document.getElementById("modal-my-list");
			if (modal.style.display === "block"){
				modal.style.display = "none";
				_hideContents();
			}
			if (modalMyList.style.display === "block"){
				closeMyList();
			}
		});
	}
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

function initYourPosition(){
	/**storageにある存在しないポジションを削除する */
	const localData = storage.parse();
	if (!localData) return null;
	for(const data of localData){
		const id = data["id"];
		const bool = details.findById(id);
		if(!bool) {
			console.log(`id:${id} does not exits anymore...`);
			storage.remove(id);
		}
	}
}

window.addEventListener("load", e => {
	//initPrices  initAmount　はテストのため止める
	
	initValutation();
	initPrices();
	initModal();
	initModalPositions();
	initModalStory();
	initModalTrade();
	initAmount();
	initTouch();
	initOpenTradeDialog();
	initCloseTradeDialog();
	details.socketOnOpen(setAmount);
	initLoader();
	initMyList();
	
	//スマホのキーボード表示で縮むのを防止
	const vp = document.querySelector("meta[name=viewport]");
	vp.setAttribute("content",vp.content + ", height=" + window.innerHeight);

	//test
	//document.getElementById("greet-frame").addEventListener("click",showLoader);
	//document.getElementById("modal-loader").addEventListener("click",e => updateLoaderMessage("failed!","hello\nworld"));

	//以下テスト後削除
	/*
	const proms = [];
	for (const pair of PAIRS){
		const prom = fetch("/positions?symbol="+pair)
			.then(res => res.json())
			.then(data => {
				if (data){
					if(data.length > 0){
						setAmount(pair,data);
						details.update(pair,data);
					}
				} else {
					//console.log(`${pair}の保有量が取得できませんでした。`)
				}
		});
		proms.push(prom);
	}
	Promise.all(proms).then(val=>{
		console.log(details);
		details.add("XRP_JPY",{leverage: '2', lossGain: '99', losscutPrice: '99.99', orderdSize: '9', positionId: 999999,})
		details.remove("XRP_JPY",156106502)
		details.add("BTC_JPY",{leverage: '1', lossGain: '1', losscutPrice: '11.11', orderdSize: '1', positionId: 111111,})
		details.add("BTC_JPY",{leverage: '1', lossGain: '2', losscutPrice: '22.22', orderdSize: '2', positionId: 222222})
	});
	*/
});
