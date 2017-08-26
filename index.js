const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('request')
const config = require('config')
const api = require('./question-api')

const port = process.env.PORT || 9487;

const verify_token = process.env.VERIFY_TOKEN || config.get('verify_token')
const page_token = process.env.PAGE_TOKEN || config.get('page_token')

const STATE = {
  unknown: -1,
  getstart: 0,
  plaintext: 1,
  menu: 2,
  command: 3,
  answer: 4,
}

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
      var msg = "Hello,歡迎光臨CCNS! 輸入/help查看可用指令!"
      reply(genMsgText(uid, msg), null);
      break
    case STATE.command:
      var text = msging.message.text
      var cmd = text.substr(1).split(' ')
      execCommand(uid, cmd)
      break
    case STATE.menu:
      var payload = msging.postback.payload
      var cmd = payload.split('.')[1]
      execCommand(uid, cmd)
      break
    case STATE.answer:
      var payload = msging.message.quick_reply.payload
      var sp = payload.split('.')
      var qid = sp[1]
      var ans = sp[2]
      getQuestion(qid, (question) => {
        sendAns(uid, question, ans, ()=>{
          getNewQuestion(uid, (question) => {
            sendQuestion(uid, question);
          })
        })
      })
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
  switch(cmd[0]) {
    case 'help':
      // var msg = "/help\n- 顯示本列表\n/quiz\n- 開始猜謎遊戲"
      var msg = "/help\n- 顯示本列表\n/random\n- 隨機產生1-100的亂數\n/random m\n- 隨機產生1-m的亂數\n/random n m\n- 隨機產生n-m的亂數"
      reply(genMsgText(uid, msg), null);
      break
    case 'quiz':
      api.GetUser(uid, (user) => {
        getNewQuestion(uid, (question) => {
          sendQuestion(uid, question);
        });
      })
      break
    case 'random':
      var msg = "產生亂數: "+getRandomNum(cmd)
      reply(genMsgText(uid, msg), null);
  }
}

function getState(msging) {
  if(msging.postback) {
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
      var sp = msging.message.quick_reply.payload.split('.')
      switch(sp[0]) {
        case 'answer':
          return STATE.answer
      }
    } else {
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

function sendAns(uid, question, ans, callback) {
  var msg;
  if(!checkAns(question, ans)) msg = 'You suck!';
  else {
    msg = 'Good job!';
    api.Answer(uid, question, ans);
  }
  reply(genMsgText(uid, msg), callback);
}

function checkAns(question, ans) {
  if(ans != question.answer) return false;
  else return true;
}

function getNewQuestion(uid, callback) {
  api.GetNewQuestion(uid, (question) => {
    question_cache[question.id] = question
    callback(question)
  })
}

function getQuestion(qid, callback) {
  if(typeof question_cache[qid] != 'undefined') callback(question_cache[qid])
  else api.GetQuestionById(qid, callback)
}

function sendQuestion(uid, question) {
  var quick_replies = genQuestionReplies(uid, question)
  var msgTxt = question.question
                + '\nA: ' + question.option[0]
                + '\nB: ' + question.option[1]
                + '\nC: ' + question.option[2]
                + '\nD: ' + question.option[3]
  reply(genMsg(uid, msgTxt, quick_replies), null);
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

function genQuestionReplies(uid, question) {
  var option = question.option;
  return [
    {
      content_type: 'text',
      title: 'A: '+option[0],
      payload: 'answer.'+question.id+'.0'
    },
    {
      content_type: 'text',
      title: 'B: '+option[1],
      payload: 'answer.'+question.id+'.1'
    },
    {
      content_type: 'text',
      title: 'C: '+option[2],
      payload: 'answer.'+question.id+'.2'
    },
    {
      content_type: 'text',
      title: 'D: '+option[3],
      payload: 'answer.'+question.id+'.3'
    },
  ];
}

function isundefine(v) { return (typeof v == 'undefined') }

function getRandomNum(cmd) {
  if( !isundefine(cmd[1]) && !isundefine(cmd[2]) )
    return parseInt(cmd[1]) + Math.floor(Math.random()*parseInt(cmd[2]))
  else if( !isundefine(cmd[1]) )
    return 1+Math.floor(Math.random()*parseInt(cmd[1]))
  else
    return 1+Math.floor(Math.random()*100)
}
