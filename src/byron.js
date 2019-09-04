const fs = require('fs')
const path = require('path')

module.exports = class Byron {
  constructor() {
    this.chinese = [] // 中文字符数组
    this.langPack = {} // 语言包对象
  }

  /**
   * 解析文件
   * @param { string } content - 文件内容
   */
  parseFile(content) {
    if (!content) return
    // 获取包含中文字符的片段
    const paragraph = []
    const arr = content.split('\n')
    const vueArr = arr.slice(1, arr.indexOf('</template>'))
    // 解析vue组件片段
    vueArr.forEach(e => {
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
    // 解析js内容片段
    arr.forEach(e => {
      if (/\/\//.test(e) || /\/* .* *\//.test(e)) {
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
      this.chinese.push(
        e.replace(
          /[^\u4e00-\u9fa5\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g,
          ''
        )
      )
    })
    // 中文字符去重
    this.chinese = [...new Set(this.chinese)]
  }

  /**
   * 生成语言包
   */
  createLangPack() {
    this.chinese.forEach((e, i) => {
      this.langPack[`lang_${i}`] = e
    })
    const file = path.join(process.cwd(), `zh_CN.json`)
    fs.writeFile(file, JSON.stringify(this.langPack), function(err) {
      if (err) {
        return console.log(err)
      }
      console.log('生成语言包结束，输出文件路径：' + file)
    })
  }

  /**
   * 中文替换
   * @param { string } content - 文件内容
   */
  chineseReplace(content) {
    let contentArr = []
    if (content.indexOf('</template>') !== -1) {
      contentArr = content.split('</template>')
    } else {
      contentArr = [null, content]
    }
    Object.keys(this.langPack).forEach(k => {
      // 单引号
      const single = new RegExp(`'${this.langPack[k]}'`, 'g')
      // 双引号
      const double = new RegExp(`"${this.langPack[k]}"`, 'g')
      const chinese = new RegExp(`${this.langPack[k]}`, 'g')
      if (contentArr[0]) {
        contentArr[0] = contentArr[0].replace(chinese, `{{$t('${k}')}}`)
      }
      contentArr[1] = contentArr[1].replace(single, `$t('${k}')`)
      contentArr[1] = contentArr[1].replace(double, `$t('${k}')`)
    })
    return contentArr[0] ? contentArr.join('</template>') : contentArr[1]
  }

  /**
   * 文件遍历
   * @param filePath 需要遍历的文件路径
   */
  fileDisplay(filePath) {
    const forEachFile = filename => {
      const filedir = path.join(filePath, filename)
      fs.stat(filedir, (eror, stats) => {
        if (eror) {
          console.log('获取文件信息失败')
        } else {
          const isFile = stats.isFile() // 是文件
          const isDir = stats.isDirectory() // 是文件夹
          if (
            (isFile && filedir.indexOf('.vue') !== -1) ||
            (isFile && filedir.indexOf('.js') !== -1)
          ) {
            fs.readFile(filedir, (err, data) => {
              if (err) {
                console.log(`读取文件[${filedir}]失败！`)
              } else {
                this.parseFile(data.toString())
                this.createLangPack()
                const content = this.chineseReplace(data.toString())
                fs.writeFile(filedir, content, err => {
                  if (err) {
                    console.log(`写入文件[${filedir}]失败！`)
                  } else {
                    console.log(`写入文件[${filedir}]成功！`)
                  }
                })
              }
            })
          }
          if (isDir) {
            this.fileDisplay(filedir) // 递归，如果是文件夹，就继续遍历该文件夹下面的文件
          }
        }
      })
    }
    fs.readdir(filePath, (err, files) => {
      if (err) {
        return console.log(err)
      } else {
        // 遍历读取到的文件列表
        files.forEach(filename => {
          forEachFile(filename)
        })
      }
    })
  }
}
