const Message = require('./Message')
const {Messenger} = require('messaging-api-messenger')
const {Line} = require('messaging-api-line')

// 子類別, 繼承 Message
module.exports = class TextMessage extends Message {
    constructor(data) {
        super(data)
    }

    // Override
    toLineMessage() {
        return Line.createText(this.data)
    }

    toMessengerMessage() {
        return Messenger.createText(this.data)
    }
}
