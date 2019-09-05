const fs = require('fs')
const path = require('path')
const uuid = require('uuid/v1')

// 中文正则
const ZHCN = /[^\u4e00-\u9fa5\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g

module.exports = class Byron {
  constructor() {
    this.count = 0
    this.langPack = {} // 语言包对象
  }

  /**
   * 替换文件内容
   * @param { string } content - 文件内容
   */
  replaceContent(content) {
    let text = []
    if (!content) return
    if (content.indexOf('<script>') !== -1) {
      text = content.split('<script>')
      text[0] = this.readVueTemplate(text[0])
      text[1] = this.readJsScript(text[1])
      return text.join('<script>')
    }
    return this.readJsScript(content)
  }

  /**
   * 解析vue模版
   * @param { string } content - 模版内容
   */
  readVueTemplate(content) {
    let chinese = []
    const paragraph = []
    const arr = content.split('\n')
    arr.forEach(e => {
      if (/<!-- .* -->/.test(e)) {
        return
      }
      const lineArr = e.split(' ').filter(item => {
        return item !== '' && /[\u4e00-\u9fa5]+/.test(item)
      })
      if (lineArr.length) {
        paragraph.push(lineArr.toString())
      }
    })
    paragraph.forEach(e => {
      chinese.push(e.replace(ZHCN, ''))
    })
    // 去重
    chinese = [...new Set(chinese)]
    chinese.forEach((e, i) => {
      const hanzi = new RegExp(e, 'g')
      const single = new RegExp(`'${e}'`, 'g')
      const key = `${uuid().split('-')[0]}_${i}`
      content = content.replace(single, `$t('${key}')`)
      content = content.replace(hanzi, `{{$t('${key}')}}`)
      this.langPack[key] = e
    })
    return content
  }

  /**
   * 解析js脚本
   * @param { string } content - 脚本内容
   */
  readJsScript(content) {
    let chinese = []
    const paragraph = []
    const arr = content.split('\n')
    arr.forEach(e => {
      if (/\/\//.test(e) || /\/* .* *\//.test(e) || /console./.test(e)) {
        return
      }
      const lineArr = e.split(' ').filter(item => {
        return item !== '' && /[\u4e00-\u9fa5]+/.test(item)
      })
      if (lineArr.length) {
        paragraph.push(lineArr.toString())
      }
    })
    paragraph.forEach(e => {
      chinese.push(e.replace(ZHCN, ''))
    })
    // 去重
    chinese = [...new Set(chinese)]
    chinese.forEach((e, i) => {
      const single = new RegExp(`'${e}'`, 'g')
      const double = new RegExp(`"${e}"`, 'g')
      const key = `${uuid().split('-')[0]}_${i}`
      content = content.replace(single, `$t('${key}')`)
      content = content.replace(double, `$t('${key}')`)
      this.langPack[key] = e
    })
    return content
  }

  /**
   * 生成语言包
   */
  createLangPack() {
    const name = `${uuid().split('-')[0]}_zh_cn.json`
    const file = path.join(process.cwd(), name)
    fs.writeFileSync(file, JSON.stringify(this.langPack))
    console.log('生成语言包结束，输出文件路径：' + file)
  }

  /**
   * 文件遍历
   * @param filePath 需要遍历的文件路径
   */
  directoryForEach(filePath) {
    const files = fs.readdirSync(filePath)
    for (let file of files) {
      const filedir = path.join(filePath, file)
      const fileState = fs.statSync(filedir)
      if (fileState.isDirectory()) {
        this.fileRecursive(filedir)
      } else {
        this.fileStats(filedir)
      }
    }
    this.createLangPack()
  }

  fileRecursive(filePath) {
    const files = fs.readdirSync(filePath)
    for (let file of files) {
      const filedir = path.join(filePath, file)
      const fileState = fs.statSync(filedir)
      if (fileState.isDirectory()) {
        this.fileRecursive(filedir)
      } else {
        this.fileStats(filedir)
      }
    }
  }

  fileStats(filedir) {
    const isVue = filedir.indexOf('.vue') !== -1
    const isJS = filedir.indexOf('.js') !== -1
    if (isVue || isJS) {
      this.fileBuffer(filedir)
    }
  }

  fileBuffer(filedir) {
    const data = fs.readFileSync(filedir)
    if (data) {
      const content = data.toString()
      this.fileReplace(filedir, this.replaceContent(content))
    }
  }

  fileReplace(filedir, content) {
    fs.writeFileSync(filedir, content)
    console.log(`替换文件[${filedir}]成功！`)
  }
}
