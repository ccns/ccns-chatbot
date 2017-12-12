const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('request')
const config = require('config')
const dialog = require('./dialog')
const setting = require('./setting')

const port = process.env.PORT || 9487;

const verify_token = process.env.VERIFY_TOKEN || config.get('verify_token')
const page_token = process.env.PAGE_TOKEN || config.get('page_token')

const append_info = (process.env.APPEND_INFO || config.get('append_info'))

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
app.get('/', function (req, res) {
  if(req.query['hub.verify_token'] == verify_token)
    res.send(req.query['hub.challenge'])
})

// Webhook
app.post('/', function(req, res) {
  var msging = req.body.entry[0].messaging[0];
  // console.log(msging);

  var senderId = msging.sender.id;
  var recipientId = msging.recipient.id;

  var uid = senderId;
  switch(getState(msging)) {
    case STATE.getstart:
      var msg = dialog.GetWelcome()
      reply(genMsgText(uid, msg), null);
      break
    case STATE.command:
      var text = msging.message.text
      var cmd = text.substr(1).split(' ')
      execCommand(uid, cmd)
      break
    case STATE.menu:
      var payload = msging.postback.payload
      var cmd = payload.split('.')[1].split(' ')
      execCommand(uid, cmd)
      break
    case STATE.unknown:
      console.log('Error! State unknown!')
      console.log(msging)
      break
  }

  res.sendStatus(200);
})

app.listen(port, function () {
  console.log('Example app listening on port '+port+'!')
})

function execCommand(uid, cmd) {
  if (sleeper[uid]) {
    var msg = sleep_msg[sleeper[uid]-1];
    sleeper[uid]--;
    reply(genMsgText(uid, msg), null);
  } else {
    switch(cmd[0]) {
      case 'help':
        var msg = dialog.GetHelp()
        msg += "\n\n"+append_info
        reply(genMsgText(uid, msg), null);
        break
      case 'random':
        var rand = getRandomNum(cmd);
        if(rand)
          var msg = "產生亂數: "+rand
        else
          var msg = "無法辨識範圍！"
        reply(genMsgText(uid, msg), null);
        break
      case 'sleep':
        var msg = "Zzzzz..."
        sleeper[uid] = 3;
        reply(genMsgText(uid, msg), null);
        break
      case 'chatroom':
        var msg = dialog.GetChatroom()
        reply(genMsgText(uid, msg), null);
        break
      case 'setting':
        setting.Exec(cmd[1]).then((msg) => {
          reply(genMsgText(uid, msg), null);
        })
        break
      case 'fuck':
        var msg = "不可以罵髒話喔"
        reply(genMsgText(uid, msg), null);
        break
      default:
        reply(genMsgText(uid, '沒有這個指令唷'), null);
    }
  }
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

function genMsg(recipientId, msgTxt, quick_replies) {
  return {
    recipient: { id: recipientId },
    message: {
      text: msgTxt,
      quick_replies: quick_replies
    }
  };
}

function genMsgText(recipientId, msgTxt) {
  return {
    recipient: { id: recipientId },
    message: { text: msgTxt, }
  };
}

function reply(messageData, callback) {
  // console.log(messageData);
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: page_token },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
      if (callback)
        return callback();
      else
        return true;
    }
  })
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
