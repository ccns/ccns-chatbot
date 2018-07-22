const axios = require('axios')
const config = require('config')
const fs = require("fs")

const page_token = process.env.PAGE_TOKEN || config.get('page_token')

const getstart_uri = "https://graph.facebook.com/v2.6/me/messenger_profile?access_token="
const greeting_uri = "https://graph.facebook.com/v2.6/me/thread_settings?access_token="
const menu_uri = "https://graph.facebook.com/v2.6/me/messenger_profile?access_token="

const setting_dir = "setting/"
var getstart_body = fs.readFileSync(setting_dir+"getstart.txt").toString()
var greeting_body = fs.readFileSync(setting_dir+"greeting.txt").toString()
var menu_body = fs.readFileSync(setting_dir+"menu.txt").toString()

async function sendRequest(uri, data) {
  const res = await axios({
    url: uri+page_token,
    method: "POST",
    data: data,
    headers: { "Content-Type": "application/json" },
  })
  return res.data
}

module.exports = {
  Exec: async (cmd) => {
      switch (cmd) {
        case 'getstart':
          return sendRequest(getstart_uri, getstart_body)
          break
        case 'greeting':
          return sendRequest(greeting_uri, greeting_body)
          break
        case 'menu':
          return sendRequest(menu_uri, menu_body)
          break
        default:
          throw new Error('Setting not found.')
      }
  }
}
