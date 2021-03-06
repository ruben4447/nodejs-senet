const socket = io();

const containerId = "senet-container";
const container = document.getElementById("container");
var p5Canvas; // P5 Canvas
var senetBoardImage, anubisImage, blackStickImage, whiteStickImage; // Images
var boardRenderInfo; // Board render info
const bgColour = 51; // Default background colour

var boardInfo; // Board info from "board-info" event
var draggingHouse = -1; // Index of house that we are changing pos[] of
var w; // Width of pieces
var stickScore = null; // Score for sticks
var canThrowSticks = false;
var renderBoard = false;
var draggingHouseStart; // Start coordinates for draggingHouse
var currentMessage = ''; // Message to show when rendering board

const senetBoardWidth = 700;
const senetBoardHeight = 237;

const anubisWidth = 179;
const anubisHeight = 215;
const anubisPadding = 11; // Y-padding on anubis

const white = [242, 223, 223];
const black = [129, 122, 127];

// P5: Setup function
function setup() {
  p5Canvas = createCanvas(senetBoardWidth + anubisWidth, 400);
  p5Canvas.parent(containerId);

  // IMAGES
  senetBoardImage = loadImage('./img/senet-board.png');
  anubisImage = loadImage('./img/anubis.png');
  blackStickImage = loadImage('./img/black-stick.png');
  whiteStickImage = loadImage('./img/white-stick.png');

  // SOUNDS
  Sounds.create("error", "./sound/error.mp3");
  Sounds.create("tada", "./sound/tada.mp3");
  Sounds.create("water-splash", "./sound/splash.mp3");
  Sounds.create("roll", "./sound/roll.mp3");
  Sounds.create("anubis-0", "./sound/anubis-1.mp3");
  Sounds.create("anubis-1", "./sound/anubis-2.mp3");
  Sounds.create("anubis-2", "./sound/anubis-3.mp3");
  Sounds.create("anubis-final", "./sound/anubis-final.mp3");

  noLoop();
}

// Renders certain state to canvas
function render(mode, data = undefined) {
  renderBoard = mode == "board";
  try {
    background(bgColour);
  } catch (e) {
    setTimeout(() => render(mode, data), 100);
    return;
  }

  switch (mode) {
    case 'message':
      fill(100, 80, 200);
      noStroke();
      textSize(30);
      text(data, 10, 50);
      break;
    case 'instructions':
      render("message", "Follow instructions below");
      break;
    case 'board': {
      background(0xff);
      if (data == undefined) data = boardInfo;

      // Display image
      image(senetBoardImage, 0, 0, senetBoardWidth, senetBoardHeight);

      image(anubisImage, senetBoardWidth, anubisPadding, anubisWidth, anubisHeight);
      stroke(151, 99, 12);
      strokeWeight(3);
      fill(252, 204, 155, 120);
      rect(senetBoardWidth, anubisPadding, anubisWidth, anubisHeight);

      if (boardRenderInfo == undefined || data == undefined) {
        render('error', { title: 'Cannot Render Game', message: 'Missing information' });
      } else {
        // Who's go is it?
        textSize(17);
        noStroke();
        fill(data.whiteGo ? white : black);
        let txt = (data.whiteGo ? "White" : "Black") + "'s Go";
        text(txt, boardRenderInfo.padding + boardRenderInfo.border, boardRenderInfo.padding);
        text(txt, boardRenderInfo.padding + boardRenderInfo.border, senetBoardHeight - boardRenderInfo.padding / 3);

        strokeWeight(2);
        w = boardRenderInfo.w / 3.5;
        for (let x = 0; x < data.board.length; x++) {
          const pos = data.pos[x];

          if (data.board[x] != null) {
            renderPiece(data.board[x], pos[0], pos[1], w);
          }
        }

        // Sticks
        let gap = 37;
        let y = senetBoardHeight + 20;
        for (let x = 0; x < data.sticks.length; x++) {
          const img = data.sticks[x] ? whiteStickImage : blackStickImage;
          image(img, (x + 1) * gap, y);
        }
        noStroke();
        fill(0);
        text(data.score, gap / 3, y + whiteStickImage.height / 2);

        // Board message
        if (currentMessage.length != 0) {
          noStroke();
          textSize(14);
          fill(51);
          text(currentMessage, (data.sticks.length + 3) * gap, y);
        }

        // Render pieces that are on anubis
        gap = w * 2;
        let x = w;
        y = anubisPadding + w;
        let pieces = [...new Array(data.atAnubis[0]).fill(true), ...new Array(data.atAnubis[1]).fill(false)];
        for (let i = 0; i < pieces.length; ++i) {
          renderPiece(pieces[i], senetBoardWidth + x + w, y + w, w);
          x += gap + w / 2;
          if (x + w >= anubisWidth) {
            x = w;
            y += gap + w;
          }
        }
      }
      break;
    }
    case 'error':
      background(255, 99, 71, 70);
      textSize(25);
      fill(255, 0, 0);
      textStyle(BOLD);
      noStroke();
      const title = data.title == undefined ? "Error" : data.title;
      text(title, 10, 75);

      textSize(18);
      textStyle(NORMAL);
      const body = data.message == undefined ? "An unknown error occurred" : data.message;
      text(body, 10, 100);
      break;
    default:
      render('error', { message: `Unknown render mode '${mode}'` });
      console.error("Unknown render mode: " + mode);
  }
}

function mousePressed() {
  if (renderBoard) {
    // Find house we are over
    for (let i = 0; i < boardInfo.board.length; i++) {
      if ((boardRenderInfo.mode == 1 && boardInfo.board[i] == boardInfo.whiteGo) || (typeof boardInfo.board[i] == 'boolean' && boardInfo.board[i] == boardInfo.mov)) {
        let pos = boardInfo.pos[i];
        let isOver = (mouseX > pos[0] - w && mouseX < pos[0] + w && mouseY > pos[1] - w && mouseY < pos[1] + w);
        if (isOver) {
          draggingHouse = i;
          draggingHouseStart = [pos[0], pos[1]];
          break;
        }
      }
    }
  }
}

function mouseDragged() {
  if (renderBoard) {
    if (draggingHouse != -1) {
      if (mouseX < w || mouseX > (senetBoardWidth + anubisWidth) - w || mouseY < w || mouseY > senetBoardHeight - w); else {
        boardInfo.pos[draggingHouse][0] = parseInt(mouseX);
        boardInfo.pos[draggingHouse][1] = parseInt(mouseY);
        render('board');
      }
    }
  }
}

function mouseReleased() {
  if (renderBoard && draggingHouse != -1) {
    blck: {
      let houseStart = draggingHouse;

      let houseEnd = getHouseOver(...boardInfo.pos[draggingHouse]);
      if (houseEnd == -1) {
        if (overAnubis(...boardInfo.pos[draggingHouse])) {
          houseEnd = 'a';
        } else {
          Sounds.play("error");
          movPiece(draggingHouse, ...draggingHouseStart);
          break blck;
        }
      }

      // Only check different houses
      if (houseStart == houseEnd) break blck;

      let flag = false;
      if (houseStart == 26) {
        flag = window.confirm("~~ House of Waters ~~\nHope for a four or succumb to House of Waters?\n\n(Sticks will be re-cast)");
      }

      __emit('piece-move', { hfrom: houseStart, hto: houseEnd, flag });
    }
    draggingHouse = -1;
    draggingHouseStart = undefined;
  }
}