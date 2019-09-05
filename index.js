#! /usr/bin/env node

const commander = require('commander')
const argv = require('minimist')(process.argv.slice(2))
const Byron = require('./src/byron')
const directoryReplace = new Byron()

// 注册版本号与描述
commander.version('1.0.0').description('替换.vue/.js中的中文为多语言')

// 注册参数
commander.option('-f, --file', '要替换的文件目录')

// 解析
commander.parse(process.argv)

function main() {
  if (!argv.f && !argv.file) {
    console.warn('替换结束，缺少替换目录参数！！！')
    return
  }
  directoryReplace.directoryForEach(argv.f || argv.file)
}

main()
