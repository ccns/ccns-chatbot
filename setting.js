const request = require('request')
const config = require('config')
const fs = require("fs")
const path = require("path");

const page_token = process.env.PAGE_TOKEN || config.get('page_token')

const getstart_uri = "https://graph.facebook.com/v2.6/me/messenger_profile?access_token="
const greeting_uri = "https://graph.facebook.com/v2.6/me/thread_settings?access_token="
const menu_uri = "https://graph.facebook.com/v2.6/me/messenger_profile?access_token="

const setting_dir = "setting/"
var getstart_body = fs.readFileSync(path.join(process.cwd(), setting_dir+"getstart.txt"))
var greeting_body = fs.readFileSync(path.join(process.cwd(), setting_dir+"greeting.txt"))
var menu_body = fs.readFileSync(path.join(process.cwd(), setting_dir+"menu.txt"))

function sendRequest(uri, body, callback) {
  request({
    uri: uri+page_token,
    method: "POST",
    body: body,
    headers: { "Content-Type": "application/json" },
  }, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      return callback(body);
    }
  })
}

module.exports = {
  Exec: (cmd) => {
    return new Promise(function (resolve, reject) {
      switch (cmd) {
        case 'getstart':
          sendRequest(getstart_uri, getstart_body, resolve)
          break
        case 'greeting':
          sendRequest(greeting_uri, greeting_body, resolve)
          break
        case 'menu':
          sendRequest(menu_uri, menu_body, resolve)
          break
        default:
          resolve('Setting not found.')
      }
    })
  }
}
