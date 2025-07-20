import logging
import pytz
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Настройка логирования
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)

# Токен бота
TOKEN = "7991278255:AAH768906s5l4L9wFMzBYFeTNHaChtUJEDk"

# Короткое имя игры, заданное при регистрации у BotFather
GAME_SHORT_NAME = "italianrf"

# URL вашей HTML5-игры
GAME_URL = "https://heruvim2025.github.io/telegram-game1/"

# Обработка команды /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Ciao! Нажми /game чтобы сыграть в 3D Brainrot игру 🇮🇹🧠")

# Обработка команды /game — отправка игры
async def game(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await context.bot.send_game(chat_id=update.effective_chat.id, game_short_name=GAME_SHORT_NAME)

# Обработка callback-кнопки на игру
async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    try:
        if query.game_short_name == GAME_SHORT_NAME:
            await query.answer(url=GAME_URL)
        else:
            await query.answer(text="Неизвестная игра.")
    except Exception as e:
        logging.error(f"Ошибка в callback_handler: {e}")
        await query.answer(text="Произошла ошибка!")

# Главная функция запуска
def main() -> None:
    timezone = pytz.timezone("Europe/Kiev")
    scheduler = AsyncIOScheduler(timezone=timezone)
    scheduler.start()

    app = Application.builder().token(TOKEN).build()
    app.job_queue.scheduler = scheduler

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("game", game))
    app.add_handler(CallbackQueryHandler(callback_handler))

    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
