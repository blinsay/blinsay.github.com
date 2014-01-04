// Conway's Game of Life
function game() {
  var
    // The number of cells on the board
    width = 10,
    height = 10,
    // The fraction of cells that will be live at the beginning of the game. 
    seedFraction = 0.5;

  var self = {};

  self.makeBoard = function() {
    var board = new Array(height);
    for (var i = 0; i < board.length; i++) {
      board[i] = new Array(width);
    }
    return board;
  }

  self.newCell = function(board, x, y) {
    var livedFor = board[x][y],
        liveNeighbors = 0;
    for (var i = Math.max(x - 1, 0); i <= Math.min(x + 1, height - 1); i++) {
      for (var j = Math.max(y - 1, 0); j <= Math.min(y + 1, width - 1); j++) {
        if (i == x && j == y) {
          continue;
        }
        if (board[i][j]) {
          liveNeighbors += 1;
        }
      }
    }
    if ((livedFor && (liveNeighbors >= 2 && liveNeighbors <= 3)) || (!livedFor && liveNeighbors == 3)) {
      return livedFor + 1;
    }
    return 0/*dead*/;
  }

  self.next = function(board) {
    var next = self.makeBoard();
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        next[i][j] = self.newCell(board, i, j);
      }
    }
    return next;
  }

  self.seed = function() {
    var newBoard = self.makeBoard();
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        newBoard[i][j] = (Math.random() < seedFraction) ? 1 : 0;
      }
    }
    return newBoard;
  }

  self.seedFraction = function(_) {
    if (!arguments.length) { return seedFraction }
    seedFraction = _;
    return self;
  }

  self.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return self;
  }

  self.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return self;
  }

  return self;
}

function board() {
  var cellWidth = 10,
      cellHeight = 10,
      breaks = [0, 1, 5, 10],
      colors = ["#ffffff", "#67a9cf", "#1c9099", "#016c59"];

  var self = function(selection) {
    selection.each(function(data) {
      var height = cellHeight * data.length,
          width = cellWidth * data[0].length,
          colorScale = d3.scale.linear().domain(breaks).range(colors).clamp(true);

      var grid = d3.select(this).selectAll('svg').data([data]);
      grid.enter().append('svg');
      grid.attr('width', width).attr('height', height);

      var rows = grid.selectAll('.row').data(data);
      rows.enter()
        .append('g')
        .attr('class', 'row')
        .attr('transform', function(d, i){ return 'translate(0,' + (cellHeight * i) + ')'}); 

      var cells = rows.selectAll('.cell').data(function(d){ return d });
      cells.enter()
        .append('rect')
          .classed('cell', true)
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .attr('x', function(d, i) { return i * cellWidth })
      // cells.classed('alive', function(d){ return d });
      cells.style('fill', function(d){ return colorScale(d) });
    });
  }

  self.cellWidth = function(_) {
    if (!arguments.length) { return cellWidth; }
    cellWidth = _;
    return self;
  }

  self.cellHeight = function(_) {
    if (!arguments.length) { return cellHeight; }
    cellHeight = _;
    return self;
  }

   return self;
}

