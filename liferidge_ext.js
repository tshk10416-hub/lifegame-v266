// ==========================================================
// liferidge_ext.js - ライフリッジ 拡張モジュール (2026-09 体験会フィードバック対応)
//   1. LRNet    : 収支の「最終増減値」表示と内訳・理由の補足
//   2. LRFx     : イベント適用時の効果音(Web Audio API)・画面端パーティクル・アイコン演出
//   3. RoomSync : ルーム同期（自動再接続・再リスン・送信キュー・リロード復帰）
// ※ game.js の後に読み込むこと（game.js のグローバル関数/変数を参照する）
// ==========================================================

// ----------------------------------------------------------
// 共通ヘルパー
// ----------------------------------------------------------
function lrEscapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function lrShowToast(message, kind) {
    let el = document.getElementById('lrToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'lrToast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
    }
    el.className = 'lr-toast lr-toast--' + (kind || 'info');
    el.textContent = message;
    // 再表示時にアニメーションをやり直す
    el.classList.remove('lr-toast--show');
    void el.offsetWidth;
    el.classList.add('lr-toast--show');
    clearTimeout(lrShowToast._timer);
    lrShowToast._timer = setTimeout(() => el.classList.remove('lr-toast--show'), 3500);
}

// ==========================================================
// 1. LRNet - 収支の最終増減値と理由
// ==========================================================
const LRNet = (() => {
    let ctx = null;

    function round1(v) {
        return Math.round((Number(v) || 0) * 10) / 10;
    }

    function fmtNum(v) {
        return round1(v).toLocaleString('ja-JP', { maximumFractionDigits: 1 });
    }

    // 符号付き表記。0 は「0」、正は「+」、負は「-」を1つだけ付ける（「+-30」を構造的に防ぐ）
    function formatSigned(v) {
        const r = round1(v);
        if (r === 0) return '0';
        return (r > 0 ? '+' : '-') + fmtNum(Math.abs(r));
    }

    function signOf(v) {
        const r = round1(v);
        return r > 0 ? 'plus' : (r < 0 ? 'minus' : 'zero');
    }

    // カード適用の開始（applyCardEffect の冒頭で呼ぶ）
    function begin(cardId, card) {
        ctx = { cardId: cardId, card: card, notes: [] };
    }

    // 理由メモを追加
    //   zeroOnly=true (既定) : 最終増減が0のときだけ表示する理由（例: 保険適用のため）
    //   zeroOnly=false       : 増減が0以外でも表示する内訳（例: 給付金と増税の差し引き）
    function note(reason, detail, zeroOnly) {
        if (!ctx) return;
        ctx.notes.push({ reason: reason || '', detail: detail || '', zeroOnly: zeroOnly !== false });
    }

    // 支出が保険などで全額補填され、相殺された場合の理由
    function offset(grossCost, reason) {
        const g = Math.abs(Number(grossCost) || 0);
        const detail = g > 0 ? `本来の支出 -${fmtNum(g)}万円 → 補償 +${fmtNum(g)}万円` : '';
        note(reason, detail, true);
    }

    function defaultZeroReason(card) {
        if (!card) return '';
        if (card.life_point || card.lifePointRequireFlag) return 'お金の増減はないイベントのため（ライフポイントのみ変化）';
        return 'このイベントによるお金の増減はありません';
    }

    // カード適用の終了。最終増減値と、表示すべき理由・内訳を返す
    function finish(oldAssets, newAssets) {
        const diff = round1(newAssets - oldAssets);
        const sign = signOf(diff);
        const c = ctx || { notes: [] };
        ctx = null;

        const visible = c.notes.filter(n => sign === 'zero' || !n.zeroOnly);
        let reason = visible.map(n => n.reason).filter(Boolean).join(' / ');
        const detail = visible.map(n => n.detail).filter(Boolean).join(' / ');
        if (sign === 'zero' && !reason) reason = defaultZeroReason(c.card);

        return { diff: diff, sign: sign, reason: reason, detail: detail, cardId: c.cardId || null, card: c.card || null };
    }

    // 結果表示 HTML
    //   opts.dark    : 暗い背景（ガイダンスの資産パネル）用の配色
    //   opts.compact : ソーシャルイベントの個別リザルト枠など狭い場所用
    function renderHtml(result, opts) {
        const o = opts || {};
        const sign = result.sign || signOf(result.diff);
        const cls = 'lr-net lr-net--' + sign + (o.dark ? ' lr-net--dark' : '') + (o.compact ? ' lr-net--compact' : '');
        let html = `<div class="${cls}">`;
        html += `<div class="lr-net__value">${lrEscapeHtml(formatSigned(result.diff))}<span class="lr-net__unit">万円</span></div>`;
        if (sign === 'zero') html += `<div class="lr-net__label">増減なし</div>`;
        if (result.reason) html += `<div class="lr-net__reason">${lrEscapeHtml(result.reason)}</div>`;
        if (result.detail) html += `<div class="lr-net__detail">${lrEscapeHtml(result.detail)}</div>`;
        html += `</div>`;
        return html;
    }

    return { begin, note, offset, finish, renderHtml, formatSigned, signOf, round1, fmtNum };
})();

// ==========================================================
// 2. LRFx - イベント演出（効果音 / パーティクル / アイコン）
//    既存の数値UI（画面中央のモーダル）を隠さないよう、
//    ・パーティクルは画面左右の端の帯だけに発生
//    ・画面の縁を光らせる（inset box-shadow）
//    ・左上に小さなアイコンバッジ
//    で表現する。すべて pointer-events:none で操作を妨げない。
// ==========================================================
const LRFx = (() => {
    const EVENT_TYPES = ['life_event', 'life_event_asset_change', 'social_event', 'social_event_asset_change'];
    const LS_MUTE = 'liferidgeSoundMuted';

    let muted = false;
    try { muted = localStorage.getItem(LS_MUTE) === '1'; } catch (e) { muted = false; }

    const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // ------------------------------
    // 2-1. Web Audio API 効果音
    // ------------------------------
    let audioCtx = null;
    let master = null;

    function ensureAudio() {
        if (audioCtx) return audioCtx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            audioCtx = new AC();
            master = audioCtx.createGain();
            master.gain.value = 0.35;
            master.connect(audioCtx.destination);
        } catch (e) {
            console.warn('AudioContext の生成に失敗:', e);
            audioCtx = null;
        }
        return audioCtx;
    }

    // iOS / Chrome の自動再生制限対策: 最初のユーザー操作で AudioContext を有効化
    const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown'];
    function unlockAudio() {
        const ac = ensureAudio();
        if (!ac) return;
        if (ac.state !== 'running') {
            ac.resume().catch(() => { /* noop */ });
        }
        try {
            // 無音バッファを1回再生してアンロック（iOS Safari 対策）
            const buf = ac.createBuffer(1, 1, 22050);
            const src = ac.createBufferSource();
            src.buffer = buf;
            src.connect(ac.destination);
            src.start(0);
        } catch (e) { /* noop */ }
        if (ac.state === 'running') {
            UNLOCK_EVENTS.forEach(ev => document.removeEventListener(ev, unlockAudio, true));
        }
    }
    UNLOCK_EVENTS.forEach(ev => document.addEventListener(ev, unlockAudio, true));

    // バックグラウンド復帰後は AudioContext が suspended / interrupted になるため再度アンロック待ちにする
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && audioCtx && audioCtx.state !== 'running') {
            UNLOCK_EVENTS.forEach(ev => document.addEventListener(ev, unlockAudio, true));
        }
    });

    function tone(freq, t0, dur, opts) {
        const o = opts || {};
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);

        const peak = (o.gain != null) ? o.gain : 0.5;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack || 0.01));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        if (o.lowpass) {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = o.lowpass;
            osc.connect(filter);
            filter.connect(gain);
        } else {
            osc.connect(gain);
        }
        gain.connect(master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
    }

    const SOUNDS = {
        // プラス: コインの「チャリン」＋上昇アルペジオ（明るい長調）
        plus(t) {
            tone(1318.5, t, 0.12, { type: 'square', gain: 0.16 });
            tone(1975.5, t + 0.07, 0.35, { type: 'square', gain: 0.14 });
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                tone(f, t + 0.18 + i * 0.07, 0.3, { type: 'triangle', gain: 0.35 });
            });
        },
        // マイナス: 下降する「ヒュ～ン」＋低音（しょんぼり感）
        minus(t) {
            tone(392, t, 0.3, { type: 'sawtooth', gain: 0.22, slideTo: 330, lowpass: 1200 });
            tone(311.1, t + 0.24, 0.55, { type: 'sawtooth', gain: 0.22, slideTo: 196, lowpass: 900 });
            tone(98, t, 0.6, { type: 'sine', gain: 0.35, slideTo: 65 });
        },
        // ゼロ: 同じ高さの「ポン・ポン」（プラマイゼロ＝釣り合い）
        zero(t) {
            tone(880, t, 0.14, { type: 'sine', gain: 0.3 });
            tone(880, t + 0.18, 0.22, { type: 'sine', gain: 0.3 });
            tone(440, t, 0.45, { type: 'triangle', gain: 0.1 });
        }
    };

    function playSound(sign) {
        if (muted) return;
        const ac = ensureAudio();
        if (!ac || !SOUNDS[sign]) return;
        const start = () => {
            try { SOUNDS[sign](ac.currentTime + 0.02); } catch (e) { console.warn('効果音の再生に失敗:', e); }
        };
        if (ac.state === 'running') start();
        else ac.resume().then(start).catch(() => { /* ユーザー操作前は鳴らせない（仕様） */ });
    }

    // ------------------------------
    // 2-2. パーティクル（画面左右の帯のみ）
    // ------------------------------
    let canvas = null;
    let c2d = null;
    let dpr = 1;
    let particles = [];
    let rafId = null;
    let lastFrame = 0;

    function ensureCanvas() {
        if (canvas) return;
        canvas = document.createElement('canvas');
        canvas.id = 'lrFxCanvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        if (!canvas) return;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        c2d = canvas.getContext('2d');
        c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // 画面中央の数値UIを避けるため、左右の端の帯だけに発生させる
    function sideX() {
        const w = window.innerWidth;
        const band = Math.max(36, w * (w < 600 ? 0.13 : 0.17));
        return Math.random() < 0.5 ? Math.random() * band : w - Math.random() * band;
    }

    function rand(min, max) { return min + Math.random() * (max - min); }

    function spawn(sign) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (sign === 'plus') {
            // 金色のコインが下から舞い上がる
            for (let i = 0; i < 26; i++) {
                particles.push({
                    kind: 'coin', x: sideX(), y: h + rand(10, 80),
                    vx: rand(-0.6, 0.6), vy: -rand(5, 8.5), g: 0.1,
                    r: rand(8, 13), phase: rand(0, Math.PI * 2), spin: rand(0.12, 0.25),
                    life: 0, maxLife: rand(80, 120), delay: i * 2,
                    fill: '#F6C744', stroke: '#B7791F', glyph: '¥'
                });
            }
            for (let i = 0; i < 18; i++) {
                particles.push({
                    kind: 'sparkle', x: sideX(), y: rand(h * 0.2, h * 0.9),
                    r: rand(2, 4.5), life: 0, maxLife: rand(40, 70), delay: rand(5, 40),
                    color: '#FFF3B0'
                });
            }
        } else if (sign === 'minus') {
            // くすんだコインが上からこぼれ落ちて消えていく
            for (let i = 0; i < 22; i++) {
                particles.push({
                    kind: 'coin', x: sideX(), y: -rand(10, 60),
                    vx: rand(-0.4, 0.4), vy: rand(1.5, 3), g: 0.12,
                    r: rand(8, 12), phase: rand(0, Math.PI * 2), spin: rand(0.05, 0.12),
                    life: 0, maxLife: rand(70, 100), delay: i * 2.5,
                    fill: '#CBD5E0', stroke: '#E53E3E', glyph: '¥'
                });
            }
        } else {
            // ゼロ: 四隅から静かな波紋（釣り合い・変化なし）
            const corners = [[0, 0], [w, 0], [0, h], [w, h]];
            corners.forEach(([cx, cy]) => {
                for (let k = 0; k < 3; k++) {
                    particles.push({
                        kind: 'ring', x: cx, y: cy, r: 0, maxR: Math.min(w, h) * 0.28,
                        life: 0, maxLife: 70, delay: k * 14, color: '#90A4C0'
                    });
                }
            });
        }
    }

    function drawCoin(p, alpha) {
        const squash = Math.abs(Math.cos(p.phase)); // コインの回転（横幅が伸び縮み）
        c2d.save();
        c2d.globalAlpha = alpha;
        c2d.translate(p.x, p.y);
        c2d.scale(Math.max(0.15, squash), 1);
        c2d.beginPath();
        c2d.arc(0, 0, p.r, 0, Math.PI * 2);
        c2d.fillStyle = p.fill;
        c2d.fill();
        c2d.lineWidth = 2;
        c2d.strokeStyle = p.stroke;
        c2d.stroke();
        if (squash > 0.45) {
            c2d.fillStyle = p.stroke;
            c2d.font = `bold ${Math.round(p.r * 1.2)}px sans-serif`;
            c2d.textAlign = 'center';
            c2d.textBaseline = 'middle';
            c2d.fillText(p.glyph, 0, 1);
        }
        c2d.restore();
    }

    function drawSparkle(p, alpha) {
        c2d.save();
        c2d.globalAlpha = alpha;
        c2d.translate(p.x, p.y);
        c2d.fillStyle = p.color;
        c2d.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = (Math.PI / 2) * i;
            c2d.lineTo(Math.cos(a) * p.r * 2.2, Math.sin(a) * p.r * 2.2);
            c2d.lineTo(Math.cos(a + Math.PI / 4) * p.r * 0.6, Math.sin(a + Math.PI / 4) * p.r * 0.6);
        }
        c2d.closePath();
        c2d.fill();
        c2d.restore();
    }

    function drawRing(p, alpha) {
        c2d.save();
        c2d.globalAlpha = alpha;
        c2d.lineWidth = 3;
        c2d.strokeStyle = p.color;
        c2d.beginPath();
        c2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c2d.stroke();
        c2d.restore();
    }

    function frame(ts) {
        const dt = lastFrame ? Math.min(3, (ts - lastFrame) / (1000 / 60)) : 1;
        lastFrame = ts;
        c2d.clearRect(0, 0, window.innerWidth, window.innerHeight);

        particles = particles.filter(p => {
            if (p.delay > 0) { p.delay -= dt; return true; }
            p.life += dt;
            const t = p.life / p.maxLife;
            if (t >= 1) return false;

            if (p.kind === 'coin') {
                p.vy += p.g * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.phase += p.spin * dt;
                drawCoin(p, t < 0.7 ? 1 : (1 - t) / 0.3);
            } else if (p.kind === 'sparkle') {
                drawSparkle(p, Math.sin(t * Math.PI));
            } else if (p.kind === 'ring') {
                p.r = p.maxR * t;
                drawRing(p, 0.7 * (1 - t));
            }
            return true;
        });

        if (particles.length > 0) {
            rafId = requestAnimationFrame(frame);
        } else {
            rafId = null;
            lastFrame = 0;
            c2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    function runParticles(sign) {
        if (reduceMotion) return;
        ensureCanvas();
        spawn(sign);
        if (!rafId) rafId = requestAnimationFrame(frame);
    }

    // ------------------------------
    // 2-3. 画面の縁の発光 & 左上アイコンバッジ
    // ------------------------------
    const BADGE = {
        plus: { icon: 'fa-coins', text: 'お金が増えた！' },
        minus: { icon: 'fa-arrow-down', text: 'お金が減った…' },
        zero: { icon: 'fa-scale-balanced', text: '増減なし' }
    };

    function flashEdge(sign) {
        let edge = document.getElementById('lrFxEdge');
        if (!edge) {
            edge = document.createElement('div');
            edge.id = 'lrFxEdge';
            edge.setAttribute('aria-hidden', 'true');
            document.body.appendChild(edge);
        }
        edge.className = '';
        void edge.offsetWidth; // アニメーションを再スタート
        edge.className = 'lr-edge lr-edge--' + sign;
    }

    function showBadge(sign, diff) {
        let badge = document.getElementById('lrFxBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'lrFxBadge';
            badge.setAttribute('aria-hidden', 'true');
            document.body.appendChild(badge);
        }
        const b = BADGE[sign];
        const amount = (typeof diff === 'number') ? `<span class="lr-badge__amount">${lrEscapeHtml(LRNet.formatSigned(diff))}万</span>` : '';
        badge.innerHTML = `<i class="fas ${b.icon}"></i><span class="lr-badge__text">${b.text}</span>${amount}`;
        badge.className = '';
        void badge.offsetWidth;
        badge.className = 'lr-badge lr-badge--' + sign + ' lr-badge--show';
        clearTimeout(showBadge._timer);
        showBadge._timer = setTimeout(() => badge.classList.remove('lr-badge--show'), 2600);
    }

    function vibrate(sign) {
        if (!navigator.vibrate) return;
        // ユーザー操作前の vibrate はブラウザにブロックされ、コンソールエラーになるため呼ばない
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
        const pattern = { plus: [30, 40, 30], minus: [140], zero: [20, 60, 20] }[sign];
        try { navigator.vibrate(pattern); } catch (e) { /* noop */ }
    }

    // ------------------------------
    // 2-4. ミュート切替ボタン（画面左下）
    // ------------------------------
    function ensureMuteButton() {
        if (document.getElementById('lrMuteBtn')) return;
        const btn = document.createElement('button');
        btn.id = 'lrMuteBtn';
        btn.type = 'button';
        btn.className = 'lr-mute-btn';
        btn.addEventListener('click', () => setMuted(!muted));
        document.body.appendChild(btn);
        renderMuteButton();
    }

    function renderMuteButton() {
        const btn = document.getElementById('lrMuteBtn');
        if (!btn) return;
        btn.innerHTML = muted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-high"></i>';
        btn.setAttribute('aria-label', muted ? '効果音をオンにする' : '効果音をオフにする');
        btn.title = muted ? '効果音: オフ' : '効果音: オン';
    }

    function setMuted(v) {
        muted = !!v;
        try { localStorage.setItem(LS_MUTE, muted ? '1' : '0'); } catch (e) { /* noop */ }
        renderMuteButton();
        if (!muted) playSound('zero');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureMuteButton);
    } else {
        ensureMuteButton();
    }

    // ------------------------------
    // 公開API
    // ------------------------------
    function isEventCard(card) {
        return !!(card && EVENT_TYPES.includes(card.type));
    }

    // sign: 'plus' | 'minus' | 'zero'
    function play(sign, diff) {
        if (!BADGE[sign]) return;
        try {
            playSound(sign);
            flashEdge(sign);
            showBadge(sign, diff);
            runParticles(sign);
            vibrate(sign);
        } catch (e) {
            // 演出の失敗でゲーム進行を止めない
            console.warn('イベント演出エラー:', e);
        }
    }

    return { play, isEventCard, setMuted, isMuted: () => muted };
})();

// ==========================================================
// 3. RoomSync - ソーシャルイベントのルーム同期
//
// 【旧方式の問題点】
//   (1) ルームIDとリスナーが proceedToFamilyMake() でしか設定されず、localStorage にも
//       保存されていなかった。スマホOSがバックグラウンドのタブを破棄→復帰時に自動再読み込み
//       すると、ゲーム状態は復元されるが currentRoomId=null・リスナー無しになり、
//       「受信しない」「送信しても共有されない」の両方が同時に起きる。
//   (2) 単一ノード(globalEvent / currentSocialEvent)を set() で上書きし 'value' で監視していたため、
//       切断中に複数イベントが発生すると最後の1件しか届かない。
//   (3) 重複判定を各端末の Date.now()（端末時計）で比較していたため、端末の時計がずれていると
//       その端末のイベントが「過去のもの」と判定されて他端末で無視される。
//   (4) iOS/Android のバックグラウンド移行で WebSocket が半開き(ゾンビ)状態になり、
//       .info/connected が true のまま実際には通信できない状態が続くことがある。
//
// 【新方式】
//   ・rooms/{roomId}/eventLog に push() で追記（上書きしない）→ child_added で1件ずつ受信
//   ・並び順・カーソルはサーバー時刻(ServerValue.TIMESTAMP)を使用（端末時計に依存しない）
//   ・処理済みキーを localStorage に保存して重複適用を防止、リロード後はカーソル位置から再リスン
//   ・未送信イベントは送信キュー(outbox)に保存し、再接続時・リロード後に同じキーで再送（冪等）
//   ・.info/connected 監視 / 画面復帰 / online イベント / ハートビートで切断を検知し、
//     goOffline()→goOnline() で強制再接続してリスナーを張り直す
// ==========================================================
const RoomSync = (() => {
    const LS_KEY = 'liferidgeSync';
    const MAX_PROCESSED = 300;
    const RESUME_MARGIN_MS = 5 * 60 * 1000;   // 再リスン時にさかのぼる余裕（重複は処理済みキーで除外）
    const HEARTBEAT_MS = 20000;               // 生存確認の間隔
    const HEARTBEAT_TIMEOUT_MS = 10000;       // 生存確認の応答待ち上限
    const SEND_TIMEOUT_MS = 10000;            // 送信の応答待ち上限
    const HIDDEN_RECONNECT_MS = 5000;         // これ以上バックグラウンドにいたら復帰時に強制再接続
    const GRACE_MIN_MS = 8000;                // 切断検知後、強制再接続するまでの待ち時間（初期値）
    const GRACE_MAX_MS = 60000;

    let roomId = null;
    let state = null;           // { roomId, cursorTs, needsBaseline, processed:[], outbox:[] }
    let query = null;
    let childHandler = null;
    let attachSeq = 0;
    let connected = false;
    let everConnected = false;
    let status = 'idle';
    let statusDetail = '';
    let graceTimer = null;
    let graceDelay = GRACE_MIN_MS;
    let heartbeatTimer = null;
    let retryTimer = null;
    let retryDelay = 1000;
    let lastForceAt = 0;
    let hiddenAt = 0;
    let lifecycleBound = false;
    let connBound = false;
    const inFlight = {};        // key -> true（送信中）

    // ------------------------------
    // 永続化
    // ------------------------------
    function loadState() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function persist() {
        if (!state) return;
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[RoomSync] 同期状態の保存に失敗:', e);
        }
    }

    function logPath() {
        return 'rooms/' + roomId + '/eventLog';
    }

    function getMyId() {
        if (!gameState.myPlayerId) {
            gameState.myPlayerId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            if (typeof saveGameState === 'function') saveGameState();
        }
        return gameState.myPlayerId;
    }

    function isProcessed(key) {
        return state.processed.indexOf(key) !== -1;
    }

    function markProcessed(key) {
        if (isProcessed(key)) return;
        state.processed.push(key);
        if (state.processed.length > MAX_PROCESSED) {
            state.processed = state.processed.slice(-MAX_PROCESSED);
        }
    }

    // ------------------------------
    // ステータス表示（画面右上の小さなピル）
    // ------------------------------
    const STATUS_VIEW = {
        idle: { icon: 'fa-circle', text: '' },
        online: { icon: 'fa-circle', text: '同期中' },
        pending: { icon: 'fa-arrow-up', text: '送信待ち' },
        reconnecting: { icon: 'fa-rotate', text: '再接続中…' },
        offline: { icon: 'fa-circle-xmark', text: 'オフライン' },
        error: { icon: 'fa-triangle-exclamation', text: '同期エラー' }
    };

    function ensureStatusPill() {
        let pill = document.getElementById('lrSyncPill');
        if (pill) return pill;
        pill = document.createElement('button');
        pill.id = 'lrSyncPill';
        pill.type = 'button';
        pill.addEventListener('click', () => {
            if (!roomId) return;
            lrShowToast('ルームへ再接続しています…', 'info');
            lastForceAt = 0;
            forceReconnect('手動再同期');
        });
        document.body.appendChild(pill);
        return pill;
    }

    function setStatus(next, detail) {
        status = next;
        statusDetail = detail || '';
        renderStatus();
    }

    function refreshStatus() {
        if (!roomId) return setStatus('idle');
        if (!connected) return setStatus(navigator.onLine === false ? 'offline' : 'reconnecting');
        if (state && state.outbox.length > 0) return setStatus('pending', state.outbox.length + '件');
        return setStatus('online');
    }

    function renderStatus() {
        const pill = ensureStatusPill();
        if (!roomId || status === 'idle') {
            pill.style.display = 'none';
            return;
        }
        const v = STATUS_VIEW[status] || STATUS_VIEW.online;
        const spin = status === 'reconnecting' ? ' fa-spin' : '';
        pill.style.display = 'inline-flex';
        pill.className = 'lr-sync-pill lr-sync-pill--' + status;
        pill.innerHTML = `<i class="fas ${v.icon}${spin}"></i><span>${lrEscapeHtml(v.text)}${statusDetail ? ' ' + lrEscapeHtml(statusDetail) : ''}</span>`;
        pill.title = `ルーム: ${roomId}（タップで再同期）`;
        pill.setAttribute('aria-label', `ルーム同期状態: ${v.text}${statusDetail ? ' ' + statusDetail : ''}。タップで再同期`);
    }

    // ------------------------------
    // 在席(presence)
    // ------------------------------
    function presenceRef() {
        return database.ref('rooms/' + roomId + '/presence/' + getMyId());
    }

    function writePresence() {
        if (!roomId) return;
        const ref = presenceRef();
        const TS = firebase.database.ServerValue.TIMESTAMP;
        ref.onDisconnect().update({ online: false, lastSeen: TS }).catch(e => console.warn('[RoomSync] onDisconnect 設定失敗:', e));
        ref.update({ online: true, lastSeen: TS, joinedAt: (state && state.joinedAt) || Date.now() })
            .catch(e => console.warn('[RoomSync] presence 書き込み失敗:', e));
    }

    // ------------------------------
    // 受信（再リスン可能な child_added リスナー）
    // ------------------------------
    function detach() {
        if (query && childHandler) {
            try { query.off('child_added', childHandler); } catch (e) { /* noop */ }
        }
        query = null;
        childHandler = null;
    }

    function scheduleRetry(reason) {
        clearTimeout(retryTimer);
        const wait = retryDelay;
        retryDelay = Math.min(retryDelay * 2, 30000);
        console.warn(`[RoomSync] ${Math.round(wait / 1000)}秒後に再リスンします (${reason})`);
        retryTimer = setTimeout(() => attach(), wait);
    }

    function attach() {
        if (!database || !roomId || !state) return;
        detach();
        clearTimeout(retryTimer);
        const seq = ++attachSeq;
        const base = database.ref(logPath());

        // 初回参加時: 既存ログの最新サーバー時刻を基準点にする（参加前の過去イベントは適用しない）
        const prepare = state.needsBaseline
            ? base.orderByChild('ts').limitToLast(1).once('value').then(snap => {
                if (seq !== attachSeq) return;
                let baseline = 0;
                snap.forEach(child => {
                    const v = child.val();
                    markProcessed(child.key);
                    if (v && typeof v.ts === 'number') baseline = v.ts;
                });
                state.cursorTs = baseline;
                state.needsBaseline = false;
                persist();
            })
            : Promise.resolve();

        prepare.then(() => {
            if (seq !== attachSeq) return;
            const from = Math.max(0, (state.cursorTs || 0) - RESUME_MARGIN_MS);
            const q = base.orderByChild('ts').startAt(from);
            const handler = snap => handleChild(snap);
            q.on('child_added', handler, err => {
                // 権限エラーなどでリスナーがキャンセルされた → バックオフ付きで再リスン
                console.error('[RoomSync] リスナーがキャンセルされました:', err);
                if (seq !== attachSeq) return;
                query = null;
                childHandler = null;
                setStatus('error', '受信');
                lrShowToast('イベント受信が中断されました。自動で再接続します。', 'error');
                scheduleRetry(err && err.code ? err.code : 'cancel');
            });
            query = q;
            childHandler = handler;
            retryDelay = 1000;
        }).catch(err => {
            if (seq !== attachSeq) return;
            console.error('[RoomSync] 初期化に失敗:', err);
            setStatus('error', '初期化');
            scheduleRetry(err && err.code ? err.code : 'baseline');
        });
    }

    function handleChild(snap) {
        const key = snap.key;
        const data = snap.val();
        if (!data || !state) return;

        if (typeof data.ts === 'number' && data.ts > (state.cursorTs || 0)) {
            state.cursorTs = data.ts;
        }

        if (isProcessed(key)) {
            persist();
            return;
        }
        markProcessed(key);
        persist();

        // 自分が送ったイベントは送信時に適用済み
        if (data.senderId === getMyId()) return;

        if (typeof CARD_DATA === 'undefined' || !CARD_DATA[data.cardId]) {
            console.warn('[RoomSync] 不明なカードIDを受信:', data.cardId);
            return;
        }

        try {
            applyCardEffect(data.cardId, true);
        } catch (e) {
            console.error('[RoomSync] 受信イベントの適用に失敗:', e);
            lrShowToast('共有イベントの反映中にエラーが発生しました', 'error');
        }
    }

    // ------------------------------
    // 送信（送信キュー付き・同じキーでの再送は冪等）
    // ------------------------------
    function send(item) {
        if (!database || !roomId || inFlight[item.key]) return;
        inFlight[item.key] = true;
        let settled = false;

        const timer = setTimeout(() => {
            if (settled) return;
            // 応答が返らない = 半開き接続の可能性が高い
            setStatus('pending', state.outbox.length + '件');
            forceReconnect('送信タイムアウト');
        }, SEND_TIMEOUT_MS);

        database.ref(logPath() + '/' + item.key).set(item.payload)
            .then(() => {
                settled = true;
                clearTimeout(timer);
                delete inFlight[item.key];
                state.outbox = state.outbox.filter(o => o.key !== item.key);
                persist();
                refreshStatus();
            })
            .catch(err => {
                settled = true;
                clearTimeout(timer);
                delete inFlight[item.key];
                console.error('[RoomSync] イベント送信に失敗:', err);
                setStatus('error', '送信');
                lrShowToast('イベントの共有に失敗しました。再接続後に自動で再送します。', 'error');
            });
    }

    function flushOutbox() {
        if (!state || !state.outbox.length) return;
        state.outbox.slice().forEach(item => send(item));
    }

    function publish(cardId, kind) {
        if (!database || !roomId || !state) return;
        const ref = database.ref(logPath()).push();
        const payload = {
            cardId: cardId,
            kind: kind || '',
            senderId: getMyId(),
            ts: firebase.database.ServerValue.TIMESTAMP,
            clientTs: Date.now()
        };
        markProcessed(ref.key);
        const item = { key: ref.key, payload: payload };
        state.outbox.push(item);
        persist();
        refreshStatus();
        send(item);
    }

    // ------------------------------
    // 接続監視・強制再接続
    // ------------------------------
    function forceReconnect(reason) {
        if (!database || !roomId) return;
        const now = Date.now();
        if (now - lastForceAt < 3000) return;
        lastForceAt = now;
        console.warn('[RoomSync] 強制再接続:', reason);
        setStatus('reconnecting');
        Object.keys(inFlight).forEach(k => delete inFlight[k]);
        try { database.goOffline(); } catch (e) { /* noop */ }
        setTimeout(() => {
            try { database.goOnline(); } catch (e) { /* noop */ }
            attach();
        }, 400);
    }

    function bindConnection() {
        if (connBound) return;
        connBound = true;
        database.ref('.info/connected').on('value', snap => {
            if (snap.val() === true) {
                const isReconnect = everConnected && !connected;
                connected = true;
                everConnected = true;
                clearTimeout(graceTimer);
                graceTimer = null;
                graceDelay = GRACE_MIN_MS;
                if (!roomId) return;
                writePresence();
                flushOutbox();
                if (isReconnect) {
                    // 念のためリスナーを張り直し、切断中に追加されたイベントを取りこぼしなく受信する
                    attach();
                    lrShowToast('通信が復旧しました。イベントを再同期しました。', 'success');
                }
                refreshStatus();
            } else {
                connected = false;
                if (!roomId) return;
                refreshStatus();
                clearTimeout(graceTimer);
                graceTimer = setTimeout(() => {
                    if (!connected && navigator.onLine !== false) {
                        forceReconnect('接続待ちタイムアウト');
                        graceDelay = Math.min(graceDelay * 2, GRACE_MAX_MS);
                    }
                }, graceDelay);
            }
        });
    }

    function bindLifecycle() {
        if (lifecycleBound) return;
        lifecycleBound = true;

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                hiddenAt = Date.now();
                if (typeof saveGameState === 'function') saveGameState();
                return;
            }
            if (!roomId) return;
            const away = hiddenAt ? Date.now() - hiddenAt : 0;
            hiddenAt = 0;
            if (away > HIDDEN_RECONNECT_MS) {
                forceReconnect('バックグラウンドから復帰 (' + Math.round(away / 1000) + '秒)');
            }
        });

        // bfcache（戻る/進むキャッシュ）からの復帰
        window.addEventListener('pageshow', e => {
            if (e.persisted && roomId) forceReconnect('ページキャッシュから復帰');
        });

        window.addEventListener('online', () => {
            if (roomId) forceReconnect('ネットワーク復帰');
        });

        window.addEventListener('offline', () => {
            if (roomId) setStatus('offline');
        });
    }

    function startHeartbeat() {
        clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
            if (!roomId || !connected || document.visibilityState !== 'visible') return;
            let answered = false;
            const timer = setTimeout(() => {
                if (!answered) forceReconnect('ハートビート応答なし');
            }, HEARTBEAT_TIMEOUT_MS);
            presenceRef().update({ lastSeen: firebase.database.ServerValue.TIMESTAMP })
                .then(() => { answered = true; clearTimeout(timer); })
                .catch(err => {
                    answered = true;
                    clearTimeout(timer);
                    console.warn('[RoomSync] ハートビート失敗:', err);
                });
        }, HEARTBEAT_MS);
    }

    // ------------------------------
    // 公開API
    // ------------------------------
    // ルーム参加（新規）: proceedToFamilyMake() から呼ぶ
    // ルーム復帰（リロード後）: resume() から呼ぶ
    function connect(id, opts) {
        const o = opts || {};
        if (!database || !id) return false;

        const saved = loadState();
        if (o.resume && saved && saved.roomId === id) {
            state = saved;
            state.processed = state.processed || [];
            state.outbox = state.outbox || [];
        } else {
            state = { roomId: id, cursorTs: 0, needsBaseline: true, processed: [], outbox: [], joinedAt: Date.now() };
        }

        roomId = id;
        currentRoomId = id; // game.js 側のグローバル変数も復元
        persist();

        bindConnection();
        bindLifecycle();
        startHeartbeat();
        refreshStatus();
        attach();
        flushOutbox();
        return true;
    }

    // ページ再読み込み後に、保存されているルームへ自動復帰する
    function resume() {
        const saved = loadState();
        if (!saved || !saved.roomId || !database) return false;
        const ok = connect(saved.roomId, { resume: true });
        if (ok) {
            const input = document.getElementById('roomIdInput');
            if (input && !input.value) input.value = saved.roomId;
            lrShowToast(`ルーム「${saved.roomId}」に再接続しました`, 'success');
        }
        return ok;
    }

    // ルーム離脱（ゲーム終了時）
    function disconnect() {
        detach();
        attachSeq++;
        clearTimeout(retryTimer);
        clearTimeout(graceTimer);
        clearInterval(heartbeatTimer);
        if (database && roomId) {
            try {
                const ref = presenceRef();
                ref.onDisconnect().cancel();
                ref.remove();
            } catch (e) { /* noop */ }
        }
        roomId = null;
        state = null;
        currentRoomId = null;
        try { localStorage.removeItem(LS_KEY); } catch (e) { /* noop */ }
        setStatus('idle');
    }

    return {
        connect,
        resume,
        disconnect,
        publish,
        forceReconnect: reason => { lastForceAt = 0; forceReconnect(reason || '外部要求'); },
        getStatus: () => ({ roomId, status, connected, pending: state ? state.outbox.length : 0, cursorTs: state ? state.cursorTs : 0 })
    };
})();
