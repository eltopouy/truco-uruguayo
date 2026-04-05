import os
import asyncio
import edge_tts

VOICE = "es-UY-MateoNeural"
OUTPUT_DIR = "assets/audio_voices"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

VOICES_TO_GENERATE = {
    "flor": "¡Flor!",
    "contra_flor": "¡Contra flor!",
    "contra_flor_al_resto": "¡Contra flor al resto!",
    "con_flor_me_achico": "¡Con flor me achico!",
    "envido": "¡Envido!",
    "real_envido": "¡Real envido!",
    "falta_envido": "¡Falta envido!",
    "truco": "¡Truco!",
    "retruco": "¡Quiero retruco!",
    "vale_4": "¡Quiero vale cuatro!",
    "quiero": "¡Quiero!",
    "no_quiero": "No quiero.",
    "me_voy_al_mazo": "Me voy al mazo.",
    "son_buenas": "Son buenas.",
}

async def generate():
    for filename, text in VOICES_TO_GENERATE.items():
        print(f"Generando {filename}.mp3...")
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(os.path.join(OUTPUT_DIR, f"{filename}.mp3"))
    print("¡Listo!")

asyncio.run(generate())
