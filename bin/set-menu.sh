#!/bin/bash

curl -X POST -H "Content-Type: application/json" -d '{
  "persistent_menu":[
    {
      "locale":"default",
      "composer_input_disabled":false,
      "call_to_actions":[
        {
          "type":"postback",
          "title":"查看可用指令 /help",
          "payload":"menu.help",
          "webview_height_ratio":"full"
        }
      ]
    },
    {
      "locale":"zh_CN",
      "composer_input_disabled":false
    }
  ]
}' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=PAGE_ACCESS_TOKEN"
