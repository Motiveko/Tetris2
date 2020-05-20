
//Basic Function

function get(id) { return document.getElementById(id) };
function hide(id) { get(id).style.visibility = 'hidden' };
function show(id) { get(id).style.visibility = 'visible' };
function timeStamp() { var d = new Date(); return d.getTime() };
function random(min, max) { return Math.floor(min + Math.random() * (max + 1 - min)) }
function randomChoice(choices) { return choices[random(0, choices.length - 1)] }
// 0 - 6
// 0 - 0.5 / 0.5 - 1.5 / 1.5-2.5 / 2.5 - 3.5 /... - 5.5/ 5.5 - 6

window.requestAnimFrame = (function () {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function (callback) {
			window.setTimeout(callback, 1000 / 60);
		};
})();


// variables
var KEY = { ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SHIFT: 16 },
	DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3, FULLDROP: 4 },
	canvas = get('canvas'),
	ctx = canvas.getContext('2d'),
	ucanvas = get('upcoming'),
	uctx = ucanvas.getContext('2d'),
	scanvas = get('storing'),
	sctx = scanvas.getContext('2d'),
	speed = { start: 0.6, decrement: 0.01, min: 0.1 },
	nx = 10, ny = 20, nu = 5;



var dx, dy, // 1blcok의 real pixel
	blocks, // court
	actions,
	playing,
	storing,
	dt,
	current,
	next,
	stored,
	score,
	vscore, // score 를 촤라락 표시하기위해 필요
	rows,
	vrows,
	step;
	




// blocks , type
var i = { size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan' }; // 짝대기
var j = { size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue' }; // J
var l = { size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' }; // L
var o = { size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' }; // 네모
var s = { size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green' }; // S
var t = { size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' }; // T
var z = { size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red' };  // z


function eachblock(type, x, y, dir, fn) {
	var col = 0, row = 0, cur = type.blocks[dir], bit = 0x8000;
	// x+col, y+row
	var count = 0;
	for (var i = 0; i < 16; i++) {
		// 0000 : false;
		if ((cur & bit)) {
			count++;
			fn(x + col, y + row);
		}
		if (++col > 3) {
			col = 0;
			row++;
		}
		bit = bit >> 1;
	}

}

function unoccupied(type, x, y, dir) {

	var result = true;

	eachblock(type, x, y, dir, function (x, y) {
		if (x < 0 || x >= nx || y < 0 || y >= ny || getBlock(x, y)) {
			result = false;
		}
	})

	return result;
}

function randomPiece() {
	// 이렇게 해도 될 것 같은데..!
	var pieces = [i, j, l, o, s, t, z];

	var blockType = randomChoice(pieces);
	var piece = { type: blockType, dir: DIR.UP, x: random(0, nx - 4), y: 0 };
	randomPosition(piece);
	return piece;
}

function randomPosition(piece) {
	var count = 0;
	while (!unoccupied(piece.type, piece.x, 0, piece.dir) && count < 10) {
		piece.x = random(0, nx - 2);
		count++;
	}
}


function run() {
	addEvents();
	var last = now = timeStamp();

	function frame() {

		now = timeStamp();

		// frame이 다시실행되는 시간. 1초로 계산한다. 거의 뒤에값이 들어간다.
		update(Math.min(1, (now - last) / 1000.0));
		draw();
		last = now;

		requestAnimationFrame(frame, canvas);
	}

	resize();
	reset();
	frame();
}

function addEvents() {
	document.addEventListener('keydown', keydown);
	window.addEventListener('resize', resize, false);
}

function keydown(ev) {
	if (playing) {
		var handled = false;
		switch (ev.keyCode) {
			case KEY.UP: actions.push(KEY.UP); handled = true; break;
			case KEY.DOWN: actions.push(KEY.DOWN); handled = true; break;
			case KEY.LEFT: actions.push(KEY.LEFT); handled = true; break;
			case KEY.RIGHT: actions.push(KEY.RIGHT); handled = true; break;
			case KEY.SPACE: actions.push(KEY.SPACE); handled = true; break;
			case KEY.SHIFT: actions.push(KEY.SHIFT); handled = true; break;
			case KEY.ESC: lose(); handled = true;
		}
	} else {
		if (ev.keyCode == KEY.SPACE) play();
	}

	if (handled)
		ev.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)

}

function resize() {

	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	ucanvas.width = ucanvas.clientWidth;
	ucanvas.height = ucanvas.clientHeight;

	scanvas.width = scanvas.clientWidth;
	scanvas.height = scanvas.clientHeight;

	dx = canvas.width / nx;
	dy = canvas.height / ny;
}


function play() { hide('start'); reset(); playing = true }


function lose() { show('start'); setVisualScore(score); playing = false; }


function setVisualScore(n) { vscore = n || score; invalidateScore(); }

function setScore(n) { score = n; }

function addScore(n) { setScore(score + n); }

function clearScore() { setScore(0); vscore = 0; invalidateScore(); }

function clearRows() { setRows(0); vrows = 0; invalidateRows(); }

function setVisualRows(n) { console.log('setVisualRows(N)'); vrows = n || rows; invalidateRows(); }

function setRows(n) {
	rows = n;
	step = Math.max(speed.min, speed.start - rows * speed.decrement);
}

function addRows(n) { setRows(rows + n); }

// Blocks에 현재 표시되는 블럭들을 놓는것은 내방식으로 구현한다.
function getBlock(x, y) {
	// 이부분은 정확히는 모르겠지만.. blocks 가 2차원배열로 선언된상태가 아닐 때 null로 보내주는거같다..
	return (blocks && blocks[x]) ? blocks[x][y] : null;
}

function setBlock(input) {

	var x = input.x, y = input.y, dir = input.dir, type = input.type;
	// 좌표 (x,y)에 블럭이 있으면 type을 넣어준다. , 아니면  null
	eachblock(type, x, y, dir, function (x, y) {
		//array가 2차원으로 선언을 해주지 않으면 사용할 수 없다!! blocks[x] 가 없으면 []로 선언해준다는 뜻
		blocks[x] = blocks[x] || [];
		blocks[x][y] = type;
	})

}

function clearBlocks() {
	blocks = [];
	invalidate();
}

function clearActions() { actions = []; }

function setCurrentPiece(piece) { current = piece || randomPiece(); invalidate(); }

function setNextPiece(piece) { next = piece || randomPiece(); invalidateNext(); }

function setStoredPiece(piece) {
	stored = piece || randomPiece();
	invalidateStored();
}

function reset() {
	dt = 0;

	clearActions();
	clearBlocks();
	clearRows();
	clearScore();

	setCurrentPiece();
	setNextPiece();
	storing = false;
}

function update(idt) {
	if (playing) {

		//score 표시
		if (score > vscore) {
			vscore = (score - vscore) > 3 ? vscore + 3 : score;
			setVisualScore(vscore);
		}

		if (rows > vrows) {
			setVisualRows(vrows + 1);
		}



		handle(actions.shift());

		dt += idt;
		if (dt > step) {
			dt = dt - step;
			drop();
		}
	}

}

function handle(action) {

	switch (action) {
		case KEY.LEFT: move(DIR.LEFT); break;
		case KEY.RIGHT: move(DIR.RIGHT); break;
		case KEY.UP: rotate(); break;
		case KEY.DOWN: drop(); break;
		case KEY.SPACE: fullDrop(); break;
		case KEY.SHIFT: storePiece(); break;
	}

}

function storePiece() {

	if( storing == false ){
		dt = 0;
		current.y = 0;
		if (!stored) {
			console.log('first storing');
			// 첫 storing
			setStoredPiece(current);
			setCurrentPiece(next);
			setNextPiece();
		} else {
			console.log('get stored block');
			// 이미 storing -> current와 storing 교환;
			var tmp = current;
			randomPosition(stored);
			setCurrentPiece(stored);
			setStoredPiece(tmp);
		}
		storing = true;

	} else console.log('cannot store');
}


function move(dir) {

	var x = current.x;
	var y = current.y;
	switch (dir) {
		case DIR.LEFT: x -= 1; break;
		case DIR.RIGHT: x += 1; break;
		case DIR.DOWN: y += 1; dt = 0;
	}

	if (unoccupied(current.type, x, y, current.dir)) {
		current.x = x, current.y = y;
		invalidate();
		return true;
	}

	return false;
}


function rotate() {


	var x = current.x, y = current.y, nextDir = current.dir;
	nextDir = (nextDir + 1) > DIR.MAX ? 0 : nextDir + 1;

	var xAdjust = 0;
	var yAdjust = 0;
	eachblock(current.type, x, y, nextDir, function (x, y) {

		if (x < 0) {
			xAdjust = Math.max(xAdjust, -x);
		} else if (x >= nx) xAdjust = Math.min(xAdjust, nx - 1 - x);
		if (y >= ny) yAdjust = Math.min(yAdjust, ny - 1 - y);
	})

	x += xAdjust;
	y += yAdjust;

	if (unoccupied(current.type, x, y, nextDir)) {
		current.x = x;
		current.y = y;
		current.dir = nextDir;
		invalidate();
	}

}

function drop() {
	if (!move(DIR.DOWN)) {

		setBlock(current);
		addScore(10);

		removeLines();
		setCurrentPiece(next);
		setNextPiece();
		storing = false;
		// clearActions();
	}
	if (!unoccupied(current.type, current.x, current.y, current.dir)) lose();


}

function fullDrop() {

	while (move(DIR.DOWN)) { }
	drop();
}

function dropPiece() {

	//setBlock(current) 임
}

function removeLines() {

	var count = 0;
	for (var i = ny - 1; i > 0; i--) {
		var willRemoved = true;
		for (var j = 0; j < nx; j++) {
			if (!getBlock(j, i)) willRemoved = false;
		}
		if (willRemoved) {
			removeLine(i);
			//없앤줄부터 다시검사!
			i++;
			count++;
		}
	}

	addRows(count);
	console.log(rows);
	switch (count) {
		case 1: addScore(100);
		case 2: addScore(250);
		case 3: addScore(400);
		case 4: addScore(600);
	}
}

function lineAnima() {

}


function removeLine(n) {

	for (var j = n; j > 0; j--) {
		for (var i = 0; i < nx; i++) {
			//윗줄을 아랫줄로
			blocks[i] = blocks[i] || [];
			blocks[i][j] = blocks[i][j - 1];
		}
	}
}


var invalid = {};

function invalidate() { invalid.court = true };
function invalidateNext() { invalid.next = true };
function invalidateScore() { invalid.score = true };
function invalidateRows() { invalid.rows = true };
function invalidateStored() { invalid.stored = true };


// RENDERING

function draw() {
	if (playing) {

		//drawCourt, Next, Score
		ctx.save();
		ctx.lineWidth = 1;

		// ctx.translate(0.5, 0.5);

		if (invalid.court) {
			drawCourt();
			invalid.court = false;
		}
		if (invalid.next) {
			drawNext();
			invalid.next = false;
		}
		if (invalid.score) {
			drawScore();
			invalid.score = false;
		}
		if (invalid.rows) {
			drawRows();
			invalid.rows = false;
		}
		if( invalid.stored ){
			drawStored();
			invalid.stored = false;
		}
		ctx.restore();
	}

}

function drawCourt() {


	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// current 랜더링
	drawPiece(ctx, current, 0, 0, canvas.width, canvas.height);

	//court에 존재하는 block 랜더링	
	for (var i = 0; i < nx; i++) {
		for (var j = 0; j < ny; j++) {
			if (getBlock(i, j)) drawBlock(ctx, i, j, getBlock(i, j).color);
		}
	}
}

function drawNext() {

	uctx.clearRect(0, 0, ucanvas.width, ucanvas.height);
	uctx.save();
	eachblock(next.type, 1, 1, next.dir, function (x, y) {
		drawBlock(uctx, x, y, next.type.color);
	})

	uctx.restore();
}
function drawStored(){

	sctx.clearRect(0, 0, scanvas.width, scanvas.height );
	sctx.save();
	eachblock( stored.type, 1, 1, stored.dir, function(x, y){
		drawBlock(sctx, x, y, stored.type.color);
	})
}

function drawScore() {
	get('score').innerText = vscore;
}

function drawRows() {
	get('rows').innerText = vrows;
}

//한개 통째로 그림
function drawPiece(ctx, input) {

	eachblock(input.type, input.x, input.y, input.dir, function (x, y) {
		drawBlock(ctx, x, y, input.type.color);
	})

}
//한칸씩 그림
function drawBlock(ctx, x, y, color) {
	ctx.fillStyle = color;
	ctx.fillRect(x * dx, y * dy, dx, dy);
	ctx.strokeRect(x * dx, y * dy, dx, dy);

}

run();








