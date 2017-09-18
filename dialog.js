const fs = require("fs")

var correct_msg = fs.readFileSync('correct_msg.txt').toString().split("\n");
var wrong_msg = fs.readFileSync('wrong_msg.txt').toString().split("\n");
var finished_msg = fs.readFileSync('finished_msg.txt').toString().split("\n");
var allcorrect_msg = fs.readFileSync('allcorrect_msg.txt').toString().split("\n");
var allwrong_msg = fs.readFileSync('allwrong_msg.txt').toString().split("\n");

function GetCorrect() {
  var idx = Math.floor(Math.random()*(correct_msg.length-1))
  return correct_msg[idx]
}

function GetWrong() {
  var idx = Math.floor(Math.random()*(wrong_msg.length-1))
  return wrong_msg[idx]
}

function GetFinished() {
  var idx = Math.floor(Math.random()*(correct_msg.length-1))
  return finished_msg[idx]
}

function GetAllcorrect() {
  var idx = Math.floor(Math.random()*(correct_msg.length-1))
  return allcorrect_msg[idx]
}

function GetAllwrong() {
  var idx = Math.floor(Math.random()*(wrong_msg.length-1))
  return allwrong_msg[idx]
}

module.exports = {
  GetCorrect: GetCorrect,
  GetWrong: GetWrong,
  GetFinished: GetFinished,
  GetAllcorrect: GetAllcorrect,
  GetAllwrong: GetAllwrong
}
