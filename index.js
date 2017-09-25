const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('request')
const config = require('config')
const api = require('./question-api')
const dialog = require('./dialog')

const port = process.env.PORT || 9487;

const verify_token = process.env.VERIFY_TOKEN || config.get('verify_token')
const page_token = process.env.PAGE_TOKEN || config.get('page_token')

const quiz_online = (process.env.QUIZ_ONLINE || config.get('quiz_online')) == 'true'
const append_info = (process.env.APPEND_INFO || config.get('append_info'))
const append_info2 = (process.env.APPEND_INFO2 || config.get('append_info2'))

const STATE = {
  unknown: -1,
  getstart: 0,
  plaintext: 1,
  menu: 2,
  command: 3,
  answer: 4,
}

const USER = {
  unfinished: -1,
  finished: 0,
  allcorrect: 1,
  allwrong: 2,
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
      var cmd = payload.split('.')[1].split(' ')
      execCommand(uid, cmd)
      break
    case STATE.answer:
      var payload = msging.message.quick_reply.payload
      var sp = payload.split('.')
      var qid = sp[1]
      var ans = sp[2]
      if (ans != "hint")
        getQuestion(qid, (question) => {
          sendAns(uid, question, ans, ()=>{
            getNewQuestion(uid, (question) => {
              sendQuestion(uid, question);
            })
          })
        })
      else
        getQuestion(qid, (question) => {
          sendHint(uid, question);
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
  if (sleeper[uid]) {
    var msg = sleep_msg[sleeper[uid]-1];
    sleeper[uid]--;
    reply(genMsgText(uid, msg), null);
  } else {
    switch(cmd[0]) {
      case 'help':
        var msg = "/help\n- 顯示本列表\n/random n\n- 產生一個小於n的亂數\n/sleep\n- 睡個\n"
        if(quiz_online)
          msg += "\n[社博活動]\n/quiz\n- 開始猜謎遊戲\n/status\n- 顯示目前答題狀況\n/leaderboard\n- 顯示排行榜網址\n"
        msg += "\n"+append_info
        msg += "\n"+append_info2
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
        var rand = getRandomNum(cmd);
        if(rand)
          var msg = "產生亂數: "+rand
        else
          var msg = "無法辨識範圍！"
        reply(genMsgText(uid, msg), null);
        break
      case 'status':
        api.GetUser(uid, (user) => {
          // console.log(user)
          console.log(user.questionStatus.reduce((s, v)=>s+(v==0),0))
          var uid = user.name
          var nickname = typeof user.nickname == 'undefined' ? 'Anonymous (未設定暱稱)' : user.nickname
          var questions = user.questionStatus
          var point = user.point
          var order = user.order
          var total = user.total
          var msg = "uid: "+uid
                  +"\n名稱: "+nickname
                  +"\n分數: "+point
                  +"\n排名: "+order+"/"+total
          reply(genMsgText(uid, msg), null);
        })
        break
      case 'leaderboard':
        var msg = "http://leaderboard.ccns.ncku.edu.tw/"
        reply(genMsgText(uid, msg), null);
        break
      case 'sleep':
        var msg = "Zzzzz..."
        sleeper[uid] = 3;
        reply(genMsgText(uid, msg), null);
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
  api.Answer(uid, question, ans, (result) => {
    if(result) { msg = '😎 '+dialog.GetCorrect(); }
    else { msg = '😩 '+dialog.GetWrong(); }
    // console.log(msg);
    reply(genMsgText(uid, msg), ()=> {
      if(question.id == 'finish') {
        msg = dialog.GetFinished()
        reply(genMsgText(uid, msg), callback)
      }
      else callback()
    });
  });
}

function checkAns(uid, ans) {
  if(ans != question.answer) return false;
  else return true;
}

function checkUser(uid, callback) {
  api.GetUser(uid, (user) => {
    var stat
    var qStatus = user.questionStatus
    var tot = qStatus.length
    var sum = qStatus.reduce((a, b) => a + b, 0)
    if (sum == tot*2) stat = USER.allcorrect
    else if (sum == tot) stat = USER.allwrong
    else if (sum > tot) stat = USER.finished
    else stat = USER.unfinished
    return callback(stat)
  })
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
  var quick_replies = genQuestionReplies(uid, question, true)
  var msgTxt =  '[' + question.category + ']'
                + '\n' + question.question
                + '\nA: ' + question.option[0]
                + '\nB: ' + question.option[1]
                + '\nC: ' + question.option[2]
                + '\nD: ' + question.option[3]
  reply(genMsg(uid, msgTxt, quick_replies), null);
}

function sendHint(uid, question) {
  var quick_replies = genQuestionReplies(uid, question, false)
  var msgTxt = question.hint
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

function genQuestionReplies(uid, question, showHint) {
  var option = question.option;
  var hint = question.hint;
  // console.log("Hint: "+hint)
  if (hint && showHint)
    return [
      {
        content_type: 'text',
        // title: 'A: '+option[0],
        // title: '（A）',
        title: '- A -',
        payload: 'answer.'+question.id+'.0'
      },
      {
        content_type: 'text',
        // title: 'B: '+option[1],
        // title: '（B）',
        title: '- B -',
        payload: 'answer.'+question.id+'.1'
      },
      {
        content_type: 'text',
        // title: 'C: '+option[2],
        // title: '（C）',
        title: '- C -',
        payload: 'answer.'+question.id+'.2'
      },
      {
        content_type: 'text',
        // title: 'D: '+option[3],
        // title: '（D）',
        title: '- D -',
        payload: 'answer.'+question.id+'.3'
      },
      {
        content_type: 'text',
        title: '- Hint -',
        payload: 'answer.'+question.id+'.hint'
      },
    ];
  else
    return [
      {
        content_type: 'text',
        // title: 'A: '+option[0],
        // title: '（A）',
        title: '- A -',
        payload: 'answer.'+question.id+'.0'
      },
      {
        content_type: 'text',
        // title: 'B: '+option[1],
        // title: '（B）',
        title: '- B -',
        payload: 'answer.'+question.id+'.1'
      },
      {
        content_type: 'text',
        // title: 'C: '+option[2],
        // title: '（C）',
        title: '- C -',
        payload: 'answer.'+question.id+'.2'
      },
      {
        content_type: 'text',
        // title: 'D: '+option[3],
        // title: '（D）',
        title: '- D -',
        payload: 'answer.'+question.id+'.3'
      },
    ];
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
