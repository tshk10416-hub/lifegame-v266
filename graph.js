// graph.js - リアルタイム反映対応版

// game.js とキーを共有
const BALANCE_HISTORY_KEY = 'lifeGameBalanceHistory';

document.addEventListener('DOMContentLoaded', () => {
    // データを読み込む
    const historyDataString = localStorage.getItem(BALANCE_HISTORY_KEY);
    const history = historyDataString ? JSON.parse(historyDataString) : [];

    const ctx = document.getElementById('historyChart');

    if (!ctx) {
        console.error("Chart canvas not found!");
        return;
    }

    if (history.length === 0) {
        const container = document.querySelector('.chart-container');
        if(container) {
            container.innerHTML = '<p style="text-align: center; padding: 20px;">まだグラフを表示できるデータがありません。<br>ゲームを進めてターンを終了すると表示されます。</p>';
        }
        return;
    }

    // --- データ加工処理 ---
    
    // X軸のラベル (30代, 40代...)
    const labels = ["開始時", ...history.map(e => `${e.age}代`)];

    // 棒グラフ用: 期間中の収支 (イベント込み)
    // データがない "開始時" は 0 とする
    const periodDiffs = [0, ...history.map(e => e.finalDiff)];

    // 折れ線グラフ用: 総資産の推移
    // game.js 側で assetsAtEnd (終了時資産) が記録されている場合はそれを使う
    // 記録がない場合は計算で補完する
    let currentAsset = 100; // 初期資産
    const assetData = [100]; // 開始時

    history.forEach(e => {
        if (e.assetsAtEnd !== undefined) {
            // 新ロジック: 記録された資産額をそのまま使う
            currentAsset = e.assetsAtEnd;
        } else {
            // 旧データの互換性用: 収支を足し合わせる
            currentAsset += e.finalDiff;
        }
        assetData.push(currentAsset);
    });

    // グラフ描画 (Chart.js)
    new Chart(ctx, {
        type: 'bar', // ベースは棒グラフ
        data: {
            labels: labels,
            datasets: [
                {
                    label: '総資産 (右軸)',
                    data: assetData,
                    type: 'line', // 折れ線グラフ
                    borderColor: '#FF7F50', // サーモンピンク
                    backgroundColor: '#FF7F50',
                    borderWidth: 3,
                    yAxisID: 'yAsset',
                    tension: 0.1,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: '期間収支 (左軸)',
                    data: periodDiffs,
                    backgroundColor: periodDiffs.map(val => val >= 0 ? 'rgba(72, 187, 120, 0.6)' : 'rgba(229, 62, 62, 0.6)'), // プラスは緑、マイナスは赤
                    borderColor: periodDiffs.map(val => val >= 0 ? 'rgba(72, 187, 120, 1)' : 'rgba(229, 62, 62, 1)'),
                    borderWidth: 1,
                    yAxisID: 'yDiff'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: '資産と収支の推移',
                    font: { size: 18 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += Math.round(context.parsed.y).toLocaleString() + '万円';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                yDiff: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '期間収支 (万円)'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                yAsset: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '総資産 (万円)'
                    },
                    grid: {
                        drawOnChartArea: false, // グリッド線は左軸のみ
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
});