/*jshint esnext: true */

window.onload = () => {
  // game colors
  var whiteDeadBlueLive = {
    dead: [239, 243, 128],
    live: [[8, 81, 156, 200], [49, 130, 189, 128], [107, 174, 214, 128], [189, 215, 231, 128]]
  };

  function setup() {
    var canvas = document.getElementById('life');
    var ctx = canvas.getContext('2d');

    var parent = canvas.parentElement;
    ctx.canvas.width = parent.clientWidth;
    ctx.canvas.height = parent.clientWidth;

    life.play(canvas, 0.1, whiteDeadBlueLive, 4, 16);
  }

  window.onresize = function () {
    life.stop();
    setup();
  };

  setup();
};
