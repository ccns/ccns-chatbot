const fs = require("fs")

const data_dir = "data/"
var welcome_msg = fs.readFileSync(data_dir+"welcome.txt").toString()
var help_msg = fs.readFileSync(data_dir+"help.txt").toString()
var chatroom_msg = fs.readFileSync(data_dir+"chatroom.txt").toString()

module.exports = {
  GetChatroom: () => chatroom_msg,
  GetHelp: () => help_msg,
  GetWelcome: () => welcome_msg
}
