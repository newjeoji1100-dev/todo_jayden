import os
import sqlite3
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

DB_PATH = "/workspace/data/app.db"


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def init_db():
    with get_db() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS shoot_todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sequence INTEGER NOT NULL,
            section TEXT NOT NULL,
            title TEXT NOT NULL,
            detail TEXT NOT NULL DEFAULT '',
            media_type TEXT NOT NULL CHECK(media_type IN ('photo', 'video', 'interview')),
            camera_tag TEXT NOT NULL CHECK(camera_tag IN ('2470', '70200')),
            is_required INTEGER NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )''')
        count = conn.execute('SELECT COUNT(*) FROM shoot_todos').fetchone()[0]
        if count == 0:
            seed_todos(conn)


def seed_todos(conn):
    rows = [
        (1, '공항 & 시작', '제주공항 도착 직후 전체 그룹 포토', '세로/가로 각 1장', 'photo', '2470', 0),
        (2, '공항 & 시작', '참가자들끼리 반갑게 인사하고 포옹하는 환영 스냅', '', 'photo', '2470', 0),
        (3, '공항 & 시작', '게이트를 걸어 나오며 밝게 웃고 손 흔드는 오프닝 컷', '3~4초', 'video', '2470', 0),
        (4, '공항 & 시작', '공항 밖으로 나와 제주의 바람과 햇살을 처음 마주하는 표정', '', 'video', '2470', 0),
        (5, '위로 · 해녀 만남 & 바다', '제주 바다 배경 해녀분들과 함께 찍는 전체 그룹 포토', '', 'photo', '2470', 0),
        (6, '위로 · 해녀 만남 & 바다', '해녀와 참가자가 눈을 맞추며 환하게 웃는 교감 스냅', '', 'photo', '70200', 0),
        (7, '위로 · 해녀 만남 & 바다', '해녀의 거친 손과 참가자의 손이 맞닿은 클로즈업', '', 'photo', '2470', 0),
        (8, '위로 · 해녀 만남 & 바다', '제주 해안가를 나란히 걷는 참가자들 뒷모습 풀샷', '', 'photo', '2470', 0),
        (9, '위로 · 해녀 만남 & 바다', '해녀분들의 주름진 얼굴과 따뜻한 미소 타이트 샷', '', 'video', '70200', 0),
        (10, '위로 · 해녀 만남 & 바다', '서로 손짓하며 대화하고 웃음 짓는 현장 분위기 스케치', '', 'video', '2470', 0),
        (11, '위로 · 해녀 만남 & 바다', '반짝이는 바다 윤슬 클로즈업', '5초 이상 홀드', 'video', '70200', 1),
        (12, '정화 · 요가 / 108배 & 싱잉볼', '요가/명상 공간 매트 위 전체 그룹 포토', '', 'photo', '2470', 0),
        (13, '정화 · 요가 / 108배 & 싱잉볼', '눈을 감고 사운드 힐링에 몰입한 개인별 포트레이트', '전원 확보', 'photo', '70200', 0),
        (14, '정화 · 요가 / 108배 & 싱잉볼', '싱잉볼과 스틱, 매트 위 편안하게 내려놓은 손 정물 컷', '', 'photo', '2470', 0),
        (15, '정화 · 요가 / 108배 & 싱잉볼', '108배 또는 요가 동작의 일체감 있는 움직임 풀샷', '9:16 마커 확인', 'video', '2470', 0),
        (16, '정화 · 요가 / 108배 & 싱잉볼', '싱잉볼 타격 순간의 손끝과 진동 클로즈업', '원음 수음', 'video', '70200', 1),
        (17, '정화 · 요가 / 108배 & 싱잉볼', '싱잉볼 소리가 울릴 때 참가자의 깊은 호흡과 평온한 표정', '', 'video', '70200', 0),
        (18, '정화 · 요가 / 108배 & 싱잉볼', '창가 빛, 흔들리는 나뭇잎, 또는 피어오르는 향 연기', '', 'video', '2470', 1),
        (19, '채움 · 다도 시퀀스', '다도 세팅이 완료된 테이블 전체 그룹 포토', '', 'photo', '2470', 0),
        (20, '채움 · 다도 시퀀스', '찻잔을 두 손으로 감싸 쥐고 향을 음미하는 클로즈업', '', 'photo', '70200', 0),
        (21, '채움 · 다도 시퀀스', '햇살 비치는 다구 세트와 피어오르는 찻물의 김 정물 컷', '', 'photo', '2470', 0),
        (22, '채움 · 다도 시퀀스', '다관에서 찻잔으로 맑은 찻물이 또르르 따르는 타이트 샷', 'ASMR', 'video', '70200', 0),
        (23, '채움 · 다도 시퀀스', '차를 마신 뒤 서로 눈을 맞추며 잔잔하게 미소 짓는 모습', '', 'video', '2470', 0),
        (24, '스토리텔링 · 개인 인터뷰', 'Q1. 이번 리트릿을 한 단어로 표현한다면?', '가장 먼저 떠오르는 장면은?', 'interview', '70200', 0),
        (25, '스토리텔링 · 개인 인터뷰', 'Q2. 해녀분들을 만났을 때 어떤 기분이 들었나요?', '', 'interview', '70200', 0),
        (26, '스토리텔링 · 개인 인터뷰', 'Q3. 싱잉볼과 다도 시간 중 언제 가장 평온했나요?', '', 'interview', '70200', 0),
        (27, '스토리텔링 · 개인 인터뷰', 'Q4. 이곳에 오길 망설이는 사람에게 해주고 싶은 말은?', '', 'interview', '70200', 0),
        (28, '스토리텔링 · 개인 인터뷰', 'Q5. 방금 말씀하신 감정을 짧은 한 문장으로 요약해 주실 수 있나요?', '', 'interview', '70200', 0),
    ]
    created = now_iso()
    conn.executemany('''INSERT INTO shoot_todos
        (sequence, section, title, detail, media_type, camera_tag, is_required, completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)''', [(*row, created, created) for row in rows])


class CompletionInput(BaseModel):
    completed: bool


app = FastAPI()
init_db()


@app.get('/api/health')
def health():
    return {'ok': True}


@app.get('/api/shoot-todos')
def list_shoot_todos():
    with get_db() as conn:
        rows = conn.execute('''SELECT * FROM shoot_todos
            ORDER BY completed ASC, sequence ASC''').fetchall()
    return [dict(row, completed=bool(row['completed']), is_required=bool(row['is_required'])) for row in rows]


@app.patch('/api/shoot-todos/{todo_id}/completion')
def update_completion(todo_id: int, payload: CompletionInput):
    with get_db() as conn:
        cursor = conn.execute('UPDATE shoot_todos SET completed=?, updated_at=? WHERE id=?',
                              (int(payload.completed), now_iso(), todo_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='작업을 찾을 수 없습니다.')
        row = conn.execute('SELECT * FROM shoot_todos WHERE id=?', (todo_id,)).fetchone()
    return dict(row, completed=bool(row['completed']), is_required=bool(row['is_required']))
