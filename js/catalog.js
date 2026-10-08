/* 加自己的 HTML 遊戲：
   1. 把檔案放到 games/你的資料夾/index.html
   2. 在下面的 GAMES 加一筆，entry 指向那個檔案，maxScore 填這款遊戲的滿分
   3. 遊戲結束時送出分數（分數用這款遊戲自己的計分，不要先換算）：
      parent.postMessage({ type: "game-score", score: 分數 }, location.origin);
   平台會用「分數 / 滿分 × 100」換成百分，再加進總排行榜。
   若填了 questions，平台會用內建問答頁，不必另寫 HTML。
*/
const CATEGORIES = [
  { id: "chinese", name: "中文", icon: "assets/chinese.png" },
  { id: "english", name: "英文", icon: "assets/english.png" },
  { id: "math", name: "數學", icon: "assets/math.png" },
  { id: "physics", name: "物理", icon: "assets/physics.png" },
  { id: "chemistry", name: "化學", icon: "assets/chemistry.png" },
  { id: "biology", name: "生物", icon: "assets/biology.png" },
  { id: "science", name: "科學", icon: "assets/science.png" },
];

const GAMES = [
  {
    id: "zh-idiom",
    category: "chinese",
    title: "成語填空",
    level: "upper",
    blurb: "選出成語裡缺少的那個字。",
    questions: [
      { q: "一心一（　）", options: ["意", "義", "益", "議"], answer: 0 },
      { q: "畫蛇添（　）", options: ["腳", "足", "尾", "手"], answer: 1 },
      { q: "守株待（　）", options: ["鳥", "雞", "兔", "魚"], answer: 2 },
      { q: "亡羊補（　）", options: ["洞", "牢", "圈", "門"], answer: 1 },
      { q: "井底之（　）", options: ["魚", "龜", "蝦", "蛙"], answer: 3 },
    ],
  },
  {
    id: "en-words",
    category: "english",
    title: "動物與日常單字",
    level: "lower",
    blurb: "看中文，選出對應的英文單字。",
    questions: [
      { q: "「貓」的英文是？", options: ["Dog", "Cat", "Bird", "Fish"], answer: 1 },
      { q: "「書」的英文是？", options: ["Pen", "Book", "Desk", "Bag"], answer: 1 },
      { q: "「太陽」的英文是？", options: ["Moon", "Star", "Sun", "Rain"], answer: 2 },
      { q: "「水」的英文是？", options: ["Milk", "Juice", "Tea", "Water"], answer: 3 },
      { q: "「學校」的英文是？", options: ["School", "Home", "Park", "Shop"], answer: 0 },
    ],
  },
  {
    id: "math-add",
    category: "math",
    title: "加法衝刺",
    level: "lower",
    blurb: "五題加法，看你能答對幾題。",
    questions: [
      { q: "6 + 7 = ？", options: ["12", "13", "14", "15"], answer: 1 },
      { q: "9 + 8 = ？", options: ["16", "17", "18", "19"], answer: 1 },
      { q: "5 + 7 = ？", options: ["11", "12", "13", "14"], answer: 1 },
      { q: "8 + 8 = ？", options: ["14", "15", "16", "18"], answer: 2 },
      { q: "9 + 6 = ？", options: ["13", "14", "15", "16"], answer: 2 },
    ],
  },
  {
    id: "math-times",
    category: "math",
    title: "乘法小隊",
    level: "middle",
    blurb: "五題乘法，算完就送上這款遊戲的排行榜。",
    questions: [
      { q: "3 × 4 = ？", options: ["7", "12", "14", "16"], answer: 1 },
      { q: "6 × 7 = ？", options: ["36", "42", "48", "56"], answer: 1 },
      { q: "8 × 5 = ？", options: ["35", "40", "45", "48"], answer: 1 },
      { q: "9 × 3 = ？", options: ["24", "27", "29", "36"], answer: 1 },
      { q: "7 × 7 = ？", options: ["42", "47", "49", "56"], answer: 2 },
    ],
  },
  {
    id: "phy-force",
    category: "physics",
    title: "力與現象",
    level: "middle",
    blurb: "磁鐵、光和聲音，選出合理的答案。",
    questions: [
      { q: "磁鐵最容易吸住哪一個？", options: ["木棒", "鐵釘", "塑膠尺", "橡皮"], answer: 1 },
      { q: "用力推一顆靜止的小球，小球會？", options: ["變重", "開始移動", "變成正方形", "消失"], answer: 1 },
      { q: "聲音沒辦法在哪裡傳播？", options: ["空氣", "水", "真空", "木頭"], answer: 2 },
      { q: "影子主要是因為？", options: ["光被擋住", "風很大", "聲音反射", "水結冰"], answer: 0 },
      { q: "同樣大小時，哪一個通常比較重？", options: ["棉花", "氣球", "鐵球", "羽毛"], answer: 2 },
    ],
  },
  {
    id: "chem-lab",
    category: "chemistry",
    title: "小小實驗室",
    level: "upper",
    blurb: "認識水、空氣和常見變化。",
    questions: [
      { q: "水的化學式是？", options: ["CO₂", "H₂O", "O₂", "NaCl"], answer: 1 },
      { q: "鐵放在潮濕的空氣中，久了會？", options: ["生鏽", "結冰", "變成木頭", "發光"], answer: 0 },
      { q: "食鹽的主要成分是？", options: ["蔗糖", "澱粉", "氯化鈉", "酒精"], answer: 2 },
      { q: "小蘇打加進醋裡，常常會看到？", options: ["冰塊", "氣泡", "彩虹火焰", "長出葉子"], answer: 1 },
      { q: "空氣裡最多的氣體是？", options: ["氧氣", "二氧化碳", "氫氣", "氮氣"], answer: 3 },
    ],
  },
  {
    id: "bio-life",
    category: "biology",
    title: "生物問答",
    level: "middle",
    blurb: "植物、動物和身體，各答一題。",
    questions: [
      { q: "植物主要用哪裡進行光合作用？", options: ["根", "葉子", "花瓣", "種子"], answer: 1 },
      { q: "人的心臟主要負責？", options: ["思考", "推動血液", "消化食物", "製造口水"], answer: 1 },
      { q: "青蛙屬於？", options: ["魚類", "鳥類", "兩棲類", "昆蟲"], answer: 2 },
      { q: "蜜蜂對植物很重要，因為牠們會？", options: ["幫忙傳粉", "製造雨水", "鬆開大石頭", "發出陽光"], answer: 0 },
      { q: "種子發芽通常一定需要？", options: ["醬油", "水", "砂糖", "油"], answer: 1 },
    ],
  },
  {
    id: "sci-sky",
    category: "science",
    title: "天空小知識",
    level: "middle",
    blurb: "太陽、月亮和天氣，用一局遊戲記下來。",
    questions: [
      { q: "地球繞著什麼轉？", options: ["月亮", "太陽", "北極星", "雲"], answer: 1 },
      { q: "月亮看起來會發光，是因為？", options: ["自己在燃燒", "反射太陽光", "裡面有許多燈泡", "靠近地球才會亮"], answer: 1 },
      { q: "在平地，水的沸點大約是？", options: ["0°C", "37°C", "50°C", "100°C"], answer: 3 },
      { q: "彩虹比較常出現在什麼時候？", options: ["雨後又有陽光", "完全沒有光的房間", "只有深夜", "冰箱裡面"], answer: 0 },
      { q: "太陽大約從哪一個方向升起？", options: ["西邊", "北邊", "東邊", "地底下"], answer: 2 },
    ],
  },
  {
    id: "sci-garden",
    category: "science",
    title: "太空菜園",
    level: "middle",
    blurb: "在太空種植箱裡做公平測試，種出一株太空蕓豆。",
    maxScore: 600,
    entry: "games/science/space-garden/index.html",
  },
  {
    id: "sci-strong",
    category: "science",
    title: "誰是大力士",
    level: "lower",
    blurb: "用紙柱做實驗，找出哪一種形狀最能承托重量。",
    maxScore: 460,
    entry: "games/science/strongman/index.html",
  },
  {
    id: "sci-maglev",
    category: "science",
    title: "磁浮小勇士",
    level: "middle",
    blurb: "用磁極和摩擦力，讓磁浮列車浮起來並跑得更快。",
    maxScore: 2000,
    entry: "games/science/maglev/index.html",
  },
  {
    id: "sci-air",
    category: "science",
    title: "空氣炮小科學家",
    level: "lower",
    blurb: "做出空氣炮，探究看不見的氣流怎麼吹熄蠟燭。",
    maxScore: 1200,
    entry: "games/science/air-cannon/index.html",
  },
  {
    id: "sci-trebuchet",
    category: "science",
    title: "霹靂車工程師",
    level: "upper",
    blurb: "設計投石器，用實驗把石頭投得更遠。",
    maxScore: 100,
    entry: "games/science/trebuchet/index.html",
  },
  {
    id: "sci-ice",
    category: "science",
    title: "冰城挑戰",
    level: "middle",
    blurb: "設計防寒服，用公平測試比較保暖物料。",
    maxScore: 1900,
    entry: "games/science/ice-city/index.html",
  },
];

function categoryById(id) {
  return CATEGORIES.find((item) => item.id === id) || null;
}

function gameById(id) {
  return GAMES.find((item) => item.id === id) || null;
}

function gamesIn(categoryId) {
  return GAMES.filter((item) => item.category === categoryId);
}

function gameMax(game) {
  if (game.questions && game.questions.length) return game.questions.length;
  return game.maxScore;
}
