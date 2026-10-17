// ==========================================================
// theme_f.js - F案デザイン(空とワールドマップ)の表示専用スクリプト
//   ・現在の年代に合わせて島マップを描画(現在の島だけ大きく表示)
//   ・イベントログの最新1件を吹き出しに表示
//   ・ライフプラン詳細/イベントログのシート開閉
// ※ ゲームの状態は読むだけで、一切変更しない
// ==========================================================
(function () {
    'use strict';

    var STAGES = ['30代', '40代', '50代', '60代', 'セカンドライフ'];
    var INK = '#2B1B5A';
    var TILE = ['#FF4F8B', '#FFC531', '#5FD1FF', '#7B5CFF'];

    // #current-age の表示(30代/40代/50代/60-64歳/65歳～)から島の番号を求める
    function stageIndex() {
        var el = document.getElementById('current-age');
        var t = el ? el.textContent : '';
        if (t.indexOf('65') >= 0 || t.indexOf('70') >= 0) return 4;
        if (t.indexOf('60') >= 0) return 3;
        if (t.indexOf('50') >= 0) return 2;
        if (t.indexOf('40') >= 0) return 1;
        return 0;
    }

    function island(x, y, w, top, stroke) {
        var ry = w / 5;
        return '<ellipse cx="' + x + '" cy="' + (y + ry * 0.62) + '" rx="' + w / 2 + '" ry="' + ry + '" fill="#8B5E3C"/>' +
            '<ellipse cx="' + x + '" cy="' + (y + ry * 0.33) + '" rx="' + w / 2 + '" ry="' + ry + '" fill="#4FA83A"/>' +
            '<ellipse cx="' + x + '" cy="' + y + '" rx="' + w / 2 + '" ry="' + ry + '" fill="' + top + '" stroke="' + INK + '" stroke-width="' + stroke + '"/>';
    }

    function cloud(x, y, w) {
        return '<g fill="#fff" opacity=".9"><ellipse cx="' + x + '" cy="' + y + '" rx="' + w / 2 + '" ry="' + w / 6 + '"/>' +
            '<circle cx="' + (x - w / 8) + '" cy="' + (y - w / 8) + '" r="' + w / 5 + '"/>' +
            '<circle cx="' + (x + w / 7) + '" cy="' + (y - w / 12) + '" r="' + w / 7 + '"/></g>';
    }

    function piece(x, y, color) {
        return '<g transform="translate(' + x + ' ' + y + ')"><ellipse cy="5" rx="10" ry="4" fill="rgba(0,0,0,.3)"/>' +
            '<path d="M-9 3 L-6 -17 A7 7 0 0 1 6 -17 L9 3Z" fill="' + color + '" stroke="' + INK + '" stroke-width="2.5"/>' +
            '<circle cy="-23" r="8" fill="' + color + '" stroke="' + INK + '" stroke-width="2.5"/>' +
            '<circle cx="-3" cy="-26" r="2.5" fill="#fff"/></g>';
    }

    function label(x, y, text, done) {
        var w = text.length > 3 ? 82 : 44;
        return '<g transform="translate(' + x + ' ' + y + ')"><rect x="' + (-w / 2) + '" y="-11" width="' + w + '" height="21" rx="10.5" fill="' + (done ? '#E7E2F7' : '#fff') + '" stroke="' + INK + '" stroke-width="2"/>' +
            '<text y="4.5" text-anchor="middle" font-family="RocknRoll One, sans-serif" font-size="11" fill="' + (done ? '#8A80BF' : INK) + '">' + (done ? '✔' : '') + text + '</text></g>';
    }

    // viewBox 375×250 に、過去の島(小)→現在の島(大)→これからの島(小)を左から並べる
    function drawMap() {
        var svg = document.getElementById('lfMap');
        if (!svg) return;
        var cur = stageIndex();
        var SMALL = 40, BIG = 196, x = 20, h = '';
        var pos = [];
        for (var i = 0; i < STAGES.length; i++) {
            if (i === cur) { pos.push({ x: x + BIG / 2 - 14, y: 168, big: true }); x += BIG - 4; }
            else {
                // 未来の島は右上がり、過去の島は低め
                var y = i < cur ? 176 - i * 6 : 150 - (i - cur) * 24;
                pos.push({ x: x + SMALL / 2 - 14, y: y, big: false }); x += SMALL + 2;
            }
        }
        h += cloud(330, 36, 76) + cloud(40, 60, 56) + cloud(300, 226, 60);
        // 道
        var road = pos.map(function (p) { return p.x + ',' + (p.big ? p.y + 4 : p.y); }).join(' ');
        pos.forEach(function (p, i) {
            if (!p.big) h += island(p.x, p.y, 44, i < cur ? '#B9D9A8' : '#C6EDB0', 2.5);
        });
        var b = pos[cur];
        h += island(b.x, b.y, BIG, '#7ED957', 3);
        h += '<polyline points="' + road + '" fill="none" stroke="' + INK + '" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>' +
             '<polyline points="' + road + '" fill="none" stroke="#FFF3D6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
        // 現在の島のマスと飾り
        [-70, -30, 10, 50].forEach(function (dx, k) {
            var tx = b.x + dx, ty = b.y + 6 - Math.abs(dx) * 0.05;
            h += '<ellipse cx="' + tx + '" cy="' + (ty + 3) + '" rx="13" ry="8" fill="' + INK + '"/>' +
                 '<ellipse cx="' + tx + '" cy="' + ty + '" rx="13" ry="8" fill="' + TILE[k] + '" stroke="' + INK + '" stroke-width="2"/>';
        });
        h += '<g transform="translate(' + (b.x - 66) + ' ' + (b.y - 30) + ')"><rect x="-15" y="-3" width="30" height="22" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>' +
             '<path d="M-21 -1 L0 -19 L21 -1Z" fill="#FF4F8B" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
             '<rect x="-5" y="7" width="10" height="12" fill="#7B5CFF" stroke="' + INK + '" stroke-width="2"/></g>' +
             '<g transform="translate(' + (b.x + 66) + ' ' + (b.y - 36) + ')"><rect x="-2" y="0" width="4" height="12" fill="#8B5E3C"/><circle r="12" fill="#5CC463" stroke="' + INK + '" stroke-width="2.5"/></g>';
        // 旗(いまここ)
        var fw = STAGES[cur].length > 3 ? 112 : 72;
        h += '<g transform="translate(' + (b.x - 14) + ' ' + (b.y - 16) + ')"><rect x="-2" y="-62" width="4" height="62" fill="' + INK + '"/>' +
             '<path d="M2 -62 L' + fw + ' -62 L' + (fw - 10) + ' -49 L' + fw + ' -36 L2 -36Z" fill="#FF4F8B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
             '<text x="' + (fw / 2) + '" y="-43" text-anchor="middle" font-family="RocknRoll One, sans-serif" font-size="15" fill="#fff">' + STAGES[cur] + '</text>' +
             '<rect x="4" y="-84" width="62" height="18" rx="9" fill="' + INK + '"/>' +
             '<text x="35" y="-71" text-anchor="middle" font-family="M PLUS Rounded 1c, sans-serif" font-weight="900" font-size="10.5" fill="#FFC531">いまここ!</text></g>';
        // 小さい島のラベル
        pos.forEach(function (p, i) {
            if (p.big) return;
            // 終わった年代は ✔ マークだけ(ラベルが重ならないように)
            if (i < cur) {
                h += '<g transform="translate(' + p.x + ' ' + (p.y - 16) + ')"><circle r="10" fill="#22B45B" stroke="' + INK + '" stroke-width="2"/>' +
                     '<text y="4.5" text-anchor="middle" font-family="M PLUS Rounded 1c, sans-serif" font-weight="900" font-size="12" fill="#fff">✔</text></g>';
                return;
            }
            var lx = Math.min(Math.max(p.x, 46), 375 - (STAGES[i].length > 3 ? 44 : 24));
            h += label(lx, p.y - 19, STAGES[i], i < cur);
        });
        h += piece(b.x - 2, b.y + 2, '#5FD1FF') + piece(b.x + 18, b.y + 2, '#FF4F8B');
        svg.innerHTML = h;
    }

    // イベントログの最新1件を吹き出しへ
    function updateLatest() {
        var list = document.getElementById('event-list');
        var box = document.getElementById('lfLatestEvent');
        if (!list || !box) return;
        var last = list.lastElementChild;
        box.textContent = last ? last.textContent : 'まだイベントはありません';
    }

    // メイン画面表示中は body にクラスを付け、固定ボタン類の位置を調整する
    function syncInGame() {
        var main = document.getElementById('mainGameContainer');
        document.body.classList.toggle('lf-in-game', !!main && main.style.display === 'block');
    }

    window.lfToggleSheet = function (open) {
        var sheet = document.getElementById('lfSheet');
        if (!sheet) return;
        var willOpen = typeof open === 'boolean' ? open : !sheet.classList.contains('is-open');
        sheet.classList.toggle('is-open', willOpen);
        document.body.classList.toggle('lf-sheet-open', willOpen);
    };

    function init() {
        drawMap(); updateLatest(); syncInGame();
        var age = document.getElementById('current-age');
        if (age) new MutationObserver(drawMap).observe(age, { childList: true, characterData: true, subtree: true });
        var list = document.getElementById('event-list');
        if (list) new MutationObserver(updateLatest).observe(list, { childList: true, subtree: true });
        var main = document.getElementById('mainGameContainer');
        if (main) new MutationObserver(syncInGame).observe(main, { attributes: true, attributeFilter: ['style'] });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
