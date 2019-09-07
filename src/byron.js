const fs = require('fs')
const path = require('path')
const colors = require('colors')

// 中文正则
const ZHCN = /(['"`])([^'"`\n]*[\u4e00-\u9fa5]+[^'"`\n]*)(['"`])/gim

module.exports = class Byron {
  constructor() {
    this.index = 0
    this.rootPath = ''
    this.i18n = '@/locale' // i18n引入路径
    this.langPack = {} // 语言包对象
    this.messages = {}
  }

  /**
   * 生成语言包key
   */
  createLangKey(match, file) {
    if (this.messages[match]) {
      return this.messages[match]
    }
    return `${path
      .relative(this.rootPath, file)
      .replace(/[\\/\\\\-]/g, '_')
      .replace(/\..*$/, '')}_${this.index++}`
  }

  /**
   * 生成语言包文件
   */
  createLangPack() {
    const file = path.join(process.cwd(), 'zh_cn.json')
    fs.writeFileSync(file, JSON.stringify(this.langPack))
    console.log(`✔ 生成语言包成功，存放路径: ${file}`.green)
  }

  /**
   * 遍历目录
   * @param {* string} directory 需要遍历的目录
   * @param {* string} i18n i18n引入路径
   */
  directoryTraversal(directory, i18n) {
    this.rootPath = directory
    if (i18n) this.i18n = i18n
    const files = fs.readdirSync(directory)
    for (let file of files) {
      const dir = path.join(directory, file)
      const state = fs.statSync(dir)
      if (state.isDirectory()) {
        this.recursiveTraversal(dir)
      } else {
        this.readVueOrJsFile(dir)
      }
    }
    this.createLangPack()
  }

  /**
   * 递归遍历目录
   * @param {* string} directory 需要遍历的目录
   */
  recursiveTraversal(directory) {
    const files = fs.readdirSync(directory)
    for (let file of files) {
      const dir = path.join(directory, file)
      const state = fs.statSync(dir)
      if (state.isDirectory()) {
        this.recursiveTraversal(dir)
      } else {
        this.readVueOrJsFile(dir)
      }
    }
  }

  /**
   * 读取vue/js文件
   * @param {* string} file
   */
  readVueOrJsFile(file) {
    const name = path.extname(file).toLowerCase()
    if (name === '.js') {
      this.index = 0
      this.replaceJsFile(file)
    }
    if (name === '.vue') {
      this.index = 0
      this.replaceVueFile(file)
    }
  }

  /**
   * 替换js文件内容
   * @param {* string} file
   */
  replaceJsFile(file) {
    console.log(`➤ 开始替换${file}文件`.blue)
    let content = fs.readFileSync(file, 'utf8')
    content = `import i18n from '${this.i18n}'\n${content}`
    const arr = content.split('\n')
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i]
      const patrn = /[\u4e00-\u9fa5]|[\ufe30-\uffa0]/gi
      if (!patrn.exec(e)) {
        continue
      }
      if (/\/\//.test(e) || /\/* .* *\//.test(e) || /console./.test(e)) {
        continue
      }
      arr[i] = arr[i].replace(ZHCN, (_, prev, match) => {
        match = match.trim()
        if (prev !== '`') {
          const key = this.createLangKey(match, file)
          this.langPack[key] = match
          this.messages[match] = key
          return `i18n.t('${key}')`
        }
        let matchIndex = 0
        const matchArr = []
        match = match.replace(/(\${)([^{}]+)(})/gim, (_, prev, match) => {
          matchArr.push(match)
          return `{${matchIndex++}}`
        })
        const key = this.createLangKey(match, file)
        this.langPack[key] = match
        this.messages[match] = key
        if (!matchArr.length) {
          return `i18n.t('${key}')`
        } else {
          return `i18n.t('${key}', [${matchArr.toString()}])`
        }
      })
    }
    content = arr.join('\n')
    fs.writeFileSync(file, content, 'utf-8')
    console.log(`✔ 替换${file}文件成功`.green)
  }

  /**
   * 替换vue文件内容
   * @param {* string} file
   */
  replaceVueFile(file) {
    console.log(`➤ 开始替换${file}文件`.blue)
    let content = fs.readFileSync(file, 'utf8')
    // 替换template中的部分
    content = content.replace(/<template(.|\n)*template>/gim, _match => {
      const arr = _match.split('\n')
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i]
        const patrn = /[\u4e00-\u9fa5]|[\ufe30-\uffa0]/gi
        if (!patrn.exec(e)) {
          continue
        }
        arr[i] = arr[i].replace(
          /(\w+='|\w+="|>|'|")([^'"<>]*[\u4e00-\u9fa5]+[^'"<>]*)(['"<])/gim,
          (_, prev, match, after) => {
            match = match.trim()
            if (match.match(/{{[^{}]+}}/)) {
              // 对于 muscache 中部分的替换
              const matchArr = []
              let matchIndex = 0
              match = match.replace(/{{([^{}]+)}}/gim, (_, match) => {
                matchArr.push(match)
                return `{${matchIndex++}}`
              })
              const key = this.createLangKey(match, file)
              this.langPack[key] = match
              this.messages[match] = key
              if (!matchArr.length) {
                return `${prev}{{$t('${key}')}}${after}`
              } else {
                return `${prev}{{$t('${key}', [${matchArr.toString()}])}}${after}`
              }
            } else {
              const key = this.createLangKey(match, file)
              this.langPack[key] = match
              this.messages[match] = key
              if (prev.match(/^\w+='$/)) {
                // 对于属性中普通文本的替换
                return `:${prev}$t("${key}")${after}`
              } else if (prev.match(/^\w+="$/)) {
                // 对于属性中普通文本的替换
                return `:${prev}$t('${key}')${after}`
              } else if (prev === '"' || prev === "'") {
                // 对于属性中参数形式中的替换
                return `$t(${prev}${key}${after})`
              } else {
                // 对于tag标签中的普通文本替换
                return `${prev}{{$t('${key}')}}${after}`
              }
            }
          }
        )
      }
      return arr.join('\n')
    })
    // 替换script中的部分
    content = content.replace(/<script(.|\n)*script>/gim, _match => {
      const arr = _match.split('\n')
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i]
        const patrn = /[\u4e00-\u9fa5]|[\ufe30-\uffa0]/gi
        if (!patrn.exec(e)) {
          continue
        }
        if (/\/\//.test(e) || /\/* .* *\//.test(e) || /console./.test(e)) {
          continue
        }
        arr[i] = arr[i].replace(ZHCN, (_, prev, match) => {
          match = match.trim()
          if (prev !== '`') {
            const key = this.createLangKey(match, file)
            this.langPack[key] = match
            this.messages[match] = key
            return `this.$t('${key}')`
          }
          let matchIndex = 0
          const matchArr = []
          match = match.replace(/(\${)([^{}]+)(})/gim, (_, prev, match) => {
            matchArr.push(match)
            return `{${matchIndex++}}`
          })
          const key = this.createLangKey(match, file)
          this.langPack[key] = match
          this.messages[match] = key
          if (!matchArr.length) {
            return `this.$t('${key}')`
          } else {
            return `this.$t('${key}', [${matchArr.toString()}])`
          }
        })
      }
      return arr.join('\n')
    })
    fs.writeFileSync(file, content, 'utf-8')
    console.log(`✔ 替换${file}文件成功`.green)
  }
}
