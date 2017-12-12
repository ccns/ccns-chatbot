const fs = require("fs")

const msg_dir = "msg/"
var welcome_msg = fs.readFileSync(msg_dir+"welcome.txt")
var help_msg = fs.readFileSync(msg_dir+"help.txt")
var chatroom_msg = fs.readFileSync(msg_dir+"chatroom.txt")

module.exports = {
  GetChatroom: () => chatroom_msg,
  GetHelp: () => help_msg,
  GetWelcome: () => welcome_msg
}
