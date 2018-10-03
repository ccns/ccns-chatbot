const fs = require("fs")

const data_dir = "data/"
var welcome_msg = fs.readFileSync(data_dir+"welcome.txt", 'utf8')
var help_msg = fs.readFileSync(data_dir+"help.txt", 'utf8')
var chatroom_msg = fs.readFileSync(data_dir+"chatroom.txt", 'utf8')

module.exports = {
  GetChatroom: () => chatroom_msg,
  GetHelp: () => help_msg,
  GetWelcome: () => welcome_msg
}
