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
        var response
        switch (cmd) {
            case 'getstart':
                res = await sendRequest(getstart_uri, getstart_body)
                return res.result
            case 'greeting':
                res = await sendRequest(greeting_uri, greeting_body)
                return res.result
            case 'menu':
                res = await sendRequest(menu_uri, menu_body)
                return res.result
            default:
                return 'Setting not found.'
        }
    }
}
