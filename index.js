const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const axios = require('axios')
const request = require('request')
const config = require('config')
const dialog = require('./dialog')
const setting = require('./setting')
const course = require('./course')

const TextMessage = require('./message/TextMessage')
const CourseListMessage = require('./message/CourseListMessage')

const port = process.env.PORT || 9487;

const verify_token = process.env.VERIFY_TOKEN || config.get('verify_token')
const page_token = process.env.PAGE_TOKEN || config.get('page_token')

const append_info = process.env.APPEND_INFO || config.get('append_info')

const STATE = {
    idle: 0,
    sleeping: 1,
    courseQueryWait: 2,
}

const ACTION = {
    unknown: -1,
    getstart: 0,
    plaintext: 1,
    menu: 2,
    command: 3,
}

const sleep_msg = [
    "!!?!(驚醒",
    "我在睡，別吵",
    "Zzz",
    "Zzzz.."
]

var sleeper = {};
var user_state = {};
var question_cache = [];

app.use(bodyParser.json())

// For init auth
app.get('/', (req, res) => {
    if(req.query['hub.verify_token'] == verify_token)
        res.send(req.query['hub.challenge'])
    else
        res.sendStatus(403)
})

// Webhook
app.post('/', async (req, res) => {
    let msging = req.body.entry[0].messaging[0]
    // console.log(msging)

    let senderId = msging.sender.id
    let recipientId = msging.recipient.id
    let uid = senderId

    if (user_state[uid] === undefined)
        user_state[uid] = STATE.idle

    let action = getAction(msging)
    let msg
    switch(user_state[uid]) {
        case STATE.idle:
            switch(action) {
                case ACTION.getstart:
                    msg = new TextMessage(dialog.GetWelcome())
                    break
                case ACTION.command:
                    var text = msging.message.text
                    var cmd = text.substr(1).split(' ')
                    try {
                        msg = await execCommand(uid, cmd)
                    }
                    catch(err) {
                        msg = new TextMessage('有東西壞掉啦Q_Q')
                        console.trace(err)
                        user_state[uid] = STATE.idle
                    }
                    break
                case ACTION.menu:
                    var payload = msging.postback.payload
                    var cmd = payload.split('.')[1].split(' ')
                    msg = await execCommand(uid, cmd)
                    break
                case ACTION.unknown:
                    msg = new TextMessage('有東西壞掉啦Q_Q')
                    console.log('Error! Action unknown!')
                    console.log(msging)
                    user_state[uid] = STATE.idle
                    break
            }
            break
        case STATE.sleeping:
            msg = new TextMessage(sleep_msg[sleeper[uid]-1]);
            sleeper[uid]--;
            if (sleeper[uid] == 0)
                user_state[uid] = STATE.idle;
            break
        case STATE.courseQueryWait:
            var text = msging.message.text
            var cmd = text.substr(0).split(' ')
            cmd.unshift('course')
            try {
                msg = await execCommand(uid, cmd)
            }
            catch(err) {
                msg = new TextMessage('有東西壞掉啦Q_Q')
                console.trace(err)
                user_state[uid] = STATE.idle
            }
            break
    }

    try {
        if (msg !== undefined)
            reply(uid, msg.toMessengerMessage())
    }
    catch(err) {
        console.trace(err)
    }


    res.sendStatus(200);
})

app.listen(port, () => {
    console.log('Example app listening on port '+port+'!')
})

async function execCommand(uid, cmd) {
    let msg
    var text
    switch(cmd[0]) {
        case 'help':
            text = dialog.GetHelp()
            if (append_info !== 'none')
                text += "\n"+append_info
            msg = new TextMessage(text)
            break
        case 'random':
            var rand = getRandomNum(cmd);
            if(rand)
                text = "產生亂數: "+rand
            else
                text = "無法辨識範圍！"
            msg = new TextMessage(text)
            break
        case 'primality_test':
            var n = parseInt(cmd[1])
            if(n < 100000) {
                if(primality_test(n))
                    text = n+" 是個質數"
                else
                    text = n+" 不是質數唷"
            } else {
                text = n+" 太大啦，小一點好嗎"
            }
            msg = new TextMessage(text)
            break
        case 'anime':
            var ani = await getRecommendAnime()
            if(ani)
                text = "RNGesus 今天推薦你這部:\n" + ani
            else
                text = "Oops! 沒抽到 看來你今天手氣不好LoL"
            msg = new TextMessage(text)
            break
        case 'weather':
            var wea = await getWeather()
            text = "現在成大附近的天氣為 "+wea.weather.description+"，氣溫 "+wea.main.temp+"°C，相對溼度 "+wea.main.humidity+"%"
            msg = new TextMessage(text)
            break
        case 'sleep':
            msg = new TextMessage("Zzzzz...")
            sleeper[uid] = 3;
            user_state[uid] = STATE.sleeping;
            break
        case 'chatroom':
            msg = new TextMessage(dialog.GetChatroom())
            break
        case 'setting':
            msg = new TextMessage(await setting.Exec(cmd[1]))
            break
        case 'fuck':
            msg = new TextMessage("不可以罵髒話喔")
            break
        case 'course':
            msg = new TextMessage('這個功能目前無法使用唷')
            user_state[uid] = STATE.idle
            break
            if (cmd[1]) {
                if (cmd[1] === '88')
                    msg = new TextMessage('取消查詢')
                else {
                    let courseList
                    if (course.isDeptNo(cmd[1])) {
                        let dept_no = cmd[1]
                        let query_string = cmd.slice(2).join(' ')
                        courseList = await course.query(query_string, dept_no)
                    }
                    else {
                        let query_string = cmd.slice(1).join(' ')
                        courseList = await course.query(query_string)
                    }
                    // console.log(courseList.length)
                    msg = new CourseListMessage(courseList)
                }
                user_state[uid] = STATE.idle
            }
            else {
                msg = new TextMessage('請輸入查詢關鍵字，可輸入課程名稱、老師名字、課程代碼，ex: 機動學，若要取消查詢請輸入 88')
                user_state[uid] = STATE.courseQueryWait
            }
            break
        default:
            msg = new TextMessage('沒有這個指令唷')
            user_state[uid] = STATE.idle
    }
    return msg
}

function getAction(msging) {
    if(msging.postback) {
        // From postback
        var sp = msging.postback.payload.split('.')
        switch(sp[0]) {
            case 'getstart':
                return ACTION.getstart
            case 'menu':
                return ACTION.menu
        }
    } else if (msging.message) {
        var msg = msging.message;
        if (msg.quick_reply) {
            // From quick reply
            var sp = msging.message.quick_reply.payload.split('.')
            switch(sp[0]) {
                // Deal with quick reply
            }
        } else {
            // Plain text
            var msgTxt = msging.message.text
            if(msgTxt)
                if(msgTxt[0]=='/')
                    return ACTION.command
            else
                return ACTION.plaintext
            else
                return ACTION.sticker
        }
    }
    return ACTION.unknown
}

function genMsg(recipientId, msg) {
    return {
        recipient: { id: recipientId },
        message: msg
    };
}

function genTextMsg(msgTxt, quick_replies) {
    let msg = {}
    msg.text = msgTxt
    if (quick_replies)
        msg.quick_replies = quick_replies
    return msg
}

async function reply(recipientId, msg) {
    // console.log(recipientId, msg);
    try {
        const res = await axios({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            method: 'POST',
            params: { access_token: page_token },
            data: genMsg(recipientId, msg)
        })
        var body = res.data
        var messageId = body.message_id

        console.log("Successfully sent generic message with id %s to recipient %s", messageId, recipientId)
    }
    catch(err) {
        console.trace(err)
    }
}

function isundefine(v) { return (typeof v == 'undefined') }

function getRandomNum(cmd) {
    if( cmd.length == 3 )
        return parseInt(cmd[1]) + Math.floor(Math.random()*(parseInt(cmd[2])-parseInt(cmd[1])+1))
    else if( cmd.length == 2 )
        return 1+Math.floor(Math.random()*parseInt(cmd[1]))
    else
        return 1+Math.floor(Math.random()*100)
}

function primality_test(n) {
    if( n == 1 || n % 2 == 0 ) {
        if( n == 2 ) return true;
        else return false;
    }

    a = 1;
    b = (n - 1) / 2;
    while( b > 0 ) {
        if( gcd(a, b) != 1 ) return false;
        a += 2;
        b -= 1;
    }

    return true;
}

function gcd(x, y) {
  if ((typeof x !== 'number') || (typeof y !== 'number'))
    return false;

  x = Math.abs(x);
  y = Math.abs(y);

  while(y) {
    var t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function getRecommendAnime() {
  return new Promise((resolve, reject) => {
    var options = {
      url: 'https://anidb.net/perl-bin/animedb.pl?show=anime&do.random=1',
      headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Mobile Safari/537.36',
          'Cache-Control': 'max-age=0',
          'Connection': 'keep-alive'
      }
    }
    request(options, function (error, response, body) {
      if(!error && response.statusCode == 200)
        resolve(response.request.uri.href)
      else
        reject(undefined)
    })
  })
};

function getWeather() {
    return new Promise((resolve, reject) => {
      var options = {
        url: 'http://api.openweathermap.org/data/2.5/weather?lat=22.99&lon=120.22&units=metric&appid=0c986b41ce4f0187ec5c7f83cb59783e',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Mobile Safari/537.36',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive'
        }
      }
      request(options, function (error, response, body) {
        if(!error && response.statusCode == 200)
          resolve(body)
        else
          reject(undefined)
      })
    })
}