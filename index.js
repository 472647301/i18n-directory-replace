#! /usr/bin/env node

const colors = require('colors')
const commander = require('commander')
const argv = require('minimist')(process.argv.slice(2))
const Byron = require('./src/byron')
const i18nReplace = new Byron()

// 注册版本号与描述
commander.version('1.0.3').description('替换.vue/.js中的中文为多语言')

// 注册参数
commander.option('-f, --file', '要替换的文件目录')
commander.option('-i, --i18n', 'i18n引入路径')

// 解析
commander.parse(process.argv)

function main() {
  if (!argv.f && !argv.file) {
    console.error('🙅  替换结束，缺少替换目录参数！！！'.red)
    return
  }
  i18nReplace.directoryTraversal(argv.f || argv.file, argv.i || argv.i18n)
}

main()
