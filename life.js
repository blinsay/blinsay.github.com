var life = (function () {
  // Drawing
  function Canvas(canvas, colors, pixelWidth, pixelHeight) {
    this.pixelWidth  = pixelWidth;
    this.pixelHeight = pixelHeight;
    this.width       = Math.floor(canvas.width / pixelWidth);
    this.height      = Math.floor(canvas.height / pixelHeight);

    this.canvasWidth  = canvas.width;
    this.ctx          = canvas.getContext('2d');
    this.imgData      = this.ctx.createImageData(canvas.width, canvas.height);
    this.data         = this.imgData.data;

    this.colors = colors;

    this.drawCell = function(x, y, liveness) {
      this.setPixel.apply(this, [x, y].concat(this.pickColor(liveness)));
    };

    this.pickColor = function(liveness) {
      var colors = this.colors,
          logLiveness = Math.floor(Math.log2(liveness + 1));

      if (logLiveness === 0) {
        return colors.dead;
      }
      return colors.live[Math.min(logLiveness - 1, colors.live.length)];
    };

    this.setPixel = function(x, y, r, g, b, a) {
      for (var i = 0; i < this.pixelWidth; i++) {
        for (var j = 0; j < this.pixelHeight; j++) {
          var canvasX = (x * this.pixelWidth) + i,
              canvasY = (y * this.pixelHeight) + j,
              pos = ((this.canvasWidth * canvasY) + canvasX) * 4;

          this.data[pos + 0] = r;
          this.data[pos + 1] = g;
          this.data[pos + 2] = b;
          this.data[pos + 3] = a;
        }
      }
    };

    this.finish = function() {
      this.ctx.putImageData(this.imgData, 0, 0);
    };
  }

  // Game

  newBoard = function(width, height, aliveFraction) {
    var board = new Array(height);
    for (var i = 0; i < height; i++) {
      board[i] = new Array(width);
      for (var j = 0; j < width; j++) {
        board[i][j] = (Math.random() < aliveFraction) ? 1 : 0;
      }
    }
    return board;
  };

  function Game(width, height, aliveFraction) {
    this.width  = width;
    this.height = height;
    this.board  = newBoard(width, height, aliveFraction);


    // Use the given drawing object to render this game.
    this.render = function(d) {
      for (var i = 0; i < this.height; i++) {
        for (var j = 0; j < this.width; j++) {
          d.drawCell(j, i, this.board[i][j]);
        }
      }
      d.finish();
    };

    // Advance the board. Returns this for chaining.
    this.step = function() {
      var nextBoard = newBoard(this.width, this.height);

      for (var i = 0; i < this.height; i++) {
        for (var j = 0; j < this.width; j++) {
          nextBoard[i][j] = this.nextState(this.board[i][j], this.neighborCount(i, j));
        }
      }

      this.board = nextBoard;
      return this;
    };

    // Return the next state of a cell that has been aliveFor a given number of
    // rounds and its current neighbor count
    this.nextState = function(aliveFor, neighborCount) {
      if ((neighborCount === 3) || (neighborCount === 2 && aliveFor > 0)) {
        return aliveFor + 1;
      }
      return 0;
    };

    // Count the number of live neighbors a given cell has.
    this.neighborCount = function(x, y) {
      var count = 0;
      for (var i = Math.max(x - 1, 0); i <= Math.min(x + 1, height - 1); i++) {
        for (var j = Math.max(y - 1, 0); j <= Math.min(y + 1, width - 1); j++) {
          if (i === x && j === y) {
            continue;
          }

          if (this.board[i][j] > 0) {
            count++;
          }
        }
      }
      return count;
    };
  }

  return {
    debug: function(canvas, fraction, colors, pixelSize, fps) {
      var draw = new Canvas(canvas, colors, pixelSize, pixelSize),
          game = new Game(draw.width, draw.height, fraction);

      var step = function() {
        game.step().render(draw);
      };
      return {draw: draw, game: game, step: step};
    },

    play: function(canvas, fraction, colors, pixelSize, fps) {
      var draw = new Canvas(canvas, colors, pixelSize, pixelSize),
          game = new Game(draw.width, draw.height, fraction);

      var step = function() {
        game.step().render(draw);
        setTimeout(function() {
          requestAnimationFrame(step);
        }, 1000 / fps);
      };
      requestAnimationFrame(step);
    },
  };
})();
