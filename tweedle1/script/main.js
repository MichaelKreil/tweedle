var searchTerm = '%23cbase';
var searchTerm = 'lobbyplag';
var maxHours = 70*24;
var maxWords = 200;
var fontScale = 4;

var fontSize = 30;

var blackList = ['die', 'der', 'das', 'hat', 'und', 'den', 'mit', 'ist', 'des', 'dann', 'ner', 'ein', 'mal', 'auf', 'schon', 'was', 'ich', 'and', 'the', 'les', 'are', 'vor', 'bei', 'als', 'out', 'for', 'für', 'von', 'with', 'ihm', 'über', 'can', 'you', 'this', 'zum', 'aus', 'sind', 'bin', 'man', 'los'];
var whiteList = [/[\:\=;8x][\-]?[\/\\\(\)DPp\[\]\*3o\>\<]/i, /\<3/];

var tweets = [];
var canvas, context;
var cWidth, cHeight;
var wordList, wordMap, otherWords = [];

$(function () {
	cWidth = $('body').innerWidth();
	cHeight = $('body').innerHeight();

	fontScale = 0.1*Math.sqrt(cWidth*cHeight)/fontSize;

	canvas = $('#canvas');

	canvas.attr({
		width: cWidth,
		height: cHeight
	});

	context = canvas.get(0).getContext('2d');
	context.font = fontSize + 'px Helvetica';
	context.textBaseline = 'top';

	contemp = $('#hidden').get(0).getContext('2d');
	contemp.font = fontSize + 'px Helvetica';
	contemp.textBaseline = 'top';

	updateTweets();
});

function updateTweets() {
	var url = 'http://search.twitter.com/search.json?q=' + searchTerm + '&rpp=100&include_entities=true&result_type=recent';
	$.ajax({
		url:url,
		dataType:'jsonp'
	}).done(function (data) {
		tweets = [];
		var minDate = (new Date()).getTime() - 3600000*maxHours;
		
		console.log('Results: ' + data.results.length);

		for (var i = 0; i < data.results.length; i++) {
			var tweet = data.results[i];
			var date = (new Date(tweet.created_at)).getTime();
			if (date > minDate) {
				
				parseEntities(tweet, 'media', function (entry) {
					return '';
				});
				
				parseEntities(tweet, 'urls', function (entry) {
					return entry.display_url;
				})
				
				tweet.text = tweet.text.toLowerCase();

				tweet.text = tweet.text.replace(/\&gt\;/g, '>');
				tweet.text = tweet.text.replace(/\&lt\;/g, '<');
				tweet.text = tweet.text.replace(/\&amp\;/g, '&');

				tweets.push(tweet);
			}
		};

		console.log('Tweets: '+tweets.length);

		createWordList();

		startAnimation();
	});
}

function createWordList() {
	wordMap = {};

	for (var i = 0; i < tweets.length; i++) {
		var tweet = tweets[i];
		var text = tweet.text;
		var chunks = [];

		var words = text.split(' ');
		for (var j = 0; j < words.length; j++) {
			var word = words[j];
			
			var whiteListed = false;
			for (var k = 0; k < whiteList.length; k++) {
				if (whiteList[k].test(word)) whiteListed = true;
			}

			var cleanedUp, prefix, suffix;

			if (whiteListed) {
				cleanedUp = word;
				prefix = '';
				suffix = '';
			} else {
				cleanedUp = word.replace(/^[^a-z#@äöüß]*|[^a-z0-9äöüß]*$/ig, '');

				var k = word.indexOf(cleanedUp);
				prefix = word.substr(0, k);
				suffix = word.substr(k+cleanedUp.length);
			}

			suffix += (j != words.length-1) ? ' ' : '';

			if (prefix != '') chunks.push(prefix);

			chunks.push(cleanedUp);

			if ((cleanedUp.length >= 3) && (cleanedUp.length <= 15)) {
				if (wordMap[cleanedUp] == undefined) wordMap[cleanedUp] = 0;
				wordMap[cleanedUp]++;
			}

			if (suffix != '') chunks.push(suffix);
		}

		tweet.chunks = chunks;
	}

	// Unnütze Wörter wegwerfen

	for (var i = 0; i < blackList.length; i++) {
		wordMap[blackList[i]] = undefined;
	}

	wordList = [];

	for (var word in wordMap) {
		if (wordMap[word]) {
			wordList.push({
				text:word,
				count:wordMap[word]
			});
		}
	}

	wordList.sort(function (a,b) {
		return b.count - a.count;
	})

	console.log('words: '+wordList.length);

	if (wordList.length > maxWords) wordList.length = maxWords;


	// wordMap (Wort->Index erstellen)

	wordMap = {};

	for (var i = 0; i < wordList.length; i++) {
		wordMap[wordList[i].text] = i;
	}

	for (var i = 0; i < wordList.length; i++) {
		var word = wordList[i];
		var xMax = measureTextWidth(word.text);
		var yMax = fontSize*1.2;
		
		contemp.fillStyle = '#000000';
		contemp.fillRect(0, 0, xMax, yMax);

		contemp.fillStyle = '#FFFFFF';
		contemp.fillText(word.text, 0, 0);
		
		var data = contemp.getImageData(0, 0, xMax, yMax).data;

		var x0 = 1e10, y0 = 1e10, x1 = 0, y1 = 0;

		for (var y = 0; y < yMax; y++) {
			for (var x = 0; x < xMax; x++) {
				var index = (y*xMax + x)*4;
				if (data[index] > 10) {
					if (x0 > x) x0 = x;
					if (x1 < x) x1 = x;
					if (y0 > y) y0 = y;
					if (y1 < y) y1 = y;
				}
			}
		}

		word.xc = (x1 + x0)/2;
		word.yc = (y1 + y0)/2;
		word.width  = x1 - x0;
		word.height = y1 - y0;
	}
}

function parseEntities(tweet, entity, callback) {
	if (tweet.entities[entity]) {
		var text = [];
		for (var i = 0; i < tweet.text.length; i++) {
			text[i] = tweet.text[i];
		}

		var entries = tweet.entities[entity];
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i];
			var start = entry.indices[0];
			var end   = entry.indices[1];
			for (var i = start; i <= end; i++) text[i] = '';
			text[start] = callback(entry);
		}
		tweet.text = text.join('');
	}
}

function startAnimation() {
	var layouts = ['kreis', 'tweet', 'rechteck', 'tweet', 'raute', 'tweet'];
	//var layouts = ['kreis', 'rechteck', 'raute'];
	var layoutId = 0;

	calcLayout('kreis');

	endAnimation();
	drawFrame(1);
	//return;
	setInterval(function () {
		layoutId = (layoutId + 1) % layouts.length;
		calcLayout(layouts[layoutId]);;
		animate();
	}, 5000)
}

function animate() {
	var frameCount = 40;
	var frameId = 0;

	var pointer = setInterval(function () {
		frameId++;
		if (frameId < frameCount) {
			drawFrame(frameId/frameCount);
		} else {
			clearInterval(pointer);
			drawFrame(1);
			endAnimation();
		}
	}, 40)
}

function drawFrame(phase) {
	context.fillStyle = '#000000';
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.fillRect(0, 0, cWidth, cHeight);

	var a = (1-Math.cos(phase*3.14159))/2;

	for (var i = 0; i < wordList.length; i++) {
		var word = wordList[i];

		var scale = word.newScale*a + word.scale*(1-a);
		var x = word.newX*a + word.x*(1-a);
		var y = word.newY*a + word.y*(1-a);

		drawWord(word.text, x, y, scale, word.xc, word.yc);
	}

	for (var i = 0; i < otherWords.length; i++) {
		var word = otherWords[i];

		var scale = word.newScale*a + word.scale*(1-a);
		var x = word.newX*a + word.x*(1-a);
		var y = word.newY*a + word.y*(1-a);

		drawWord(word.text, x, y, scale, word.xc, word.yc);
	}
}

function drawWord(text, x, y, scale, xc, yc) {
	var fadeScale = 0.8;
	if (scale >= fadeScale) {
		context.fillStyle = '#FFFFFF';
	} else {
		context.fillStyle = 'rgba(255,255,255,'+scale/fadeScale+')';
	}

	context.setTransform(scale, 0, 0, scale, x, y);
	context.fillText(text, -xc, -yc);
}

function endAnimation() {
	for (var i = 0; i < wordList.length; i++) {
		var word = wordList[i];
		word.scale = word.newScale;
		word.x = word.newX;
		word.y = word.newY;
	}

	for (var i = 0; i < otherWords.length; i++) {
		var word = otherWords[i];
		word.scale = word.newScale;
		word.x = word.newX;
		word.y = word.newY;
	}
}

function calcLayout(format) {
	var distanceFunction, simpleDistance;

	var aspectRatio = cWidth/cHeight;

	if (format == 'tweet') {
		simpleDistance = function (word, x0, y0) {
			return 0;
			if (word.x === undefined) return 0;
			var dx = (x0 - word.x);
			var dy = (y0 - word.y)/aspectRatio;
			return Math.max(Math.abs(dx), Math.abs(dy));
		};
	} else {
		simpleDistance = function (word, x0, y0) {
			if (word.scale == 0) return 0;
			if (word.x === undefined) return 0;
			var dx = x0 - word.x;
			var dy = y0 - word.y;
			return Math.sqrt(dx*dx + dy*dy)*0.2;
		};
	}

	switch (format) {
		case 'kreis':
			distanceFunction = function (xc, yc) {
				var dx = (xc - cWidth/2);
				var dy = (yc - cHeight/2)*aspectRatio;
				return Math.sqrt(dx*dx + dy*dy);
			};
		break;
		case 'rechteck':
			distanceFunction = function (xc, yc) {
				var dx = (xc - cWidth/2);
				var dy = (yc - cHeight/2)*aspectRatio;
				return Math.max(Math.abs(dx), Math.abs(dy));
			};
		break;
		case 'raute':
			distanceFunction = function (xc, yc) {
				var dx = (xc - cWidth/2);
				var dy = (yc - cHeight/2)*aspectRatio;
				return Math.abs(dx) + Math.abs(dy);
			};
		break;
		case 'tweet':
			distanceFunction = function (xc, yc) {
				var dx = (xc - cWidth/2);
				var dy = (yc - cHeight/2)*aspectRatio;
				return Math.max(Math.abs(dx), Math.abs(dy));
			};
		break;
	}

	var positionFunction = function (box, rect, word) {
		// Passt das Ding überhaupt rein?
		if (box.w < rect.w) return {x0:0, y0:0, d:1e20};
		if (box.h < rect.h) return {x0:0, y0:0, d:1e20};

		var
			x0 = (cWidth  - rect.w)/2,
			y0 = (cHeight - rect.h)/2,
			x1 = (cWidth  + rect.w)/2,
			y1 = (cHeight + rect.h)/2;

		if (x0 < box.x0) x0 = box.x0;
		if (y0 < box.y0) y0 = box.y0;
		if (x1 > box.x1) x0 = box.x1 - rect.w;
		if (y1 > box.y1) y0 = box.y1 - rect.h;

		return {
			x0:x0,
			y0:y0,
			d:distanceFunction(x0 + rect.w/2, y0 + rect.h/2) + simpleDistance(word, x0, y0)
		}
	}

	var layout;

	if (format != 'tweet') {
		layout = new Layout(positionFunction, 1);

		for (var i = 0; i < wordList.length; i++) {
			var word = wordList[i];

			var scale = Math.sqrt(word.count/tweets.length)*fontScale;
			var padX = 4*scale+2;
			var padY = 4*scale+2;

			var rWidth  = scale*word.width;
			var rHeight = scale*word.height;

			var pos = layout.findBest(rWidth+padX*2, rHeight+padY*2, word);

			layout.add(pos.x0, pos.y0, rWidth+padX*2, rHeight+padY*2);

			word.newScale = scale;
			word.newX = pos.x0 + padX + rWidth/2;
			word.newY = pos.y0 + padY + rHeight/2;

			if (word.scale == 0) {
				word.x = word.newX;
				word.y = word.newY;
			}
		}

		layout.debug();

		for (var i = 0; i < otherWords.length; i++) {
			otherWords[i].newScale = 0;
		}
	} else {

		for (var i = 0; i < wordList.length; i++) {
			var word = wordList[i];
			word.used = false;
			word.newScale = 0;
		}

		otherWords = [];

		var tweetId = Math.floor(Math.random()*tweets.length);
		var tweet = tweets[tweetId];
		var chunks = tweet.chunks;

		var x = 0, y = 0;
		var maxWidth = cWidth*0.5, lineHeight = fontSize*1.2;

		var xOffset = (cWidth - maxWidth)/2;
		var yOffset = (cHeight - 4*lineHeight)/2;

		for (var i = 0; i < chunks.length; i++) {
			var text = chunks[i];
			var width = measureTextWidth(text);
			var height = fontSize*1.2;

			if (x + width > maxWidth) {
				x = 0;
				y += lineHeight;
			}

			if ((text == ' ') && (x == 0)) {
				// Leerzeichen am Anfang brauchen wir nicht
			} else {
				var wx = x + width/2 + xOffset;
				var wy = y + height/2 + yOffset;

				if (wordMap[text] !== undefined) {
					var word = wordList[wordMap[text]];

					if (word.used) {
						otherWords.push({
							text:text,
							x:word.x,
							y:word.y,
							scale:word.scale,
							newX:x + xOffset + word.xc,
							newY:y + yOffset + word.yc,
							newScale:1,
							xc:word.xc,
							yc:word.yc
						})
					} else {
						word.newX = x + word.xc + xOffset;
						word.newY = y + word.yc + yOffset;
						word.newScale = 1;
						word.used = true;
					}
				} else {
					otherWords.push({
						text:text,
						x:wx,
						y:wy,
						newX:wx,
						newY:wy,
						scale:0,
						newScale:1,
						xc:width/2,
						yc:height/2
					})
				}

				x += width;
			}
		}
	}
}

function Layout(posFunc, size) {
	var me = this;
	var boundingBoxes = [{
		x0:(1 - size)*cWidth/2,
		y0:(1 - size)*cHeight/2,
		x1:(1 + size)*cWidth/2,
		y1:(1 + size)*cHeight/2,
		w:size*cWidth,
		h:size*cHeight
	}];

	me.findBest = function(w, h, word) {

		var rect = {w:w, h:h};
		var bestPos = {x0:0, y0:0, d:1e10};
		for (var i = 0; i < boundingBoxes.length; i++) {
			var box = boundingBoxes[i];
			var pos = posFunc(box, rect, word);
			if (pos.d < bestPos.d) bestPos = pos;
		}

		return bestPos;
	}

	var knownBoxes = {};

	me.add = function(x0, y0, w, h) {

		var x1 = x0 + w;
		var y1 = y0 + h;
		var newBoxes = [];

		function addBox(x0, y0, x1, y1) {
			var w = x1 - x0;
			var h = y1 - y0;
			if ((w > 12) && (h > 5)) {
				var x0 = Math.round(x0);
				var x1 = Math.round(x1);
				var y0 = Math.round(y0);
				var y1 = Math.round(y1);
				var index = [x0, x1, y0, y1].join('_');
				if (knownBoxes[index] === undefined) {
					knownBoxes[index] = true;
					newBoxes.push({
						x0:x0,
						y0:y0,
						x1:x1,
						y1:y1,
						w: x1 - x0,
						h: y1 - y0
					});
				}
			}
		}

		for (var i = 0; i < boundingBoxes.length; i++) {
			var box = boundingBoxes[i];

			if (((box.x1 > x0) && (box.x0 < x1)) && ((box.y1 > y0) && (box.y0 < y1))) {
				box.del = true;
				addBox(x1,     box.y0, box.x1, box.y1);
				addBox(box.x0, y1,     box.x1, box.y1);
				addBox(box.x0, box.y0, x0,     box.y1);
				addBox(box.x0, box.y0, box.x1, y0    );
			}
		}

		for (var i = 0; i < boundingBoxes.length; i++) {
			if (boundingBoxes[i].del != true) newBoxes.push(boundingBoxes[i]);
		}

		boundingBoxes = newBoxes;

	}

	me.debug = function() {
		//console.log(boundingBoxes.length);
	}

	return me;
}

var measureTextWidth = (function () {
	var knownTexts = {};
	return function (text) {
		if (knownTexts[text] === undefined) knownTexts[text] = contemp.measureText(text).width;
		return knownTexts[text];
	}
})();
