#!/bin/bash

curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type":"greeting",
  "greeting":{
    "text":"Hi {{user_first_name}}, 歡迎光臨成大電腦網路愛好社.\n輸入/help查看可用指令"
  }
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=PAGE_ACCESS_TOKEN"
