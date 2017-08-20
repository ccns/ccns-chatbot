#!/bin/bash

curl -X POST -H "Content-Type: application/json" -d '{
  "get_started":{
    "payload":"getstart"
  }
}' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=PAGE_ACCESS_TOKEN"
