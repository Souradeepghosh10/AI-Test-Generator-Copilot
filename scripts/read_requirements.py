# Reads a story / requirements from a local file instead of Jira.
#
# Supported: .txt, .md (plain text), .csv, .xlsx / .xlsm (every sheet, row by row)
# The file name becomes the story key (unless you give one): requirements/login_story.xlsx -> LOGIN-STORY

import csv
import os
import re

TEXT_EXTENSIONS = (".txt", ".md")
EXCEL_EXTENSIONS = (".xlsx", ".xlsm")
SUPPORTED_EXTENSIONS = TEXT_EXTENSIONS + EXCEL_EXTENSIONS + (".csv",)


def to_story_key(name: str):
    # "login_story" -> LOGIN-STORY (used to name the test cases LOGIN-STORY-TC001, ...)
    return re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-").upper()


def story_key_from_path(path: str):
    # requirements/login_story.xlsx -> LOGIN-STORY
    return to_story_key(os.path.splitext(os.path.basename(path))[0])


def rows_to_text(rows):
    # Each row becomes one line, cells joined with " | ". Empty rows are left out.
    # Empty cells in the middle are kept so the values stay under the right column.
    # Line breaks inside a cell are turned into spaces, so each row stays on one line.
    lines = []
    for row in rows:
        cells = ["" if cell is None else " ".join(str(cell).split()) for cell in row]
        while cells and not cells[-1]:
            cells.pop()
        if cells:
            lines.append(" | ".join(cells))
    return "\n".join(lines)


def read_excel(path: str):
    from openpyxl import load_workbook  # only needed for Excel files

    workbook = load_workbook(path, read_only=True, data_only=True)
    sheets = []
    for sheet in workbook.worksheets:
        text = rows_to_text(sheet.iter_rows(values_only=True))
        if text:
            sheets.append(f"Sheet: {sheet.title}\n{text}")
    workbook.close()
    return "\n\n".join(sheets)


def read_file_text(path: str):
    # The file as plain text (Excel and CSV: one line per row)
    extension = os.path.splitext(path)[1].lower()

    if extension in TEXT_EXTENSIONS:
        with open(path, encoding="utf-8") as file:
            text = file.read()
    elif extension == ".csv":
        with open(path, newline="", encoding="utf-8-sig") as file:
            text = rows_to_text(csv.reader(file))
    elif extension in EXCEL_EXTENSIONS:
        text = read_excel(path)
    else:
        raise ValueError(f"{path}: unsupported file type '{extension}'. Use one of: {', '.join(SUPPORTED_EXTENSIONS)}")
    return text


def read_requirements_file(path: str, story_key: str = ""):
    # Give it a file path, get back (story_key, story text), the same shape the test case writer gets from Jira.
    # story_key: an optional name for the test cases; without it, the file name is used.
    text = read_file_text(path)
    if not text.strip():
        raise ValueError(f"{path} is empty")

    story_key = to_story_key(story_key) if story_key else story_key_from_path(path)
    if not story_key:
        raise ValueError(f"{path}: cannot make a story key from the name, give one that has letters or numbers")
    print(f"Requirements file: read {path} as story {story_key}")
    return story_key, f"Story {story_key} (from file {os.path.basename(path)}):\n\n{text}"


if __name__ == "__main__":
    # python3 scripts/read_requirements.py <file>   prints the file as plain text, for the Copilot test case writer
    import sys

    print(read_file_text(sys.argv[1]))
