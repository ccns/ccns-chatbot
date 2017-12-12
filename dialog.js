const fs = require("fs")

const msg_dir = "msg/"
var welcome_msg = fs.readFileSync(msg_dir+"welcome.txt").toString()
var help_msg = fs.readFileSync(msg_dir+"help.txt").toString()
var chatroom_msg = fs.readFileSync(msg_dir+"chatroom.txt").toString()

module.exports = {
  GetChatroom: () => chatroom_msg,
  GetHelp: () => help_msg,
  GetWelcome: () => welcome_msg
}
