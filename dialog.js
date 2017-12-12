const fs = require("fs")
const path = require("path");

const msg_dir = "msg/"
var welcome_msg = fs.readFileSync(path.join(process.cwd(), msg_dir+"welcome.txt"))
var help_msg = fs.readFileSync(path.join(process.cwd(), msg_dir+"help.txt"))
var chatroom_msg = fs.readFileSync(path.join(process.cwd(), msg_dir+"chatroom.txt"))

module.exports = {
  GetChatroom: () => chatroom_msg,
  GetHelp: () => help_msg,
  GetWelcome: () => welcome_msg
}
