const fs = require("fs")

var correct_msg = fs.readFileSync('correct_msg.txt').toString().split("\n");
var wrong_msg = fs.readFileSync('wrong_msg.txt').toString().split("\n");

function GetCorrect() {
  var idx = Math.floor(Math.random()*(correct_msg.length-1))
  return correct_msg[idx]
}

function GetWrong() {
  var idx = Math.floor(Math.random()*(wrong_msg.length-1))
  return wrong_msg[idx]
}

module.exports = {
  GetCorrect: GetCorrect,
  GetWrong: GetWrong
}
