/*jshint esnext: true */

window.onload = () => {
  // dumb titles
  var titles = [
    "ben linsay has a website",
    "ben linsay is an engineer",
    "ben linsay wants to pet your dog",
  ];
  document.getElementById("dumb-title").innerHTML = titles[Math.floor(Math.random() * titles.length)];

  // game colors
  var whiteDeadBlueLive = {
    dead: [239,243,128],
    live: [[8,81,156,200], [49,130,189,128], [107,174,214,128], [189,215,231,128]]
  };

  function setup() {
    var canvas = document.getElementById('life'),
        ctx    = canvas.getContext('2d');

    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;

    life.play(canvas, 0.1, whiteDeadBlueLive, 4, 16);
  }

  window.onresize = function() {
    life.stop();
    setup();
  };

  setup();
};