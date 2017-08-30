const request = require('request')
const config = require('config')

const api_url = process.env.API_URL || config.get('api_url')
const page_token = process.env.PAGE_TOKEN || config.get('page_token')

function GetUser(uid, callback) {
  request({
    uri: api_url+'/user?user='+uid,
    method: 'GET',
  }, (error, response, body) => {
    var body = JSON.parse(body);
    // console.log(body)
    if (!error && response.statusCode == 200) {
      // console.log(body);
      console.log("Old user start a new session, uid: "+uid)
      return callback(body);
    } else if (response.statusCode == 404 && body.message == 'Error: no such user') {
      return newUser(uid, callback)
    }
  });
}

function newUser(uid, callback) {
  request({
    uri: 'https://graph.facebook.com/v2.6/' + uid + '?access_token=' + page_token,
    method: 'GET'
  }, (error, response, body) => {

    var data = JSON.parse(body)
    var nickname = data.first_name + " " + data.last_name
    console.log("New user, uid: "+uid+", nickname: "+nickname)

    request({
      uri: api_url+'/user',
      method: 'POST',
      json: {'user': uid, 'nickname': nickname},
    }, (error, response, body) => {
      // console.log(body)
      if (!error && response.statusCode == 200) {
        // console.log(body);
        return callback(body);
      }
    });

  })
}

function GetNewQuestion(uid, callback) {
  request({
    uri: api_url+'/question?user='+uid,
    method: 'GET',
  }, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      var question = JSON.parse(body)
      return callback(question);
    }
  });
}

function GetQuestionById(qid, callback) {
  request({
    uri: api_url+'/question?id='+qid,
    method: 'GET',
  }, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      var question = JSON.parse(body)
      // console.log(question)
      return callback(question);
    }
  });
}

function Answer(uid, question, ans) {
  request({
    uri: api_url+'/answer',
    method: 'POST',
    json: {
      'user': uid,
      'id': question.id,
      'answer': ans
    },
  }, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // console.log(body);
    }
  });
}

module.exports = {
  GetUser: GetUser,
  GetNewQuestion: GetNewQuestion,
  GetQuestionById: GetQuestionById,
  Answer: Answer
}
