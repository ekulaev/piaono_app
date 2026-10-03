// 简体中文版（C-LAUNCH-1）。称呼用“你”；全角标点；引号用“”。
// 练习器界面目前是英文，所以按钮名保留 “Start”。

export default {
  code: 'zh',
  htmlLang: 'zh-Hans',
  hreflang: 'zh-Hans',
  ogLocale: 'zh_CN',
  nativeName: '中文',
  appInLanguage: false,
  siteName: '视奏练习器',
  meta: {
    title: '视奏练习器 — 用数码钢琴练习识谱',
    description:
      '免费的视奏练习工具。用数据线把数码钢琴连接到平板、手机或电脑，即可弹奏：五线谱上的音符，弹下即判对错。无需注册，可离线使用。',
  },
  language: '语言',
  close: '关闭',
  langHint: '本页面有中文版',
  hero: {
    title: '流畅地读谱',
    lead: '为数码钢琴设计的视奏练习器。用数据线连接平板、手机或电脑，就能开始弹。',
    cta: '打开练习器',
    free: '免费。无需注册。',
  },
  method: {
    title: '按乐句读谱，而不是一个音一个音地认',
    alt: '练习器中的五线谱：参考音 C4，后面的音符上方标有音程箭头',
    modes: [
      {
        name: '音列',
        text: '从参考音找到第一个音，然后按音程往下弹。弹对了，提示就会逐步隐去。',
      },
      { name: '轮廓', text: '从任意琴键开始，弹出旋律的走向——上行、下行或同音。' },
      { name: '节奏', text: '在任意琴键上敲出节奏型。' },
    ],
    adaptive: '难点会更常出现；每次练习结束，你都能看到哪里进步了。',
  },
  see: {
    title: '字大清晰，按你的节奏来。',
    correct: '正确：实线圆圈',
    wrong: '弹错：虚线圆圈',
    lines: [
      '大音符、高对比度，适合看小字吃力的人。',
      '没有倒计时，也没有“失败”：速度只在后台默默记录。',
      '手边没有钢琴？可以用屏幕键盘弹。',
    ],
  },
  begin: {
    title: '连上钢琴，开始弹奏',
    stepsLabel: '如何开始',
    steps: [
      '用 USB 数据线把钢琴连接到设备。',
      '在 Chrome 中打开练习器。',
      '允许访问钢琴。',
      '点击“Start”。',
    ],
    needTitle: '你需要',
    need: '一台带 USB 接口的数码钢琴；一台安卓平板或手机（接口不匹配时用 OTG 转接头），或一台装有 Windows、macOS 或 Linux 的电脑；Chrome 或 Edge 浏览器。',
    ios: 'iPhone 和 iPad 无法使用：Safari 不能访问钢琴。屏幕键盘在任何设备上都能试用。',
    honestTitle: '坦白说',
    honest: [
      '首次打开后，练习器无需联网即可使用。',
      '练习器不收集任何数据：练习进度只保存在你的设备上。',
      '本网站会统计访问量，详见“隐私”。',
    ],
    appEnglish: '练习器界面目前为英文。',
    unsupported: '此浏览器无法连接钢琴。请在 Chrome 中打开本网站。',
  },
  footer: {
    email: '邮箱',
    privacy: '隐私',
    counter: '访问统计',
    version: '版本',
  },
  consent: {
    text: '本网站使用 Yandex Metrica 统计访问量。是否同意？',
    yes: '同意',
    no: '不同意',
    more: '详细说明',
  },
  privacy: {
    title: '隐私',
    back: '返回首页',
    paragraphs: [
      '练习器不会发送任何数据：设置和练习进度只保存在你设备上的浏览器里。',
      '本网站使用 Yandex 公司的 Yandex Metrica 统计访问量。只有在你点击“同意”后，统计才会开启。',
      'Metrica 能看到：打开了哪些页面、你从哪里来、设备和浏览器、根据 IP 地址推测的大致城市、点击和滚动。会话录制（Webvisor）会记录页面上的操作，但本网站没有任何表单，无需输入内容。数据由 Yandex 按照其 Metrica 使用条款保存。',
      '如何拒绝：点击页面底部的“访问统计”，然后选择“不同意”。你也可以在浏览器设置中禁止 cookie。',
    ],
    termsLink: 'Yandex Metrica 使用条款',
    termsUrl: 'https://yandex.com/legal/metrica_termsofuse/',
  },
}
