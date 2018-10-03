const Message = require('./Message')
const {Messenger} = require('messaging-api-messenger')

module.exports = class CourseListMessage extends Message {
    constructor(data) {
        super(data)
    }

    // Override
    toMessengerMessage() {
        let text = ''
        const columns = this.data.map((el, idx) => {
            let d = el._source
            let t = [
                idx+1,
                d.dept_name,
                d.name,
                d.classes,
                d.teacher,
                d.classroom
            ]
            return t.join(' / ')
        })

        // console.log(columns)
        if (columns.length > 0) {
            text += "No / 系所名稱 / 課程名稱 / 班級 / 授課老師 / 上課地點\n\n"
            text += columns.join('\n\n')
        }
        else
            text += '嗚嗚找不到任何東西'

        text += "\n================\nNCKU Course Query\nhttps://course.ncku.io"
        return Messenger.createText(text)
    }
}
