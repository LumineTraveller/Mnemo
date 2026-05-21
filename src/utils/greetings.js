/**
 * Daytime (5–21): inspirational quotes from famous figures of each language's culture.
 * Night   (22–4): gentle wind-down messages (unchanged).
 */

const QUOTES = {
  German: [
    '„Was mich nicht umbringt, macht mich stärker."\n— Friedrich Nietzsche',
    '„Phantasie ist wichtiger als Wissen."\n— Albert Einstein',
    '„Habe Mut, dich deines eigenen Verstandes zu bedienen."\n— Immanuel Kant',
    '„In der Beschränkung zeigt sich der Meister."\n— Johann Wolfgang von Goethe',
    '„Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt."\n— Ludwig Wittgenstein',
    '„Wer kämpft, kann verlieren. Wer nicht kämpft, hat schon verloren."\n— Bertolt Brecht',
    '„Der Mensch ist nur da ganz Mensch, wo er spielt."\n— Friedrich Schiller',
    '„Man muss das Unmögliche versuchen, um das Mögliche zu erreichen."\n— Hermann Hesse',
    '„Zwei Dinge sind unendlich: das Universum und die menschliche Dummheit."\n— Albert Einstein',
  ],

  French: [
    '« Au milieu de l\'hiver, j\'apprenais enfin qu\'il y avait en moi un été invincible. »\n— Albert Camus',
    '« Ceux qui vivent sont ceux qui luttent. »\n— Victor Hugo',
    '« Le cœur a ses raisons que la raison ne connaît point. »\n— Blaise Pascal',
    '« Je pense, donc je suis. »\n— René Descartes',
    '« Il faut imaginer Sisyphe heureux. »\n— Albert Camus',
    '« Le mieux est l\'ennemi du bien. »\n— Voltaire',
    '« La véritable générosité envers l\'avenir consiste à tout donner au présent. »\n— Albert Camus',
    '« On ne naît pas femme : on le devient. »\n— Simone de Beauvoir',
    '« Vivre sans philosophie, c\'est avoir les yeux bandés. »\n— René Descartes',
  ],

  Spanish: [
    '«Caminante, son tus huellas el camino y nada más.»\n— Antonio Machado',
    '«Podrán cortar todas las flores, pero no podrán evitar la primavera.»\n— Pablo Neruda',
    '«Siempre imaginé que el Paraíso sería algún tipo de biblioteca.»\n— Jorge Luis Borges',
    '«La vida no es la que uno vivió, sino la que uno recuerda, y cómo la recuerda para contarla.»\n— Gabriel García Márquez',
    '«El que lee mucho y anda mucho, ve mucho y sabe mucho.»\n— Miguel de Cervantes',
    '«Yo soy yo y mi circunstancia, y si no la salvo a ella no me salvo yo.»\n— José Ortega y Gasset',
    '«El fin de la cultura es hacer hombre; lo demás es oficio.»\n— Miguel de Unamuno',
    '«Un hombre que no lee no tiene ninguna ventaja sobre el que no sabe leer.»\n— Mark Twain',
  ],

  Italian: [
    '"L\'apprendimento non esaurisce mai la mente."\n— Leonardo da Vinci',
    '"La matematica è l\'alfabeto con cui Dio ha scritto l\'universo."\n— Galileo Galilei',
    '"La semplicità è la massima sofisticazione."\n— Leonardo da Vinci',
    '"Istruitevi, perché avremo bisogno di tutta la nostra intelligenza."\n— Antonio Gramsci',
    '"Chi non legge, a 70 anni avrà vissuto una sola vita: la propria."\n— Umberto Eco',
    '"Non v\'è cosa che più tormenti l\'uomo che il rimanere ozioso."\n— Leonardo da Vinci',
    '"Il coraggio è non avere paura di avere paura."\n— Piero Calamandrei',
    '"Leggere è sempre un atto di resistenza."\n— Italo Calvino',
    '"La cultura è l\'unica cosa che nessuno può portarti via."\n— proverbio italiano',
  ],

  Japanese: [
    '「挑戦して失敗を恐れるよりも、何もしないことを恐れろ。」\n— 本田宗一郎',
    '「世の人は我を何とも言わば言え、我が成すことは我のみぞ知る。」\n— 坂本龍馬',
    '「今日の我に飽き足らず、明日また高みを目指せ。」\n— 宮本武蔵',
    '「成功とは、成功するまで諦めないことである。」\n— 松下幸之助',
    '「楽観的に構想し、悲観的に計画し、楽観的に実行する。」\n— 稲盛和夫',
    '「世界がぜんたい幸福にならないうちは個人の幸福はあり得ない。」\n— 宮沢賢治',
    '「学びて思わざれば則ち罔し、思いて学ばざれば則ち殆し。」\n— 孔子（論語）',
    '「千里の道も一歩から。」\n— 日本の故事',
    '「七転び八起き。」\n— 日本の諺',
  ],

  Korean: [
    '「하루라도 책을 읽지 않으면 입안에 가시가 돋는다.」\n— 안중근',
    '「죽고자 하면 살 것이요, 살고자 하면 죽을 것이다.」\n— 이순신',
    '「죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를.」\n— 윤동주',
    '「배움에는 끝이 없다.」\n— 한국 격언',
    '「나는 우리나라가 세계에서 가장 아름다운 나라가 되기를 원한다.」\n— 김구',
    '「책을 읽지 않고 하루를 보내는 것은 두 눈 멀쩡히 있으면서 보지 않는 것과 같다.」\n— 정약용',
    '「학문은 날마다 새로워야 한다.」\n— 이황',
    '「넘어지는 것이 실패가 아니라, 넘어진 채로 있는 것이 실패다.」\n— 한국 격언',
    '「오늘 할 수 있는 일을 내일로 미루지 마라.」\n— 세종대왕',
  ],

  Portuguese: [
    '"Tudo vale a pena se a alma não é pequena."\n— Fernando Pessoa',
    '"Não sou nada. Nunca serei nada. Não posso querer ser nada. À parte isso, tenho em mim todos os sonhos do mundo."\n— Fernando Pessoa',
    '"Mudam-se os tempos, mudam-se as vontades."\n— Luís de Camões',
    '"Quando você quer algo, todo o universo conspira para que você realize seu desejo."\n— Paulo Coelho',
    '"O homem mais sábio que já conheci na minha vida não sabia ler nem escrever."\n— José Saramago',
    '"A esperança é o sonho do homem desperto."\n— Aristóteles (tradução)',
    '"Navegar é preciso, viver não é preciso."\n— Fernando Pessoa',
    '"Ler é viajar sem mover os pés."\n— provérbio português',
    '"O saber não ocupa lugar."\n— provérbio português',
  ],

  Russian: [
    '«Красота спасёт мир.»\n— Фёдор Достоевский',
    '«Краткость — сестра таланта.»\n— Антон Чехов',
    '«Человек — это звучит гордо.»\n— Максим Горький',
    '«Жизнь прожить — не поле перейти.»\n— русская пословица',
    '«Иди и смотри. Увидишь больше, чем знаешь.»\n— Лев Толстой',
    '«Всё приходит вовремя к тому, кто умеет ждать.»\n— Лев Толстой',
    '«Счастье — это знать своё дело и делать его.»\n— Лев Толстой',
    '«Учиться, учиться и учиться.»\n— Владимир Ленин',
    '«Дорогу осилит идущий.»\n— русская пословица',
  ],

  English: [
    '"All the world\'s a stage, and all the men and women merely players."\n— William Shakespeare',
    '"Be yourself; everyone else is already taken."\n— Oscar Wilde',
    '"Success is not final, failure is not fatal: it is the courage to continue that counts."\n— Winston Churchill',
    '"If I have seen further, it is by standing on the shoulders of Giants."\n— Isaac Newton',
    '"A thing of beauty is a joy forever."\n— John Keats',
    '"The good life is one inspired by love and guided by knowledge."\n— Bertrand Russell',
    '"In the middle of difficulty lies opportunity."\n— Albert Einstein',
    '"The more that you read, the more things you will know."\n— Dr. Seuss',
    '"Not all those who wander are lost."\n— J.R.R. Tolkien',
  ],
};

const NIGHT = {
  German: [
    'Noch ein bisschen?',
    'Die Nacht ist still — perfekt zum Lernen.',
    'Gute Nacht kommt bald.',
    'Nachts verankert sich das Gelernte.',
    'Nur ein Wort noch.',
    'Die Stille gehört dir.',
  ],
  French: [
    'Une dernière révision?',
    'La nuit est douce pour apprendre.',
    'Presque l\'heure de se reposer.',
    'Le silence de la nuit — idéal.',
    'Encore un mot avant de dormir.',
    'La nuit consolide la mémoire.',
  ],
  Spanish: [
    '¿Un repaso antes de dormir?',
    'La noche es perfecta para aprender.',
    'Casi hora de descansar.',
    'El silencio habla — escúchalo.',
    'Un último esfuerzo.',
    'La noche consolida lo aprendido.',
  ],
  Italian: [
    'Un ultimo ripasso?',
    'La notte porta buoni consigli.',
    'Quasi ora di riposare.',
    'Il silenzio della notte è tuo.',
    'Ancora una parola.',
    'La memoria lavora di notte.',
  ],
  Japanese: [
    'もう少しだけ。',
    '夜は言葉が心に残りやすい。',
    'もうすぐ休む時間。',
    '夜の静寂に学ぶ。',
    'あと一言だけ。',
    '記憶は夜に定着する。',
  ],
  Korean: [
    '자기 전에 한 번 더?',
    '밤은 단어가 잘 기억되는 시간이에요.',
    '곧 잠들 시간이에요.',
    '조용한 밤에 배워봐요.',
    '마지막으로 한 단어만.',
    '기억은 잠자는 동안 굳어져요.',
  ],
  Portuguese: [
    'Uma última revisão?',
    'A noite é perfeita para aprender.',
    'Quase hora de descansar.',
    'O silêncio da noite é seu.',
    'Mais uma palavra.',
    'A memória trabalha à noite.',
  ],
  Russian: [
    'Ещё немного?',
    'Ночью слова запоминаются глубже.',
    'Скоро время отдыхать.',
    'Тишина ночи — ваша.',
    'Ещё одно слово.',
    'Память работает ночью.',
  ],
  English: [
    'One last review?',
    'Words settle in at night.',
    'Almost time to rest.',
    'The silence is yours.',
    'Just one more word.',
    'Memory consolidates while you sleep.',
  ],
};

const GREETINGS = {
  German: {
    morning: ['Guten Morgen.', 'Ein neuer Tag beginnt.', 'Morgens lernt es sich am besten.', 'Der frühe Vogel lernt das Wort.', 'Frisch in den Tag — und in die Sprache.', 'Was lernst du heute?'],
    afternoon: ['Guten Tag.', 'Weiter so.', 'Ein paar Wörter für den Nachmittag?', 'Der Tag gehört dir.', 'Pause? Oder noch ein Wort?', 'Sprache braucht Zeit — nimm dir welche.'],
    evening: ['Guten Abend.', 'Der Abend gehört den Wörtern.', 'Lass uns den Tag abrunden.', 'Ruhig und konzentriert — ideal.', 'Abends bleibt mehr hängen.', 'Ein letzter Gedanke vor dem Abend.'],
  },
  French: {
    morning: ['Bonjour.', 'Une belle journée commence.', 'Le matin, les mots restent.', 'Nouveau jour, nouveau vocabulaire.', 'Comment commencer la journée ? Par un mot.', "L'esprit est frais — apprenons."],
    afternoon: ['Bon après-midi.', 'Continuez — vous progressez.', 'Un moment pour les mots.', 'La journée avance, et vous aussi.', "Quelques mots pour l'après-midi?", 'Le français attend.'],
    evening: ['Bonsoir.', 'Le calme du soir est propice.', 'La nuit porte conseil — et les mots aussi.', 'Finissons la journée en beauté.', 'Un dernier effort ce soir.', 'Le soir vous appartient.'],
  },
  Spanish: {
    morning: ['Buenos días.', 'Un nuevo día, nuevas palabras.', 'La mañana es tuya.', 'Empieza el día con el idioma.', 'Fresco y listo para aprender.', '¿Qué aprenderás hoy?'],
    afternoon: ['Buenas tardes.', 'Sigue adelante.', 'Unas palabras para esta tarde.', 'El idioma no descansa — tú tampoco.', 'La tarde es perfecta para repasar.', 'Un momento de español.'],
    evening: ['Buenas noches.', 'La tarde es tuya — y del idioma.', 'Termina el día con algo nuevo.', 'La tranquilidad del atardecer.', 'Un repaso antes de cenar.', 'El español te espera.'],
  },
  Italian: {
    morning: ['Buongiorno.', 'Un nuovo giorno, nuove parole.', 'La mattina è perfetta per imparare.', 'Inizia bene la giornata.', 'Fresco e pronto a imparare.', "L'italiano ti aspetta."],
    afternoon: ['Buon pomeriggio.', 'Continua così.', 'Un momento per le parole.', 'Il pomeriggio è tuo.', 'Qualche parola in più?', "L'italiano non dorme mai."],
    evening: ['Buonasera.', 'La sera è tua — e delle parole.', 'Concludiamo la giornata con qualcosa di nuovo.', 'La quiete della sera favorisce il ricordo.', 'Un ultimo ripasso stasera.', "L'italiano ti accompagna."],
  },
  Japanese: {
    morning: ['おはようございます。', '今日も一つずつ覚えよう。', '朝の学習が一番効果的。', '新しい一日、新しい言葉。', '頭が冴えている今がチャンス。', '今日は何を覚える？'],
    afternoon: ['こんにちは。', '今日もよく頑張っています。', '少しずつ、確実に。', '午後の学習を始めよう。', '言葉は積み重ね。', '今日の進歩を続けよう。'],
    evening: ['こんばんは。', '夜の静けさの中で学ぼう。', '今日の締めくくりに。', '夜は集中しやすい。', '一日の終わりに言葉を。', '静かな夜に、また一言。'],
  },
  Korean: {
    morning: ['좋은 아침이에요.', '새로운 하루, 새로운 단어.', '아침에 배우면 더 잘 기억돼요.', '상쾌한 아침, 배울 준비 됐어요?', '오늘은 무엇을 배울까요?', '머리가 맑은 지금이 기회예요.'],
    afternoon: ['안녕하세요.', '계속 해봐요.', '오늘 오후도 조금씩 배워봐요.', '언어는 꾸준히 하는 거예요.', '오늘의 진도를 이어가요.', '잠깐 쉬고 또 배워봐요.'],
    evening: ['좋은 저녁이에요.', '저녁의 고요함 속에서 공부해요.', '오늘 하루 마무리로 몇 가지 더.', '조용한 저녁, 집중하기 좋아요.', '오늘도 수고했어요.', '하루를 단어로 마무리해요.'],
  },
  Portuguese: {
    morning: ['Bom dia.', 'Um novo dia, novas palavras.', 'De manhã se aprende melhor.', 'A manhã é sua.', 'Comece o dia com o idioma.', 'O que aprenderá hoje?'],
    afternoon: ['Boa tarde.', 'Continue assim.', 'Algumas palavras para esta tarde.', 'A língua não descansa.', 'Um momento para o português.', 'Continue progredindo.'],
    evening: ['Boa noite.', 'A tarde é sua — e do idioma.', 'Vamos terminar o dia com algo novo.', 'A quietude da noite favorece o aprendizado.', 'Um último esforço esta noite.', 'O português te espera.'],
  },
  Russian: {
    morning: ['Доброе утро.', 'Новый день — новые слова.', 'Утром учится лучше всего.', 'Свежий ум — лучшее время.', 'Что выучим сегодня?', 'Начнём день с языка.'],
    afternoon: ['Добрый день.', 'Продолжайте — вы прогрессируете.', 'Несколько слов во второй половине дня.', 'Язык не ждёт.', 'Продолжаем.', 'Ещё немного?'],
    evening: ['Добрый вечер.', 'Вечерняя тишина — лучшее время для слов.', 'Завершим день чем-то новым.', 'Спокойный вечер для учёбы.', 'Последнее усилие сегодня.', 'Вечер принадлежит вам.'],
  },
  English: {
    morning: ['Good morning.', 'A new day, a few new words.', 'Mornings are made for learning.', 'The mind is freshest now.', 'What will you learn today?', 'Start the day with language.'],
    afternoon: ['Good afternoon.', 'Keep going.', 'A few words for the afternoon.', "Language doesn't wait.", "You're making progress.", 'One more round?'],
    evening: ['Good evening.', 'The quiet of the evening is yours.', "Let's close the day with something new.", 'Evening light — good for learning.', 'Wind down with words.', 'The day is almost done.'],
  },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTimeBucket() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

export function getGreeting(lang = 'English') {
  const bucket = getTimeBucket();

  if (bucket === 'night') {
    return pickRandom(NIGHT[lang] || NIGHT['English']);
  }

  // 白天：问候语 + 名言混合池，各占约一半概率
  const greets = (GREETINGS[lang] || GREETINGS['English'])[bucket];
  const quotes = QUOTES[lang] || QUOTES['English'];
  const pool = [...greets, ...quotes];
  return pickRandom(pool);
}
