const TelegramBot = require('node-telegram-bot-api');
const token = "8572610862:AAGmufeFu8RymWopmfFughge4652X9zKIXQ"; // <-- tokenni shu yerga yozing

const bot = new TelegramBot(token, { polling: true });
console.log('✅ Snake Bot ishga tushdi!');

const games = new Map();
const GRID_SIZE = 12;
const INITIAL_SNAKE = [{ x: 6, y: 6 }];
const INITIAL_DIRECTION = 'right';

function startGame(chatId) {
    const gameState = {
        snake: JSON.parse(JSON.stringify(INITIAL_SNAKE)),
        direction: INITIAL_DIRECTION,
        food: generateFood(INITIAL_SNAKE),
        score: 0,
        isGameOver: false
    };
    games.set(chatId, gameState);
    return gameState;
}

function generateFood(snake) {
    let food;
    do {
        food = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
    return food;
}

function drawGrid(gameState) {
    let grid = '';
    for (let y = 0; y < GRID_SIZE; y++) {
        let row = '';
        for (let x = 0; x < GRID_SIZE; x++) {
            const isSnake = gameState.snake.some(segment => segment.x === x && segment.y === y);
            const isHead = gameState.snake[0].x === x && gameState.snake[0].y === y;
            const isFood = gameState.food.x === x && gameState.food.y === y;
            
            if (isHead) row += '🐍';
            else if (isSnake) row += '🟢';
            else if (isFood) row += '🍎';
            else row += '◻️';
            row += ' ';
        }
        grid += row + '\n';
    }
    return grid;
}

function moveSnake(gameState) {
    if (gameState.isGameOver) return false;
    const head = { ...gameState.snake[0] };

    switch (gameState.direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }

    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameState.isGameOver = true;
        return false;
    }

    if (gameState.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameState.isGameOver = true;
        return false;
    }

    gameState.snake.unshift(head);
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        gameState.score += 10;
        gameState.food = generateFood(gameState.snake);
    } else {
        gameState.snake.pop();
    }
    return true;
}

function createKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '⬆️', callback_data: 'up' }],
            [
                { text: '⬅️', callback_data: 'left' },
                { text: '➡️', callback_data: 'right' }
            ],
            [{ text: '⬇️', callback_data: 'down' }],
            [{ text: '🔄 Yangi o\'yin', callback_data: 'restart' }]
        ]
    };
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        '🐍 **Snake O\'yiniga Xush Kelibsiz!**\n\n' +
        '🎮 O\'yinni boshlash uchun: /snake\n\n' +
        '💡 Tugmalar bilan ham, yoki **W, A, S, D** yozib boshqarishingiz mumkin!',
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/\/snake/, (msg) => {
    const chatId = msg.chat.id;
    const gameState = startGame(chatId);
    const message = `🎮 **Snake O'yini**\n\n${drawGrid(gameState)}\n\n📊 **Hisob:** ${gameState.score}`;
    bot.sendMessage(chatId, message, {
        reply_markup: createKeyboard(),
        parse_mode: 'Markdown'
    });
});

// Har bir text yozuvni tekshiradi (W, A, S, D)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim().toLowerCase();

    if (!['w', 'a', 's', 'd'].includes(text)) return;

    let gameState = games.get(chatId);
    if (!gameState) {
        bot.sendMessage(chatId, "🎮 Avval /snake bilan o'yinni boshlang!");
        return;
    }

    const keyMap = {
        'w': 'up',
        'a': 'left',
        's': 'down',
        'd': 'right'
    };

    const newDirection = keyMap[text];
    const oppositeDirections = {
        'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'
    };

    if (oppositeDirections[newDirection] !== gameState.direction) {
        gameState.direction = newDirection;
    }

    moveSnake(gameState);

    const updatedMessage = gameState.isGameOver
        ? `💀 **O'YIN TUGADI!**\n\n${drawGrid(gameState)}\n\n📊 Yakuniy hisob: ${gameState.score}`
        : `🎮 **Snake O'yini**\n\n${drawGrid(gameState)}\n\n📊 Hisob: ${gameState.score}`;

    bot.sendMessage(chatId, updatedMessage, {
        reply_markup: createKeyboard(),
        parse_mode: 'Markdown'
    });
});

bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    let gameState = games.get(chatId);

    if (!gameState || gameState.isGameOver) {
        if (data === 'restart') gameState = startGame(chatId);
        else return;
    }

    if (data === 'restart') {
        gameState = startGame(chatId);
        bot.answerCallbackQuery(callbackQuery.id, { text: '🔄 O\'yin qayta boshlandi!' });
    } else {
        const oppositeDirections = {
            'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'
        };
        if (oppositeDirections[data] !== gameState.direction) {
            gameState.direction = data;
        }
        moveSnake(gameState);
    }

    const updatedMessage = gameState.isGameOver
        ? `💀 **O'YIN TUGADI!**\n\n${drawGrid(gameState)}\n\n📊 Yakuniy hisob: ${gameState.score}`
        : `🎮 **Snake O'yini**\n\n${drawGrid(gameState)}\n\n📊 Hisob: ${gameState.score}`;

    bot.editMessageText(updatedMessage, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: createKeyboard(),
        parse_mode: 'Markdown'
    });

    bot.answerCallbackQuery(callbackQuery.id);
});

bot.on('polling_error', (err) => console.log('Xato:', err.message));

