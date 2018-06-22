var ROOT_URL = "https://www.synrgtech.net/"
var emblemDetails = {}
var emblemName = {}

$( document ).ready(function(){ 
    queryEmblemDetails(getParameterByName("emb"))
})

function queryEmblemDetails(name){
    var emblemIdentifier = name
    var namePromise = getName(emblemIdentifier)
            namePromise.then(result=>{
                console.log("Name result", result)
                emblemDetails.name = result
                emblemName.value = result
            })
            var contentsPromise = getContents(emblemIdentifier)
            contentsPromise.then(result=>{
                var parsedResult = JSON.parse(result[0].decoded)
                var btcAddress = parsedResult.bitcoin.address
                var covalAddress = parsedResult.bitcoin.address
                var ethereumAddress = parsedResult.ethereum.address
                console.log("btc address", btcAddress)
                emblemDetails.btcAddress = btcAddress
                console.log("ethereum address", ethereumAddress)
                emblemDetails.ethereumAddress = ethereumAddress
                var ethereumBalancePromise = getEthereumBalance(ethereumAddress)
                ethereumBalancePromise.then(result=>{
                    var adjustedResult = (Number(result) * .000000000000000001).toFixed(8)
                    console.log("ethereum balance result", adjustedResult)
                    emblemDetails.ethereumBalance = adjustedResult
                })
                var covalBalancePromise = getXcpBalance(covalAddress)
                covalBalancePromise.then(result=>{
                    console.log("coval balance result", result)
                    emblemDetails.covalBalance = result
                })
                var btcBalancePromise = getBitcoinBalance(btcAddress)
                btcBalancePromise.then(result=>{
                    var adjustedBalance = (Number(result) *.00000001).toFixed(8)
                    console.log("btc balance result", adjustedBalance)
                    emblemDetails.btcBalance = adjustedBalance
                })
                var openSeaBalancePromise = getOpenSeaBalance(ethereumAddress)
                openSeaBalancePromise.then(result=>{
                    var resultLength = result.length
                    var assets = []
                    emblemDetails.collectableAssets = []
                    result.forEach(item=>{
                        emblemDetails.collectableAssets.push(item)
                    })
                    //emblemDescription.value = emblemDetails
                    result.forEach(asset=>{
                        //console.log("asset?",asset.asset_contract.name, asset.name, asset.image_url, asset.image_url.includes('ck-kitty-image') )
                        
                        var propertyCollection = { number: [], value: [] }
                        var propKeys = Object.keys(asset.properties)
                        propKeys.forEach((property, index)=>{
                            var value = asset.properties[property]
                            console.log(asset.properties[property], typeof(value) === "number")
                            var kvp = {name: property, value: value}
                            if (typeof(value) === "number") {
                                propertyCollection.number.push(kvp)
                            } else {
                                propertyCollection.value.push(kvp)
                            }
                            console.log(index, propKeys.length)
                            if (index === propKeys.length - 1) {
                                asset.propertyCollection = propertyCollection
                                assets[assets.length] = asset
                                if (resultLength === assets.length) {
                                    assignProperty()
                                }
                            }

                        })
                    })
                })
            })
}

function externalApiFetch(path, options, cb) {
	return apiFetch(path, options, cb)
}

function internalApiFetch(path, options, cb) {
	var url = encodeURI(ROOT_URL + path)
	return apiFetch(url, options, cb)
}


function apiFetch(url, options, cb) {
	var path = url
	//console.log("Using URL", url)
	if(options === undefined) {
		options = {};
	}
	
	// If a body is provided, serialize it as JSON and set the Content-Type header
	if(options.body !== undefined) {
		options = Object.assign({}, options, {
			body: JSON.stringify(options.body),
			headers: Object.assign({}, options.headers, {
				"Content-Type": "application/json"
			}),
			method: 'POST'
		})
	}
	// Fetch the resource and parse the response as JSON
	//console.log("inside api fetch", url, options)
	return fetch(url, options)
		.then(function(response) {
			//console.log("Fetch result", JSON.stringify(response))
			return cb(response.json())
		})
}

function getEthereumBalance(address) {
	var queryUrl = "https://api.etherscan.io/api?module=account&action=balance&address="+address+"&tag=latest"
	//console.log("query url", queryUrl)
	return externalApiFetch(queryUrl, {}, function(resultPromise){
		return resultPromise.then(value=>{
			//console.log("eth", JSON.stringify(value))
			var resultValue = value.result
			return JSON.parse(resultValue)
		})
	})
}

function getXcpBalance(address) {
	var queryUrl = "https://xchain.io/api/balances/"+address+"&cors=true"
	return externalApiFetch(queryUrl, {}, function(resultPromise){
		return resultPromise.then(value=>{
			var filteredValue = value.data.filter(coin=>{return coin.asset === "COVALC"})[0] || {quantity: 0}
			var resultValue = filteredValue.quantity
			return JSON.parse(resultValue)
		})
	})
}

function getBitcoinBalance(address) {
	var queryUrl = "https://blockchain.info/balance?active="+address+"&cors=true"
	return externalApiFetch(queryUrl, {}, function(resultPromise){
		return resultPromise.then(value=>{
			var parsedValue = JSON.stringify(value[address].final_balance)
			return JSON.parse(parsedValue)
		})
	})
}

function getOpenSeaBalance(address) {	
	var queryUrl = "https://1h6pof1izw-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%20(lite)%203.24.9%3Breact-instantsearch%205.0.0-beta.1%3BJS%20Helper%202.24.0&x-algolia-application-id=1H6POF1IZW&x-algolia-api-key=4df9c579a49b1ec507d7224052598f42"
		var options = {}
	options.body = {
		"requests": [
			{
				"indexName": "assets_prod_main",
				"params": "query=&maxValuesPerFacet=50&page=0&highlightPreTag=%3Cais-highlight-0000000000%3E&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&facets=%5B%22_tags%22%2C%22owner.address%22%2C%22asset_contract.address%22%5D&tagFilters=&facetFilters=%5B%5B%22owner.address%3A"+address+"%22%5D%5D"
			}
		]
	}
	return externalApiFetch(queryUrl, options, function(resultPromise){
		return resultPromise.then(value=>{
			var foundAssets = value.results[0].hits
			return foundAssets
		})
	})
}

function getName(name) {
	return internalApiFetch("address-stream-item?stream_key="+name+":name", {}, function(resultPromise){
		return resultPromise.then(function(value) {
			var resultValue = JSON.stringify(value[0].decoded)
			return JSON.parse(resultValue)
		  })		
	})	
}

function getContents(name) {
	return internalApiFetch("address-stream-item?stream_key="+name+":contents", {}, function(resultPromise){
		return resultPromise.then(function(value) {
			var resultValue = JSON.stringify(value)
			return JSON.parse(resultValue)
		  })		
	})	
}

function assignProperty() {
        if (emblemDetails.btcBalance > 0)
        emblemDetails.collectableAssets.push({
            name: "Bitcoin",
            balance: emblemDetails.btcBalance,
            description: "Currency",
            BottomColor: "#a88131",
            external_link: "https://live.blockcypher.com/btc/address/"+emblemDetails.btcAddress,
            asset_contract: {name: "BlockCypher"},
            png_image_url: "assets/bitcoin.png",
            image_url: "assets/bitcoin.png"
        })
        if (emblemDetails.covalBalance > 0)
        emblemDetails.collectableAssets.push({
            name: "Coval",
            balance: emblemDetails.covalBalance,
            description: "Currency",
            BottomColor: "#1c2148",
            external_link: "https://xchain.io/address/"+emblemDetails.btcAddress,
            asset_contract: {name: "Coval Explorer"},
            png_image_url: "assets/coval.png",
            image_url: "assets/coval.png"
        })
        if (emblemDetails.ethereumBalance > 0)
        emblemDetails.collectableAssets.push({
            name: "Ethereum",
            balance: emblemDetails.ethereumBalance,
            description: "Currency",
            BottomColor: "#3d498e",
            external_link: "https://etherscan.io/address/"+emblemDetails.ethereumAddress,
            asset_contract: {name: "Etherscan"},
            png_image_url: "assets/ethereum.png",
            image_url: "assets/ethereum.png"
        })
		console.log("assigning")
        console.log(JSON.stringify(emblemDetails, null, 4))
        var assets = ""
        emblemDetails.collectableAssets.forEach(asset=>{
            console.log(asset.asset_contract.name, asset.name, asset.png_image_url)
            assets = assets + "<div class=\"column\"><div class=\"ui segment card\"><img style=\"display:block;margin:auto;\" width=\"50%\"src=\""+asset.image_url+"\"><div class=\"content\"><div class=\"header\">" + asset.name + "<div class=\"meta\"><span class=\"date\">" +(asset.balance || asset.asset_contract.name ) + "</span></div></div></div><div class=\"extra content\"><span><a target=\"_blank\" href=\"" + asset.external_link + "\">View on " + asset.asset_contract.name + " <i class=\"external alternate icon\"></i></a></span></div></div></div>"
            $(".ui.trophy.modal .cats").html(assets)
        })
        $('.ui.trophy.modal').modal('show')
}