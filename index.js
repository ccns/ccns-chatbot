const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const axios = require('axios')
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
    unknown: -1,
    getstart: 0,
    plaintext: 1,
    menu: 2,
    command: 3,
}

const sleep_msg = [
    "!!?!(驚醒",
    "Zzz",
    "Zzzz.."
]

var sleeper = {};
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
    let msging = req.body.entry[0].messaging[0];
    // console.log(msging);

    let senderId = msging.sender.id;
    let recipientId = msging.recipient.id;

    let state = getState(msging)
    if (state != STATE.plaintext) {
        let uid = senderId
        let msg
        switch(state) {
            case STATE.getstart:
                msg = new TextMessage(dialog.GetWelcome())
                break
            case STATE.command:
                var text = msging.message.text
                var cmd = text.substr(1).split(' ')
                try {
                    msg = await execCommand(uid, cmd)
                }
                catch(err) {
                    msg = new TextMessage('有東西壞掉啦Q_Q')
                    console.trace(err)
                }
                break
            case STATE.menu:
                var payload = msging.postback.payload
                var cmd = payload.split('.')[1].split(' ')
                msg = await execCommand(uid, cmd)
                break
            case STATE.unknown:
                msg = new TextMessage('有東西壞掉啦Q_Q')
                console.log('Error! State unknown!')
                console.log(msging)
                break
        }

        try {
            reply(uid, msg.toMessengerMessage())
        }
        catch(err) {
            console.trace(err)
        }
    }


    res.sendStatus(200);
})

app.listen(port, () => {
    console.log('Example app listening on port '+port+'!')
})

async function execCommand(uid, cmd) {
    let msg
    if (sleeper[uid]) {
        msg = new TextMessage(sleep_msg[sleeper[uid]-1]);
        sleeper[uid]--;
    } else {
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
            case 'sleep':
                msg = new TextMessage("Zzzzz...")
                sleeper[uid] = 3;
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
                if (cmd[1]) {
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
                else
                    msg = new TextMessage('請輸入查詢關鍵字')
                break
            default:
                msg = new TextMessage('沒有這個指令唷')
        }
    }
    return msg
}

function getState(msging) {
    if(msging.postback) {
        // From postback
        var sp = msging.postback.payload.split('.')
        switch(sp[0]) {
            case 'getstart':
                return STATE.getstart
            case 'menu':
                return STATE.menu
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
                    return STATE.command
            else
                return STATE.plaintext
            else
                return STATE.sticker
        }
    }
    return STATE.unknown
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
