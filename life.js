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
    var board = new Array(width);
    for (var i = 0; i < width; i++) {
      board[i] = new Array(height);
    }
    return board;
  }

  self.newCell = function(board, x, y) {
    var live = board[x][y].alive,
        liveNeighbors = 0;
    for (var i = Math.max(x - 1, 0); i <= Math.min(x + 1, width - 1); i++) {
      for (var j = Math.max(y - 1, 0); j <= Math.min(y + 1, height - 1); j++) {
        if (i == x && j == y) {
          continue;
        }
        if (board[i][j].alive) {
          liveNeighbors += 1;
        }
      }
    }
    return {x: x, y: y, alive: ((live && (liveNeighbors >= 2 && liveNeighbors <= 3)) || (!live && liveNeighbors == 3))}; 
  }

  self.next = function(board) {
    var next = self.makeBoard();
    for (var i = 0; i < width; i++) {
      for (var j = 0; j < height; j++) {
        next[i][j] = self.newCell(board, i, j);
      }
    }
    return next;
  }

  self.seed = function() {
    var newBoard = self.makeBoard();
    for (var i = 0; i < width; i++) {
      for (var j = 0; j < width; j++) {
        newBoard[i][j] = {x: i, y: j, alive: (Math.random() < seedFraction)};
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
      cellHeight = 10;

  var self = function(selection) {
    selection.each(function(data) {
      var grid = d3.select(this).selectAll('svg').data([data]);
      grid.enter().append('svg');

      var rows = grid.selectAll('.row').data(data);
      rows.enter().append('g').attr('class', 'row');

      var cells = rows.selectAll('.cell').data(function(d){ return d });
      cells.enter()
        .append('rect')
          .classed('cell', true)
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .attr('x', function(d) { return d.x * cellWidth })
          .attr('y', function(d) { return d.y * cellHeight });
      cells.classed('alive', function(d){ return d.alive });
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

