"""Transcribe un archivo de audio en local con faster-whisper y emite JSON por stdout.

Se usa como respaldo de ``npm run ingesta:debates -- --whisper`` cuando un video
no tiene subtítulos (manuales ni automáticos) en YouTube. No envía audio a
servicios externos: el modelo se descarga una vez y corre en la CPU/GPU local.

Requisitos:
    python -m pip install faster-whisper

Uso:
    python pipeline/scripts/transcribir_whisper.py <audio> [--modelo small] [--idioma es]

Salida (stdout):
    [{"inicio": 12.3, "fin": 15.8, "texto": "..."}, ...]
"""

from __future__ import annotations

import argparse
import json
import sys


def parsear_argumentos(argv: list[str]) -> argparse.Namespace:
    """Construye y evalúa los argumentos de línea de comandos.

    Args:
        argv: Argumentos sin el nombre del script.

    Returns:
        Espacio de nombres con ``audio``, ``modelo``, ``idioma`` y ``dispositivo``.
    """
    parser = argparse.ArgumentParser(
        description="Transcripción local de audio con faster-whisper."
    )
    parser.add_argument("audio", help="Ruta del archivo de audio a transcribir.")
    parser.add_argument(
        "--modelo",
        default="small",
        help="Modelo Whisper (tiny, base, small, medium, large-v3).",
    )
    parser.add_argument("--idioma", default="es", help="Código de idioma ISO 639-1.")
    parser.add_argument(
        "--dispositivo",
        default="auto",
        help="Dispositivo de inferencia: auto, cpu o cuda.",
    )
    return parser.parse_args(argv)


def transcribir(
    ruta_audio: str, modelo: str, idioma: str, dispositivo: str
) -> list[dict[str, float | str]]:
    """Transcribe el audio y devuelve segmentos con marcas de tiempo en segundos.

    Args:
        ruta_audio: Ruta del archivo de audio (m4a, webm, mp3, wav...).
        modelo: Nombre del modelo Whisper a cargar.
        idioma: Idioma esperado del habla.
        dispositivo: ``auto``, ``cpu`` o ``cuda``.

    Returns:
        Lista de diccionarios con ``inicio``, ``fin`` y ``texto``.

    Raises:
        ImportError: Si ``faster-whisper`` no está instalado.
    """
    from faster_whisper import WhisperModel

    tipo_computo = "int8" if dispositivo in ("auto", "cpu") else "float16"
    motor = WhisperModel(modelo, device=dispositivo, compute_type=tipo_computo)
    segmentos, _info = motor.transcribe(
        ruta_audio,
        language=idioma,
        vad_filter=True,
        beam_size=5,
    )

    resultado: list[dict[str, float | str]] = []
    for segmento in segmentos:
        texto = segmento.text.strip()
        if texto:
            resultado.append(
                {
                    "inicio": round(float(segmento.start), 3),
                    "fin": round(float(segmento.end), 3),
                    "texto": texto,
                }
            )
    return resultado


def main(argv: list[str]) -> int:
    """Punto de entrada CLI.

    Args:
        argv: Argumentos sin el nombre del script.

    Returns:
        Código de salida del proceso (0 éxito, 2 dependencia ausente).
    """
    args = parsear_argumentos(argv)
    try:
        segmentos = transcribir(args.audio, args.modelo, args.idioma, args.dispositivo)
    except ImportError:
        print(
            "faster-whisper no está instalado. Ejecuta: python -m pip install faster-whisper",
            file=sys.stderr,
        )
        return 2

    sys.stdout.reconfigure(encoding="utf-8")
    json.dump(segmentos, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
